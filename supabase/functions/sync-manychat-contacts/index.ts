import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

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

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null
  if (phone.trim().startsWith('+')) return phone.trim()
  // Brazilian numbers: 10-11 digits without country code
  if (digits.length === 10 || digits.length === 11) return '+55' + digits
  // Already has country code (12-13 digits)
  if (digits.length >= 12) return '+' + digits
  return '+55' + digits
}

async function createManychatContact(phone: string, apiKey: string): Promise<{ ok: boolean; error?: string }> {
  const normalized = normalizePhone(phone)
  if (!normalized) return { ok: false, error: 'Número inválido: ' + phone }

  try {
    const res = await fetch('https://api.manychat.com/fb/subscriber/createByPhone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: normalized }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok || res.status === 409) return { ok: true }
    return { ok: false, error: data?.message || `HTTP ${res.status}` }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  const corsHeaders = getCorsHeaders(req)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const manychatKey = Deno.env.get('MANYCHAT_API_KEY')

    if (!manychatKey) {
      return new Response(JSON.stringify({ error: 'MANYCHAT_API_KEY não configurado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Exige autenticação admin
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    let authorized = false

    if (await secureCompare(token, supabaseKey)) {
      authorized = true
    } else {
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        const { data: role } = await supabase
          .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
        if (role) authorized = true
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Busca todos os trials expirados com whatsapp
    const { data: trials, error } = await supabase
      .from('accesses')
      .select('id, email, whatsapp')
      .eq('access_type', 'trial')
      .eq('status', 'expired')
      .not('whatsapp', 'is', null)
      .neq('whatsapp', '')

    if (error) throw error

    if (!trials || trials.length === 0) {
      return new Response(JSON.stringify({ synced: 0, failed: 0, errors: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let synced = 0
    let failed = 0
    const errors: string[] = []

    for (const trial of trials) {
      const result = await createManychatContact(trial.whatsapp, manychatKey)
      if (result.ok) {
        synced++
      } else {
        failed++
        errors.push(`${trial.email}: ${result.error}`)
      }
    }

    return new Response(JSON.stringify({ synced, failed, total: trials.length, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('sync-manychat-contacts error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
