import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Contas que mexem em dinheiro real, isoladas num módulo puro e coberto por
// teste (src/test/billingRules.test.ts).
import { baseDaComissao, novoVencimento } from '../_shared/billing-rules.ts'

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

// Envia o Purchase pela Conversions API e DEIXA RASTRO em `capi_events`.
//
// Antes, o resultado só ia pra console.log/console.error — e como a retenção
// de log deste projeto é de minutos, quando a auditoria do pixel encontrou
// ~11 Purchase para 44 vendas reais não havia nada pra consultar. O motivo
// (token vencido em 14/07/2026, erro 190) só apareceu testando a Graph API
// direto. Com a tabela, uma falha dessas fica visível no mesmo dia.
async function logCapi(
  supabase: ReturnType<typeof createClient>,
  row: Record<string, unknown>,
): Promise<void> {
  // O registro é diagnóstico: se ele próprio falhar, não pode derrubar o
  // processamento do pagamento.
  try {
    await supabase.from('capi_events').insert({ event_name: 'Purchase', ...row })
  } catch (err) {
    console.error('failed to log capi_event:', (err as Error).message)
  }
}

async function sendMetaCAPIEvent(
  supabase: ReturnType<typeof createClient>,
  opts: {
    email: string
    name?: string | null
    phone?: string | null
    fbp?: string | null
    fbc?: string | null
    fbclid?: string | null
    clientIp?: string | null
    clientUserAgent?: string | null
    value: number
    plan: string
    paymentId: string
    buyerId?: string | null
  },
): Promise<void> {
  const eventId = `purchase_${opts.paymentId}`
  const accessToken = Deno.env.get('META_CAPI_ACCESS_TOKEN')

  if (!accessToken) {
    console.warn('META_CAPI_ACCESS_TOKEN not set — skipping CAPI')
    await logCapi(supabase, {
      event_id: eventId, pixel_id: 'all', buyer_id: opts.buyerId ?? null,
      email: opts.email, value: opts.value, success: false,
      error: 'META_CAPI_ACCESS_TOKEN ausente nos secrets',
    })
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

  // fbp/fbc são passados sem hash — já são identificadores do navegador.
  // fbc pode ter se perdido no redirect; reconstrói do fbclid raw se necessário.
  const fbc = opts.fbc || (opts.fbclid ? `fb.1.${Math.floor(Date.now() / 1000)}.${opts.fbclid}` : undefined)
  if (opts.fbp) userData.fbp = opts.fbp
  if (fbc) userData.fbc = fbc

  // IP e user-agent do COMPRADOR, capturados no checkout (mp-create-payment).
  // Não dá pra pegar aqui: esta requisição vem de um servidor do Mercado Pago,
  // então o IP desta chamada seria o do MP. Sem essas duas chaves a
  // correspondência do Purchase fica bem abaixo da do Lead (EMQ 6.1 vs 8.7).
  if (opts.clientIp) userData.client_ip_address = opts.clientIp
  if (opts.clientUserAgent) userData.client_user_agent = opts.clientUserAgent

  const matchKeys = Object.keys(userData)

  const payload = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId, // deduplicação com o pixel client-side
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
    // Falha passageira de rede não pode custar a atribuição de uma venda.
    // Erro de credencial (190) não se resolve tentando de novo — sai na hora.
    const MAX_ATTEMPTS = 3
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
        )
        const json = await res.json().catch(() => ({}))

        if (res.ok) {
          console.log(`CAPI Purchase OK pixel ${pixelId}, events_received:`, json?.events_received)
          await logCapi(supabase, {
            event_id: eventId, pixel_id: pixelId, buyer_id: opts.buyerId ?? null,
            email: opts.email, value: opts.value, success: true,
            http_status: res.status, events_received: json?.events_received ?? null,
            match_keys: matchKeys, attempt,
          })
          break
        }

        const code = json?.error?.code
        const errorMsg = `${json?.error?.message ?? 'erro desconhecido'} (code ${code ?? '?'})`
        console.error(`CAPI error pixel ${pixelId}:`, JSON.stringify(json))

        const permanent = code === 190 || code === 200 || code === 10 ||
          (res.status >= 400 && res.status < 500 && res.status !== 429)
        if (permanent || attempt === MAX_ATTEMPTS) {
          await logCapi(supabase, {
            event_id: eventId, pixel_id: pixelId, buyer_id: opts.buyerId ?? null,
            email: opts.email, value: opts.value, success: false,
            http_status: res.status, error: errorMsg.slice(0, 500),
            match_keys: matchKeys, attempt,
          })
          break
        }
      } catch (err) {
        const errorMsg = `rede: ${(err as Error).message}`
        console.error(`CAPI network error pixel ${pixelId}:`, errorMsg)
        if (attempt === MAX_ATTEMPTS) {
          await logCapi(supabase, {
            event_id: eventId, pixel_id: pixelId, buyer_id: opts.buyerId ?? null,
            email: opts.email, value: opts.value, success: false,
            error: errorMsg.slice(0, 500), match_keys: matchKeys, attempt,
          })
          break
        }
      }
      await new Promise(r => setTimeout(r, 500 * 2 ** (attempt - 1)))
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

