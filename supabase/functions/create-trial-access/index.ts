// ─────────────────────────────────────────────────────────────────────────────
// OneMed · create-trial-access
// Fluxo enxuto:
//   1. Validar email + WhatsApp
//   2. Bloquear quem já é comprador aprovado ou já fez trial
//   3. Inserir access com expires_at = now + 10min (dá acesso à área de
//      membros/membros — não compartilha mais pasta do Google Drive)
//   4. Gerar sessão instantânea (mesmo truque do member-auth-request) pra
//      já devolver o usuário logado direto em /membros, sem precisar de link
//      por email
//   5. Disparar email de confirmação em fire-and-forget (não bloqueia)
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const TRIAL_DURATION_MINUTES = 10

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function jsonResponse(req: Request, body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json', ...extra },
  })
}

// Rate limit: 5 tentativas por IP a cada 15 minutos.
async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  identifier: string,
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const maxAttempts = 5
  const windowMs = 15 * 60 * 1000
  const now = new Date()

  const { data: existing } = await supabase
    .from('rate_limits')
    .select('attempts, window_start')
    .eq('identifier', identifier)
    .eq('action', 'create_trial')
    .maybeSingle()

  if (!existing || (now.getTime() - new Date(existing.window_start).getTime()) > windowMs) {
    await supabase.from('rate_limits').upsert(
      { identifier, action: 'create_trial', attempts: 1, window_start: now.toISOString() },
      { onConflict: 'identifier,action' }
    )
    return { allowed: true }
  }

  if (existing.attempts >= maxAttempts) {
    const retryAfter = Math.ceil(
      (new Date(existing.window_start).getTime() + windowMs - now.getTime()) / 1000,
    )
    return { allowed: false, retryAfterSeconds: retryAfter }
  }

  await supabase.from('rate_limits')
    .update({ attempts: existing.attempts + 1 })
    .eq('identifier', identifier)
    .eq('action', 'create_trial')

  return { allowed: true }
}

// Limite de 2 trials REAIS por IP a cada 24h — diferente do checkRateLimit
// acima (que barra rajadas de tentativas), este conta só trials de fato
// criados, mesmo com emails diferentes a cada vez, pra travar quem tenta
// burlar o limite por email trocando de endereço.
async function checkIpTrialLimit(
  supabase: ReturnType<typeof createClient>,
  identifier: string,
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const maxTrials = 2
  const windowMs = 24 * 60 * 60 * 1000
  const now = new Date()

  const { data: existing } = await supabase
    .from('rate_limits')
    .select('attempts, window_start')
    .eq('identifier', identifier)
    .eq('action', 'trial_per_ip')
    .maybeSingle()

  if (!existing || (now.getTime() - new Date(existing.window_start).getTime()) > windowMs) {
    return { allowed: true }
  }

  if (existing.attempts >= maxTrials) {
    const retryAfterSeconds = Math.ceil((new Date(existing.window_start).getTime() + windowMs - now.getTime()) / 1000)
    return { allowed: false, retryAfterSeconds }
  }

  return { allowed: true }
}

async function recordIpTrial(
  supabase: ReturnType<typeof createClient>,
  identifier: string,
): Promise<void> {
  const now = new Date()
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('attempts, window_start')
    .eq('identifier', identifier)
    .eq('action', 'trial_per_ip')
    .maybeSingle()

  if (!existing || (now.getTime() - new Date(existing.window_start).getTime()) > 24 * 60 * 60 * 1000) {
    await supabase.from('rate_limits').upsert(
      { identifier, action: 'trial_per_ip', attempts: 1, window_start: now.toISOString() },
      { onConflict: 'identifier,action' },
    )
    return
  }

  await supabase.from('rate_limits').update({ attempts: existing.attempts + 1 })
    .eq('identifier', identifier).eq('action', 'trial_per_ip')
}

