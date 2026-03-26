import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://onemedcursos.com.br',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = 'https://onemedcursos.com.br'
const SITE_NAME = 'OneMed'
const FROM_EMAIL = 'noreply@onemedcursos.com.br'
const WHATSAPP_URL = 'https://wa.me/5545991220048?text=Ol%C3%A1!%20Tenho%20interesse%20no%20OneMed.'

interface FollowupConfig {
  days: number
  type: string
  couponCode: string
  discount: number
  subjectText: string
  message: string
  urgency: string
  annualPrice: string
  lifetimePrice: string
}

const FOLLOWUP_CONFIGS: FollowupConfig[] = [
  {
    days: 1,
    type: 'followup_1d',
    couponCode: 'ONEMED10',
    discount: 10,
    subjectText: 'Sentimos sua falta!',
    message: 'Notamos que voce experimentou nosso conteudo ontem. Esperamos que tenha gostado!',
    urgency: 'Aproveite nossa oferta especial e garanta acesso ilimitado a todo o conteudo.',
    annualPrice: 'R$ 179,10',
    lifetimePrice: 'R$ 269,10',
  },
  {
    days: 7,
    type: 'followup_7d',
    couponCode: 'ONEMED20',
    discount: 20,
    subjectText: 'Uma semana se passou...',
    message: 'Faz uma semana que voce testou o OneMed. Sentimos sua falta!',
    urgency: 'Milhares de medicos ja garantiram acesso. Nao fique de fora!',
    annualPrice: 'R$ 159,20',
    lifetimePrice: 'R$ 239,20',
  },
  {
    days: 30,
    type: 'followup_30d',
    couponCode: 'ONEMED30',
    discount: 30,
    subjectText: 'Ultima chance!',
    message: 'Faz um mes que voce conheceu o OneMed. Esta pode ser sua ultima oportunidade!',
    urgency: 'Garanta seu acesso agora e transforme sua carreira medica.',
    annualPrice: 'R$ 139,30',
    lifetimePrice: 'R$ 209,30',
  },
]

