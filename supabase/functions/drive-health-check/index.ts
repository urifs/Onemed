// ─────────────────────────────────────────────────────────────────────────────
// OneMed · drive-health-check
//
// Existe por causa do apagão de 19/08/2026: a autorização das duas contas do
// Google foi revogada e NINGUÉM soube até um cliente reclamar que nenhum vídeo
// abria. O que enganou foi o `drive-access-token` responder 200 — ele só
// comparava `token_expiry` com o relógio, e um token revogado continua "dentro
// do prazo" até a hora dele passar.
//
// A lição virou esta função: a única prova de que a credencial presta é PEDIR
// algo ao Google com ela. `about?fields=user` é a chamada mais barata que
// existe na API do Drive — não lê arquivo, não consome franquia de download.
//
// Roda de hora em hora pelo cron e grava o resultado em `drive_health`, que o
// painel mostra em /admin/drive.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173']

function cors(req: Request) {
  const origin = req.headers.get('origin') || ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  }
}

async function secureCompare(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode('timing-safe-compare'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const [ma, mb] = await Promise.all([crypto.subtle.sign('HMAC', key, enc.encode(a)), crypto.subtle.sign('HMAC', key, enc.encode(b))])
  const x = new Uint8Array(ma), y = new Uint8Array(mb)
  if (x.length !== y.length) return false
  let d = 0
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i]
  return d === 0
}

const CONTAS = [
  { nome: 'conteudo', fn: 'drive-access-token', rotulo: 'Conta de conteúdo' },
  { nome: 'armazenamento', fn: 'drive-storage-token', rotulo: 'Conta de armazenamento' },
]

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })

  const json = (p: unknown, status = 200) =>
    new Response(JSON.stringify(p), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Cron (x-cron-secret) ou chamada interna com a service role.
  const segredo = req.headers.get('x-cron-secret') || ''
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const validos = [Deno.env.get('CRON_SECRET'), Deno.env.get('MEMBER_SYNC_SECRET')].filter((v): v is string => !!v && v !== 'NOT_SET')
  let ok = bearer ? await secureCompare(bearer, SERVICE_KEY) : false
  if (!ok) for (const esperado of validos) { if (await secureCompare(segredo, esperado)) { ok = true; break } }
  if (!ok) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const agora = new Date().toISOString()
  const resultados: any[] = []

  for (const conta of CONTAS) {
    let saudavel = false
    let erro: string | null = null
    let email: string | null = null

    try {
      // `force: true` de propósito: renovar aqui é justamente o que descobre um
      // refresh_token morto — que é a falha que derruba a plataforma. Sem force,
      // a sonda passaria só reusando um access_token guardado que o Google já
      // pode ter invalidado.
      const tRes = await fetch(`${SUPABASE_URL}/functions/v1/${conta.fn}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: '{"force":true}',
      })
      if (!tRes.ok) {
        erro = `A renovação do token falhou (${tRes.status}). A autorização desta conta no Google provavelmente foi revogada — reconecte em /admin/drive.`
      } else {
        const accessToken = (await tRes.json()).accessToken
        if (!accessToken) {
          erro = 'A função de token respondeu sem token.'
        } else {
          // Chamada mais barata da API: identifica a conta, não toca em arquivo.
          const g = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          if (g.ok) {
            saudavel = true
            email = (await g.json())?.user?.emailAddress ?? null
          } else {
            const corpo = await g.text().catch(() => '')
            erro = `O Google recusou o token (${g.status}): ${corpo.slice(0, 200)}`
          }
        }
      }
    } catch (e) {
      erro = `Falha ao conferir: ${String((e as Error)?.message || e).slice(0, 200)}`
    }

    await supabase.from('drive_health').upsert({
      account: conta.nome, label: conta.rotulo, healthy: saudavel,
      email, error: erro, checked_at: agora,
      ...(saudavel ? { last_ok_at: agora } : {}),
    }, { onConflict: 'account' })

    resultados.push({ conta: conta.nome, saudavel, email, erro })
  }

  const tudoOk = resultados.every(r => r.saudavel)
  if (!tudoOk) console.error('DRIVE FORA DO AR:', JSON.stringify(resultados))
  return json({ ok: tudoOk, contas: resultados })
})
