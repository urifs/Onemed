import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  }
}

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
// 10 tentativas por email a cada 60 minutos
async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  identifier: string,
  action: string,
  maxAttempts: number,
  windowMinutes: number
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const now = new Date()
  const windowMs = windowMinutes * 60 * 1000

  const { data: existing } = await supabase
    .from('rate_limits')
    .select('attempts, window_start')
    .eq('identifier', identifier)
    .eq('action', action)
    .maybeSingle()

  if (!existing || (now.getTime() - new Date(existing.window_start).getTime()) > windowMs) {
    await supabase.from('rate_limits').upsert(
      { identifier, action, attempts: 1, window_start: now.toISOString() },
      { onConflict: 'identifier,action' }
    )
    return { allowed: true }
  }

  if (existing.attempts >= maxAttempts) {
    const windowExpiry = new Date(new Date(existing.window_start).getTime() + windowMs)
    const retryAfterSeconds = Math.ceil((windowExpiry.getTime() - now.getTime()) / 1000)
    return { allowed: false, retryAfterSeconds }
  }

  await supabase.from('rate_limits')
    .update({ attempts: existing.attempts + 1 })
    .eq('identifier', identifier)
    .eq('action', action)

  return { allowed: true }
}

// ─── Preços canônicos definidos SERVER-SIDE ───────────────────────────────────
const PLAN_PRICES: Record<string, number> = {
  monthly:       99.00,
  annual:        199.00,
  lifetime:      299.90,
  lifetime_plus: 599.00,
  lifetime_pro:  997.00,
}

const UPSELL_PRICE  = 19.90
const UPSELL2_PRICE = 9.90

const PLAN_LABELS: Record<string, string> = {
  monthly:       'OneMed Mensal - 30 Dias de Acesso',
  annual:        'OneMed Anual - 12 Meses de Acesso',
  lifetime:      'OneMed Vitalicio - Acesso Permanente',
  lifetime_plus: 'OneMed Vitalicio Plus - Backup Drive + 4 Telas',
  lifetime_pro:  'OneMed Vitalicio Pro - IA Meduf + Backup Exclusivo + 6 Telas',
}

