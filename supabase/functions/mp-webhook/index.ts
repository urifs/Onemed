import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN_PROD') || Deno.env.get('MP_ACCESS_TOKEN_TEST')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // Use service role client — bypasses RLS completely
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })

    const body = await req.json()
    console.log('[mp-webhook] received:', JSON.stringify(body))

    // MP sends two formats:
    // 1. Webhook: { type: "payment", data: { id: "123" } }
    // 2. IPN:     { topic: "payment", resource: "123" }
    let paymentId: string | null = null

    if (body.type === 'payment' && body.data?.id) {
      paymentId = String(body.data.id)
    } else if (body.topic === 'payment' && body.resource) {
      // IPN resource can be a full URL or just the ID
      const resource = String(body.resource)
      paymentId = resource.includes('/') ? resource.split('/').pop()! : resource
    }

    if (!paymentId) {
      console.log('No payment ID found, ignoring:', JSON.stringify(body))
      return new Response('ok', { headers: corsHeaders })
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
      return new Response('ok', { headers: corsHeaders })
    }

    const externalRef = payment.external_reference
    const status = payment.status // approved, pending, rejected, cancelled

    if (!externalRef) {
      console.log('No external_reference in payment, skipping')
      return new Response('ok', { headers: corsHeaders })
    }

    // Fetch buyer first by external_reference
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
      return new Response('ok', { headers: corsHeaders })
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
      // Skip if already granted to avoid duplicates
      if (buyer.access_granted) {
        console.log('Access already granted for:', buyer.email, '— skipping duplicate')
        return new Response('ok', { headers: corsHeaders })
      }

      // Mark access as granted
      await supabase
        .from('buyers')
        .update({ access_granted: true })
        .eq('id', buyer.id)

      // Check if access already exists (prevents race condition with duplicate webhooks)
      const { data: existingAccess } = await supabase
        .from('accesses')
        .select('id')
        .eq('email', buyer.email)
        .eq('access_type', 'paid')
        .maybeSingle()

      let accessId: string | null = existingAccess?.id || null

      if (!existingAccess) {
        const { data: newAccess, error: accessErr } = await supabase.from('accesses').insert({
          email: buyer.email,
          access_type: 'paid',
          status: 'active',
          whatsapp: buyer.whatsapp,
        }).select('id').single()

        if (accessErr) {
          console.error('Error inserting access:', accessErr.message)
        } else {
          accessId = newAccess?.id || null
          console.log('Access granted for:', buyer.email)
        }
      } else {
        console.log('Access already exists for:', buyer.email, '— skipping insert')
      }

      // Share Drive folder with the buyer's email
      try {
        const driveRes = await supabase.functions.invoke('drive-share-folder', {
          body: { email: buyer.email, accessId }
        })
        console.log('Drive folder shared with:', buyer.email, 'result:', JSON.stringify(driveRes.data))
      } catch (driveErr: any) {
        console.error('Drive share error:', driveErr?.message || driveErr)
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

    return new Response('ok', { headers: corsHeaders })
  } catch (err: any) {
    console.error('Webhook error:', err?.message || err)
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
