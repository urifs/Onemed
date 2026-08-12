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
      .select('drive_file_id, mime_type, type, title, course_id').eq('id', claims.lid).maybeSingle()
    if (lessonErr || !lesson) return new Response('Lesson not found', { status: 404, headers: corsHeaders() })

    // The token stays valid for 4h so a long study session doesn't get cut
    // off mid-lecture, but that also means a revoked/expired account could
    // otherwise keep streaming for up to 4h after losing access. Re-check
    // entitlement live on every request instead of trusting the token alone.
    const { data: userRow, error: userErr } = await supabase.auth.admin.getUserById(claims.uid)
    if (userErr || !userRow?.user?.email) return new Response('Invalid session', { status: 401, headers: corsHeaders() })
    const email = userRow.user.email.toLowerCase()
    const [{ data: activeAccess }, { data: buyer }, { data: isAdmin }] = await Promise.all([
      // expires_at indispensável (mesmo motivo do member-lesson-token): trial
      // vencido não pode continuar puxando bytes até o cron de revogação rodar.
      supabase.from('accesses').select('id').eq('email', email).eq('status', 'active')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).limit(1).maybeSingle(),
      supabase.from('buyers').select('id').eq('email', email).eq('access_granted', true).limit(1).maybeSingle(),
      supabase.rpc('has_role', { _user_id: claims.uid, _role: 'admin' }),
    ])
    if (!activeAccess && !buyer && !isAdmin) return new Response('Access revoked', { status: 403, headers: corsHeaders() })

    // Curso restrito a plano: mesma checagem do member-lesson-token, refeita
    // aqui porque o token dura 4h e o acesso ao curso pode ter sido removido
    // (plano rebaixado, grant revogado) depois que ele foi emitido.
    if (!isAdmin && lesson.course_id) {
      const { data: podeVer } = await supabase.rpc('can_access_course_email', {
        _course_id: lesson.course_id, _email: email,
      })
      if (podeVer === false) {
        return new Response('Este conteúdo não está incluído no seu plano.', { status: 403, headers: corsHeaders() })
      }
    }

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

    const range = req.headers.get('range')
    const metodo = req.method === 'HEAD' ? 'GET' : req.method

    // ── DUAS contas de leitura ────────────────────────────────────────────
    // O `downloadQuotaExceeded` do Google acompanha a conta que PEDE, não o
    // arquivo (medido: mesmo arquivo, mesmo instante, 403 numa conta e 206 na
    // outra). A conta de conteúdo ficou com o download restringido; a de
    // armazenamento tem leitura das mesmas pastas e assume. Mesma ordem do
    // Worker de streaming: armazenamento primeiro, conteúdo como reserva.
    const tokensLeitura: string[] = []
    try {
      const st = await fetch(`${supabaseUrl}/functions/v1/drive-storage-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (st.ok) {
        const { accessToken: t } = await st.json()
        if (t) tokensLeitura.push(t)
      }
    } catch { /* segue com a conta de conteúdo */ }
    tokensLeitura.push(accessToken)

    let driveRes: Response | null = null
    for (const tok of tokensLeitura) {
      const driveHeaders: Record<string, string> = { Authorization: `Bearer ${tok}` }
      if (range) driveHeaders['Range'] = range
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${lesson.drive_file_id}?alt=media`,
        { method: metodo, headers: driveHeaders },
      )
      if (res.ok || res.status === 206) { driveRes = res; break }
      const text = await res.text().catch(() => '')
      console.error('Drive stream error', res.status, text)
      // 403 (cota da conta) e 404 (sem acesso) mandam tentar a próxima conta.
      if (res.status !== 403 && res.status !== 404) {
        return new Response('Upstream error', { status: 502, headers: corsHeaders() })
      }
      driveRes = null
    }
    if (!driveRes) return new Response('Upstream error', { status: 502, headers: corsHeaders() })

    const outHeaders = new Headers(corsHeaders())
    outHeaders.set('Content-Type', lesson.mime_type || driveRes.headers.get('content-type') || 'application/octet-stream')
    outHeaders.set('Accept-Ranges', 'bytes')
    outHeaders.set('Cache-Control', 'private, max-age=3600')
    const contentRange = driveRes.headers.get('content-range')
    if (contentRange) outHeaders.set('Content-Range', contentRange)
    const contentLength = driveRes.headers.get('content-length')
    if (contentLength) outHeaders.set('Content-Length', contentLength)
    if (contentLength) {
      supabase.rpc('record_egress', { _source: 'member-stream-file', _bytes: Number(contentLength) }).then(() => {}).catch(() => {})
    }
    // HTTP header values must stay ASCII — course titles are Portuguese and
    // routinely carry accents ("Questões", "Inéditas"), which silently
    // dropped this whole header (no error, just missing from the response).
    // Without Content-Disposition the browser fell back to treating the PDF
    // as a generic download instead of rendering it inline in the iframe.
    // Keep a sanitized ASCII filename for older clients and add the RFC 5987
    // UTF-8 form for everyone else.
    const rawName = lesson.title || 'arquivo'
    const asciiName = rawName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, "'")
    const encodedName = encodeURIComponent(rawName)
    outHeaders.set('Content-Disposition', `inline; filename="${asciiName}"; filename*=UTF-8''${encodedName}`)

    if (req.method === 'HEAD') {
      return new Response(null, { status: driveRes.status, headers: outHeaders })
    }

    return new Response(driveRes.body, { status: driveRes.status, headers: outHeaders })
  } catch (err: any) {
    console.error(err)
    return new Response('Internal error', { status: 500, headers: corsHeaders() })
  }
})
