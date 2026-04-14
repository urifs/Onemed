import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

// ─── Normalização de telefone ──────────────────────────────────────────────────
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits
  if (digits.length === 10 || digits.length === 11) return '55' + digits
  if (digits.length >= 12 && digits.length <= 15) return digits
  return null
}

// ─── Faixas de data por tipo de audiência ─────────────────────────────────────
function getTrialDateRange(audience: string): { from: string | null; to: string | null } {
  const now = new Date()
  // Brasil = UTC-3 (sem horário de verão desde 2019)
  const BR_OFFSET = 3 * 60 * 60 * 1000
  const brazilNow = new Date(now.getTime() - BR_OFFSET)
  // Início do dia de hoje no horário de Brasília → convertido para UTC
  const todayStartBR = new Date(Date.UTC(
    brazilNow.getUTCFullYear(), brazilNow.getUTCMonth(), brazilNow.getUTCDate()
  ) + BR_OFFSET)

  const DAY = 24 * 60 * 60 * 1000

  switch (audience) {
    case 'trial_expired_today':
      return { from: todayStartBR.toISOString(), to: now.toISOString() }
    case 'trial_expired_yesterday':
      return {
        from: new Date(todayStartBR.getTime() - DAY).toISOString(),
        to: todayStartBR.toISOString(),
      }
    case 'trial_expired_3d':
      return { from: new Date(now.getTime() - 3 * DAY).toISOString(), to: now.toISOString() }
    case 'trial_expired_5d':
      return { from: new Date(now.getTime() - 5 * DAY).toISOString(), to: now.toISOString() }
    case 'trial_expired_7d':
      return { from: new Date(now.getTime() - 7 * DAY).toISOString(), to: now.toISOString() }
    case 'trial_expired_all':
    default:
      return { from: null, to: null }
  }
}

const TRIAL_EXPIRED_AUDIENCES = [
  'trial_expired_today',
  'trial_expired_yesterday',
  'trial_expired_3d',
  'trial_expired_5d',
  'trial_expired_7d',
  'trial_expired_all',
]

