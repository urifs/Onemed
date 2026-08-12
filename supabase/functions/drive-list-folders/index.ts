import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

const GOOGLE_CLIENT_ID = '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com'

async function refreshAccessToken(refreshToken: string, clientSecret: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Failed to refresh token')
  return data.access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Só admin: enumera as pastas do Drive da conta de conteúdo — qualquer
    // JWT de membro/trial passava pelo verify_jwt padrão sem esta checagem.
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(jwt)
    const { data: roleData } = user
      ? await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      : { data: null }
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Apenas administradores' }), {
        status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const { query = '' } = await req.json().catch(() => ({}))

    const { data: config, error } = await supabase.from('drive_config').select('*').single()
    if (error || !config?.connected) {
      return new Response(JSON.stringify({ error: 'Google Drive não conectado' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    let accessToken = config.access_token
    const expiry = config.token_expiry ? new Date(config.token_expiry) : null

    if (!expiry || expiry < new Date()) {
      if (!config.refresh_token) {
        return new Response(JSON.stringify({ error: 'Token expirado. Reconecte o Google Drive.' }), {
          status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        })
      }
      accessToken = await refreshAccessToken(config.refresh_token, GOOGLE_CLIENT_SECRET)
      await supabase.from('drive_config').update({
        access_token: accessToken,
        token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      }).eq('id', config.id)
    }

    // Build query: list folders matching search or all folders
    let q = "mimeType='application/vnd.google-apps.folder' and trashed=false"
    if (query) {
      q += ` and name contains '${query.replace(/'/g, "\\'")}'`
    }

    const params = new URLSearchParams({
      q,
      fields: 'files(id,name,parents)',
      orderBy: 'name',
      pageSize: '100',
      corpora: 'user',
    })

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      const err = await res.json()
      return new Response(JSON.stringify({ error: err.error?.message || 'Erro ao listar pastas' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const data = await res.json()

    return new Response(JSON.stringify({ folders: data.files || [] }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
