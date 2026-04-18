// ─────────────────────────────────────────────────────────────────────────────
// OneMed · create-trial-access
// Fluxo enxuto:
//   1. Validar email + WhatsApp
//   2. Bloquear quem já é comprador aprovado ou já fez trial
//   3. Compartilhar a pasta no Google Drive (síncrono — sem sucesso aqui, não
//      cria registro; o cron depende do drive_permission_id para revogar)
//   4. Inserir access com expires_at = now + 30min
//   5. Disparar email e ManyChat em fire-and-forget (não bloqueia a resposta)
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const TRIAL_DURATION_MINUTES = 30

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

// ─── GOOGLE DRIVE ────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com'

async function refreshGoogleToken(refreshToken: string, clientSecret: string): Promise<string> {
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
  if (!res.ok || !data.access_token) throw new Error('Falha ao renovar token do Google')
  return data.access_token as string
}

async function shareDriveFolder(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<{ folderId: string; folderName: string | null; permissionId: string } | null> {
  const { data: config } = await supabase.from('drive_config').select('*').maybeSingle()
  if (!config?.connected || !config.folder_id) return null

  let accessToken = config.access_token
  const expiry = config.token_expiry ? new Date(config.token_expiry) : null
  if (!expiry || expiry < new Date()) {
    if (!config.refresh_token) throw new Error('Google Drive não autenticado (sem refresh token)')
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
    accessToken = await refreshGoogleToken(config.refresh_token, GOOGLE_CLIENT_SECRET)
    await supabase.from('drive_config').update({
      access_token: accessToken,
      token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
    }).eq('id', config.id)
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${config.folder_id}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ role: 'reader', type: 'user', emailAddress: email, sendNotificationEmail: false }),
  })
  const perm = await res.json()
  if (!res.ok) throw new Error(perm?.error?.message || 'Falha ao compartilhar pasta')

  return { folderId: config.folder_id, folderName: config.folder_name ?? null, permissionId: perm.id }
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
      return jsonResponse(req, { error: 'Email inválido' }, 400)
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

    // ── Se já tem trial ativo, devolve o tempo restante ──
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
          return jsonResponse(req, {
            alreadyActive: true,
            email: normalizedEmail,
            minutesRemaining: Math.floor(diffMs / 60000),
            secondsRemaining: Math.floor((diffMs % 60000) / 1000),
          })
        }
      }
      return jsonResponse(req, {
        error: 'Este email já utilizou o período de teste gratuito. Para continuar com acesso ilimitado, adquira um plano.',
      }, 409)
    }

    // ── Compartilhar Drive SÍNCRONO — se falhar, não criamos acesso ──
    let drive: { folderId: string; folderName: string | null; permissionId: string } | null = null
    try {
      drive = await shareDriveFolder(supabase, normalizedEmail)
    } catch (e: any) {
      console.error('Drive share falhou:', e.message)
      return jsonResponse(req, { error: 'Não foi possível liberar o acesso à pasta. Tente novamente em instantes.' }, 503)
    }

    if (!drive) {
      return jsonResponse(req, { error: 'Sistema temporariamente indisponível (Drive não conectado).' }, 503)
    }

    // ── Criar registro de acesso com perm_id já salvo ──
    const accessId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + TRIAL_DURATION_MINUTES * 60 * 1000).toISOString()

    const { error: insertError } = await supabase.from('accesses').insert({
      id: accessId,
      email: normalizedEmail,
      whatsapp: whatsapp || null,
      access_type: 'trial',
      status: 'active',
      expires_at: expiresAt,
      drive_folder_id: drive.folderId,
      drive_folder_name: drive.folderName,
      drive_permission_id: drive.permissionId,
    })

    if (insertError) {
      // Rollback: remove a permissão do Drive pois o registro não foi criado.
      try {
        const { data: cfg } = await supabase.from('drive_config').select('access_token').maybeSingle()
        if (cfg?.access_token) {
          await fetch(
            `https://www.googleapis.com/drive/v3/files/${drive.folderId}/permissions/${drive.permissionId}`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${cfg.access_token}` } },
          )
        }
      } catch { /* best effort */ }
      throw insertError
    }

    // ── Side-effects fire-and-forget ──
    supabase.from('visits').insert({ page: 'trial', user_agent: '' }).then(() => {}).catch(() => {})

    supabase.functions.invoke('send-access-email', {
      body: {
        to: normalizedEmail,
        type: 'trial_access',
        folderId: drive.folderId,
        folderName: drive.folderName,
      },
    }).then(() => {}).catch((e: any) => console.warn('Trial email falhou:', e))

    if (whatsapp) {
      const manychatApiKey = Deno.env.get('MANYCHAT_API_KEY')
      if (manychatApiKey) {
        const digits = String(whatsapp).replace(/\D/g, '')
        const phone = digits.startsWith('55') ? '+' + digits : '+55' + digits
        fetch('https://api.manychat.com/fb/subscriber/findByPhone?phone=' + encodeURIComponent(phone), {
          headers: { Authorization: `Bearer ${manychatApiKey}` },
        }).then(async r => {
          const d = await r.json()
          const sid = d.data?.id
          if (sid) {
            await fetch('https://api.manychat.com/fb/subscriber/addTagByName', {
              method: 'POST',
              headers: { Authorization: `Bearer ${manychatApiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscriber_id: sid, tag_name: 'trial_ativo' }),
            })
          } else {
            await fetch('https://api.manychat.com/fb/subscriber/createSubscriber', {
              method: 'POST',
              headers: { Authorization: `Bearer ${manychatApiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone, email: normalizedEmail, has_opt_in_phone: true }),
            })
          }
        }).catch(() => {})
      }
    }

    return jsonResponse(req, {
      success: true,
      accessId,
      email: normalizedEmail,
      minutesRemaining: TRIAL_DURATION_MINUTES,
      secondsRemaining: 0,
    })
  } catch (err: any) {
    console.error('create-trial-access error:', err)
    return jsonResponse(req, { error: err.message || 'Erro interno' }, 500)
  }
})
