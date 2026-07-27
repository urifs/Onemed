import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── PLANOS ───────────────────────────────────────────────────────────────────
// Cada plano define o access_type gravado em `accesses` e por quantos dias
// dura (null = vitalício, nunca expira). lifetime/lifetime_plus/lifetime_pro
// formam a "família vitalícia" — rankeados pra nunca rebaixar quem já comprou
// um nível superior, e permitir upgrade (comprar lifetime_plus tendo lifetime).
const PLAN_ACCESS_TYPE: Record<string, string> = {
  lifetime: 'lifetime',
  lifetime_plus: 'lifetime_plus',
  lifetime_pro: 'lifetime_pro',
}
const PLAN_DURATION_DAYS: Record<string, number> = {
  annual: 365,
  monthly: 30,
}
const LIFETIME_TIER_RANK: Record<string, number> = {
  lifetime: 1,
  lifetime_plus: 2,
  lifetime_pro: 3,
}
const PLAN_CONTENT_NAMES: Record<string, string> = {
  monthly: 'Plano Mensal',
  annual: 'Plano Anual',
  lifetime: 'Plano Vitalício',
  lifetime_plus: 'Plano Vitalício Plus',
  lifetime_pro: 'Plano Vitalício Pro',
}
// Planos que dão direito ao backup exclusivo no Google Drive do aluno.
const BACKUP_FOLDER_PLANS = new Set(['lifetime_plus', 'lifetime_pro'])

// ─── META CAPI ────────────────────────────────────────────────────────────────
const CAPI_PIXEL_IDS = ['797374160058274', '2400702203708115']

async function sha256hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.toLowerCase().trim())
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sendMetaCAPIEvent(opts: {
  email: string
  name?: string | null
  phone?: string | null
  fbp?: string | null
  fbc?: string | null
  fbclid?: string | null
  value: number
  plan: string
  paymentId: string
}): Promise<void> {
  const accessToken = Deno.env.get('META_CAPI_ACCESS_TOKEN')
  if (!accessToken) {
    console.warn('META_CAPI_ACCESS_TOKEN not set — skipping CAPI')
    return
  }

  const userData: Record<string, string> = {
    em: await sha256hex(opts.email),
  }

  if (opts.phone) {
    const digits = opts.phone.replace(/\D/g, '')
    if (digits.length >= 8) userData.ph = await sha256hex(digits)
  }

  if (opts.name) {
    const parts = opts.name.trim().split(/\s+/)
    if (parts[0]) userData.fn = await sha256hex(parts[0])
    if (parts.length > 1) userData.ln = await sha256hex(parts[parts.length - 1])
  }

  // fbp/fbc são passados sem hash — já são identificadores do navegador
  // fbc pode ter se perdido no redirect; reconstrói do fbclid raw se necessário
  const fbc = opts.fbc || (opts.fbclid ? `fb.1.${Math.floor(Date.now() / 1000)}.${opts.fbclid}` : undefined)
  if (opts.fbp) userData.fbp = opts.fbp
  if (fbc) userData.fbc = fbc

  const payload = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: `purchase_${opts.paymentId}`, // deduplicação com o pixel client-side
      action_source: 'website',
      event_source_url: 'https://onemedcursos.com.br/payment/success',
      user_data: userData,
      custom_data: {
        value: opts.value,
        currency: 'BRL',
        content_name: PLAN_CONTENT_NAMES[opts.plan] || 'Plano Anual',
        content_category: 'Subscription',
        content_ids: [opts.plan],
        content_type: 'product',
        num_items: 1,
        order_id: opts.paymentId,
      },
    }],
  }

  for (const pixelId of CAPI_PIXEL_IDS) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      )
      const json = await res.json()
      if (!res.ok) {
        console.error(`CAPI error pixel ${pixelId}:`, JSON.stringify(json))
      } else {
        console.log(`CAPI Purchase OK pixel ${pixelId}, events_received:`, json.events_received)
      }
    } catch (err: any) {
      console.error(`CAPI network error pixel ${pixelId}:`, err.message)
    }
  }
}

// ─── BACKUP NO GOOGLE DRIVE (planos Vitalício Plus/Pro) ───────────────────────
// Compartilha a pasta de backup configurada em /admin/drive com o email do
// comprador — mesma engrenagem de drive-share-folder, só que numa pasta
// separada da usada pro streaming das aulas (ver folderType: 'backup').
async function shareBackupFolder(supabase: ReturnType<typeof createClient>, email: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('drive-share-folder', {
      body: { email, folderType: 'backup' },
    })
    if (error) console.error('Backup folder share error:', JSON.stringify(error))
    else console.log('Backup folder shared with:', email)
  } catch (err: any) {
    console.error('Backup folder share exception:', err?.message || err)
  }
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

