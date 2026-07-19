// ─────────────────────────────────────────────────────────────────────────────
// OneMed · member-stream-file
// Verifies a signed member-lesson-token, then proxies the Drive file bytes
// straight through — including Range requests, so the native <video> element
// can seek, and PDFs render inline in an <iframe>. The student never sees
// Google Drive; only this URL, on our own domain.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_CLIENT_ID = '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'range, content-type',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Expose-Headers': 'content-range, content-length, accept-ranges',
  }
}

function b64urlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4)
  return atob(padded)
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() })

  try {
    const SECRET = Deno.env.get('MEMBER_STREAM_SECRET')!
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const url = new URL(req.url)
    const token = url.searchParams.get('token') || ''
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return new Response('Invalid token', { status: 401, headers: corsHeaders() })

    const expectedSig = await hmacHex(SECRET, payload)
    if (sig !== expectedSig) return new Response('Invalid signature', { status: 401, headers: corsHeaders() })

    let claims: { lid: string; uid: string; exp: number }
    try { claims = JSON.parse(b64urlDecode(payload)) } catch { return new Response('Malformed token', { status: 401, headers: corsHeaders() }) }
    if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) {
      return new Response('Token expired', { status: 401, headers: corsHeaders() })
    }

    const { data: lesson, error: lessonErr } = await supabase.from('lessons')
      .select('drive_file_id, mime_type, type, title').eq('id', claims.lid).maybeSingle()
    if (lessonErr || !lesson) return new Response('Lesson not found', { status: 404, headers: corsHeaders() })

    const { data: config, error: cfgErr } = await supabase.from('drive_config').select('*').single()
    if (cfgErr || !config?.connected) return new Response('Drive not connected', { status: 502, headers: corsHeaders() })

    let accessToken = config.access_token
    const expiry = config.token_expiry ? new Date(config.token_expiry) : null
    if (!expiry || expiry < new Date()) {
      if (!config.refresh_token) return new Response('Drive token expired', { status: 502, headers: corsHeaders() })
      accessToken = await refreshAccessToken(config.refresh_token, GOOGLE_CLIENT_SECRET)
      await supabase.from('drive_config').update({
        access_token: accessToken, token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      }).eq('id', config.id)
    }

    const driveHeaders: Record<string, string> = { Authorization: `Bearer ${accessToken}` }
    const range = req.headers.get('range')
    if (range) driveHeaders['Range'] = range

    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${lesson.drive_file_id}?alt=media`,
      { method: req.method === 'HEAD' ? 'GET' : req.method, headers: driveHeaders },
    )

    if (!driveRes.ok && driveRes.status !== 206) {
      const text = await driveRes.text().catch(() => '')
      console.error('Drive stream error', driveRes.status, text)
      return new Response('Upstream error', { status: driveRes.status === 404 ? 404 : 502, headers: corsHeaders() })
    }

    const outHeaders = new Headers(corsHeaders())
    outHeaders.set('Content-Type', lesson.mime_type || driveRes.headers.get('content-type') || 'application/octet-stream')
    outHeaders.set('Accept-Ranges', 'bytes')
    outHeaders.set('Cache-Control', 'private, max-age=3600')
    const contentRange = driveRes.headers.get('content-range')
    if (contentRange) outHeaders.set('Content-Range', contentRange)
    const contentLength = driveRes.headers.get('content-length')
    if (contentLength) outHeaders.set('Content-Length', contentLength)
    outHeaders.set('Content-Disposition', `inline; filename="${(lesson.title || 'arquivo').replace(/"/g, "'")}"`)

    if (req.method === 'HEAD') {
      return new Response(null, { status: driveRes.status, headers: outHeaders })
    }

    return new Response(driveRes.body, { status: driveRes.status, headers: outHeaders })
  } catch (err: any) {
    console.error(err)
    return new Response('Internal error', { status: 500, headers: corsHeaders() })
  }
})
