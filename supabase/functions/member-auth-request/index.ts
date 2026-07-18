// ─────────────────────────────────────────────────────────────────────────────
// OneMed · member-auth-request
// Passwordless login gate for the member platform (/membros).
//   1. Validate email
//   2. Rate limit (5 tentativas / 15min por IP)
//   3. Confirm the email has an active trial/purchase, or belongs to an admin
//   4. Provision (or reuse) the Supabase Auth user + generate a magic link
//   5. Redeem that link server-side and hand the session tokens straight back
//      to the caller — the user only ever types their email, no inbox trip.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

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

async function checkRateLimit(supabase: ReturnType<typeof createClient>, identifier: string) {
  const maxAttempts = 5
  const windowMs = 15 * 60 * 1000
  const now = new Date()
  const { data: existing } = await supabase.from('rate_limits')
    .select('attempts, window_start').eq('identifier', identifier).eq('action', 'member_login').maybeSingle()

  if (!existing || (now.getTime() - new Date(existing.window_start).getTime()) > windowMs) {
    await supabase.from('rate_limits').upsert(
      { identifier, action: 'member_login', attempts: 1, window_start: now.toISOString() },
      { onConflict: 'identifier,action' },
    )
    return { allowed: true }
  }
  if (existing.attempts >= maxAttempts) {
    return { allowed: false, retryAfterSeconds: Math.ceil((new Date(existing.window_start).getTime() + windowMs - now.getTime()) / 1000) }
  }
  await supabase.from('rate_limits').update({ attempts: existing.attempts + 1 }).eq('identifier', identifier).eq('action', 'member_login')
  return { allowed: true }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { email: rawEmail } = await req.json().catch(() => ({}))
    const email = String(rawEmail || '').trim().toLowerCase()

    if (!EMAIL_REGEX.test(email)) return jsonResponse(req, { error: 'Email inválido' }, 400)

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    const rate = await checkRateLimit(supabase, ip)
    if (!rate.allowed) {
      return jsonResponse(req, { error: 'Muitas tentativas. Tente novamente em alguns minutos.', retryAfterSeconds: rate.retryAfterSeconds }, 429)
    }

    const [{ data: activeAccess }, { data: buyer }, { data: isAdminEmail }] = await Promise.all([
      supabase.from('accesses').select('id').eq('email', email).eq('status', 'active').limit(1).maybeSingle(),
      supabase.from('buyers').select('id').eq('email', email).eq('access_granted', true).limit(1).maybeSingle(),
      supabase.rpc('is_admin_email', { _email: email }),
    ])

    if (!activeAccess && !buyer && !isAdminEmail) {
      return jsonResponse(req, { error: 'Nenhum acesso ativo encontrado para este email. Faça um trial gratuito ou verifique sua compra.' }, 404)
    }

    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error('generateLink error', linkErr)
      return jsonResponse(req, { error: 'Não foi possível gerar o acesso. Tente novamente.' }, 500)
    }

    // Redeem the link ourselves instead of emailing it — GoTrue returns the
    // session as a URL fragment on the 303 redirect, so we read it off the
    // Location header without ever exposing the underlying magic link.
    // A buyer's very first login has no confirmed auth.users row yet, so
    // GoTrue files the token as a "signup" confirmation instead of a
    // "magiclink" one — verifying with the wrong type reports it as expired.
    // Try both; whichever matches the token's real type wins.
    const hashedToken = linkData.properties.hashed_token
    let access_token: string | null = null
    let refresh_token: string | null = null
    for (const verifyType of ['magiclink', 'signup']) {
      const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${hashedToken}&type=${verifyType}&redirect_to=${encodeURIComponent(ALLOWED_ORIGINS[0])}`
      const verifyRes = await fetch(verifyUrl, { redirect: 'manual' })
      const location = verifyRes.headers.get('location')
      if (!location) continue
      const fragment = new URLSearchParams(new URL(location).hash.slice(1))
      access_token = fragment.get('access_token')
      refresh_token = fragment.get('refresh_token')
      if (access_token && refresh_token) break
    }

    if (!access_token || !refresh_token) {
      console.error('verify redeem failed for both magiclink and signup types')
      return jsonResponse(req, { error: 'Não foi possível concluir o login. Tente novamente.' }, 500)
    }

    return jsonResponse(req, { success: true, access_token, refresh_token })
  } catch (err: any) {
    console.error(err)
    return jsonResponse(req, { error: err.message }, 500)
  }
})
