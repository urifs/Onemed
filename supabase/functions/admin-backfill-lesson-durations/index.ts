// ─────────────────────────────────────────────────────────────────────────────
// OneMed · admin-backfill-lesson-durations
// Preenche duration_seconds de aulas em vídeo que ficaram sem essa informação
// depois da sincronização (member-sync-library).
//
// Reescrito em 2026-07-27: a v1 só consultava videoMediaMetadata do Drive —
// rodou em produção e corrigiu só 3 de ~4.990 aulas (as 3 com "duration: 0",
// um bug à parte: durationMillis como string "0" passava na checagem
// `if (ms)` por ser string não-vazia). Investigando arquivo por arquivo:
// - Boa parte dos vídeos tem videoMediaMetadata sempre ausente no Drive
//   porque pertencem a uma conta Google diferente da conta admin (só
//   compartilhados, não "owned by"), e o Drive nunca roda o processamento
//   de vídeo (nem gera thumbnail) pra arquivo que não é dele.
// - Uma fatia relevante desses arquivos, apesar da extensão .mp4, é na
//   verdade MPEG-TS cru (começa com o sync byte 0x47 de um Transport
//   Stream, não com "ftyp" de um MP4/ISO-BMFF de verdade).
//
// Por isso, além de tentar o Drive primeiro (rápido, funciona quando dá
// certo), essa versão lê os bytes reais do arquivo direto do Drive e
// calcula a duração sozinha:
//   1) MP4/ISO-BMFF: acha a caixa moov (pulando a mdat pelo tamanho
//      declarado no cabeçalho) e lê o mvhd (timescale + duration).
//   2) MPEG-TS: lê o primeiro e o último PCR (Program Clock Reference) do
//      stream e divide a diferença por 27MHz.
// Cada aula processada sai do filtro (duration_checked_at deixa de ser
// nulo) então a próxima chamada já pega o próximo lote — sem cursor/offset,
// que perderia aulas num conjunto que encolhe a cada lote.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
const BATCH_SIZE = 5 // um lote de 8 mediu ~30s em produção (várias leituras de bytes do Drive por aula) — reduzido por margem de segurança contra o limite de execução da function
const GOOGLE_CLIENT_ID = '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com'
const TS_PACKET_SIZE = 188

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

async function refreshAccessToken(refreshToken: string, clientSecret: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken, client_id: GOOGLE_CLIENT_ID, client_secret: clientSecret, grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) throw new Error('Failed to refresh Google token')
  return data.access_token as string
}

// ── MP4 / ISO-BMFF: acha moov pulando ftyp/free/mdat pelo tamanho de cada
// caixa, depois procura mvhd (timescale + duration) dentro dela. ──
function findMvhdDuration(buf: Uint8Array): number | null {
  const marker = [0x6d, 0x76, 0x68, 0x64] // "mvhd"
  for (let i = 0; i < buf.length - 4; i++) {
    if (buf[i] === marker[0] && buf[i + 1] === marker[1] && buf[i + 2] === marker[2] && buf[i + 3] === marker[3]) {
      const version = buf[i + 4]
      const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
      try {
        if (version === 0) {
          const timescale = view.getUint32(i + 16)
          const duration = view.getUint32(i + 20)
          if (timescale > 0) return duration / timescale
        } else if (version === 1) {
          const timescale = view.getUint32(i + 24)
          const durHigh = view.getUint32(i + 28)
          const durLow = view.getUint32(i + 32)
          if (timescale > 0) return (durHigh * 4294967296 + durLow) / timescale
        }
      } catch { /* fora dos limites do buffer, continua procurando */ }
    }
  }
  return null
}