function getBaseTemplate(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0A0A0A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0A0A0A;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #111111; border-radius: 16px; border: 1px solid rgba(239, 68, 68, 0.2);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); width: 50px; height: 50px; border-radius: 12px; text-align: center; vertical-align: middle;">
                    <span style="color: white; font-size: 24px; font-weight: bold;">+</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="color: white; font-size: 28px; font-weight: bold;">One</span><span style="color: #EF4444; font-size: 28px; font-weight: bold;">Med</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- WhatsApp Support -->
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: rgba(34, 197, 94, 0.1); border-radius: 12px; border: 1px solid rgba(34, 197, 94, 0.3);">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="color: #94A3B8; font-size: 14px; margin: 0 0 12px;">
                      Precisa de ajuda? Fale com nosso suporte!
                    </p>
                    <a href="${WHATSAPP_URL}" style="display: inline-block; background-color: #22C55E; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: bold;">
                      Suporte via WhatsApp
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #0A0A0A; border-radius: 0 0 16px 16px; border-top: 1px solid rgba(255,255,255,0.1);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="color: #64748B; font-size: 14px; margin: 0 0 10px;">
                      O maior acervo de conteudos medicos da America Latina
                    </p>
                    <p style="color: #475569; font-size: 12px; margin: 0;">
                      &copy; 2026 OneMed. Todos os direitos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function getFollowupEmailHtml(email: string, cfg: FollowupConfig): string {
  const content = `
    <h1 style="color: white; font-size: 28px; margin: 0 0 20px; text-align: center;">
      ${cfg.subjectText}
    </h1>

    <p style="color: #94A3B8; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
      Ola!
    </p>

    <p style="color: #94A3B8; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
      ${cfg.message}
    </p>

    <!-- Coupon Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(21, 128, 61, 0.15) 100%); border-radius: 12px; border: 2px dashed rgba(34, 197, 94, 0.5); margin: 20px 0;">
      <tr>
        <td style="padding: 24px; text-align: center;">
          <p style="color: #22C55E; font-size: 14px; font-weight: bold; margin: 0 0 8px; text-transform: uppercase;">
            Cupom Exclusivo
          </p>
          <p style="color: white; font-size: 32px; font-weight: bold; margin: 0 0 8px; letter-spacing: 4px;">
            ${cfg.couponCode}
          </p>
          <p style="color: #22C55E; font-size: 20px; font-weight: bold; margin: 0;">
            ${cfg.discount}% DE DESCONTO
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(153, 27, 27, 0.1) 100%); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3); margin: 20px 0;">
      <tr>
        <td style="padding: 24px; text-align: center;">
          <p style="color: white; font-size: 18px; font-weight: bold; margin: 0;">
            ${cfg.urgency}
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: white; font-size: 20px; margin: 30px 0 15px;">
      O que voce esta perdendo:
    </h2>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding: 10px 0;"><span style="color: #EF4444; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">+530 cursos de medicina</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #EF4444; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">+9.000 livros medicos atualizados</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #EF4444; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">Material completo para Residencia e Revalida</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #EF4444; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">Atualizacoes constantes</span></td></tr>
    </table>

    <!-- Prices side by side -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
      <tr>
        <td style="background-color: #1a1a1a; border-radius: 12px; padding: 20px;">
          <p style="color: #22C55E; font-size: 14px; text-align: center; margin: 0 0 15px;">
            Precos com seu cupom de ${cfg.discount}% de desconto:
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="width: 50%; padding: 10px; text-align: center; border-right: 1px solid #333;">
                <p style="color: #64748B; font-size: 12px; margin: 0;">PLANO ANUAL</p>
                <p style="color: #64748B; font-size: 14px; margin: 5px 0; text-decoration: line-through;">R$ 199,00</p>
                <p style="color: #22C55E; font-size: 24px; font-weight: bold; margin: 0;">${cfg.annualPrice}</p>
                <p style="color: #94A3B8; font-size: 12px; margin: 5px 0 0;">12 meses de acesso</p>
              </td>
              <td style="width: 50%; padding: 10px; text-align: center;">
                <p style="color: #64748B; font-size: 12px; margin: 0;">PLANO VITALICIO</p>
                <p style="color: #64748B; font-size: 14px; margin: 5px 0; text-decoration: line-through;">R$ 299,90</p>
                <p style="color: #22C55E; font-size: 24px; font-weight: bold; margin: 0;">${cfg.lifetimePrice}</p>
                <p style="color: #94A3B8; font-size: 12px; margin: 5px 0 0;">Acesso para sempre</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding: 10px 0 20px;">
          <a href="${SITE_URL}/checkout?plan=lifetime&coupon=${cfg.couponCode}" style="display: inline-block; background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold;">
            Usar Cupom e Garantir Acesso
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #64748B; font-size: 12px; text-align: center; margin: 10px 0 0;">
      Use o codigo <strong style="color: #22C55E;">${cfg.couponCode}</strong> no checkout para aplicar o desconto
    </p>

    <p style="color: #475569; font-size: 12px; text-align: center; margin: 16px 0 0;">
      Este email foi enviado para <strong style="color: #94A3B8;">${email}</strong> pois voce experimentou o OneMed gratuitamente.
    </p>
  `
  return getBaseTemplate(content, `${cfg.subjectText} - ${SITE_NAME}`)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await req.json().catch(() => ({}))
    let totalSent = 0
    const errors: string[] = []

    // Test mode: send all follow-up types directly to a specified email
    if (body.test_email) {
      const testEmail = body.test_email
      const configsToTest = body.test_days
        ? FOLLOWUP_CONFIGS.filter(c => c.days === body.test_days)
        : FOLLOWUP_CONFIGS

      for (const cfg of configsToTest) {
        const html = getFollowupEmailHtml(testEmail, cfg)
        const subject = `[TESTE] ${cfg.subjectText} - ${SITE_NAME}`
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({ from: `${SITE_NAME} <${FROM_EMAIL}>`, to: [testEmail], subject, html }),
        })
        const data = await res.json()
        if (res.ok) { totalSent++; console.log(`Test sent ${cfg.type} to ${testEmail}, id: ${data.id}`) }
        else { errors.push(`${cfg.type}: ${data.message || res.status}`) }
      }
      return new Response(JSON.stringify({ success: true, totalSent, errors, mode: 'test' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const now = new Date()

    for (const cfg of FOLLOWUP_CONFIGS) {
      const windowStart = new Date(now.getTime() - (cfg.days * 24 * 60 * 60 * 1000) - (2 * 60 * 60 * 1000))
      const windowEnd   = new Date(now.getTime() - (cfg.days * 24 * 60 * 60 * 1000) + (2 * 60 * 60 * 1000))

      const { data: trialUsers, error: fetchErr } = await supabase
        .from('accesses')
        .select('email, expires_at')
        .eq('access_type', 'trial')
        .gte('expires_at', windowStart.toISOString())
        .lte('expires_at', windowEnd.toISOString())

      if (fetchErr) {
        console.error(`Error fetching for ${cfg.type}:`, fetchErr)
        continue
      }

      if (!trialUsers || trialUsers.length === 0) {
        console.log(`No users for ${cfg.type} in window`)
        continue
      }

      for (const user of trialUsers) {
        const email = user.email

        const { data: alreadySent } = await supabase
          .from('email_followups')
          .select('id')
          .eq('email', email)
          .eq('type', cfg.type)
          .maybeSingle()

        if (alreadySent) continue

        const { data: buyer } = await supabase
          .from('buyers')
          .select('id')
          .eq('email', email)
          .eq('status', 'approved')
          .maybeSingle()

        if (buyer) {
          await supabase.from('email_followups').insert({ email, type: cfg.type })
          continue
        }

        try {
          const html = getFollowupEmailHtml(email, cfg)
          const subject = `${cfg.subjectText} - ${SITE_NAME}`

          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: `${SITE_NAME} <${FROM_EMAIL}>`,
              to: [email],
              subject,
              html,
            }),
          })

          const data = await res.json()

          if (res.ok) {
            await supabase.from('email_followups').insert({ email, type: cfg.type })
            totalSent++
            console.log(`Sent ${cfg.type} to ${email}, id: ${data.id}`)
          } else {
            console.error(`Resend error for ${email}:`, data)
            errors.push(`${email} (${cfg.type}): ${data.message || res.status}`)
          }
        } catch (e: any) {
          errors.push(`${email} (${cfg.type}): ${e.message}`)
        }
      }
    }

    return new Response(JSON.stringify({ success: true, totalSent, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('send-followup-emails error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
