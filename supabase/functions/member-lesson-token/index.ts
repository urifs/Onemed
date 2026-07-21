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

// Caps how many *different* lessons one account can open in a window — a
// real student opens one lesson at a time; a script scraping the library
// requests hundreds/thousands of distinct lessonIds in minutes. This is the
// actual choke point: it doesn't touch the Range-request volume a single
// video naturally generates while seeking/buffering (that's rate-limited
// nowhere, on purpose — it would break normal playback).
async function checkTokenRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  // Reduzido de 20 pra 6/10min em 2026-07-21 — mesmo com o limite de 20,
  // uma conta sozinha batendo o teto o dia todo ainda dava pra explicar
  // ~140GB/dia de egress (20 arquivos/10min × ~50MB médio × 144 janelas
  // de 10min/dia). 6/10min ainda é folgado pra navegação humana normal
  // (ninguém abre uma aula nova a cada <100s por 10 minutos seguidos).
  const maxAttempts = 6
  const windowMs = 10 * 60 * 1000
  const now = new Date()

  const { data: existing } = await supabase
    .from('rate_limits')
    .select('attempts, window_start')
    .eq('identifier', userId)
    .eq('action', 'lesson_token')
    .maybeSingle()

  if (!existing || (now.getTime() - new Date(existing.window_start).getTime()) > windowMs) {
    await supabase.from('rate_limits').upsert(
      { identifier: userId, action: 'lesson_token', attempts: 1, window_start: now.toISOString() },
      { onConflict: 'identifier,action' },
    )
    return { allowed: true }
  }

  if (existing.attempts >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((new Date(existing.window_start).getTime() + windowMs - now.getTime()) / 1000)
    return { allowed: false, retryAfterSeconds }
  }

  await supabase.from('rate_limits').update({ attempts: existing.attempts + 1 })
    .eq('identifier', userId).eq('action', 'lesson_token')
  return { allowed: true }
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

    if (!isAdmin) {
      const rl = await checkTokenRateLimit(supabase, user.id)
      if (!rl.allowed) {
        return jsonResponse(req, {
          error: 'Muitas aulas abertas em pouco tempo. Aguarde alguns minutos.',
          retryAfterSeconds: rl.retryAfterSeconds,
        }, 429)
      }
    }

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