async function tryMp4Duration(fetchRange: (s: number, e: number) => Promise<Uint8Array>, sizeBytes: number): Promise<number | null> {
  let offset = 0
  let guard = 0
  let moovOffset: number | null = null
  let moovSize: number | null = null
  while (offset < sizeBytes && guard++ < 20) {
    const headerBuf = await fetchRange(offset, offset + 15)
    if (headerBuf.length < 8) break
    const view = new DataView(headerBuf.buffer, headerBuf.byteOffset, headerBuf.byteLength)
    let boxSize = view.getUint32(0)
    const boxType = String.fromCharCode(headerBuf[4], headerBuf[5], headerBuf[6], headerBuf[7])
    if (boxSize === 1) boxSize = view.getUint32(8) * 4294967296 + view.getUint32(12) // largesize de 64 bits
    else if (boxSize === 0) boxSize = sizeBytes - offset // caixa vai até o fim do arquivo
    if (boxType === 'moov') { moovOffset = offset; moovSize = boxSize; break }
    if (!/^[a-zA-Z0-9]{4}$/.test(boxType) || boxSize <= 0) break // estrutura inválida/corrompida — desiste
    offset += boxSize
  }
  if (moovOffset === null || moovSize === null) return null
  const moovBuf = await fetchRange(moovOffset, moovOffset + Math.min(moovSize, 3 * 1024 * 1024) - 1)
  return findMvhdDuration(moovBuf)
}

function findPcrAt(buf: Uint8Array, off: number): number | null {
  const afc = (buf[off + 3] >> 4) & 0x03
  if (afc !== 2 && afc !== 3) return null
  const adaptLen = buf[off + 4]
  if (adaptLen <= 0 || !(buf[off + 5] & 0x10)) return null
  const b6 = buf[off+6], b7 = buf[off+7], b8 = buf[off+8], b9 = buf[off+9], b10 = buf[off+10], b11 = buf[off+11]
  const base = (b6 * 0x1000000 + b7 * 0x10000 + b8 * 0x100 + b9) * 2 + (b10 >> 7)
  const ext = ((b10 & 0x01) << 8) | b11
  return base * 300 + ext
}

