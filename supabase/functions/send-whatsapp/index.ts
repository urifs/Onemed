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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

// ─── Normalização de telefone ──────────────────────────────────────────────────
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  // Com código Brasil (55) + DDD + número = 12 ou 13 dígitos
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits
  // Só DDD + número = 10 ou 11 dígitos → adiciona 55
  if (digits.length === 10 || digits.length === 11) return '55' + digits
  // Internacional com outro código de país
  if (digits.length >= 12 && digits.length <= 15) return digits
  return null
}

// ─── Envio via Z-API ───────────────────────────────────────────────────────────
async function sendZApi(
  instanceId: string,
  token: string,
  phone: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message }),
      },
    )
    const data = await res.json()
    if (res.ok && (data.zaapId || data.messageId || data.id)) return { ok: true }
    const msg = data?.message || data?.error || JSON.stringify(data)
    return { ok: false, error: msg }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

// ─── Handler principal ─────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  const cors = getCorsHeaders(req)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const instanceId = Deno.env.get('ZAPI_INSTANCE_ID')!
    const zapiToken = Deno.env.get('ZAPI_TOKEN')!

    // ── Autenticação admin ───────────────────────────────────────────────────
    const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '')
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── Parse body ───────────────────────────────────────────────────────────
    const {
      audience,        // 'trial_expired' | 'trial_active' | 'buyers_approved' | 'buyers_all' | 'all_with_whatsapp' | 'custom' | 'preview'
      custom_numbers,  // string[] — lista avulsa
      message,         // string — texto da mensagem (suporta *negrito*, _itálico_)
      delay_ms,        // number — delay entre envios (default 1500ms)
    } = await req.json()

    if (!audience) {
      return new Response(JSON.stringify({ error: 'audience é obrigatório' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── Buscar destinatários ─────────────────────────────────────────────────
    let rawNumbers: string[] = []

    if (audience === 'custom') {
      rawNumbers = (custom_numbers || []).filter(Boolean)
    } else if (audience !== 'preview') {
      if (audience === 'trial_expired') {
        const { data } = await supabase
          .from('accesses')
          .select('whatsapp')
          .eq('access_type', 'trial')
          .eq('status', 'expired')
          .not('whatsapp', 'is', null)
        rawNumbers = (data || []).map((r: { whatsapp: string | null }) => r.whatsapp!).filter(Boolean)

      } else if (audience === 'trial_active') {
        const { data } = await supabase
          .from('accesses')
          .select('whatsapp')
          .eq('access_type', 'trial')
          .eq('status', 'active')
          .not('whatsapp', 'is', null)
        rawNumbers = (data || []).map((r: { whatsapp: string | null }) => r.whatsapp!).filter(Boolean)

      } else if (audience === 'buyers_approved') {
        const { data } = await supabase
          .from('buyers')
          .select('whatsapp')
          .eq('status', 'approved')
          .not('whatsapp', 'is', null)
        rawNumbers = (data || []).map((r: { whatsapp: string | null }) => r.whatsapp!).filter(Boolean)

      } else if (audience === 'buyers_all') {
        const { data } = await supabase
          .from('buyers')
          .select('whatsapp')
          .not('whatsapp', 'is', null)
        rawNumbers = (data || []).map((r: { whatsapp: string | null }) => r.whatsapp!).filter(Boolean)

      } else if (audience === 'all_with_whatsapp') {
        const [{ data: accData }, { data: buyData }] = await Promise.all([
          supabase.from('accesses').select('whatsapp').not('whatsapp', 'is', null),
          supabase.from('buyers').select('whatsapp').not('whatsapp', 'is', null),
        ])
        rawNumbers = [
          ...(accData || []).map((r: { whatsapp: string | null }) => r.whatsapp!),
          ...(buyData || []).map((r: { whatsapp: string | null }) => r.whatsapp!),
        ].filter(Boolean)
      }
    }

    // ── Preview: retorna apenas a contagem ───────────────────────────────────
    if (audience === 'preview') {
      const previewAudience = custom_numbers ? 'custom' : (message || 'trial_expired')
      let previewRaw: string[] = []

      if (previewAudience === 'custom') {
        previewRaw = (custom_numbers || []).filter(Boolean)
      } else {
        // Reusar a lógica de fetch com o audience real passado em message (campo reaproveitado)
        const aud = message // campo reaproveitado para passar o audience real no preview
        if (aud === 'trial_expired') {
          const { data } = await supabase.from('accesses').select('whatsapp').eq('access_type', 'trial').eq('status', 'expired').not('whatsapp', 'is', null)
          previewRaw = (data || []).map((r: { whatsapp: string | null }) => r.whatsapp!).filter(Boolean)
        } else if (aud === 'trial_active') {
          const { data } = await supabase.from('accesses').select('whatsapp').eq('access_type', 'trial').eq('status', 'active').not('whatsapp', 'is', null)
          previewRaw = (data || []).map((r: { whatsapp: string | null }) => r.whatsapp!).filter(Boolean)
        } else if (aud === 'buyers_approved') {
          const { data } = await supabase.from('buyers').select('whatsapp').eq('status', 'approved').not('whatsapp', 'is', null)
          previewRaw = (data || []).map((r: { whatsapp: string | null }) => r.whatsapp!).filter(Boolean)
        } else if (aud === 'buyers_all') {
          const { data } = await supabase.from('buyers').select('whatsapp').not('whatsapp', 'is', null)
          previewRaw = (data || []).map((r: { whatsapp: string | null }) => r.whatsapp!).filter(Boolean)
        } else if (aud === 'all_with_whatsapp') {
          const [{ data: a }, { data: b }] = await Promise.all([
            supabase.from('accesses').select('whatsapp').not('whatsapp', 'is', null),
            supabase.from('buyers').select('whatsapp').not('whatsapp', 'is', null),
          ])
          previewRaw = [...(a || []).map((r: { whatsapp: string | null }) => r.whatsapp!), ...(b || []).map((r: { whatsapp: string | null }) => r.whatsapp!)].filter(Boolean)
        }
      }

      const normalized = previewRaw.map(normalizePhone).filter(Boolean) as string[]
      const unique = [...new Set(normalized)]
      return new Response(JSON.stringify({ preview: true, total: unique.length }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'message é obrigatório' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── Normalizar e deduplicar números ──────────────────────────────────────
    const normalized: string[] = []
    const invalidNumbers: string[] = []
    for (const raw of rawNumbers) {
      const n = normalizePhone(raw)
      if (n) normalized.push(n)
      else invalidNumbers.push(raw)
    }
    const uniqueNumbers = [...new Set(normalized)]

    // ── Enviar mensagens ─────────────────────────────────────────────────────
    const delayMs = typeof delay_ms === 'number' ? delay_ms : 1500
    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const phone of uniqueNumbers) {
      const result = await sendZApi(instanceId, zapiToken, phone, message.trim())

      if (result.ok) {
        sent++
      } else {
        failed++
        errors.push(`${phone}: ${result.error}`)
        console.error(`Z-API send failed for ${phone}:`, result.error)
      }

      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    console.log(`send-whatsapp (Z-API): sent=${sent}, failed=${failed}, invalid=${invalidNumbers.length}`)

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        total: uniqueNumbers.length,
        invalid: invalidNumbers.length,
        errors: errors.slice(0, 30),
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )

  } catch (err: unknown) {
    console.error('send-whatsapp error:', err)
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
