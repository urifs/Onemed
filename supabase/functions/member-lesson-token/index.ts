// ─────────────────────────────────────────────────────────────────────────────
// OneMed · member-lesson-token
// Verifica que o usuário tem acesso ativo à aula pedida e devolve uma URL
// assinada (HMAC, curta duração) apontando pro Worker de streaming na
// Cloudflare (cloudflare/stream-lesson/worker.js) — o navegador nunca fala
// com o Google Drive diretamente.
//
// Reescrito em 2026-07-21 (três vezes):
// 1ª vez: trocou o proxy de bytes via member-stream-file (que gerava ~100%
//   do egress cobrado pela Supabase, >1TB num único dia) por um link direto
//   do Google Drive (drive.usercontent.google.com), liberado por permissão
//   temporária "qualquer um com o link".
// 2ª vez: o link direto do Drive nunca funcionou de verdade no navegador do
//   aluno — o Google manda `Cross-Origin-Resource-Policy: same-site` em toda
//   resposta desse endpoint, e o navegador bloqueia qualquer carregamento
//   cross-site independente de CORS estar correto (curl sempre funcionava
//   porque CORP só existe no navegador). Não tem como contornar isso do
//   nosso lado — quem define o cabeçalho é o Google. Voltamos a um proxy
//   same-origin na Vercel (api/stream-lesson).
// 3ª vez (esta): o projeto está no plano Hobby da Vercel, sem banda de sobra
//   pro volume de vídeo do site (~1TB/dia visto no pico). Movido pra um
//   Cloudflare Worker, que não cobra por tráfego de saída — mesma lógica de
//   proxy, só muda o destino da URL assinada.
//
// 2026-07-30 — lessons.storage_path (opcional): algumas aulas têm o arquivo
// original num codec sem suporte nativo em nenhum navegador (ex: .wmv/VC-1 —
// diferente do .ts/mpegts, não existe truque de remux, precisa
// retranscodificar de verdade). O destino óbvio seria devolver o arquivo
// corrigido pro Google Drive, mas a conta conectada está acima da cota de
// armazenamento e o Google recusa (403) QUALQUER upload de conteúdo novo,
// mesmo substituindo por um arquivo menor. Pra essas aulas, o arquivo
// corrigido fica no bucket `lesson-media` do Supabase Storage em vez do
// Drive — quando `storage_path` está preenchido, devolve uma signed URL do
// Storage e pula o fluxo do Worker/Drive inteiro (drive_file_id continua
// salvo, só não é mais usado, fica de referência histórica).
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
const STREAM_TTL_SECONDS = 60 * 60 * 2 // 2h — cobre uma aula longa com folga

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  })
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const authHeader = req.headers.get('authorization') || ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    if (!jwt) return jsonResponse(req, { error: 'Não autenticado' }, 401)

    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
    if (userErr || !userData?.user) return jsonResponse(req, { error: 'Sessão inválida' }, 401)
    const user = userData.user

    const { lessonId } = await req.json().catch(() => ({}))
    if (!lessonId) return jsonResponse(req, { error: 'lessonId obrigatório' }, 400)

    const { data: lesson, error: lessonErr } = await supabase.from('lessons')
      .select('id, course_id, drive_file_id, mime_type, storage_path').eq('id', lessonId).maybeSingle()
    if (lessonErr || !lesson) return jsonResponse(req, { error: 'Aula não encontrada' }, 404)
    if (!lesson.drive_file_id && !lesson.storage_path) return jsonResponse(req, { error: 'Arquivo não configurado' }, 404)

    const email = (user.email || '').toLowerCase()
    const [{ data: activeAccess }, { data: buyer }, { data: isAdmin }] = await Promise.all([
      // expires_at é indispensável: entre o trial expirar e o cron de revogação
      // (a cada 5min) virar o status, um trial vencido ainda conseguia emitir
      // token de 2h e continuar assistindo. status='active' sozinho não basta.
      supabase.from('accesses').select('id').eq('email', email).eq('status', 'active')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).limit(1).maybeSingle(),
      supabase.from('buyers').select('id').eq('email', email).eq('access_granted', true).limit(1).maybeSingle(),
      supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
    ])
    if (!activeAccess && !buyer && !isAdmin) return jsonResponse(req, { error: 'Sem acesso ativo' }, 403)

    if (lesson.storage_path) {
      const { data: signed, error: signErr } = await supabase.storage
        .from('lesson-media')
        .createSignedUrl(lesson.storage_path, STREAM_TTL_SECONDS)
      if (signErr || !signed?.signedUrl) return jsonResponse(req, { error: 'Não foi possível gerar o link do arquivo' }, 502)
      return jsonResponse(req, { url: signed.signedUrl, expiresAt: Math.floor(Date.now() / 1000) + STREAM_TTL_SECONDS })
    }

    const streamSecret = Deno.env.get('LESSON_STREAM_SECRET')!
    // Cloudflare Workers não cobra por tráfego de saída (diferente de
    // Supabase/Vercel) — o proxy roda lá em vez de na Vercel.
    const streamBaseUrl = Deno.env.get('STREAM_PROXY_URL') || 'https://onemed-stream-lesson.onemed-stream.workers.dev'
    const fileId = lesson.drive_file_id
    // mime_type original do Drive vai assinado junto — Google Docs/Sheets
    // nativos (application/vnd.google-apps.*) não têm bytes "crus" pra baixar
    // (alt=media falha), precisam ser exportados num formato concreto; o
    // Worker usa esse campo pra decidir isso sem precisar de outra chamada à
    // API do Drive só pra descobrir o mimeType.
    const mimeType = lesson.mime_type || ''
    const expiresAt = Math.floor(Date.now() / 1000) + STREAM_TTL_SECONDS
    const sig = await hmacHex(streamSecret, `${fileId}.${expiresAt}.${mimeType}`)
    const url = `${streamBaseUrl}/?id=${encodeURIComponent(fileId)}&exp=${expiresAt}&sig=${sig}&mime=${encodeURIComponent(mimeType)}`

    return jsonResponse(req, { url, expiresAt })
  } catch (err: any) {
    console.error(err)
    return jsonResponse(req, { error: err.message }, 500)
  }
})
