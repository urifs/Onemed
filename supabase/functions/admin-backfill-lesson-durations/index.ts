// ─────────────────────────────────────────────────────────────────────────────
// OneMed · admin-backfill-lesson-durations
// Preenche duration_seconds de aulas em vídeo que ficaram sem essa informação
// depois da sincronização (member-sync-library). Isso acontece porque o
// Google Drive só popula videoMediaMetadata.durationMillis depois de terminar
// de processar o vídeo internamente — se a sincronização rodou antes disso
// terminar pro arquivo, duration_seconds fica nulo pra sempre, sem nada que
// reprocesse automaticamente depois.
//
// Cada chamada processa um lote pequeno (sem cursor/offset): busca até
// BATCH_SIZE aulas com duration_seconds nulo E duration_checked_at nulo,
// consulta o Drive pra cada uma, e marca duration_checked_at mesmo quando o
// Drive não devolve metadata — sem isso, aulas cujo arquivo nunca ganha
// videoMediaMetadata (ex: certos formatos, arquivos muito antigos) fariam a
// mesma leva aparecer pra sempre e o loop nunca terminaria.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
const BATCH_SIZE = 20
const GOOGLE_CLIENT_ID = '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com'

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

    // Sem cursor/offset de propósito: cada aula processada sai do filtro
    // (duration_checked_at deixa de ser nulo), então a próxima chamada já
    // pega o próximo lote naturalmente — paginar por offset aqui perderia
    // aulas, porque o conjunto filtrado encolhe a cada lote processado.
    const { data: batch, error: fetchErr } = await supabase
      .from('lessons')
      .select('id, drive_file_id, title')
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
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${lesson.drive_file_id}?fields=videoMediaMetadata`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        if (res.ok) {
          const data = await res.json()
          const ms = data?.videoMediaMetadata?.durationMillis
          if (ms) {
            await supabase.from('lessons').update({
              duration_seconds: Math.round(Number(ms) / 1000),
              duration_checked_at: now,
            }).eq('id', lesson.id)
            updated++
            continue
          }
        }
        // Drive respondeu mas ainda sem videoMediaMetadata (ou erro pontual,
        // ex: arquivo temporariamente indisponível) — marca como checado pra
        // não repetir pra sempre; um admin pode limpar duration_checked_at
        // manualmente se quiser tentar de novo mais tarde.
        await supabase.from('lessons').update({ duration_checked_at: now }).eq('id', lesson.id)
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
