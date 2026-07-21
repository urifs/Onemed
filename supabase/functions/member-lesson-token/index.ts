// ─────────────────────────────────────────────────────────────────────────────
// OneMed · member-lesson-token
// Verifica que o usuário tem acesso ativo à aula pedida e devolve uma URL de
// download DIRETO do Google Drive (drive.usercontent.google.com), pra o
// navegador buscar os bytes direto do Google em vez de passar pela nossa
// Edge Function member-stream-file.
//
// Reescrito em 2026-07-21 — o proxy de bytes via member-stream-file gerava
// ~100% do egress cobrado pela Supabase (>1TB num único dia). Pra servir o
// arquivo direto do Drive sem exigir login Google no navegador do aluno, o
// arquivo precisa de permissão "qualquer um com o link" (type: 'anyone') —
// concedida aqui por tempo limitado (GRANT_TTL_SECONDS) e revogada depois
// por um cron (ver drive-revoke-access), registrada em direct_link_grants.
// Enquanto a concessão estiver ativa, qualquer pessoa que capturar esse link
// específico consegue acessar o arquivo sem passar pelo nosso controle de
// acesso — é o trade-off aceito em troca de custo de egress ~zero.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
const GOOGLE_CLIENT_ID = '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com'
const GRANT_TTL_SECONDS = 60 * 60 // 1h — cobre uma aula inteira com folga, sem deixar o link válido por muito tempo

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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// A permissão "anyone" recém-criada não fica ativa instantaneamente no lado
// do Google — testado manualmente: a primeira tentativa logo após conceder
// retorna 403, e só funciona alguns segundos depois. Sem essa espera, o
// navegador recebia a URL e tentava abrir o vídeo/PDF antes da permissão
// propagar, resultando em "formato não suportado" (vídeo) ou "não foi
// possível abrir o arquivo" (PDF) — o corpo da resposta era a página de erro
// do Google, não o arquivo. Checa o content-type real (não só o HTTP status)
// porque um 200 com text/html é a página de aviso de vírus do Drive pra
// arquivos grandes (ver comentário em buildDirectUrl), não o arquivo.
async function waitUntilAccessible(url: string): Promise<boolean> {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      const contentType = res.headers.get('content-type') || ''
      if (res.ok && !contentType.startsWith('text/html')) return true
    } catch { /* tenta de novo */ }
    await sleep(attempt < 2 ? 500 : 1000)
  }
  return false
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
  if (!res.ok || !data.access_token) {
    console.error('Google token refresh failed', res.status, JSON.stringify(data))
    throw new Error('Failed to refresh Google token')
  }
  return data.access_token as string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
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
      .select('id, course_id, drive_file_id').eq('id', lessonId).maybeSingle()
    if (lessonErr || !lesson) return jsonResponse(req, { error: 'Aula não encontrada' }, 404)
    if (!lesson.drive_file_id) return jsonResponse(req, { error: 'Arquivo não configurado' }, 404)

    const email = (user.email || '').toLowerCase()
    const [{ data: activeAccess }, { data: buyer }, { data: isAdmin }] = await Promise.all([
      supabase.from('accesses').select('id').eq('email', email).eq('status', 'active').limit(1).maybeSingle(),
      supabase.from('buyers').select('id').eq('email', email).eq('access_granted', true).limit(1).maybeSingle(),
      supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
    ])
    if (!activeAccess && !buyer && !isAdmin) return jsonResponse(req, { error: 'Sem acesso ativo' }, 403)

    const fileId = lesson.drive_file_id

    // Já tem concessão ativa pra esse arquivo? Reaproveita em vez de chamar
    // a API do Drive de novo — vários alunos podem abrir a mesma aula.
    const { data: existingGrant } = await supabase
      .from('direct_link_grants').select('expires_at').eq('drive_file_id', fileId).maybeSingle()

    const now = Date.now()
    const grantStillValid = existingGrant && new Date(existingGrant.expires_at).getTime() > now
    const newExpiresAt = new Date(now + GRANT_TTL_SECONDS * 1000).toISOString()
    // confirm=t pula a página "Google Drive não conseguiu escanear esse
    // arquivo por vírus" que aparece pra arquivos grandes (a maioria dos
    // vídeos de aula passa dos ~100MB do limite de scan) — sem isso, em vez
    // do vídeo/PDF o navegador recebia essa página HTML de confirmação.
    const url = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`

    if (!grantStillValid) {
      const { data: config, error: cfgErr } = await supabase.from('drive_config').select('*').single()
      if (cfgErr || !config?.connected) return jsonResponse(req, { error: 'Drive não conectado' }, 502)

      let accessToken = config.access_token
      const expiry = config.token_expiry ? new Date(config.token_expiry) : null
      if (!expiry || expiry < new Date()) {
        if (!config.refresh_token) return jsonResponse(req, { error: 'Token do Drive expirado' }, 502)
        accessToken = await refreshAccessToken(config.refresh_token, GOOGLE_CLIENT_SECRET)
        await supabase.from('drive_config').update({
          access_token: accessToken, token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
        }).eq('id', config.id)
      }

      const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      })
      if (!permRes.ok) {
        const text = await permRes.text().catch(() => '')
        console.error('Drive permission grant failed', permRes.status, text)
        return jsonResponse(req, { error: 'Não foi possível liberar o arquivo' }, 502)
      }

      await supabase.from('direct_link_grants').upsert(
        { drive_file_id: fileId, granted_at: new Date().toISOString(), expires_at: newExpiresAt },
        { onConflict: 'drive_file_id' },
      )

      const accessible = await waitUntilAccessible(url)
      if (!accessible) {
        return jsonResponse(req, { error: 'O arquivo ainda está sendo liberado, tente novamente em instantes.' }, 503)
      }
    } else if (existingGrant) {
      // Estende a validade enquanto o aluno continuar acessando essa aula.
      await supabase.from('direct_link_grants').update({ expires_at: newExpiresAt }).eq('drive_file_id', fileId)
    }

    return jsonResponse(req, { url, expiresAt: Math.floor(new Date(newExpiresAt).getTime() / 1000) })
  } catch (err: any) {
    console.error(err)
    return jsonResponse(req, { error: err.message }, 500)
  }
})
