import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const MP_TOKEN    = Deno.env.get('MP_ACCESS_TOKEN_PROD') || Deno.env.get('MP_ACCESS_TOKEN_TEST')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase    = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

    // ── Auth: apenas admin ────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    // ── Buscar compradores pendentes com external_reference ───────────────────
    const { data: pendingBuyers, error: fetchErr } = await supabase
      .from('buyers')
      .select('*')
      .eq('status', 'pending')
      .not('external_reference', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (fetchErr) throw fetchErr

    console.log(`Syncing ${pendingBuyers?.length ?? 0} pending buyers`)

    const results = { synced: 0, failed: 0, already_granted: 0, still_pending: 0, errors: [] as string[] }

    for (const buyer of pendingBuyers || []) {
      try {
        // Consultar MP por external_reference
        const mpRes = await fetch(
          `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(buyer.external_reference)}&sort=date_created&criteria=desc&limit=1`,
          { headers: { 'Authorization': `Bearer ${MP_TOKEN}` } }
        )
        const mpData = await mpRes.json()

        if (!mpRes.ok) {
          console.error('MP search error for', buyer.external_reference, JSON.stringify(mpData))
          results.failed++
          results.errors.push(`${buyer.email}: MP API error`)
          continue
        }

        const payment = mpData.results?.[0]
        if (!payment) {
          results.still_pending++
          continue
        }

        const paymentStatus = payment.status

        // Atualizar status do buyer
        await supabase
          .from('buyers')
          .update({ status: paymentStatus, payment_id: String(payment.id) })
          .eq('id', buyer.id)

        if (paymentStatus !== 'approved') {
          results.still_pending++
          continue
        }

        // Se já tinha acesso concedido, pular
        if (buyer.access_granted) {
          results.already_granted++
          continue
        }

        // Marcar acesso como concedido
        await supabase
          .from('buyers')
          .update({ access_granted: true })
          .eq('id', buyer.id)

        // Inserir em accesses se não existir
        const { data: existingAccess } = await supabase
          .from('accesses')
          .select('id')
          .eq('email', buyer.email)
          .eq('access_type', 'paid')
          .maybeSingle()

        if (!existingAccess) {
          await supabase.from('accesses').insert({
            email: buyer.email,
            access_type: 'paid',
            status: 'active',
            whatsapp: buyer.whatsapp,
          })
        }

        // Compartilhar Drive
        try {
          await supabase.functions.invoke('drive-share-folder', {
            body: { email: buyer.email }
          })
        } catch (driveErr: any) {
          console.warn('Drive share error for', buyer.email, driveErr?.message)
        }

        // Enviar email de acesso
        try {
          await supabase.functions.invoke('send-access-email', {
            body: {
              to: buyer.email,
              name: buyer.name,
              type: 'payment_approved',
              plan: buyer.plan,
            }
          })
        } catch (emailErr: any) {
          console.warn('Email error for', buyer.email, emailErr?.message)
        }

        results.synced++
        console.log('Synced buyer:', buyer.email, 'payment:', payment.id)
      } catch (err: any) {
        console.error('Error processing buyer', buyer.email, err?.message)
        results.failed++
        results.errors.push(`${buyer.email}: ${err?.message}`)
      }
    }

    console.log('Sync complete:', JSON.stringify(results))

    return new Response(JSON.stringify({
      success: true,
      total: pendingBuyers?.length ?? 0,
      ...results,
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('sync-pending-buyers error:', err)
    return new Response(JSON.stringify({ error: err?.message || 'Erro interno' }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
