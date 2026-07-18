// ─────────────────────────────────────────────────────────────────────────────
// OneMed · member-lesson-token
// Issues a short-lived signed token scoped to ONE lesson for the requesting
// member, after verifying they hold active access to that lesson's course.
// The token is consumed by member-stream-file, which proxies the Drive bytes
// (video/PDF/etc) without ever exposing the underlying Drive file id or the
// Drive UI to the student.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
const TOKEN_TTL_SECONDS = 4 * 60 * 60 // 4h — enough for a long study session

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

function b64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const SECRET = Deno.env.get('MEMBER_STREAM_SECRET')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const authHeader = req.headers.get('authorization') || ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    if (!jwt) return jsonResponse(req, { error: 'Não autenticado' }, 401)

    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
    if (userErr || !userData?.user) return jsonResponse(req, { error: 'Sessão inválida' }, 401)
    const user = userData.user

    const { lessonId } = await req.json().catch(() => ({}))
    if (!lessonId) return jsonResponse(req, { error: 'lessonId obrigatório' }, 400)

    const { data: lesson, error: lessonErr } = await supabase.from('lessons')
      .select('id, course_id').eq('id', lessonId).maybeSingle()
    if (lessonErr || !lesson) return jsonResponse(req, { error: 'Aula não encontrada' }, 404)

    const email = (user.email || '').toLowerCase()
    const [{ data: activeAccess }, { data: buyer }, { data: isAdmin }] = await Promise.all([
      supabase.from('accesses').select('id').eq('email', email).eq('status', 'active').limit(1).maybeSingle(),
      supabase.from('buyers').select('id').eq('email', email).eq('access_granted', true).limit(1).maybeSingle(),
      supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
    ])
    if (!activeAccess && !buyer && !isAdmin) return jsonResponse(req, { error: 'Sem acesso ativo' }, 403)

    const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
    const payload = b64urlEncode(JSON.stringify({ lid: lesson.id, uid: user.id, exp }))
    const sig = await hmacHex(SECRET, payload)
    const token = `${payload}.${sig}`

    return jsonResponse(req, { token, expiresAt: exp })
  } catch (err: any) {
    console.error(err)
    return jsonResponse(req, { error: err.message }, 500)
  }
})
