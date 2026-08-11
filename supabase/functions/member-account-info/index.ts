// ─────────────────────────────────────────────────────────────────────────────
// OneMed · member-account-info
// Returns the logged-in member's own plan/expiry — accesses and buyers are
// admin-only tables under RLS, so a member can't just select their own row;
// this looks it up with the service role, scoped to the caller's own email.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

// Pra calcular o desconto do upgrade quando não há compra registrada (ex:
// acesso concedido manualmente pelo admin, sem linha em buyers) — conta
// como se já tivesse "pago" o preço de tabela do plano atual, não zero.
const PLAN_PRICES: Record<string, number> = {
  monthly: 99.00,
  annual: 299.00,
  lifetime: 499.00,
  lifetime_plus: 798.00,
  lifetime_pro: 1497.00,
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    if (!jwt) return jsonResponse(req, { error: 'Não autenticado' }, 401)
    const { data: userData } = await supabase.auth.getUser(jwt)
    if (!userData?.user) return jsonResponse(req, { error: 'Sessão inválida' }, 401)
    const user = userData.user
    const email = (user.email || '').toLowerCase()

    const [{ data: isAdmin }, { data: buyer }, { data: accessRows }] = await Promise.all([
      supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
      supabase.from('buyers').select('plan, amount, whatsapp, created_at')
        .eq('email', email).eq('access_granted', true)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('accesses').select('access_type, whatsapp, expires_at, granted_at')
        .eq('email', email).eq('status', 'active'),
    ])

    const nonTrialRows = (accessRows || []).filter(a => a.access_type !== 'trial')
    const trialRows = (accessRows || []).filter(a => a.access_type === 'trial')

    // lifetime/lifetime_plus/lifetime_pro contam igual pra "nunca expira" —
    // Plus/Pro só adicionam perks (backup no Drive, mais telas), não mudam
    // a duração do acesso à plataforma.
    const LIFETIME_TIER_RANK: Record<string, number> = { lifetime: 1, lifetime_plus: 2, lifetime_pro: 3 }
    const LIFETIME_PLANS = new Set(Object.keys(LIFETIME_TIER_RANK))
    const isLifetime = !!isAdmin || LIFETIME_PLANS.has(buyer?.plan || '') || nonTrialRows.some(a => LIFETIME_PLANS.has(a.access_type))

    let expiresAt: string | null = null
    let plan: string | null = null
    let grantedAt: string | null = null

    if (isAdmin) {
      plan = 'admin'
    } else if (isLifetime) {
      // Uma conta pode ter mais de uma linha "active" em accesses (ex: grant
      // manual antigo nunca desativado ao fazer upgrade) — sempre usa a de
      // maior tier, nunca "a primeira que aparecer" nem só o buyer mais
      // recente, senão um upgrade pode continuar mostrando o plano antigo.
      const bestAccessRow = nonTrialRows
        .filter(a => LIFETIME_PLANS.has(a.access_type))
        .sort((a, b) => LIFETIME_TIER_RANK[b.access_type] - LIFETIME_TIER_RANK[a.access_type])[0]
      const buyerTier = buyer?.plan && LIFETIME_PLANS.has(buyer.plan) ? buyer.plan : undefined
      plan = [buyerTier, bestAccessRow?.access_type].filter((p): p is string => !!p)
        .sort((a, b) => LIFETIME_TIER_RANK[b] - LIFETIME_TIER_RANK[a])[0] || 'lifetime'
      grantedAt = buyer?.created_at || bestAccessRow?.granted_at || null
    } else if (nonTrialRows.length > 0 || buyer) {
      // Comprador (pago/anual) tem prioridade sobre um trial antigo que ainda esteja ativo
      plan = buyer?.plan || nonTrialRows[0]?.access_type || null
      const expiries = nonTrialRows.map(a => a.expires_at).filter((d): d is string => !!d)
      if (expiries.length > 0) expiresAt = expiries.sort().at(-1)!
      grantedAt = buyer?.created_at || nonTrialRows[0]?.granted_at || null
    } else if (trialRows.length > 0) {
      plan = 'trial'
      const expiries = trialRows.map(a => a.expires_at).filter((d): d is string => !!d)
      if (expiries.length > 0) expiresAt = expiries.sort().at(-1)!
      grantedAt = trialRows[0]?.granted_at || null
    }

    // "Valor" nos detalhes do plano: SEMPRE o preço de tabela do plano ATUAL
    // (decisão do dono, 11/08). Depois de um upgrade, a última linha de buyers
    // guarda só a DIFERENÇA paga (ex.: R$ 200 do Anual→Vitalício) — mostrar
    // isso fazia o plano parecer valer R$ 200. Plano sem preço de tabela
    // conhecido (legado) cai no valor realmente pago.
    const realAmountPaid = buyer?.amount ? Number(buyer.amount) : 0
    const amountPaid = (plan && PLAN_PRICES[plan]) ? PLAN_PRICES[plan] : realAmountPaid

    const whatsapp = buyer?.whatsapp || nonTrialRows.find(a => a.whatsapp)?.whatsapp || null

    return jsonResponse(req, { email, plan, isLifetime, isAdmin: !!isAdmin, expiresAt, amountPaid, whatsapp, grantedAt })
  } catch (err: any) {
    console.error(err)
    return jsonResponse(req, { error: err.message }, 500)
  }
})