// ─── PROGRAMA DE AFILIADOS ────────────────────────────────────────────────────
// A venda chega ao afiliado pelo cupom: buyers.coupon_code (gravado no
// mp-create-payment) → affiliates.coupon_code. Comissão sobre o valor
// efetivamente pago. affiliate_sales.external_reference é UNIQUE — webhook
// duplicado do MP não duplica comissão.
// Percentuais de 12/08 (decisão do dono), sobre o preço de TABELA do plano —
// ver AFFILIATE_PLAN_PRICES logo abaixo. Os valores anunciados no painel do
// afiliado saem exatamente dessa conta: 99×20%=R$19,80 · 299×25%=R$74,75 ·
// 499×25%=R$124,75 · 798×30%=R$239,40 · 1497×30%=R$449,10.
const AFFILIATE_COMMISSION_PERCENT: Record<string, number> = {
  monthly: 20,
  annual: 25,
  lifetime: 25,
  lifetime_plus: 30,
  lifetime_pro: 30,
}

// Base da comissão = preço CHEIO do plano, não o que entrou no caixa.
// O cupom do afiliado dá 10% de desconto ao indicado, e esse desconto é
// bancado pela plataforma: a comissão do afiliado não encolhe por causa dele
// (é o que o painel promete em "O desconto de 10% sai da minha comissão?").
// Plano fora da tabela (legado) cai no valor realmente pago.
const AFFILIATE_PLAN_PRICES: Record<string, number> = {
  monthly: 99.00,
  annual: 299.00,
  lifetime: 499.00,
  lifetime_plus: 798.00,
  lifetime_pro: 1497.00,
}
// A partir de 5 vendas o afiliado ganha a conta Vitalício Pro na plataforma.
const AFFILIATE_PRO_THRESHOLD = 5

