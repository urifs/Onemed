import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

// ─── EMAIL VALIDATION ─────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
// 5 tentativas por IP a cada 15 minutos
async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  identifier: string,
  action: string,
  maxAttempts: number,
  windowMinutes: number
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const now = new Date()
  const windowMs = windowMinutes * 60 * 1000

  const { data: existing } = await supabase
    .from('rate_limits')
    .select('attempts, window_start')
    .eq('identifier', identifier)
    .eq('action', action)
    .maybeSingle()

  if (!existing || (now.getTime() - new Date(existing.window_start).getTime()) > windowMs) {
    // Nova janela ou janela expirada — zerar contador
    await supabase.from('rate_limits').upsert(
      { identifier, action, attempts: 1, window_start: now.toISOString() },
      { onConflict: 'identifier,action' }
    )
    return { allowed: true }
  }

  if (existing.attempts >= maxAttempts) {
    const windowExpiry = new Date(new Date(existing.window_start).getTime() + windowMs)
    const retryAfterSeconds = Math.ceil((windowExpiry.getTime() - now.getTime()) / 1000)
    return { allowed: false, retryAfterSeconds }
  }

  await supabase.from('rate_limits')
    .update({ attempts: existing.attempts + 1 })
    .eq('identifier', identifier)
    .eq('action', action)

  return { allowed: true }
}

const TRIAL_DURATION_MINUTES = 30

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase    = createClient(supabaseUrl, supabaseKey)

    const { email, whatsapp } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email é obrigatório' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // ── Validação de formato de email ────────────────────────────────────────
    if (!EMAIL_REGEX.test(email)) {
      return new Response(JSON.stringify({ error: 'Formato de email inválido' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // ── Rate limiting por IP (degradado graciosamente se tabela não existir) ──
    const clientIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
      || req.headers.get('x-real-ip')
      || 'unknown'

    try {
      const rl = await checkRateLimit(supabase, clientIp, 'create_trial', 5, 15)
      if (!rl.allowed) {
        return new Response(JSON.stringify({
          error: 'Muitas tentativas. Tente novamente em alguns minutos.',
          retryAfterSeconds: rl.retryAfterSeconds,
        }), {
          status: 429,
          headers: {
            ...getCorsHeaders(req),
            'Content-Type': 'application/json',
            'Retry-After': String(rl.retryAfterSeconds ?? 60),
          }
        })
      }
    } catch (rlErr: any) {
      console.warn('Rate limit check failed (migration pendente?):', rlErr.message)
      // Continua sem rate limit — não bloqueia o fluxo principal
    }

    // Block if email already purchased
    const { data: buyer } = await supabase
      .from('buyers')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('status', 'approved')
      .maybeSingle()

    if (buyer) {
      return new Response(JSON.stringify({ error: 'Este email já possui acesso completo ao OneMed. Acesse pelo link enviado no seu email.' }), {
        status: 409, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // Check if email already had a trial
    const { data: existing } = await supabase
      .from('accesses')
      .select('id, status, expires_at')
      .eq('email', normalizedEmail)
      .eq('access_type', 'trial')
      .maybeSingle()

    if (existing) {
      if (existing.status === 'active') {
        const expiresAt = new Date(existing.expires_at)
        const now = new Date()
        const diffMs = expiresAt.getTime() - now.getTime()
        if (diffMs > 0) {
          const minutesRemaining = Math.floor(diffMs / 60000)
          const secondsRemaining = Math.floor((diffMs % 60000) / 1000)
          return new Response(JSON.stringify({
            alreadyActive: true,
            minutesRemaining,
            secondsRemaining,
            email: normalizedEmail
          }), { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
        }
      }
      // Trial expirado ou outro status — bloqueia nova tentativa
      return new Response(JSON.stringify({ error: 'Este email já utilizou o período de teste gratuito. Para continuar com acesso ilimitado, adquira um plano.' }), {
        status: 409, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // Get drive config
    const { data: driveConfig } = await supabase
      .from('drive_config')
      .select('folder_id, folder_name, connected')
      .maybeSingle()

    // Create trial access
    const newAccessId = crypto.randomUUID()
    const expiresAt   = new Date(Date.now() + TRIAL_DURATION_MINUTES * 60 * 1000).toISOString()

    const { error: insertError } = await supabase.from('accesses').insert({
      id: newAccessId,
      email: normalizedEmail,
      whatsapp: whatsapp || null,
      access_type: 'trial',
      status: 'active',
      expires_at: expiresAt,
      drive_folder_id: driveConfig?.folder_id || null,
      drive_folder_name: driveConfig?.folder_name || null,
    })

    if (insertError) throw insertError

    // Track visit (fire and forget)
    supabase.from('visits').insert({ page: 'trial', user_agent: '' }).then(() => {}).catch(() => {})

    // Share Drive folder — fire and forget so we don't block the response
    if (driveConfig?.connected && driveConfig?.folder_id) {
      supabase.functions.invoke('drive-share-folder', {
        body: { email: normalizedEmail, accessId: newAccessId },
      }).then(() => {}).catch((e: any) => console.warn('Drive share failed:', e))
    }

    // Send trial access email — fire and forget
    supabase.functions.invoke('send-access-email', {
      body: {
        to: normalizedEmail,
        type: 'trial_access',
        folderId: driveConfig?.folder_id || null,
        folderName: driveConfig?.folder_name || null,
      },
    }).then(() => {}).catch((e: any) => console.warn('Trial email failed:', e))

    return new Response(JSON.stringify({
      success: true,
      accessId: newAccessId,
      email: normalizedEmail,
      minutesRemaining: TRIAL_DURATION_MINUTES,
      secondsRemaining: 0,
    }), { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error('create-trial-access error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