// ─── HMAC VERIFICATION (Mercado Pago) ─────────────────────────────────────────
// Doc: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
// x-signature header: ts=<timestamp>,v1=<hmac_sha256_hex>
// Signed string:      id:<data.id>;request-id:<x-request-id>;ts:<ts>
async function verifyMPSignature(req: Request, dataId: string, secret: string): Promise<boolean> {
  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id')

  if (!xSignature || !xRequestId) {
    console.warn('MP Webhook: missing x-signature or x-request-id headers')
    return false
  }

  // Parse ts=<ts>,v1=<hash>
  const parts: Record<string, string> = {}
  for (const part of xSignature.split(',')) {
    const [k, v] = part.split('=')
    if (k && v) parts[k.trim()] = v.trim()
  }

  const ts = parts['ts']
  const v1 = parts['v1']

  if (!ts || !v1) {
    console.warn('MP Webhook: malformed x-signature header:', xSignature)
    return false
  }

  const signedString = `id:${dataId};request-id:${xRequestId};ts:${ts}`

  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(signedString))
  const computed = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const match = computed === v1
  if (!match) {
    console.error('MP Webhook: signature mismatch. Expected:', computed, 'Got:', v1)
  }
  return match
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const MP_TOKEN     = Deno.env.get('MP_ACCESS_TOKEN_PROD') || Deno.env.get('MP_ACCESS_TOKEN_TEST')
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase     = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

    // Read raw body text (needed before JSON parse so we keep it available)
    const rawBody = await req.text()
    const body = JSON.parse(rawBody)

    console.log('MP Webhook received:', JSON.stringify(body))

    // ── Verificação de assinatura HMAC ───────────────────────────────────────
    const mpWebhookSecret = Deno.env.get('MP_WEBHOOK_SECRET')
    if (mpWebhookSecret) {
      // MP sends data.id in query params for Webhook V2 notifications
      const url = new URL(req.url)
      const queryDataId = url.searchParams.get('data.id')
        || (body.data?.id ? String(body.data.id) : null)

      if (queryDataId) {
        const isValid = await verifyMPSignature(req, queryDataId, mpWebhookSecret)
        if (!isValid) {
          console.error('MP Webhook: rejected — invalid HMAC signature')
          return new Response('Unauthorized', {
            status: 401,
            headers: getCorsHeaders(req),
          })
        }
        console.log('MP Webhook: HMAC signature verified OK')
      } else {
        console.warn('MP Webhook: no data.id found for signature check — proceeding with caution')
      }
    } else {
      console.warn('MP_WEBHOOK_SECRET not configured — signature verification disabled. Configure this secret in Supabase Edge Function Secrets.')
    }

    // MP sends two formats:
    // 1. Webhook V2: { type: "payment", data: { id: "123" } }
    // 2. IPN:        { topic: "payment", resource: "123" }
    let paymentId: string | null = null

    if (body.type === 'payment' && body.data?.id) {
      paymentId = String(body.data.id)
    } else if (body.topic === 'payment' && body.resource) {
      const resource = String(body.resource)
      paymentId = resource.includes('/') ? resource.split('/').pop()! : resource
    }

    if (!paymentId) {
      console.log('No payment ID found, ignoring:', JSON.stringify(body))
      return new Response('ok', { headers: getCorsHeaders(req) })
    }

    console.log('Fetching payment ID:', paymentId)

    // Fetch payment from MP API
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_TOKEN}` }
    })
    const payment = await mpRes.json()

    console.log('MP payment status:', payment.status, 'external_ref:', payment.external_reference)

    if (!mpRes.ok) {
      console.error('Failed to fetch payment from MP:', JSON.stringify(payment))
      return new Response('ok', { headers: getCorsHeaders(req) })
    }

    const externalRef = payment.external_reference
    const status      = payment.status // approved, pending, rejected, cancelled

    if (!externalRef) {
      console.log('No external_reference in payment, skipping')
      return new Response('ok', { headers: getCorsHeaders(req) })
    }

    // Fetch buyer by external_reference
    const { data: buyerRows, error: fetchErr } = await supabase
      .from('buyers')
      .select('*')
      .eq('external_reference', externalRef)

    if (fetchErr) {
      console.error('Error fetching buyer:', fetchErr.message)
    }

    const buyer = buyerRows?.[0] || null
    console.log('Buyer found:', buyer?.id, 'email:', buyer?.email, 'externalRef:', externalRef)

    if (!buyer) {
      console.log('No buyer found for external_reference:', externalRef, '— skipping access grant')
      return new Response('ok', { headers: getCorsHeaders(req) })
    }

    // Update buyer status
    const { error: updateErr } = await supabase
      .from('buyers')
      .update({ status, payment_id: String(paymentId) })
      .eq('id', buyer.id)

    if (updateErr) {
      console.error('Error updating buyer:', updateErr.message)
    } else {
      console.log('Buyer updated:', buyer.id, 'status:', status)
    }

    // If approved, grant access and send email
    if (status === 'approved') {
      // Atomically mark access_granted = true ONLY if it was false
      // This prevents race conditions when MP sends duplicate webhooks
      const { data: grantedRows } = await supabase
        .from('buyers')
        .update({ access_granted: true })
        .eq('id', buyer.id)
        .eq('access_granted', false)
        .select('id')

      if (!grantedRows || grantedRows.length === 0) {
        console.log('Access already granted for:', buyer.email, '— skipping duplicate (atomic check)')
        return new Response('ok', { headers: getCorsHeaders(req) })
      }

      // Annual/monthly plans expire out; lifetime (e as camadas Plus/Pro)
      // nunca expira. Isso também alimenta o "Renovar Assinatura" do painel
      // da conta — sem expiry, uma compra anual parecia idêntica a vitalícia.
      const accessType = PLAN_ACCESS_TYPE[buyer.plan] || 'paid'
      const durationDays = PLAN_DURATION_DAYS[buyer.plan]
      const expiresAt = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() : null

      const { data: existingAccess } = await supabase
        .from('accesses')
        .select('id, access_type')
        .eq('email', buyer.email)
        .eq('status', 'active')
        .neq('access_type', 'trial')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Nunca rebaixa quem já tem um nível vitalício igual ou superior — mas
      // permite upgrade (ex: já tinha lifetime, comprou lifetime_plus).
      const existingRank = existingAccess ? LIFETIME_TIER_RANK[existingAccess.access_type] : undefined
      const newRank = LIFETIME_TIER_RANK[accessType]
      const alreadyAtOrAboveTier = existingRank !== undefined && (newRank === undefined || existingRank >= newRank)

      if (alreadyAtOrAboveTier) {
        console.log('Already has equal-or-higher lifetime tier for:', buyer.email, '— skipping')
      } else if (existingAccess) {
        // A renewal (ou upgrade de tier) — extend the same row instead of
        // leaving its old (possibly already-past) expiry untouched.
        const { error: updateErr } = await supabase.from('accesses').update({
          access_type: accessType, status: 'active', expires_at: expiresAt, whatsapp: buyer.whatsapp,
        }).eq('id', existingAccess.id)
        if (updateErr) console.error('Error renewing access:', updateErr.message)
        else {
          console.log('Access renewed for:', buyer.email)
          if (BACKUP_FOLDER_PLANS.has(accessType)) await shareBackupFolder(supabase, buyer.email)
        }
      } else {
        const { error: accessErr } = await supabase.from('accesses').insert({
          email: buyer.email,
          access_type: accessType,
          status: 'active',
          expires_at: expiresAt,
          whatsapp: buyer.whatsapp,
        })

        if (accessErr) {
          console.error('Error inserting access:', accessErr.message)
        } else {
          console.log('Access granted for:', buyer.email)
          if (BACKUP_FOLDER_PLANS.has(accessType)) await shareBackupFolder(supabase, buyer.email)
        }
      }

      // Send Meta CAPI Purchase event (server-side — independente de cookies do browser)
      try {
        await sendMetaCAPIEvent({
          email: buyer.email,
          name: buyer.name,
          phone: buyer.whatsapp,
          fbp: buyer.fbp ?? null,
          fbc: buyer.fbc ?? null,
          fbclid: buyer.fbclid ?? null,
          value: payment.transaction_amount ?? buyer.amount ?? 0,
          plan: buyer.plan,
          paymentId: String(paymentId),
        })
      } catch (capiErr: any) {
        console.error('CAPI error:', capiErr.message)
      }

      // Send access confirmation email
      try {
        const emailRes = await supabase.functions.invoke('send-access-email', {
          body: {
            to: buyer.email,
            name: buyer.name,
            type: 'payment_approved',
            plan: buyer.plan,
          }
        })
        if (emailRes.error) {
          console.error('Email invoke error:', JSON.stringify(emailRes.error))
        } else {
          console.log('Email sent to:', buyer.email, 'result:', JSON.stringify(emailRes.data))
        }
      } catch (emailErr: any) {
        console.error('Email error:', emailErr?.message || emailErr)
      }
    }

    return new Response('ok', { headers: getCorsHeaders(req) })
  } catch (err: any) {
    console.error('Webhook error:', err?.message || err)
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