// ── MPEG-TS: alguns arquivos com extensão .mp4 são na verdade Transport
// Stream cru (sync byte 0x47 a cada 188 bytes). Duração = diferença entre
// o primeiro e o último PCR (relógio de 27MHz) presentes no arquivo. ──
async function tryTsDuration(fetchRange: (s: number, e: number) => Promise<Uint8Array>, sizeBytes: number): Promise<number | null> {
  const headBuf = await fetchRange(0, 256 * 1024 - 1)
  if (headBuf[0] !== 0x47) return null // não é MPEG-TS

  let firstPcr: number | null = null
  for (let off = 0; off + TS_PACKET_SIZE <= headBuf.length; off += TS_PACKET_SIZE) {
    if (headBuf[off] !== 0x47) continue
    const pcr = findPcrAt(headBuf, off)
    if (pcr !== null) { firstPcr = pcr; break }
  }
  if (firstPcr === null) return null

  const tailSize = 256 * 1024
  const tailStart = Math.max(0, sizeBytes - tailSize)
  const tailBuf = await fetchRange(tailStart, sizeBytes - 1)

  // tailStart não é necessariamente múltiplo de 188 — sem achar a fase certa
  // (3 sync bytes seguidos, 188 bytes de distância), qualquer leitura de
  // "pacote" nesse ponto seria lixo alinhado errado.
  let phase = -1
  for (let p = 0; p < TS_PACKET_SIZE && p + 2 * TS_PACKET_SIZE < tailBuf.length; p++) {
    if (tailBuf[p] === 0x47 && tailBuf[p + TS_PACKET_SIZE] === 0x47 && tailBuf[p + 2 * TS_PACKET_SIZE] === 0x47) { phase = p; break }
  }
  if (phase < 0) return null

  let lastPcr: number | null = null
  for (let off = phase; off + TS_PACKET_SIZE <= tailBuf.length; off += TS_PACKET_SIZE) {
    if (tailBuf[off] !== 0x47) break
    const pcr = findPcrAt(tailBuf, off)
    if (pcr !== null) lastPcr = pcr
  }
  if (lastPcr === null) return null

  let diff = lastPcr - firstPcr
  if (diff < 0) diff += 2 ** 33 * 300 // guarda contra estouro do contador do PCR
  return diff / 27_000_000
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })
  const cors = getCorsHeaders(req)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')
    if (!jwt) return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })

    const authClient = createClient(supabaseUrl, serviceKey)
    const { data: { user }, error: authErr } = await authClient.auth.getUser(jwt)
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Sessão inválida' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
    const { data: isAdmin } = await authClient.rpc('has_role', { _user_id: user.id, _role: 'admin' })
    if (!isAdmin) return new Response(JSON.stringify({ error: 'Apenas administradores' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } })

    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: config, error: cfgErr } = await supabase.from('drive_config').select('*').single()
    if (cfgErr || !config?.connected) {
      return new Response(JSON.stringify({ error: 'Google Drive não conectado' }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    let accessToken = config.access_token
    const expiry = config.token_expiry ? new Date(config.token_expiry) : null
    if (!expiry || expiry < new Date()) {
      if (!config.refresh_token) return new Response(JSON.stringify({ error: 'Token do Drive expirado' }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } })
      accessToken = await refreshAccessToken(config.refresh_token, GOOGLE_CLIENT_SECRET)
      await supabase.from('drive_config').update({
        access_token: accessToken, token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      }).eq('id', config.id)
    }

    const { data: batch, error: fetchErr } = await supabase
      .from('lessons')
      .select('id, drive_file_id, title, size_bytes')
      .eq('type', 'video')
      .is('duration_seconds', null)
      .is('duration_checked_at', null)
      .limit(BATCH_SIZE)
    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    if (!batch || batch.length === 0) {
      return new Response(JSON.stringify({ done: true, processed: 0, updated: 0 }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    let updated = 0
    const now = new Date().toISOString()
    for (const lesson of batch) {
      try {
        let durationSeconds: number | null = null

        // 1) tentativa rápida via metadata do Drive (funciona quando o Drive
        // já processou o vídeo — cada vez mais raro pra esse lote residual,
        // mas sem custo real tentar).
        const metaRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${lesson.drive_file_id}?fields=videoMediaMetadata,size`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        let sizeBytes = lesson.size_bytes || 0
        if (metaRes.ok) {
          const meta = await metaRes.json()
          const ms = Number(meta?.videoMediaMetadata?.durationMillis)
          if (ms > 0) durationSeconds = Math.round(ms / 1000)
          if (!sizeBytes && meta?.size) sizeBytes = Number(meta.size)
        }

        // 2) lê os bytes reais do arquivo e calcula a duração sozinha.
        if (durationSeconds === null && sizeBytes > 0) {
          const fetchRange = async (s: number, e: number): Promise<Uint8Array> => {
            const res = await fetch(`https://www.googleapis.com/drive/v3/files/${lesson.drive_file_id}?alt=media`, {
              headers: { Authorization: `Bearer ${accessToken}`, Range: `bytes=${s}-${e}` },
            })
            return new Uint8Array(await res.arrayBuffer())
          }
          const mp4Duration = await tryMp4Duration(fetchRange, sizeBytes)
          durationSeconds = mp4Duration !== null ? Math.round(mp4Duration) : null
          if (durationSeconds === null) {
            const tsDuration = await tryTsDuration(fetchRange, sizeBytes)
            durationSeconds = tsDuration !== null ? Math.round(tsDuration) : null
          }
        }

        const patch: Record<string, unknown> = { duration_checked_at: now }
        if (durationSeconds !== null && durationSeconds > 0) {
          patch.duration_seconds = durationSeconds
          updated++
        }
        if (!lesson.size_bytes && sizeBytes > 0) patch.size_bytes = sizeBytes
        await supabase.from('lessons').update(patch).eq('id', lesson.id)
      } catch (e) {
        console.error(`Falha ao checar duração de "${lesson.title}" (${lesson.drive_file_id}):`, e)
        await supabase.from('lessons').update({ duration_checked_at: now }).eq('id', lesson.id)
      }
    }

    return new Response(JSON.stringify({ done: false, processed: batch.length, updated }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('admin-backfill-lesson-durations error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
