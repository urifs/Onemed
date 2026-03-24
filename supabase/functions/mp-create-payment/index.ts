import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// ─── Preços canônicos definidos SERVER-SIDE ───────────────────────────────
const PLAN_PRICES: Record<string, number> = {
  lifetime: 299.90,
  annual:   199.00,
}

const UPSELL_PRICE  = 19.90
const UPSELL2_PRICE = 9.90

const PLAN_LABELS: Record<string, string> = {
  lifetime: 'OneMed Vitalicio - Acesso Permanente',
  annual:   'OneMed Anual - 12 Meses de Acesso',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { plan, email, name, whatsapp, externalReference, couponCode, upsell, upsell2 } = await req.json()

    // ── 1. Validar plano contra allowlist ─────────────────────────────────
    if (!PLAN_PRICES[plan]) {
      return new Response(JSON.stringify({ error: 'Plano inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const accessToken = Deno.env.get('MP_ACCESS_TOKEN_PROD') || Deno.env.get('MP_ACCESS_TOKEN_TEST')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const supabaseProjectRef = supabaseUrl?.match(/https:\/\/([^.]+)/)?.[1] || 'nxhdbpqgfvinwtrmtohz'
    const webhookUrl = `https://${supabaseProjectRef}.supabase.co/functions/v1/mp-webhook`

    // ── 2. Calcular preço base server-side ────────────────────────────────
    let basePrice = PLAN_PRICES[plan]
    let discountPercent = 0
    let appliedCoupon: string | null = null

    // ── 3. Validar cupom no banco (nunca confiar no desconto do cliente) ──
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
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        // Verificar limite de usos
        if (coupon.max_uses !== null && coupon.times_used !== null && coupon.times_used >= coupon.max_uses) {
          return new Response(JSON.stringify({ error: 'Cupom esgotado' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        discountPercent = coupon.discount_percent
        appliedCoupon = coupon.id
      }
    }

    // ── 4. Calcular total com desconto e upsells ──────────────────────────
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
          title: PLAN_LABELS[plan] || 'OneMed - Acesso Completo',
          description: 'Acesso completo a plataforma OneMed',
          category_id: 'learningtools',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: totalAmount,
        },
      ],
      external_reference: externalReference,
      notification_url: webhookUrl,
      metadata: { plan, email, name, whatsapp, coupon: appliedCoupon },
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

    // Atualizar buyer com payment_id e valor calculado server-side
    await supabase.from('buyers').update({
      payment_id: mpData.id,
      amount: totalAmount,
    }).eq('external_reference', externalReference)

    // Incrementar uso do cupom se aplicado
    if (appliedCoupon) {
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

    return new Response(JSON.stringify({
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      preference_id: mpData.id,
      amount: totalAmount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('Unexpected error:', err?.message || err)
    return new Response(JSON.stringify({ error: err?.message || 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
