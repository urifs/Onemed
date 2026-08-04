// ─────────────────────────────────────────────────────────────────────────────
// OneMed · affiliate-coupon
//
// Troca/gera o cupom do afiliado logado. Passa pelo servidor porque o cupom
// mora na tabela `coupons` (escrita restrita) e porque o código precisa de
// validação central: formato, colisão com cupons de campanha e com cupons de
// outros afiliados. O cupom antigo é DESATIVADO (não apagado) — link antigo em
// bio de rede social para de dar desconto, mas o histórico de vendas fica.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }
  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), { status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    const { data: userData } = await supabase.auth.getUser(jwt)
    if (!userData?.user) return json({ error: 'Não autenticado.' }, 401)

    const { data: affiliate } = await supabase.from('affiliates')
      .select('id, coupon_code').eq('user_id', userData.user.id).maybeSingle()
    if (!affiliate) return json({ error: 'Conta de afiliado não encontrada.' }, 403)

    const { code } = await req.json().catch(() => ({}))
    const cleanCode = String(code || '').toUpperCase().trim()

    if (!/^[A-Z0-9]{4,20}$/.test(cleanCode)) {
      return json({ error: 'O cupom deve ter de 4 a 20 letras e números, sem espaços.' }, 400)
    }
    if (cleanCode === affiliate.coupon_code) {
      return json({ success: true, couponCode: cleanCode })
    }
    // Códigos da casa (campanhas de follow-up) são reservados.
    if (/^ONEMED/.test(cleanCode)) {
      return json({ error: 'Esse código é reservado. Escolha outro.' }, 409)
    }

    const { data: existing } = await supabase.from('coupons')
      .select('id').eq('code', cleanCode).maybeSingle()
    if (existing) return json({ error: 'Esse cupom já existe. Escolha outro código.' }, 409)

    const { error: insErr } = await supabase.from('coupons')
      .insert({ code: cleanCode, discount_percent: 10, active: true, description: 'Cupom de afiliado' })
    if (insErr) {
      console.error('coupon insert error', insErr)
      return json({ error: 'Esse cupom já existe. Escolha outro código.' }, 409)
    }

    if (affiliate.coupon_code) {
      await supabase.from('coupons').update({ active: false }).eq('code', affiliate.coupon_code)
    }
    const { error: updErr } = await supabase.from('affiliates')
      .update({ coupon_code: cleanCode }).eq('id', affiliate.id)
    if (updErr) {
      console.error('affiliate update error', updErr)
      return json({ error: 'Não foi possível salvar o cupom. Tente novamente.' }, 500)
    }

    return json({ success: true, couponCode: cleanCode })
  } catch (err: any) {
    console.error('affiliate-coupon error', err)
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
