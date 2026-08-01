// ─────────────────────────────────────────────────────────────────────────────
// OneMed · drive-access-token
// Função interna, service-to-service: devolve um access_token válido do Google
// Drive da conta do admin (onemedcursos@gmail.com), renovando via refresh_token
// quando necessário. Só o proxy de streaming na Vercel (api/stream-lesson) deve
// chamar isso, autenticado com a service_role key — nunca exposto ao navegador
// do aluno. Existe porque o proxy roda em runtime Edge da Vercel e não deve
// duplicar o GOOGLE_CLIENT_SECRET fora do Supabase.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_CLIENT_ID = '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com'

async function secureCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode('timing-safe-compare'),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, encoder.encode(a)),
    crypto.subtle.sign('HMAC', key, encoder.encode(b)),
  ])
  const a8 = new Uint8Array(sigA)
  const b8 = new Uint8Array(sigB)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < 32; i++) diff |= a8[i] ^ b8[i]
  return diff === 0
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
  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token || !(await secureCompare(token, serviceKey))) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: config, error } = await supabase.from('drive_config').select('*').single()
    if (error || !config?.connected) {
      return new Response(JSON.stringify({ error: 'Drive não conectado' }), { status: 502 })
    }

    let accessToken = config.access_token
    const expiry = config.token_expiry ? new Date(config.token_expiry) : null
    if (!expiry || expiry.getTime() < Date.now() + 60_000) {
      if (!config.refresh_token) {
        return new Response(JSON.stringify({ error: 'Token do Drive expirado' }), { status: 502 })
      }
      accessToken = await refreshAccessToken(config.refresh_token, GOOGLE_CLIENT_SECRET)
      await supabase.from('drive_config').update({
        access_token: accessToken, token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      }).eq('id', config.id)
    }

    return new Response(JSON.stringify({ accessToken }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