// ─── Buscar trials expirados com filtro de data ────────────────────────────────
async function fetchExpiredTrials(
  supabase: ReturnType<typeof createClient>,
  audience: string,
): Promise<{ whatsapp: string | null; email: string }[]> {
  const { from, to } = getTrialDateRange(audience)
  let query = supabase
    .from('accesses')
    .select('whatsapp, email')
    .eq('access_type', 'trial')
    .eq('status', 'expired')
    .not('whatsapp', 'is', null)

  if (from) query = query.gte('expires_at', from)
  if (to) query = query.lte('expires_at', to)

  const { data } = await query
  return data || []
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
    return { ok: false, error: data?.message || data?.error || JSON.stringify(data) }
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

    // ── Auth admin ───────────────────────────────────────────────────────────
    const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '')
    if (!jwt) return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt)
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    })

    const { data: roleData } = await supabase
      .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
    if (!roleData) return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
    })

    // ── Parse body ───────────────────────────────────────────────────────────
    const { audience, custom_numbers, message, delay_ms } = await req.json()
    if (!audience) return new Response(JSON.stringify({ error: 'audience obrigatório' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    })

    // ── Buscar destinatários ─────────────────────────────────────────────────
    type Recipient = { phone: string; email?: string }
    let recipients: Recipient[] = []

    if (audience === 'custom') {
      recipients = (custom_numbers || [])
        .filter(Boolean)
        .map((n: string) => ({ phone: n }))

    } else if (TRIAL_EXPIRED_AUDIENCES.includes(audience)) {
      const rows = await fetchExpiredTrials(supabase, audience)
      recipients = rows.map(r => ({ phone: r.whatsapp!, email: r.email }))

    } else if (audience === 'trial_active') {
      const { data } = await supabase.from('accesses').select('whatsapp, email')
        .eq('access_type', 'trial').eq('status', 'active').not('whatsapp', 'is', null)
      recipients = (data || []).map((r: { whatsapp: string | null; email: string }) => ({ phone: r.whatsapp!, email: r.email }))

    } else if (audience === 'buyers_approved') {
      const { data } = await supabase.from('buyers').select('whatsapp, email')
        .eq('status', 'approved').not('whatsapp', 'is', null)
      recipients = (data || []).map((r: { whatsapp: string | null; email: string }) => ({ phone: r.whatsapp!, email: r.email }))

    } else if (audience === 'buyers_all') {
      const { data } = await supabase.from('buyers').select('whatsapp, email').not('whatsapp', 'is', null)
      recipients = (data || []).map((r: { whatsapp: string | null; email: string }) => ({ phone: r.whatsapp!, email: r.email }))

    } else if (audience === 'all_with_whatsapp') {
      const [{ data: acc }, { data: buy }] = await Promise.all([
        supabase.from('accesses').select('whatsapp, email').not('whatsapp', 'is', null),
        supabase.from('buyers').select('whatsapp, email').not('whatsapp', 'is', null),
      ])
      recipients = [
        ...(acc || []).map((r: { whatsapp: string | null; email: string }) => ({ phone: r.whatsapp!, email: r.email })),
        ...(buy || []).map((r: { whatsapp: string | null; email: string }) => ({ phone: r.whatsapp!, email: r.email })),
      ]

    } else if (audience === 'preview') {
      // Preview: recebe o audience real em "message"
      const realAudience = message || 'trial_expired_all'
      let previewRows: { whatsapp: string | null; email?: string }[] = []

      if (realAudience === 'custom') {
        previewRows = (custom_numbers || []).filter(Boolean).map((n: string) => ({ whatsapp: n }))
      } else if (TRIAL_EXPIRED_AUDIENCES.includes(realAudience)) {
        previewRows = await fetchExpiredTrials(supabase, realAudience)
      } else if (realAudience === 'trial_active') {
        const { data } = await supabase.from('accesses').select('whatsapp').eq('access_type', 'trial').eq('status', 'active').not('whatsapp', 'is', null)
        previewRows = data || []
      } else if (realAudience === 'buyers_approved') {
        const { data } = await supabase.from('buyers').select('whatsapp').eq('status', 'approved').not('whatsapp', 'is', null)
        previewRows = data || []
      } else if (realAudience === 'buyers_all') {
        const { data } = await supabase.from('buyers').select('whatsapp').not('whatsapp', 'is', null)
        previewRows = data || []
      } else if (realAudience === 'all_with_whatsapp') {
        const [{ data: a }, { data: b }] = await Promise.all([
          supabase.from('accesses').select('whatsapp').not('whatsapp', 'is', null),
          supabase.from('buyers').select('whatsapp').not('whatsapp', 'is', null),
        ])
        previewRows = [...(a || []), ...(b || [])]
      }

      const phones = previewRows.map((r) => normalizePhone(r.whatsapp!)).filter(Boolean) as string[]
      const unique = [...new Set(phones)]
      return new Response(JSON.stringify({ preview: true, total: unique.length }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── Normalizar e deduplicar ──────────────────────────────────────────────
    const seen = new Map<string, string | undefined>() // phone → email
    const invalid: string[] = []
    for (const r of recipients) {
      const n = normalizePhone(r.phone)
      if (n) { if (!seen.has(n)) seen.set(n, r.email) }
      else invalid.push(r.phone)
    }

    if (!message?.trim() && audience !== 'preview') return new Response(
      JSON.stringify({ error: 'message é obrigatório' }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    )

    // ── Enviar ───────────────────────────────────────────────────────────────
    const delayMs = typeof delay_ms === 'number' ? Math.max(500, delay_ms) : 1500
    let sent = 0
    let failed = 0
    const errors: string[] = []
    const logsToInsert: Record<string, unknown>[] = []

    for (const [phone, email] of seen.entries()) {
      const result = await sendZApi(instanceId, zapiToken, phone, message.trim())

      if (result.ok) {
        sent++
        logsToInsert.push({ phone, email: email || null, status: 'sent', audience })
      } else {
        failed++
        errors.push(`${phone}: ${result.error}`)
        logsToInsert.push({ phone, email: email || null, status: 'failed', audience })
        console.error(`Z-API failed ${phone}:`, result.error)
      }

      // Gravar em lote a cada 50 para não acumular muito na memória
      if (logsToInsert.length >= 50) {
        await supabase.from('whatsapp_sends').insert([...logsToInsert])
        logsToInsert.length = 0
      }

      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    // Gravar logs restantes
    if (logsToInsert.length > 0) {
      await supabase.from('whatsapp_sends').insert(logsToInsert)
    }

    console.log(`send-whatsapp: sent=${sent} failed=${failed} invalid=${invalid.length}`)

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: seen.size, invalid: invalid.length, errors: errors.slice(0, 30) }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )

  } catch (err: unknown) {
    console.error('send-whatsapp error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
