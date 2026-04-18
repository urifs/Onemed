import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits
  if (digits.length === 10 || digits.length === 11) return '55' + digits
  if (digits.length >= 12 && digits.length <= 15) return digits
  return null
}

function getTrialDateRange(audience: string): { from: string | null; to: string | null } {
  const now = new Date()
  const BR_OFFSET = 3 * 60 * 60 * 1000
  const brazilNow = new Date(now.getTime() - BR_OFFSET)
  const todayStartBR = new Date(
    Date.UTC(brazilNow.getUTCFullYear(), brazilNow.getUTCMonth(), brazilNow.getUTCDate()) + BR_OFFSET
  )
  const DAY = 24 * 60 * 60 * 1000
  switch (audience) {
    case 'trial_expired_today':     return { from: todayStartBR.toISOString(), to: now.toISOString() }
    case 'trial_expired_yesterday': return { from: new Date(todayStartBR.getTime() - DAY).toISOString(), to: todayStartBR.toISOString() }
    case 'trial_expired_3d':        return { from: new Date(now.getTime() - 3 * DAY).toISOString(), to: now.toISOString() }
    case 'trial_expired_5d':        return { from: new Date(now.getTime() - 5 * DAY).toISOString(), to: now.toISOString() }
    case 'trial_expired_7d':        return { from: new Date(now.getTime() - 7 * DAY).toISOString(), to: now.toISOString() }
    default:                        return { from: null, to: null }
  }
}

const TRIAL_EXPIRED_AUDIENCES = [
  'trial_expired_today','trial_expired_yesterday','trial_expired_3d',
  'trial_expired_5d','trial_expired_7d','trial_expired_all',
]

async function fetchRecipients(
  supabase: ReturnType<typeof createClient>,
  audience: string,
): Promise<{ phone: string; email: string }[]> {
  if (TRIAL_EXPIRED_AUDIENCES.includes(audience)) {
    const { from, to } = getTrialDateRange(audience)
    let q = supabase.from('accesses').select('whatsapp, email')
      .eq('access_type', 'trial').eq('status', 'expired').not('whatsapp', 'is', null)
    if (from) q = q.gte('expires_at', from)
    if (to)   q = q.lte('expires_at', to)
    const { data } = await q
    return (data || []).map((r: any) => ({ phone: r.whatsapp, email: r.email }))
  }
  if (audience === 'trial_active') {
    const { data } = await supabase.from('accesses').select('whatsapp, email')
      .eq('access_type', 'trial').eq('status', 'active').not('whatsapp', 'is', null)
    return (data || []).map((r: any) => ({ phone: r.whatsapp, email: r.email }))
  }
  if (audience === 'buyers_approved') {
    const { data } = await supabase.from('buyers').select('whatsapp, email')
      .eq('status', 'approved').not('whatsapp', 'is', null)
    return (data || []).map((r: any) => ({ phone: r.whatsapp, email: r.email }))
  }
  if (audience === 'buyers_all') {
    const { data } = await supabase.from('buyers').select('whatsapp, email').not('whatsapp', 'is', null)
    return (data || []).map((r: any) => ({ phone: r.whatsapp, email: r.email }))
  }
  if (audience === 'all_with_whatsapp') {
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.from('accesses').select('whatsapp, email').not('whatsapp', 'is', null),
      supabase.from('buyers').select('whatsapp, email').not('whatsapp', 'is', null),
    ])
    return [
      ...(a || []).map((r: any) => ({ phone: r.whatsapp, email: r.email })),
      ...(b || []).map((r: any) => ({ phone: r.whatsapp, email: r.email })),
    ]
  }
  return []
}

async function sendWhatsAppText(token: string, phoneId: string, to: string, body: string) {
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body, preview_url: false },
      }),
    })
    const data = await res.json()
    if (res.ok && data.messages?.[0]?.id) return { ok: true }
    return { ok: false, error: data?.error?.message || JSON.stringify(data) }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