// Geolocaliza o IP do login e grava/atualiza member_locations — melhor
// esforço, nunca derruba o login se a API de geolocalização falhar.
async function captureMemberLocation(supabase: ReturnType<typeof createClient>, ip: string, userId: string, email: string) {
  try {
    if (!ip || ip === 'unknown') return
    const geoRes = await fetch(`https://ipwho.is/${ip}`, { signal: AbortSignal.timeout(3000) })
    if (!geoRes.ok) return
    const geo = await geoRes.json()
    if (!geo.success || geo.latitude == null || geo.longitude == null) return
    await supabase.from('member_locations').upsert({
      user_id: userId,
      email,
      ip,
      city: geo.city || null,
      region: geo.region || null,
      country: geo.country || null,
      country_code: geo.country_code || null,
      latitude: geo.latitude,
      longitude: geo.longitude,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  } catch (err) {
    console.warn('captureMemberLocation falhou', err)
  }
}

// Redeems a fresh magic link server-side instead of emailing it, so the
// caller gets a ready-to-use session back in the same response — same
// technique as member-auth-request. A first-ever login has no confirmed
// auth.users row yet, so GoTrue files the token as a "signup" confirmation
// instead of a "magiclink" one; try both.
async function issueSession(supabase: ReturnType<typeof createClient>, supabaseUrl: string, email: string, clientIp: string) {
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({ type: 'magiclink', email })
  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error('generateLink error', linkErr)
    return null
  }
  const hashedToken = linkData.properties.hashed_token
  for (const verifyType of ['magiclink', 'signup']) {
    const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${hashedToken}&type=${verifyType}&redirect_to=${encodeURIComponent(ALLOWED_ORIGINS[0])}`
    const verifyRes = await fetch(verifyUrl, { redirect: 'manual' })
    const location = verifyRes.headers.get('location')
    if (!location) continue
    const fragment = new URLSearchParams(new URL(location).hash.slice(1))
    const access_token = fragment.get('access_token')
    const refresh_token = fragment.get('refresh_token')
    if (access_token && refresh_token) {
      // Limite de 2 dispositivos simultâneos: mantém só as sessões mais
      // recentes, derrubando o refresh token do dispositivo mais antigo.
      if (linkData.user?.id) {
        const { error: limitErr } = await supabase.rpc('enforce_session_limit', { _user_id: linkData.user.id, _max_sessions: 2 })
        if (limitErr) console.error('enforce_session_limit error', limitErr)

        // Geolocalização não pode ficar no caminho crítico do login — uma
        // resposta lenta do ipwho.is já deixou o login inteiro estourar o
        // timeout do fetch no frontend. waitUntil mantém o isolate vivo até
        // terminar, sem segurar a resposta pro cliente.
        const locationPromise = captureMemberLocation(supabase, clientIp, linkData.user.id, email)
        // @ts-ignore EdgeRuntime é um global específico do runtime da Supabase
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil(locationPromise)
        } else {
          await locationPromise
        }
      }
      return { access_token, refresh_token }
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase    = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

    const { email, whatsapp } = await req.json().catch(() => ({}))

    if (!email || !EMAIL_REGEX.test(email)) {
      return jsonResponse(req, { error: 'E-mail inválido' }, 400)
    }

    const normalizedEmail = String(email).toLowerCase().trim()

    // ── Rate limit por IP ──
    const clientIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
      || req.headers.get('x-real-ip') || 'unknown'
    try {
      const rl = await checkRateLimit(supabase, clientIp)
      if (!rl.allowed) {
        return jsonResponse(req, {
          error: 'Muitas tentativas. Tente novamente em alguns minutos.',
          retryAfterSeconds: rl.retryAfterSeconds,
        }, 429, { 'Retry-After': String(rl.retryAfterSeconds ?? 60) })
      }
    } catch (rlErr: any) {
      console.warn('Rate limit indisponível:', rlErr.message)
    }

    // ── Bloqueia se já comprou ──
    const { data: buyer } = await supabase
      .from('buyers').select('id').eq('email', normalizedEmail).eq('status', 'approved').maybeSingle()
    if (buyer) {
      return jsonResponse(req, {
        error: 'Este email já possui acesso completo ao OneMed. Acesse pelo link enviado no seu email.',
      }, 409)
    }

    // ── Se já tem trial, devolve sessão (ativo) ou bloqueia (expirado) ──
    const { data: existing } = await supabase
      .from('accesses')
      .select('id, status, expires_at')
      .eq('email', normalizedEmail)
      .eq('access_type', 'trial')
      .maybeSingle()

    if (existing) {
      if (existing.status === 'active' && existing.expires_at) {
        const diffMs = new Date(existing.expires_at).getTime() - Date.now()
        if (diffMs > 0) {
          const session = await issueSession(supabase, supabaseUrl, normalizedEmail, clientIp)
          return jsonResponse(req, {
            alreadyActive: true,
            email: normalizedEmail,
            minutesRemaining: Math.floor(diffMs / 60000),
            secondsRemaining: Math.floor((diffMs % 60000) / 1000),
            ...(session || {}),
          })
        }
      }
      return jsonResponse(req, {
        error: 'Este email já utilizou o período de teste gratuito. Para continuar com acesso ilimitado, adquira um plano.',
      }, 409)
    }

    // ── Limite de 2 trials por IP a cada 24h, mesmo com emails diferentes ──
    try {
      const ipLimit = await checkIpTrialLimit(supabase, clientIp)
      if (!ipLimit.allowed) {
        return jsonResponse(req, {
          error: 'Este endereço já atingiu o limite de 2 testes gratuitos por dia. Tente novamente amanhã ou adquira um plano.',
          retryAfterSeconds: ipLimit.retryAfterSeconds,
        }, 409, { 'Retry-After': String(ipLimit.retryAfterSeconds ?? 60) })
      }
    } catch (ipErr: any) {
      console.warn('Limite de trial por IP indisponível:', ipErr.message)
    }

    // ── Criar registro de acesso ──
    const accessId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + TRIAL_DURATION_MINUTES * 60 * 1000).toISOString()

    const { error: insertError } = await supabase.from('accesses').insert({
      id: accessId,
      email: normalizedEmail,
      whatsapp: whatsapp || null,
      access_type: 'trial',
      status: 'active',
      expires_at: expiresAt,
    })

    if (insertError) throw insertError

    // Precisa ser aguardado (não fire-and-forget): a function pode encerrar
    // o isolate assim que a resposta é enviada, e sem await a escrita do
    // contador às vezes nunca chegava a acontecer — o limite por IP nunca
    // incrementava de verdade.
    try {
      await recordIpTrial(supabase, clientIp)
    } catch (recErr: any) {
      console.warn('Falha ao registrar trial por IP:', recErr.message)
    }

    const session = await issueSession(supabase, supabaseUrl, normalizedEmail, clientIp)
    if (!session) {
      return jsonResponse(req, { error: 'Acesso criado, mas não foi possível iniciar a sessão. Tente entrar em /login.' }, 500)
    }

    // ── Side-effects fire-and-forget ──
    supabase.from('visits').insert({ page: 'trial', user_agent: '' }).then(() => {}).catch(() => {})

    supabase.functions.invoke('send-access-email', {
      headers: { Authorization: `Bearer ${supabaseKey}` },
      body: { to: normalizedEmail, type: 'trial_access' },
    }).then(() => {}).catch((e: any) => console.warn('Trial email falhou:', e))

    return jsonResponse(req, {
      success: true,
      accessId,
      email: normalizedEmail,
      minutesRemaining: TRIAL_DURATION_MINUTES,
      secondsRemaining: 0,
      ...session,
    })
  } catch (err: any) {
    console.error('create-trial-access error:', err)
    return jsonResponse(req, { error: err.message || 'Erro interno' }, 500)
  }
})
