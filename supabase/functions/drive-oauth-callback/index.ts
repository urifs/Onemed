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

    // Gate de admin: o fluxo OAuth roda no painel /admin/drive, autenticado.
    // Sem isto, qualquer um faz POST anônimo com um code obtido com a PRÓPRIA
    // conta Google e sobrescreve drive_config, sequestrando/derrubando o acervo.
    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    if (!jwt) return new Response(JSON.stringify({ error: 'Não autenticado' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
    const { data: userData } = await supabase.auth.getUser(jwt)
    if (!userData?.user) return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' })
    if (!isAdmin) return new Response(JSON.stringify({ error: 'Acesso restrito a administradores' }), {
      status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })

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
      await supabase.from('drive_config').update({
        connected: true,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expiry: expiry,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
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