async function sendWhatsAppTemplate(
  token: string,
  phoneId: string,
  to: string,
  templateName: string,
  languageCode: string,
  variables: string[],
) {
  try {
    const components: any[] = []
    if (variables.length > 0) {
      components.push({
        type: 'body',
        parameters: variables.map(v => ({ type: 'text', text: v })),
      })
    }
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components.length > 0 && { components }),
        },
      }),
    })
    const data = await res.json()
    if (res.ok && data.messages?.[0]?.id) return { ok: true }
    return { ok: false, error: data?.error?.message || JSON.stringify(data) }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })
  const cors = getCorsHeaders(req)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const whatsappToken = Deno.env.get('WHATSAPP_TOKEN')!
    const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_ID')!
    const whatsappWabaId = Deno.env.get('WHATSAPP_WABA_ID')!

    const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '')
    if (!jwt) return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    })
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt)
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    })
    const { data: roleData } = await supabase.from('user_roles').select('role')
      .eq('user_id', user.id).eq('role', 'admin').maybeSingle()
    if (!roleData) return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
    })

    const body = await req.json()
    const { mode, audience, custom_numbers, message, delay_ms, batch_recipients,
            template_name, template_language, template_variables } = body

    // ── LIST TEMPLATES ───────────────────────────────────────────────────────
    if (mode === 'list-templates') {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${whatsappWabaId}/message_templates?status=APPROVED&limit=50&fields=name,status,category,language,components`,
        { headers: { 'Authorization': `Bearer ${whatsappToken}` } }
      )
      const data = await res.json()
      if (!res.ok) return new Response(JSON.stringify({ error: data?.error?.message || 'Erro ao buscar templates' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
      return new Response(JSON.stringify({ templates: data.data || [] }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── LIST RECIPIENTS ──────────────────────────────────────────────────────
    if (mode === 'list') {
      let raw: { phone: string; email: string }[] = []
      if (audience === 'custom') {
        raw = (custom_numbers || []).filter(Boolean).map((p: string) => ({ phone: p, email: '' }))
      } else {
        raw = await fetchRecipients(supabase, audience)
      }
      const { data: alreadySent } = await supabase.from('whatsapp_sends').select('phone').eq('status', 'sent')
      const sentSet = new Set((alreadySent || []).map((r: any) => r.phone))
      const seen = new Map<string, string>()
      for (const r of raw) {
        const n = normalizePhone(r.phone)
        if (n && !seen.has(n) && !sentSet.has(n)) seen.set(n, r.email || '')
      }
      const recipients = Array.from(seen.entries()).map(([phone, email]) => ({ phone, email }))
      return new Response(JSON.stringify({ recipients }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── BATCH SEND ───────────────────────────────────────────────────────────
    if (mode === 'batch') {
      const isTemplate = !!template_name
      if (!isTemplate && !message?.trim()) return new Response(JSON.stringify({ error: 'message ou template_name obrigatório' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })

      const recipients: { phone: string; email?: string }[] = batch_recipients || []
      const delayMs = typeof delay_ms === 'number' ? Math.max(500, delay_ms) : 1500
      const results: { phone: string; email?: string; status: string; error?: string }[] = []
      const logs: Record<string, unknown>[] = []

      for (const r of recipients) {
        const normalized = normalizePhone(r.phone) || r.phone.replace(/\D/g, '')
        let result: { ok: boolean; error?: string }

        if (isTemplate) {
          result = await sendWhatsAppTemplate(
            whatsappToken, whatsappPhoneId, normalized,
            template_name, template_language || 'pt_BR',
            template_variables || [],
          )
        } else {
          result = await sendWhatsAppText(whatsappToken, whatsappPhoneId, normalized, message.trim())
        }

        const status = result.ok ? 'sent' : 'failed'
        results.push({ phone: r.phone, email: r.email, status, error: result.error })
        logs.push({ phone: r.phone, email: r.email || null, status, audience: audience || 'batch' })
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }

      if (logs.length > 0) await supabase.from('whatsapp_sends').insert(logs)

      const sent = results.filter(r => r.status === 'sent').length
      const failed = results.filter(r => r.status === 'failed').length
      return new Response(JSON.stringify({ success: true, sent, failed, results }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'mode inválido' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    })

  } catch (err: unknown) {
    console.error('send-whatsapp error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
