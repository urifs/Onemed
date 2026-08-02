import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Checkout dos recursos avulsos da loja da área de membros. Mesmo Mercado
// Pago das assinaturas, mesma regra de ouro: o PREÇO SAI DO BANCO, nunca do
// que o navegador mandar.
//
// Diferença para o mp-create-payment: aqui o comprador é obrigatoriamente um
// usuário logado, então o e-mail vem do JWT da sessão — não há campo de
// e-mail para alguém preencher com o de outra pessoa.

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // ── 1. Quem está comprando (JWT da sessão) ─────────────────────────────
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    if (!jwt) return json(req, { error: 'Faça login para comprar' }, 401)

    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt)
    if (authErr || !user?.email) return json(req, { error: 'Sessão inválida' }, 401)
    const email = user.email.toLowerCase().trim()

    // ── 1b. Teste grátis não compra ────────────────────────────────────────
    // Precisa ser verificado aqui à mão: esta função usa a service role, que
    // ignora RLS de propósito (é ela quem grava o pedido) — então a política
    // que esconde os produtos do trial não vale dentro daqui.
    //
    // A definição é a mesma de is_trial_member(): trial ativo e NENHUM sinal
    // de pagamento. Na dúvida, deixa comprar — recusar a compra de um
    // assinante seria bem pior do que deixar passar uma venda.
    const [{ data: acessos }, { data: compras }] = await Promise.all([
      supabase.from('accesses').select('access_type').eq('email', email).eq('status', 'active'),
      supabase.from('buyers').select('id').eq('email', email).eq('access_granted', true).limit(1),
    ])
    const tipos = (acessos || []).map((a: { access_type: string }) => a.access_type)
    const soTrial = tipos.length > 0 && tipos.every(t => t === 'trial') && !(compras || []).length
    if (soTrial) {
      return json(req, { error: 'A loja é exclusiva para assinantes. Assine um plano para comprar recursos adicionais.' }, 403)
    }

    // ── 2. Produto e preço, direto do banco ────────────────────────────────
    const { productId } = await req.json()
    if (!productId) return json(req, { error: 'Produto não informado' }, 400)

    const { data: product } = await supabase
      .from('store_products')
      .select('id, name, description, price, active')
      .eq('id', productId)
      .maybeSingle()

    if (!product || !product.active) return json(req, { error: 'Produto indisponível' }, 404)

    const amount = Math.round(Number(product.price) * 100) / 100
    if (!(amount > 0)) return json(req, { error: 'Produto sem preço válido' }, 400)

    // ── 3. Pedido pendente ─────────────────────────────────────────────────
    // O prefixo é o que permite ao mp-webhook saber, só pela referência, que
    // este pagamento é da loja e não de uma assinatura.
    const externalReference = `onemed_store_${crypto.randomUUID()}`

    const { error: orderErr } = await supabase.from('store_orders').insert({
      product_id: product.id,
      product_name: product.name,
      user_id: user.id,
      email,
      price_paid: amount,
      status: 'pending',
      external_reference: externalReference,
    })
    if (orderErr) {
      console.error('Erro ao criar pedido:', orderErr.message)
      return json(req, { error: 'Não foi possível iniciar a compra' }, 500)
    }

    // ── 4. Preferência no Mercado Pago ─────────────────────────────────────
    const accessToken = Deno.env.get('MP_ACCESS_TOKEN_PROD') || Deno.env.get('MP_ACCESS_TOKEN_TEST')
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] || 'jrrybiohwqabsdurqudc'
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/mp-webhook?apikey=${anonKey}`

    const preferenceBody = {
      items: [{
        id: product.id,
        title: product.name.slice(0, 250),
        description: (product.description || 'Recurso adicional OneMed').slice(0, 250),
        category_id: 'learningtools',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: amount,
      }],
      payer: { email },
      external_reference: externalReference,
      notification_url: webhookUrl,
      metadata: { kind: 'store', productId: product.id, email },
      back_urls: {
        success: 'https://onemedcursos.com.br/membros/loja?compra=aprovada',
        failure: 'https://onemedcursos.com.br/membros/loja?compra=recusada',
        pending: 'https://onemedcursos.com.br/membros/loja?compra=pendente',
      },
      auto_return: 'approved',
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': externalReference,
      },
      body: JSON.stringify(preferenceBody),
    })

    const mpData = await mpRes.json()
    if (!mpRes.ok) {
      console.error('MP error', mpRes.status, JSON.stringify(mpData))
      return json(req, { error: 'Não foi possível abrir o checkout' }, 502)
    }

    await supabase.from('store_orders')
      .update({ payment_id: String(mpData.id) })
      .eq('external_reference', externalReference)

    return json(req, {
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      amount,
    })
  } catch (err: any) {
    console.error('Erro inesperado:', err?.message || err)
    return json(req, { error: 'Erro interno' }, 500)
  }
})
