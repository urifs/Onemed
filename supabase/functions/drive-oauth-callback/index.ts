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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Só admin: esta função sobrescreve os tokens da conta Google que serve
    // a biblioteca INTEIRA. Sem esta checagem (e com verify_jwt desligado),
    // qualquer pessoa que completasse um OAuth com o client público podia
    // apontar a plataforma pro próprio Drive — ou simplesmente derrubá-la.
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(jwt)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }
    const { data: roleData } = await supabase
      .from('user_roles').select('role')
      .eq('user_id', user.id).eq('role', 'admin').maybeSingle()
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Apenas administradores' }), {
        status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const { code, redirect_uri } = await req.json()

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    if (tokens.error) {
      return new Response(JSON.stringify({ error: tokens.error_description }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Upsert drive_config
    const { data: existing } = await supabase.from('drive_config').select('id').single()
    
    if (existing) {
      // O Google só devolve refresh_token na PRIMEIRA autorização (ou com
      // prompt=consent). Gravar `|| null` numa reconexão apagava o único
      // credencial de longa duração — streaming e sync inteiros caíam quando
      // o access_token de 1h vencia. Só sobrescreve se veio um novo.
      const patch: Record<string, unknown> = {
        connected: true,
        access_token: tokens.access_token,
        token_expiry: expiry,
        updated_at: new Date().toISOString(),
      }
      if (tokens.refresh_token) patch.refresh_token = tokens.refresh_token
      await supabase.from('drive_config').update(patch).eq('id', existing.id)
    } else {
      await supabase.from('drive_config').insert({
        connected: true,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expiry: expiry,
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