// Nome curto pra mensagens de erro (restrição de cupom) — PLAN_LABELS é o
// título completo do item no Mercado Pago, verboso demais pra essa frase.
const PLAN_DISPLAY_NAMES: Record<string, string> = {
  monthly:       'Plano Mensal',
  annual:        'Plano Anual',
  lifetime:      'Plano Vitalício',
  lifetime_plus: 'Plano Vitalício Plus',
  lifetime_pro:  'Plano Vitalício Pro',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) })

  try {
    const { plan, email, name, whatsapp, externalReference, couponCode, upsell, upsell2, isUpgrade } = await req.json()

    // ── 1. Validar plano contra allowlist ─────────────────────────────────────
    if (!PLAN_PRICES[plan]) {
      return new Response(JSON.stringify({ error: 'Plano inválido' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const accessToken  = Deno.env.get('MP_ACCESS_TOKEN_PROD') || Deno.env.get('MP_ACCESS_TOKEN_TEST')
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase     = createClient(supabaseUrl, supabaseKey)

    const supabaseProjectRef = supabaseUrl?.match(/https:\/\/([^.]+)/)?.[1] || 'jrrybiohwqabsdurqudc'
    const supabaseAnonKey    = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const webhookUrl = `https://${supabaseProjectRef}.supabase.co/functions/v1/mp-webhook?apikey=${supabaseAnonKey}`

    // ── 2. Rate limiting por email (degradado graciosamente se tabela não existir) ──
    if (email) {
      try {
        const rl = await checkRateLimit(supabase, email.toLowerCase().trim(), 'create_payment', 10, 60)
        if (!rl.allowed) {
          return new Response(JSON.stringify({
            error: 'Muitas tentativas de pagamento. Tente novamente mais tarde.',
            retryAfterSeconds: rl.retryAfterSeconds,
          }), {
            status: 429,
            headers: {
              ...getCorsHeaders(req),
              'Content-Type': 'application/json',
              'Retry-After': String(rl.retryAfterSeconds ?? 3600),
            }
          })
        }
      } catch (rlErr: any) {
        console.warn('Rate limit check failed (migration pendente?):', rlErr.message)
        // Continua sem rate limit — não bloqueia o fluxo de pagamento
      }
    }

    // ── 3. Calcular preço base server-side ────────────────────────────────────
    let basePrice = PLAN_PRICES[plan]
    let discountPercent = 0
    let appliedCoupon: string | null = null
    // Código (não id) do cupom aplicado — gravado em buyers.coupon_code para o
    // mp-webhook atribuir a venda ao afiliado dono do cupom.
    let appliedCouponCode: string | null = null

    // ── 3b. Upgrade de plano: cobra só a diferença do que a pessoa já pagou.
    // Nunca confia num "valor já pago" vindo do cliente — recalcula aqui, e só
    // libera depois de confirmar (via JWT da sessão) que quem pede o upgrade
    // é dono desse email. Sem isso, qualquer um poderia pedir um upgrade pro
    // e-mail de outra pessoa e descobrir/manipular quanto ela pagou.
    if (isUpgrade) {
      const authHeader = req.headers.get('Authorization') || ''
      const jwt = authHeader.replace(/^Bearer\s+/i, '')
      if (!jwt) {
        return new Response(JSON.stringify({ error: 'Faça login para fazer upgrade do seu plano' }), {
          status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        })
      }
      const { data: { user: callerUser }, error: authErr } = await supabase.auth.getUser(jwt)
      if (authErr || !callerUser || (callerUser.email || '').toLowerCase() !== String(email).toLowerCase().trim()) {
        return new Response(JSON.stringify({ error: 'Sessão inválida para este email' }), {
          status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        })
      }

      const normalizedEmail = String(email).toLowerCase().trim()
      const LIFETIME_TIER_RANK: Record<string, number> = { lifetime: 1, lifetime_plus: 2, lifetime_pro: 3 }

      const [{ data: previousBuyer }, { data: activeAccesses }] = await Promise.all([
        supabase.from('buyers').select('plan, amount')
          .eq('email', normalizedEmail).eq('access_granted', true)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('accesses').select('access_type')
          .eq('email', normalizedEmail).eq('status', 'active').neq('access_type', 'trial'),
      ])

      // Mesma resolução de "plano atual" do member-account-info: prefere o
      // maior tier vitalício entre buyer/accesses, nunca "o primeiro que
      // aparecer" (uma conta pode ter mais de uma linha ativa em accesses).
      const bestAccessTier = (activeAccesses || [])
        .filter(a => LIFETIME_TIER_RANK[a.access_type])
        .sort((a, b) => LIFETIME_TIER_RANK[b.access_type] - LIFETIME_TIER_RANK[a.access_type])[0]?.access_type
      const buyerTier = previousBuyer?.plan && LIFETIME_TIER_RANK[previousBuyer.plan] ? previousBuyer.plan : undefined
      const currentPlan = [buyerTier, bestAccessTier].filter((p): p is string => !!p)
        .sort((a, b) => LIFETIME_TIER_RANK[b] - LIFETIME_TIER_RANK[a])[0]
        || previousBuyer?.plan
        || (activeAccesses || [])[0]?.access_type

      // O upgrade custa a diferença entre os preços de TABELA dos dois planos
      // — nunca "preço do novo menos o que a pessoa pagou".
      //
      // Descontar o valor pago punia justamente quem comprou com cupom: um
      // Plus adquirido por R$ 299,50 (50% off) fazia o upgrade pro Pro custar
      // R$ 697,50, contra R$ 398,00 de diferença real entre os planos — e dois
      // clientes no MESMO plano viam preços diferentes pro MESMO upgrade.
      // Com a diferença de tabela, o degrau entre dois planos é fixo.
      //
      // Também resolve de graça o caso do acesso concedido à mão pelo admin
      // (sem linha em buyers): não há valor pago pra descontar, e o preço
      // continua saindo certo.
      const tabelaAtual = currentPlan ? (PLAN_PRICES[currentPlan] ?? 0) : 0

      const MIN_UPGRADE_PRICE = 1.00
      basePrice = Math.max(basePrice - tabelaAtual, MIN_UPGRADE_PRICE)
    }

    // ── 4. Validar cupom no banco (nunca confiar no desconto do cliente) ──────
    if (couponCode) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('active', true)
        .maybeSingle()

      if (coupon) {
        // Verificar expiração
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
          return new Response(JSON.stringify({ error: 'Cupom expirado' }), {
            status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
          })
        }
        // Verificar limite de usos
        if (coupon.max_uses !== null && coupon.times_used !== null && coupon.times_used >= coupon.max_uses) {
          return new Response(JSON.stringify({ error: 'Cupom esgotado' }), {
            status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
          })
        }
        // Verificar restrição de plano
        const allowedPlans = coupon.allowed_plans || 'all'
        if (allowedPlans !== 'all' && allowedPlans !== plan) {
          const planName = PLAN_DISPLAY_NAMES[allowedPlans] || allowedPlans
          return new Response(JSON.stringify({ error: `Este cupom é válido apenas para o ${planName}` }), {
            status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
          })
        }
        discountPercent = coupon.discount_percent
        appliedCoupon   = coupon.id
        appliedCouponCode = coupon.code
      } else {
        // Cupom inexistente/inativo NÃO pode passar em silêncio: a UI mostrou
        // um total com desconto e o cliente seria cobrado no preço cheio.
        return new Response(JSON.stringify({ error: 'Cupom inválido ou expirado' }), {
          status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        })
      }
    }

    // ── 5. Calcular total com desconto e upsells ──────────────────────────────
    const discountedPrice = discountPercent > 0
      ? basePrice - (basePrice * discountPercent / 100)
      : basePrice

    let totalAmount = discountedPrice
    if (upsell)  totalAmount += UPSELL_PRICE
    if (upsell2) totalAmount += UPSELL2_PRICE

    // Arredondar para 2 casas decimais
    totalAmount = Math.round(totalAmount * 100) / 100

    console.log('Creating MP preference for:', email, 'plan:', plan, 'total:', totalAmount, 'discount:', discountPercent + '%')
    console.log('Using token starting with:', accessToken?.substring(0, 20))

    const preferenceBody = {
      items: [
        {
          id: plan,
          title: (isUpgrade ? 'Upgrade - ' : '') + (PLAN_LABELS[plan] || 'OneMed - Acesso Completo'),
          description: isUpgrade ? 'Upgrade de plano na plataforma OneMed' : 'Acesso completo a plataforma OneMed',
          category_id: 'learningtools',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: totalAmount,
        },
      ],
      external_reference: externalReference,
      notification_url: webhookUrl,
      metadata: { plan, email, name, whatsapp, coupon: appliedCoupon, isUpgrade: !!isUpgrade },
      back_urls: {
        success: 'https://onemedcursos.com.br/payment/success',
        failure: 'https://onemedcursos.com.br/payment/error',
        pending: 'https://onemedcursos.com.br/payment/pending',
      },
      auto_return: 'approved',
    }

    console.log('Preference body:', JSON.stringify(preferenceBody))

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': externalReference || crypto.randomUUID(),
      },
      body: JSON.stringify(preferenceBody),
    })

    const mpData = await mpRes.json()
    console.log('MP response status:', mpRes.status)
    console.log('MP response body:', JSON.stringify(mpData))

    if (!mpRes.ok) {
      throw new Error(`MP Error ${mpRes.status}: ${JSON.stringify(mpData)}`)
    }

    console.log('MP preference created:', mpData.id)

    // Atualizar buyer com payment_id e valor calculado server-side.
    //
    // Guarda também o IP e o user-agent do COMPRADOR: são duas chaves de
    // correspondência da Meta CAPI que só existem aqui. No mp-webhook a
    // requisição vem de um servidor do Mercado Pago, então o IP de lá é do
    // MP — usá-lo pioraria a correspondência em vez de melhorar.
    const clientIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
      || req.headers.get('x-real-ip')
      || null
    const clientUserAgent = req.headers.get('user-agent') || null

    // `plan` entra AQUI de propósito, com o valor já validado pela tabela de
    // preços: a linha de buyers é inserida pelo NAVEGADOR (RLS permite), então
    // sem sobrescrever o plano validado um cliente malicioso podia gravar
    // plan:'lifetime_pro' na linha, pagar o preço do mensal e o webhook — que
    // concede acesso pelo buyers.plan — liberaria o plano caro.
    const { data: updatedBuyers, error: buyerUpdateErr } = await supabase.from('buyers').update({
      plan,
      payment_id: mpData.id,
      amount: totalAmount,
      // Valor do PLANO após desconto, SEM os upsells: é a base da comissão de
      // afiliado (decisão do dono — comissão não incide sobre complementos).
      plan_amount: Math.round(discountedPrice * 100) / 100,
      client_ip: clientIp,
      client_user_agent: clientUserAgent,
      coupon_code: appliedCouponCode,
    }).eq('external_reference', externalReference).select('id')

    // Se nenhuma linha casou, o webhook nunca vai achar esse comprador e o
    // pagamento aprovado ficaria sem acesso — melhor falhar agora, antes do
    // cliente pagar, do que depois.
    if (buyerUpdateErr || !updatedBuyers || updatedBuyers.length === 0) {
      console.error('Buyer row missing for external_reference', externalReference, buyerUpdateErr?.message)
      return new Response(JSON.stringify({ error: 'Registro da compra não encontrado. Recarregue a página e tente novamente.' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // Incrementar uso do cupom se aplicado — atômico no banco: o
    // SELECT-depois-UPDATE antigo perdia incrementos com checkouts
    // simultâneos e deixava max_uses ser ultrapassado. Se a RPC ainda não
    // existir (migration pendente), cai no caminho antigo.
    if (appliedCoupon) {
      const { error: incErr } = await supabase.rpc('increment_coupon_use', { _coupon_id: appliedCoupon })
      if (incErr) {
        const { data: couponRow } = await supabase
          .from('coupons')
          .select('times_used')
          .eq('id', appliedCoupon)
          .maybeSingle()

        await supabase
          .from('coupons')
          .update({ times_used: (couponRow?.times_used ?? 0) + 1 })
          .eq('id', appliedCoupon)
      }
    }

    return new Response(JSON.stringify({
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      preference_id: mpData.id,
      amount: totalAmount,
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('Unexpected error:', err?.message || err)
    return new Response(JSON.stringify({ error: err?.message || 'Erro interno' }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
