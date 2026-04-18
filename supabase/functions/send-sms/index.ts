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
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return '+' + digits
  if (digits.length === 10 || digits.length === 11) return '+55' + digits
  if (digits.length >= 12 && digits.length <= 15) return '+' + digits
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

async function sendTwilioSMS(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
      }
    )
    const data = await res.json()
    if (res.ok && data.sid) return { ok: true }
    return { ok: false, error: data?.message || data?.code || JSON.stringify(data) }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })
  const cors = getCorsHeaders(req)

  try {
    const supabaseUrl        = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const twilioSid          = Deno.env.get('TWILIO_ACCOUNT_SID')!
    const twilioToken        = Deno.env.get('TWILIO_AUTH_TOKEN')!
    const twilioFrom         = Deno.env.get('TWILIO_FROM_NUMBER')!

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
    const { mode, audience, custom_numbers, message, delay_ms, batch_recipients, job_id } = body

    // ── CREATE JOB ───────────────────────────────────────────────────────────
    if (mode === 'create-job') {
      if (!message?.trim()) return new Response(JSON.stringify({ error: 'message é obrigatório' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })

      let raw: { phone: string; email: string }[] = []
      if (audience === 'custom') {
        raw = (custom_numbers || []).filter(Boolean).map((p: string) => ({ phone: p, email: '' }))
      } else {
        raw = await fetchRecipients(supabase, audience)
      }

      // For custom lists, skip deduplication — user explicitly chose those numbers.
      // For audience-based lists, filter already-sent numbers to avoid duplicates.
      let sentSet = new Set<string>()
      if (audience !== 'custom') {
        const { data: alreadySent } = await supabase.from('sms_sends').select('phone').eq('status', 'sent')
        sentSet = new Set((alreadySent || []).map((r: any) => r.phone))
      }
      const seen = new Map<string, string>()
      for (const r of raw) {
        const n = normalizePhone(r.phone)
        if (n && !seen.has(n) && !sentSet.has(n)) seen.set(n, r.email || '')
      }
      const recipients = Array.from(seen.entries()).map(([phone, email]) => ({ phone, email }))

      if (recipients.length === 0) return new Response(JSON.stringify({ error: 'Nenhum destinatário encontrado' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })

      const { data: newJob, error: insertErr } = await supabase.from('sms_jobs').insert({
        status: 'scheduled',
        audience,
        message: message.trim(),
        delay_ms: typeof delay_ms === 'number' ? Math.max(300, delay_ms) : 1000,
        recipient_phones: recipients,
        total: recipients.length,
        processed_index: 0,
        sent: 0,
        failed: 0,
      }).select('id').single()

      if (insertErr) return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })

      return new Response(JSON.stringify({ job_id: newJob.id, total: recipients.length }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── CANCEL JOB ───────────────────────────────────────────────────────────
    if (mode === 'cancel-job') {
      if (!job_id) return new Response(JSON.stringify({ error: 'job_id é obrigatório' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
      await supabase.from('sms_jobs').update({ status: 'cancelled' })
        .eq('id', job_id).in('status', ['scheduled', 'running'])
      return new Response(JSON.stringify({ ok: true }), {
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
      let sentSetList = new Set<string>()
      if (audience !== 'custom') {
        const { data: alreadySent } = await supabase.from('sms_sends').select('phone').eq('status', 'sent')
        sentSetList = new Set((alreadySent || []).map((r: any) => r.phone))
      }
      const seenList = new Map<string, string>()
      for (const r of raw) {
        const n = normalizePhone(r.phone)
        if (n && !seenList.has(n) && !sentSetList.has(n)) seenList.set(n, r.email || '')
      }
      const recipients = Array.from(seenList.entries()).map(([phone, email]) => ({ phone, email }))
      return new Response(JSON.stringify({ recipients }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── BATCH SEND ───────────────────────────────────────────────────────────
    if (mode === 'batch') {
      if (!message?.trim()) return new Response(JSON.stringify({ error: 'message é obrigatório' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })

      const recipients: { phone: string; email?: string }[] = batch_recipients || []
      const delayMs = typeof delay_ms === 'number' ? Math.max(300, delay_ms) : 1000
      const results: { phone: string; email?: string; status: string; error?: string }[] = []
      const logs: Record<string, unknown>[] = []

      for (const r of recipients) {
        const normalized = normalizePhone(r.phone)
        let result: { ok: boolean; error?: string }

        if (!normalized) {
          result = { ok: false, error: 'Número inválido' }
        } else {
          result = await sendTwilioSMS(twilioSid, twilioToken, twilioFrom, normalized, message.trim())
        }

        const status = result.ok ? 'sent' : 'failed'
        results.push({ phone: r.phone, email: r.email, status, error: result.error })
        logs.push({ phone: r.phone, email: r.email || null, status, audience: audience || 'batch' })
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }

      if (logs.length > 0) await supabase.from('sms_sends').insert(logs)

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
    console.error('send-sms error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
