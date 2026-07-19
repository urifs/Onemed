import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
        content_name: opts.plan === 'lifetime' ? 'Plano Vitalício' : 'Plano Anual',
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

// ─── GOOGLE DRIVE (inline — evita dependência de drive-share-folder) ──────────
const GOOGLE_CLIENT_ID = '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com'

async function refreshGoogleToken(refreshToken: string, clientSecret: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) throw new Error('Falha ao renovar token do Google: ' + JSON.stringify(data))
  return data.access_token as string
}

async function shareDriveFolderInline(
  supabase: ReturnType<typeof createClient>,
  email: string,
  accessId: string,
): Promise<void> {
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
  const { data: config } = await supabase.from('drive_config').select('*').maybeSingle()
  if (!config?.connected || !config.folder_id) {
    console.warn('Drive: config ausente ou não conectado')
    return
  }

  let accessToken = config.access_token
  const expiry = config.token_expiry ? new Date(config.token_expiry) : null
  if (!expiry || expiry < new Date()) {
    if (!config.refresh_token) { console.error('Drive: sem refresh_token'); return }
    accessToken = await refreshGoogleToken(config.refresh_token, GOOGLE_CLIENT_SECRET)
    await supabase.from('drive_config').update({
      access_token: accessToken,
      token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
    }).eq('id', config.id)
    console.log('Drive: token renovado')
  }

  const permRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${config.folder_id}/permissions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ role: 'reader', type: 'user', emailAddress: email, sendNotificationEmail: false }),
    }
  )
  const perm = await permRes.json()
  if (!permRes.ok) {
    console.error('Drive share error para', email, ':', JSON.stringify(perm))
    return
  }

  // Salva o permissionId para que o cron possa revogar se necessário
  await supabase.from('accesses').update({
    drive_permission_id: perm.id,
    drive_folder_id: config.folder_id,
  }).eq('id', accessId)

  console.log('Drive: pasta compartilhada com', email, 'permissionId:', perm.id)
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

      // Annual plans expire a year out; lifetime never does. This also backs
      // the account panel's "Renovar Assinatura" flow — without an expiry,
      // an annual purchase looked identical to a lifetime one.
      const accessType = buyer.plan === 'lifetime' ? 'lifetime' : 'paid'
      const expiresAt = buyer.plan === 'annual' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null

      const { data: existingAccess } = await supabase
        .from('accesses')
        .select('id, access_type')
        .eq('email', buyer.email)
        .eq('status', 'active')
        .neq('access_type', 'trial')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingAccess?.access_type === 'lifetime') {
        console.log('Already has lifetime access for:', buyer.email, '— skipping')
      } else if (existingAccess) {
        // A renewal purchase — extend the same row instead of leaving its
        // old (possibly already-past) expiry untouched.
        const { error: updateErr } = await supabase.from('accesses').update({
          access_type: accessType, status: 'active', expires_at: expiresAt, whatsapp: buyer.whatsapp,
        }).eq('id', existingAccess.id)
        if (updateErr) console.error('Error renewing access:', updateErr.message)
        else console.log('Access renewed for:', buyer.email)
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
        }
      }

      // Share Drive folder inline (sem depender de drive-share-folder)
      // Busca o accessId recém-criado para salvar drive_permission_id
      const { data: newAccess } = await supabase
        .from('accesses')
        .select('id')
        .eq('email', buyer.email)
        .neq('access_type', 'trial')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      try {
        await shareDriveFolderInline(supabase, buyer.email, newAccess?.id || '')
      } catch (driveErr: any) {
        console.error('Drive share error para', buyer.email, ':', driveErr?.message || driveErr)
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
