import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
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
  if (!res.ok || !data.access_token) {
    throw new Error('Failed to refresh Google token: ' + JSON.stringify(data))
  }
  return data.access_token as string
}

// ─── CONSTANT-TIME COMPARE ───────────────────────────────────────────────────
async function secureCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode('timing-safe-compare'),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, encoder.encode(a)),
    crypto.subtle.sign('HMAC', key, encoder.encode(b)),
  ])
  const a8 = new Uint8Array(sigA)
  const b8 = new Uint8Array(sigB)
  let diff = 0
  for (let i = 0; i < 32; i++) diff |= a8[i] ^ b8[i]
  return diff === 0
}

type Access = {
  id: string
  email: string
  whatsapp: string | null
  drive_folder_id: string | null
  drive_permission_id: string | null
  expires_at: string | null
}

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null
  if (phone.trim().startsWith('+')) return phone.trim()
  if (digits.length === 10 || digits.length === 11) return '+55' + digits
  if (digits.length >= 12) return '+' + digits
  return '+55' + digits
}

async function syncToManychat(whatsapp: string, apiKey: string): Promise<void> {
  const normalized = normalizePhone(whatsapp)
  if (!normalized) return
  try {
    await fetch('https://api.manychat.com/fb/subscriber/createByPhone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: normalized }),
    })
  } catch (e: any) {
    console.error('Manychat sync error:', e.message)
  }
}

// Revoga uma única permissão no Google Drive (retorna true se OK ou 404).
async function revokeDrivePermission(
  folderId: string,
  permissionId: string,
  accessToken: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}/permissions/${permissionId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (res.ok || res.status === 404) return { ok: true }
  const err = await res.json().catch(() => ({}))
  return { ok: false, error: err?.error?.message || `HTTP ${res.status}` }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase    = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

    // Parse body (pode ser {} para modo cron, ou { accessId, finalStatus } para admin)
    let body: { accessId?: string; finalStatus?: 'revoked' | 'expired' } = {}
    if (req.method !== 'GET') {
      try { body = await req.json() } catch { body = {} }
    }

    const singleMode = Boolean(body.accessId)

    // ── Autorização ──────────────────────────────────────────────────────────
    // Modo admin (singleMode): exige service role key OU JWT de admin
    // Modo cron (batch):       exige x-cron-secret = CRON_SECRET (quando configurado)
    if (singleMode) {
      const authHeader = req.headers.get('Authorization') || ''
      let authorized = false
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '')
        if (await secureCompare(token, supabaseKey)) {
          authorized = true
        } else {
          const { data: { user } } = await supabase.auth.getUser(token)
          if (user) {
            const { data: role } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)
              .eq('role', 'admin')
              .maybeSingle()
            if (role) authorized = true
          }
        }
      }
      if (!authorized) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        })
      }
    } else {
      const cronSecret = Deno.env.get('CRON_SECRET')
      if (cronSecret) {
        const provided = req.headers.get('x-cron-secret') || ''
        if (!(await secureCompare(provided, cronSecret))) {
          console.error('drive-revoke-access: x-cron-secret inválido')
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          })
        }
      }
    }

    // ── Buscar os acessos a revogar ──────────────────────────────────────────
    let targets: Access[] = []

    if (singleMode) {
      const { data, error } = await supabase
        .from('accesses')
        .select('id, email, whatsapp, drive_folder_id, drive_permission_id, expires_at')
        .eq('id', body.accessId!)
        .maybeSingle()
      if (error) throw error
      if (!data) {
        return new Response(JSON.stringify({ error: 'Acesso não encontrado' }), {
          status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        })
      }
      targets = [data as Access]
    } else {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('accesses')
        .select('id, email, whatsapp, drive_folder_id, drive_permission_id, expires_at')
        .eq('access_type', 'trial')
        .eq('status', 'active')
        .lte('expires_at', now)
        // Lote limitado: depois de um backlog (cron parado, Drive fora), o
        // lote sem teto estourava o tempo de execução e morria no meio. O
        // cron roda a cada 5 min — os mais antigos primeiro, o resto fica
        // pras próximas rodadas.
        .order('expires_at', { ascending: true })
        .limit(300)
      if (error) throw error
      targets = (data || []) as Access[]
    }

    if (targets.length === 0) {
      return new Response(JSON.stringify({ revoked: 0, markedExpired: 0 }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // ── Preparar token do Google Drive (só se algum target tiver perm_id) ───
    const needsDrive = targets.some(t => t.drive_permission_id)
    let accessToken: string | null = null
    let fallbackFolderId: string | null = null
    let driveAvailable = false

    if (needsDrive) {
      const { data: config } = await supabase.from('drive_config').select('*').maybeSingle()
      if (config?.connected && config.folder_id) {
        fallbackFolderId = config.folder_id
        accessToken = config.access_token
        const expiry = config.token_expiry ? new Date(config.token_expiry) : null
        if (!expiry || expiry < new Date()) {
          if (config.refresh_token) {
            try {
              const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
              accessToken = await refreshAccessToken(config.refresh_token, GOOGLE_CLIENT_SECRET)
              await supabase.from('drive_config').update({
                access_token: accessToken,
                token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
              }).eq('id', config.id)
            } catch (e: any) {
              console.error('Refresh token failed:', e.message)
            }
          }
        }
        driveAvailable = Boolean(accessToken)
      }
    }

    // ── Processar cada acesso ───────────────────────────────────────────────
    const finalStatus = singleMode ? (body.finalStatus || 'revoked') : 'expired'
    const manychatKey = Deno.env.get('MANYCHAT_API_KEY')
    let revoked = 0
    let markedExpired = 0
    const errors: string[] = []

    for (const t of targets) {
      const folderId = t.drive_folder_id || fallbackFolderId

      if (t.drive_permission_id && folderId && driveAvailable && accessToken) {
        const res = await revokeDrivePermission(folderId, t.drive_permission_id, accessToken)
        if (res.ok) {
          revoked++
        } else {
          errors.push(`${t.email}: ${res.error}`)
        }
      } else if (t.drive_permission_id) {
        // Existe perm mas Drive está indisponível — não zeramos perm_id
        // para que a próxima execução tente novamente.
        errors.push(`${t.email}: Drive indisponível, mantendo perm_id para retry`)
        continue
      } else {
        markedExpired++
      }

      await supabase
        .from('accesses')
        .update({ status: finalStatus, drive_permission_id: null })
        .eq('id', t.id)

      // Sincroniza com Manychat (fire-and-forget, só em expiração de cron)
      if (!singleMode && t.whatsapp && manychatKey) {
        syncToManychat(t.whatsapp, manychatKey)
      }
    }

    const payload = singleMode
      ? { success: true, accessId: body.accessId, revoked, markedExpired, errors }
      : { revoked, markedExpired, errors }

    return new Response(JSON.stringify(payload), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('drive-revoke-access error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
