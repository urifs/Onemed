// ─────────────────────────────────────────────────────────────────────────────
// OneMed · drive-folder-permissions
// Admin-only tool: given a Google Drive folder link (or raw ID), lists every
// email that currently has access to it, using the same OAuth connection
// already stored in drive_config (no separate Drive login needed).
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
const GOOGLE_CLIENT_ID = '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com'

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

// Accepts a full Drive URL (folders/ID, ?id=ID, open?id=ID) or a bare ID.
function extractFolderId(input: string): string | null {
  const trimmed = input.trim()
  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ]
  for (const re of patterns) {
    const m = trimmed.match(re)
    if (m) return m[1]
  }
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    if (!jwt) return jsonResponse(req, { error: 'Não autenticado' }, 401)
    const { data: userData } = await supabase.auth.getUser(jwt)
    if (!userData?.user) return jsonResponse(req, { error: 'Sessão inválida' }, 401)
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' })
    if (!isAdmin) return jsonResponse(req, { error: 'Acesso restrito a administradores' }, 403)

    const { link } = await req.json().catch(() => ({}))
    const folderId = link ? extractFolderId(String(link)) : null
    if (!folderId) return jsonResponse(req, { error: 'Não foi possível identificar o ID da pasta nesse link' }, 400)

    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
    const { data: config, error: cfgErr } = await supabase.from('drive_config').select('*').single()
    if (cfgErr || !config?.connected) return jsonResponse(req, { error: 'Google Drive não conectado' }, 502)

    let accessToken = config.access_token
    const expiry = config.token_expiry ? new Date(config.token_expiry) : null
    if (!expiry || expiry < new Date()) {
      if (!config.refresh_token) return jsonResponse(req, { error: 'Token do Drive expirado. Reconecte em /admin/drive.' }, 502)
      accessToken = await refreshAccessToken(config.refresh_token, GOOGLE_CLIENT_SECRET)
      await supabase.from('drive_config').update({
        access_token: accessToken, token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      }).eq('id', config.id)
    }

    // Confirm the folder is reachable / grab its name for the response.
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!metaRes.ok) {
      const text = await metaRes.text().catch(() => '')
      console.error('Drive file metadata error', metaRes.status, text)
      return jsonResponse(req, { error: metaRes.status === 404 ? 'Pasta não encontrada (ou sem acesso)' : 'Erro ao consultar o Drive' }, metaRes.status === 404 ? 404 : 502)
    }
    const meta = await metaRes.json()

    const emails: string[] = []
    let pageToken: string | undefined
    do {
      const params = new URLSearchParams({
        fields: 'nextPageToken, permissions(emailAddress,role,type)',
        supportsAllDrives: 'true',
        pageSize: '100',
      })
      if (pageToken) params.set('pageToken', pageToken)
      const permRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${folderId}/permissions?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      if (!permRes.ok) {
        const text = await permRes.text().catch(() => '')
        console.error('Drive permissions error', permRes.status, text)
        return jsonResponse(req, { error: 'Erro ao listar as permissões da pasta' }, 502)
      }
      const permData = await permRes.json()
      for (const p of permData.permissions || []) {
        if (p.type === 'user' && p.role !== 'owner' && p.emailAddress) emails.push(p.emailAddress.toLowerCase())
      }
      pageToken = permData.nextPageToken
    } while (pageToken)

    const uniqueEmails = [...new Set(emails)].sort()
    return jsonResponse(req, { folderName: meta.name, emails: uniqueEmails })
  } catch (err: any) {
    console.error(err)
    return jsonResponse(req, { error: err.message }, 500)
  }
})
