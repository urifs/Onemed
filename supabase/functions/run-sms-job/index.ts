import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
    const twilioFrom = Deno.env.get('TWILIO_FROM_NUMBER')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Auth: cron secret OR admin JWT
    const cronSecret = Deno.env.get('CRON_SECRET')
    const providedCron = req.headers.get('x-cron-secret') || ''
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')

    let authed = false
    if (cronSecret && providedCron === cronSecret) {
      authed = true
    } else if (jwt) {
      const { data: { user } } = await supabase.auth.getUser(jwt)
      if (user) {
        const { data: roleData } = await supabase.from('user_roles')
          .select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
        if (roleData) authed = true
      }
    } else if (!cronSecret) {
      authed = true
    }

    if (!authed) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    let targetJobId: string | null = null
    try {
      const body = await req.json()
      targetJobId = body?.job_id ?? null
    } catch { /* no body */ }

    // Find next scheduled job (or specific job)
    const { data: job } = targetJobId
      ? await supabase.from('sms_jobs').select('*').eq('id', targetJobId).eq('status', 'scheduled').maybeSingle()
      : await supabase.from('sms_jobs').select('*').eq('status', 'scheduled').order('created_at', { ascending: true }).limit(1).maybeSingle()

    if (!job) {
      return new Response(JSON.stringify({ ok: true, message: 'Nenhum job pendente' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Lock the job atomically — if another worker beat us, this returns null
    const { data: lockedJob } = await supabase
      .from('sms_jobs')
      .update({ status: 'running' })
      .eq('id', job.id)
      .eq('status', 'scheduled')
      .select()
      .maybeSingle()

    if (!lockedJob) {
      return new Response(JSON.stringify({ ok: true, message: 'Job já sendo processado' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const recipients: { phone: string; email?: string }[] = job.recipient_phones || []
    const delayMs = Math.max(300, job.delay_ms || 1000)
    // Budget ~100s: at 3s delay use 30 items, otherwise 50
    const batchSize = delayMs >= 2500 ? 30 : 50

    const start = job.processed_index as number
    const end = Math.min(start + batchSize, recipients.length)
    const batch = recipients.slice(start, end)

    let sent = job.sent as number
    let failed = job.failed as number

    for (const r of batch) {
      const normalized = normalizePhone(r.phone)
      let result: { ok: boolean; error?: string }

      if (!normalized) {
        result = { ok: false, error: 'Número inválido' }
      } else {
        result = await sendTwilioSMS(twilioSid, twilioToken, twilioFrom, normalized, job.message.trim())
      }

      const status = result.ok ? 'sent' : 'failed'
      if (result.ok) sent++; else failed++

      // Insert individually so Realtime broadcasts each result in real-time
      await supabase.from('sms_sends').insert({
        phone: r.phone,
        email: r.email || null,
        status,
        audience: job.audience || 'batch',
        job_id: job.id,
        error_message: result.error || null,
      })

      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    const newIndex = end
    const isDone = newIndex >= recipients.length

    await supabase.from('sms_jobs').update({
      status: isDone ? 'completed' : 'scheduled',
      processed_index: newIndex,
      sent,
      failed,
      completed_at: isDone ? new Date().toISOString() : null,
    }).eq('id', job.id)

    console.log(`[sms-job ${job.id}] Batch ${start}-${end}. ${isDone ? 'COMPLETO' : 'Continua'}. Enviados: ${sent}, Erros: ${failed}`)

    return new Response(JSON.stringify({
      ok: true,
      job_id: job.id,
      processed: batch.length,
      sent,
      failed,
      done: isDone,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (err: unknown) {
    console.error('run-sms-job error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno' }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