function escapeHtml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function affiliateSaleEmailHtml(affiliateName: string, saleInfo: {
  planLabel: string; amount: number; commission: number; buyerName: string; proUnlocked: boolean; totalSales: number
}): string {
  const firstName = escapeHtml(affiliateName.split(' ')[0])
  const brl = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#e11d2e;padding:20px 32px;">
        <span style="color:#ffffff;font-size:20px;font-weight:bold;">OneMed</span>
      </td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Parabéns, ${firstName}! Você fez uma venda!</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3f3f46;">
          Uma compra com o seu cupom acabou de ser aprovada. Os detalhes:
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;">
          <tr><td style="padding:16px 20px;font-size:14px;color:#3f3f46;line-height:2;">
            <b>Plano:</b> ${saleInfo.planLabel}<br/>
            <b>Comprador:</b> ${escapeHtml(saleInfo.buyerName || '—')}<br/>
            <b>Valor da venda:</b> ${brl(saleInfo.amount)}<br/>
            <b style="color:#16a34a;">Sua comissão: ${brl(saleInfo.commission)}</b><br/>
            <b>Total de vendas:</b> ${saleInfo.totalSales}
          </td></tr>
        </table>
        ${saleInfo.proUnlocked ? `<p style="margin:20px 0 0;font-size:15px;line-height:1.6;color:#16a34a;font-weight:bold;">
          Você atingiu ${AFFILIATE_PRO_THRESHOLD} vendas e desbloqueou sua conta Vitalício Pro na plataforma!
        </p>` : ''}
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td style="border-radius:8px;background:#e11d2e;">
          <a href="https://onemedcursos.com.br/afiliado" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">Acessar meu painel</a>
        </td></tr></table>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

// Registra a comissão do afiliado dono do cupom usado na compra, libera a
// conta Vitalício Pro na 5ª venda e envia o e-mail de "você fez uma venda".
// Nada aqui pode derrubar o webhook: falha vira log, nunca throw pra fora.
async function processAffiliateSale(
  supabase: ReturnType<typeof createClient>,
  buyer: any,
  transactionAmount: number,
  paymentId: string,
): Promise<void> {
  try {
    // Atribuição, em ordem de prioridade:
    //   1. cupom efetivamente usado na compra (match em coupon_code);
    //   2. ref do link ?ref= — o ref_code IMUTÁVEL primeiro (link que não
    //      quebra quando o afiliado troca o cupom), depois o coupon_code
    //      como legado (links antigos que carregavam o cupom no ?ref=).
    // Cobre quem fez o teste e comprou dias depois, até sem digitar cupom.
    const lookup = async (col: 'coupon_code' | 'ref_code', code: string) => {
      const { data } = await supabase.from('affiliates')
        .select('id, name, email').eq(col, code).maybeSingle()
      return (data as { id: string; name: string; email: string } | null) || null
    }
    let affiliate: { id: string; name: string; email: string } | null = null
    if (buyer?.coupon_code) affiliate = await lookup('coupon_code', buyer.coupon_code)
    if (!affiliate && buyer?.affiliate_ref) {
      affiliate = await lookup('ref_code', buyer.affiliate_ref)
        || await lookup('coupon_code', buyer.affiliate_ref)
    }
    if (!affiliate) return

    // Auto-indicação: afiliado comprando com o PRÓPRIO cupom/ref. Sem esta
    // trava ele ganhava 15-30% de volta em toda compra própria e destravava
    // o Vitalício Pro grátis com 5 compras suas (ou de laranjas). Comissão só
    // vale pra venda a OUTRA pessoa.
    if (affiliate.email && buyer.email &&
        affiliate.email.trim().toLowerCase() === buyer.email.trim().toLowerCase()) {
      console.log('Auto-indicação ignorada (comprador = afiliado):', buyer.email)
      return
    }

    const percent = AFFILIATE_COMMISSION_PERCENT[buyer.plan]
    if (!percent) return
    // Base da comissão = valor do PLANO (plan_amount), NÃO o total pago
    // (transaction_amount inclui upsells). Decisão do dono: comissão não
    // incide sobre complementos. Fallback pro valor pago em linhas antigas
    // sem plan_amount preenchido.
    const amount = Number(transactionAmount ?? buyer.amount ?? 0)
    // Preço de tabela do plano; sem tabela (plano legado), o valor pago pelo
    // plano — nunca o total da transação, que inclui upsells.
    const precoDeTabela = AFFILIATE_PLAN_PRICES[buyer.plan]
      ?? (buyer.plan_amount != null ? Number(buyer.plan_amount) : amount)
    const commissionBase = baseDaComissao({
      precoDeTabela,
      cobradoPeloPlano: buyer.plan_amount != null ? Number(buyer.plan_amount) : null,
      tipoDeCompra: buyer.purchase_kind,
    })
    const commission = Math.round(commissionBase * percent) / 100

    const { data: inserted, error: insErr } = await supabase.from('affiliate_sales')
      .upsert({
        affiliate_id: affiliate.id,
        buyer_email: buyer.email,
        buyer_name: buyer.name || null,
        plan: buyer.plan,
        amount: commissionBase,
        commission_percent: percent,
        commission_amount: commission,
        payment_id: paymentId,
        external_reference: buyer.external_reference,
      }, { onConflict: 'external_reference', ignoreDuplicates: true })
      .select('id')
    if (insErr) { console.error('affiliate_sales insert error:', insErr.message); return }
    if (!inserted || inserted.length === 0) {
      console.log('Affiliate sale already recorded for:', buyer.external_reference)
      return
    }

    // Conta pro benefício das 5 vendas EXCLUINDO reembolsadas — uma venda
    // estornada não pode contar pro Vitalício Pro grátis.
    const { count } = await supabase.from('affiliate_sales')
      .select('id', { count: 'exact', head: true })
      .eq('affiliate_id', affiliate.id)
      .neq('status', 'reversed')
    const totalSales = count ?? 1

    // Benefício das 5 vendas: conta Vitalício Pro pro e-mail do afiliado,
    // sem rebaixar quem já tem tier igual ou superior.
    let proUnlocked = false
    if (totalSales >= AFFILIATE_PRO_THRESHOLD) {
      const { data: existing } = await supabase.from('accesses')
        .select('id, access_type').eq('email', affiliate.email).eq('status', 'active')
        .neq('access_type', 'trial')
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      const existingRank = existing ? (LIFETIME_TIER_RANK[existing.access_type] ?? 0) : -1
      if (existingRank < LIFETIME_TIER_RANK.lifetime_pro) {
        if (existing) {
          await supabase.from('accesses').update({ access_type: 'lifetime_pro', status: 'active', expires_at: null }).eq('id', existing.id)
        } else {
          await supabase.from('accesses').insert({ email: affiliate.email, access_type: 'lifetime_pro', status: 'active', expires_at: null })
        }
        proUnlocked = totalSales === AFFILIATE_PRO_THRESHOLD
        console.log('Affiliate Pro account granted to:', affiliate.email)
      }
    }

    try {
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'OneMed <contato@onemedcursos.com.br>',
          to: [affiliate.email],
          subject: 'Parabéns! Você fez uma venda na OneMed',
          html: affiliateSaleEmailHtml(affiliate.name, {
            planLabel: PLAN_CONTENT_NAMES[buyer.plan] || buyer.plan,
            amount,
            commission,
            buyerName: buyer.name || '',
            proUnlocked,
            totalSales,
          }),
        }),
      })
      if (!emailRes.ok) console.error('affiliate sale email failed:', await emailRes.text())
      else console.log('Affiliate sale email sent to:', affiliate.email)
    } catch (e: any) {
      console.error('affiliate sale email error:', e?.message || e)
    }
  } catch (err: any) {
    console.error('processAffiliateSale error:', err?.message || err)
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
      // 500 de propósito: responder 'ok' marcava a notificação como entregue
      // e o MP nunca reenviava — uma falha passageira da API do MP virava
      // pagamento aprovado sem acesso, pra sempre.
      console.error('Failed to fetch payment from MP:', JSON.stringify(payment))
      return new Response('retry', { status: 500, headers: getCorsHeaders(req) })
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
      // Erro de consulta ≠ comprador inexistente: seguir adiante com buyer
      // nulo caía no caminho de "sem comprador" e devolvia 200 — o MP não
      // reenviava e o acesso nunca era concedido. 500 força o retry.
      console.error('Error fetching buyer:', fetchErr.message)
      return new Response('retry', { status: 500, headers: getCorsHeaders(req) })
    }

    const buyer = buyerRows?.[0] || null
    console.log('Buyer found:', buyer?.id, 'email:', buyer?.email, 'externalRef:', externalRef)

    if (!buyer) {
      // Pode ser uma compra da LOJA de recursos avulsos (store-create-payment):
      // mesmo checkout, mesma referência externa, só que o pedido vive em
      // store_orders. Só entra aqui quando não é uma compra de plano — o fluxo
      // de assinatura acima não muda em nada.
      const { data: orderRows } = await supabase
        .from('store_orders')
        .select('id, status, product_name, email')
        .eq('external_reference', externalRef)

      const order = orderRows?.[0] || null
      if (order) {
        const patch: Record<string, unknown> = { status, payment_id: String(paymentId) }
        if (status === 'approved') patch.paid_at = new Date().toISOString()

        // `.neq('status','approved')` é a trava de idempotência: o MP reenvia
        // o mesmo aviso várias vezes, e um pedido já aprovado não pode ter a
        // data de pagamento reescrita a cada reenvio.
        const { error: orderErr } = await supabase
          .from('store_orders')
          .update(patch)
          .eq('id', order.id)
          .neq('status', 'approved')

        if (orderErr) console.error('Erro ao atualizar pedido da loja:', orderErr.message)
        else console.log('Pedido da loja atualizado:', order.id, order.product_name, '->', status)

        return new Response('ok', { headers: getCorsHeaders(req) })
      }

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

    // Reembolso / estorno: reverte a comissão de afiliado ainda não paga —
    // uma venda que a OneMed devolveu não pode gerar comissão a pagar nem
    // contar pro Vitalício Pro grátis. Só mexe em linhas 'pending' (se já foi
    // paga via PIX, marcar aqui não desfaz o pagamento — fica pro admin
    // acertar; o log registra o caso).
    if (['refunded', 'charged_back', 'cancelled'].includes(status)) {
      const { data: reversed, error: revErr } = await supabase.from('affiliate_sales')
        .update({ status: 'reversed' })
        .eq('external_reference', externalRef)
        .eq('status', 'pending')
        .select('id, commission_amount')
      if (revErr) console.error('Erro ao reverter comissão:', revErr.message)
      else if (reversed && reversed.length > 0) {
        console.log('Comissão de afiliado revertida:', externalRef, status)
      } else {
        // Nenhuma linha pending — ou não havia comissão, ou já foi paga.
        const { data: paid } = await supabase.from('affiliate_sales')
          .select('id').eq('external_reference', externalRef).eq('status', 'paid').maybeSingle()
        if (paid) console.warn('ATENÇÃO: venda estornada mas comissão já PAGA ao afiliado:', externalRef)
      }
    }

    // Dinheiro devolvido de verdade (reembolso/estorno) também tira o acesso
    // que ESTA compra liberou — antes só a comissão do afiliado era revertida
    // e o comprador seguia com acesso vitalício depois de receber o dinheiro
    // de volta.
    //
    // 'cancelled' fica de fora de propósito: no Mercado Pago é quase sempre um
    // boleto/PIX que expirou sem pagamento, e aí nenhum acesso foi concedido.
    //
    // Duas travas antes de revogar: (1) só se ESTA compra tinha concedido o
    // acesso (access_granted), e (2) só se não houver OUTRA compra aprovada do
    // mesmo e-mail sustentando o acesso — quem reembolsou o Mensal e depois
    // comprou o Vitalício não pode perder o Vitalício.
    if (['refunded', 'charged_back'].includes(status) && buyer.access_granted && buyer.email) {
      const emailComprador = String(buyer.email).toLowerCase()

      // ⚠️ `eq`, NUNCA `ilike`: no LIKE o `_` é curinga de um caractere, então
      // um estorno de `ana_paula@gmail.com` casaria com `anaXpaula@gmail.com`
      // e revogaria o acesso de OUTRA pessoa. Os e-mails são gravados em
      // minúsculas nos dois lados, então a comparação exata basta.
      const { data: outrasCompras } = await supabase.from('buyers')
        .select('id, plan')
        .eq('email', emailComprador)
        .eq('status', 'approved')
        .eq('access_granted', true)
        .neq('id', buyer.id)

      // Compra de TELAS EXTRAS não sustenta acesso nenhum — ela só soma telas
      // a um plano que já existe. Contá-la como "outra compra" faria um
      // reembolso do plano deixar a pessoa com acesso completo de graça.
      const sustentaAcesso = (outrasCompras || []).some(c => c.plan !== 'screens')

      // Revoga só o acesso do TIPO que esta compra concedeu. Não há marcador
      // de "concedido à mão" em `accesses`, então este é o critério que
      // protege a cortesia: quem tem um vitalício dado pelo dono e reembolsa
      // um Mensal (access_type 'paid') mantém o vitalício, porque os tipos não
      // batem. É deliberadamente conservador — na dúvida, não tira acesso.
      const tipoDestaCompra = PLAN_ACCESS_TYPE[buyer.plan] || 'paid'

      if (sustentaAcesso) {
        console.warn('Estorno sem revogar: outra compra aprovada sustenta o acesso de', emailComprador)
      } else {
        const { error: revokeErr } = await supabase.from('accesses')
          .update({ status: 'revoked' })
          .eq('email', emailComprador)
          .eq('status', 'active')
          .eq('access_type', tipoDestaCompra)
        if (revokeErr) console.error('Erro ao revogar acesso após estorno:', revokeErr.message)
        else console.log('Acesso revogado após', status, 'para', emailComprador)
        await supabase.from('buyers').update({ access_granted: false }).eq('id', buyer.id)
      }
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

      // Uso do cupom contado AQUI, não na criação da preferência: quem abre o
      // checkout e desiste não pode gastar um uso de um cupom com limite. A
      // flag atômica acima garante uma contagem por venda, mesmo com webhook
      // repetido. Falha aqui não desfaz a venda — o acesso vale mais que a
      // estatística do cupom.
      if (buyer.coupon_code) {
        const { data: cupom } = await supabase.from('coupons')
          .select('id').ilike('code', String(buyer.coupon_code)).maybeSingle()
        if (cupom?.id) {
          const { error: incErr } = await supabase.rpc('increment_coupon_use', { _coupon_id: cupom.id })
          if (incErr) console.error('Erro ao contar uso do cupom:', incErr.message)
        }
      }

      // Telas simultâneas extras compradas nesta transação (upsell no checkout
      // OU compra avulsa no perfil). A flag atômica acima garante que este
      // bloco roda UMA vez por venda, então o add_screen_addon (que ACUMULA)
      // não corre risco de dobrar.
      const telasExtras = Number(buyer.extra_screens || 0)

      // Compra AVULSA de telas: não concede plano nenhum, só soma as telas.
      if (buyer.plan === 'screens') {
        if (telasExtras > 0) {
          const { error: scrErr } = await supabase.rpc('add_screen_addon', { _email: buyer.email, _n: telasExtras })
          if (scrErr) {
            // Falhou: libera a flag e força o retry do MP (o add_screen_addon é
            // atômico, então re-rodar aplica exatamente uma vez).
            console.error('add_screen_addon (avulso):', scrErr.message)
            await supabase.from('buyers').update({ access_granted: false }).eq('id', buyer.id)
            return new Response('retry', { status: 500, headers: getCorsHeaders(req) })
          }
          console.log('Telas extras (avulso) aplicadas:', buyer.email, '+', telasExtras)
        }
        return new Response('ok', { headers: getCorsHeaders(req) })
      }

      // Annual/monthly plans expire out; lifetime (e as camadas Plus/Pro)
      // nunca expira. Isso também alimenta o "Renovar Assinatura" do painel
      // da conta — sem expiry, uma compra anual parecia idêntica a vitalícia.
      const accessType = PLAN_ACCESS_TYPE[buyer.plan] || 'paid'
      const durationDays = PLAN_DURATION_DAYS[buyer.plan]

      const { data: existingAccess } = await supabase
        .from('accesses')
        .select('id, access_type, expires_at')
        .eq('email', buyer.email)
        .eq('status', 'active')
        .neq('access_type', 'trial')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Renovação ANTECIPADA soma ao que ainda resta em vez de reiniciar a
      // contagem de hoje (ver billing-rules.ts).
      const expiresAt = novoVencimento({
        duracaoEmDias: durationDays,
        vencimentoAtual: existingAccess?.expires_at,
        agoraMs: Date.now(),
      })

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
        if (updateErr) {
          // A flag de idempotência já foi tomada lá em cima; se a concessão
          // falhou, ela PRECISA voltar pra false — senão todo retry do MP
          // bate no "already granted" e o cliente pago fica sem acesso pra
          // sempre. Devolve 500 pra o MP tentar de novo.
          console.error('Error renewing access:', updateErr.message)
          await supabase.from('buyers').update({ access_granted: false }).eq('id', buyer.id)
          return new Response('retry', { status: 500, headers: getCorsHeaders(req) })
        }
        console.log('Access renewed for:', buyer.email)
        if (BACKUP_FOLDER_PLANS.has(accessType)) await shareBackupFolder(supabase, buyer.email)
      } else {
        const { error: accessErr } = await supabase.from('accesses').insert({
          email: buyer.email,
          access_type: accessType,
          status: 'active',
          expires_at: expiresAt,
          whatsapp: buyer.whatsapp,
        })

        if (accessErr) {
          // Mesmo caso do update acima: libera a flag e força o retry do MP.
          console.error('Error inserting access:', accessErr.message)
          await supabase.from('buyers').update({ access_granted: false }).eq('id', buyer.id)
          return new Response('retry', { status: 500, headers: getCorsHeaders(req) })
        }
        console.log('Access granted for:', buyer.email)
        if (BACKUP_FOLDER_PLANS.has(accessType)) await shareBackupFolder(supabase, buyer.email)
      }

      // Telas extras compradas JUNTO do plano (upsell do checkout). Aplicadas
      // DEPOIS do grant e como último passo crítico: se falhar, libera a flag e
      // força o retry (nada depois disto reseta a flag, então não dobra).
      if (telasExtras > 0) {
        const { error: scrErr } = await supabase.rpc('add_screen_addon', { _email: buyer.email, _n: telasExtras })
        if (scrErr) {
          console.error('add_screen_addon (upsell):', scrErr.message)
          await supabase.from('buyers').update({ access_granted: false }).eq('id', buyer.id)
          return new Response('retry', { status: 500, headers: getCorsHeaders(req) })
        }
        console.log('Telas extras (upsell) aplicadas:', buyer.email, '+', telasExtras)
      }

      // Send Meta CAPI Purchase event (server-side — independente de cookies do browser)
      try {
        await sendMetaCAPIEvent(supabase, {
          email: buyer.email,
          name: buyer.name,
          phone: buyer.whatsapp,
          fbp: buyer.fbp ?? null,
          fbc: buyer.fbc ?? null,
          fbclid: buyer.fbclid ?? null,
          clientIp: buyer.client_ip ?? null,
          clientUserAgent: buyer.client_user_agent ?? null,
          value: payment.transaction_amount ?? buyer.amount ?? 0,
          plan: buyer.plan,
          paymentId: String(paymentId),
          buyerId: buyer.id,
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

      // Comissão de afiliado (se a compra usou cupom de afiliado)
      await processAffiliateSale(supabase, buyer, payment.transaction_amount ?? buyer.amount ?? 0, String(paymentId))
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
