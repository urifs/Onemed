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

const GOOGLE_CLIENT_ID = '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com'

// Comparação em tempo constante (mesmo padrão de drive-access-token) — evita
// side-channel de timing ao conferir a service_role key.
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
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase     = createClient(supabaseUrl, supabaseKey)

    // Proteção: aceita chamada interna (service role key, comparada em tempo
    // constante) OU JWT de admin via painel. Ausência de header NUNCA autoriza
    // — o webhook (mp-webhook) e o painel sempre mandam Authorization; o antigo
    // ramo "sem header = autorizado" deixava a função aberta a qualquer um.
    const authHeader = req.headers.get('Authorization') || ''
    let isAuthorized = false

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      // Chamada interna com service role key (tempo constante)
      if (await secureCompare(token, supabaseKey)) {
        isAuthorized = true
      } else {
        // JWT de admin via painel
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (!error && user) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle()
          if (roleData) isAuthorized = true
        }
      }
    }

    if (!isAuthorized) {
      console.error('drive-share-folder: chamada não autorizada rejeitada')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const { email, accessId, folderType } = await req.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // 'backup' é a pasta de backup exclusivo (planos Vitalício Plus/Pro),
    // separada da pasta de streaming das aulas usada por padrão.
    const isBackup = folderType === 'backup'

    // Get drive config
    const { data: config, error } = await supabase.from('drive_config').select('*').single()
    if (error || !config?.connected) {
      return new Response(JSON.stringify({ error: 'Google Drive não conectado' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    let accessToken = config.access_token
    const expiry    = config.token_expiry ? new Date(config.token_expiry) : null

    // Refresh token if expired
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

    const folderId = isBackup ? config.backup_folder_id : config.folder_id
    if (!folderId) {
      return new Response(JSON.stringify({ error: isBackup ? 'Nenhuma pasta de backup configurada' : 'Nenhuma pasta configurada' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // Share folder with user
    const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'user',
        emailAddress: email,
        sendNotificationEmail: false,
      }),
    })

    if (!permRes.ok) {
      const err = await permRes.json()
      console.error('Drive share error:', err)
      return new Response(JSON.stringify({ error: err.error?.message || 'Erro ao compartilhar' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const perm = await permRes.json()

    // Update access record with permission ID for later revocation
    if (accessId) {
      await supabase.from('accesses').update(
        isBackup
          ? { drive_backup_permission_id: perm.id }
          : { drive_folder_id: folderId, drive_folder_name: config.folder_name, drive_permission_id: perm.id, status: 'active' }
      ).eq('id', accessId)
    }

    return new Response(JSON.stringify({ success: true, permissionId: perm.id }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
