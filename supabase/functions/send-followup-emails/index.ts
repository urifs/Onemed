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

const SITE_URL = 'https://onemedcursos.com.br'
const SITE_NAME = 'OneMed'
const FROM_EMAIL = 'noreply@onemedcursos.com.br'
const WHATSAPP_URL = 'https://wa.me/5563999191551?text=Ol%C3%A1!%20Tenho%20interesse%20no%20OneMed.'

// Preços de tabela — MESMOS valores que o mp-create-payment cobra. Antes os
// preços com desconto eram strings escritas à mão em cada sequência e estavam
// errados no vitalício (o e-mail prometia R$ 269,10 e o checkout cobrava
// R$ 269,91), além de envelhecerem a cada mudança de tabela. Agora o e-mail
// calcula igual ao servidor: base - base * pct / 100, arredondado em 2 casas.
const PLAN_PRICES: Record<string, number> = {
  monthly:       49.00,
  annual:        199.00,
  lifetime:      299.90,
  lifetime_plus: 599.00,
  lifetime_pro:  997.00,
}

const brl = (valor: number) => `R$ ${valor.toFixed(2).replace('.', ',')}`
const comDesconto = (plano: string, pct: number) =>
  Math.round((PLAN_PRICES[plano] - (PLAN_PRICES[plano] * pct / 100)) * 100) / 100

interface FollowupConfig {
  days: number
  type: string
  couponCode: string
  discount: number
  subjectText: string
  message: string
  urgency: string
}

const FOLLOWUP_CONFIGS: FollowupConfig[] = [
  {
    days: 1,
    type: 'followup_1d',
    couponCode: 'ONEMED10',
    discount: 10,
    subjectText: 'Sentimos sua falta!',
    message: 'Notamos que você experimentou nosso conteúdo ontem. Esperamos que tenha gostado!',
    urgency: 'Aproveite nossa oferta especial e garanta acesso ilimitado a todo o conteúdo.',
  },
  {
    days: 7,
    type: 'followup_7d',
    couponCode: 'ONEMED20',
    discount: 20,
    subjectText: 'Uma semana se passou...',
    message: 'Faz uma semana que você testou o OneMed. Sentimos sua falta!',
    urgency: 'Milhares de médicos já garantiram acesso. Não fique de fora!',
  },
  {
    days: 30,
    type: 'followup_30d',
    couponCode: 'ONEMED30',
    discount: 30,
    subjectText: 'Última chance!',
    message: 'Faz um mês que você conheceu o OneMed. Esta pode ser sua última oportunidade!',
    urgency: 'Garanta seu acesso agora e transforme sua carreira médica.',
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
<body style="margin: 0; padding: 0; font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #0A0A0A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0A0A0A;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #111111; border-radius: 12px; border: 1px solid #262626;">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; text-align: center; border-bottom: 1px solid #262626;">
              <span style="color: white; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">One</span><span style="color: #EF4444; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">Med</span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- Support -->
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #161616; border-radius: 10px; border: 1px solid #262626;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="color: #94A3B8; font-size: 14px; margin: 0 0 12px;">
                      Precisa de ajuda? Fale com nosso suporte
                    </p>
                    <a href="${WHATSAPP_URL}" style="display: inline-block; background-color: #16A34A; color: white; text-decoration: none; padding: 11px 22px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                      Falar no WhatsApp
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px; border-top: 1px solid #262626;">
              <p style="color: #64748B; font-size: 13px; margin: 0 0 6px; text-align: center;">
                O maior acervo de conteúdos médicos da América Latina
              </p>
              <p style="color: #475569; font-size: 12px; margin: 0; text-align: center;">
                &copy; ${new Date().getFullYear()} OneMed. Todos os direitos reservados.
              </p>
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
    <h1 style="color: white; font-size: 24px; font-weight: 700; margin: 0 0 16px;">
      ${cfg.subjectText}
    </h1>

    <p style="color: #94A3B8; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      ${cfg.message} ${cfg.urgency}
    </p>

    <!-- Coupon -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #161616; border-radius: 10px; border: 1px solid #262626; margin: 0 0 28px;">
      <tr>
        <td style="padding: 24px; text-align: center;">
          <p style="color: #4ADE80; font-size: 12px; font-weight: 700; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">
            Cupom exclusivo — ${cfg.discount}% de desconto
          </p>
          <p style="color: white; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: 3px;">
            ${cfg.couponCode}
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: white; font-size: 16px; font-weight: 700; margin: 0 0 12px;">
      O que você está perdendo
    </h2>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 28px;">
      <tr><td style="padding: 6px 0; color: #CBD5E1; font-size: 14px;">+530 cursos de medicina</td></tr>
      <tr><td style="padding: 6px 0; color: #CBD5E1; font-size: 14px;">+9.000 livros médicos atualizados</td></tr>
      <tr><td style="padding: 6px 0; color: #CBD5E1; font-size: 14px;">Material completo para Residência e Revalida</td></tr>
    </table>

    <!-- Prices side by side -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #161616; border-radius: 10px; border: 1px solid #262626; margin: 0 0 24px;">
      <tr>
        <td style="padding: 20px;">
          <p style="color: #64748B; font-size: 12px; text-align: center; margin: 0 0 14px; text-transform: uppercase; letter-spacing: 0.5px;">
            Preço com o cupom
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="width: 50%; padding: 8px; text-align: center; border-right: 1px solid #262626;">
                <p style="color: #64748B; font-size: 11px; margin: 0; text-transform: uppercase;">Plano anual</p>
                <p style="color: #64748B; font-size: 13px; margin: 4px 0; text-decoration: line-through;">${brl(PLAN_PRICES.annual)}</p>
                <p style="color: #4ADE80; font-size: 22px; font-weight: 700; margin: 0;">${brl(comDesconto('annual', cfg.discount))}</p>
              </td>
              <td style="width: 50%; padding: 8px; text-align: center;">
                <p style="color: #64748B; font-size: 11px; margin: 0; text-transform: uppercase;">Plano vitalício</p>
                <p style="color: #64748B; font-size: 13px; margin: 4px 0; text-decoration: line-through;">${brl(PLAN_PRICES.lifetime)}</p>
                <p style="color: #4ADE80; font-size: 22px; font-weight: 700; margin: 0;">${brl(comDesconto('lifetime', cfg.discount))}</p>
              </td>
            </tr>
          </table>
          <p style="color: #64748B; font-size: 12px; text-align: center; margin: 14px 0 0; line-height: 1.5;">
            O cupom também vale no Mensal (${brl(comDesconto('monthly', cfg.discount))}),
            no Vitalício Plus (${brl(comDesconto('lifetime_plus', cfg.discount))})
            e no Vitalício Pro (${brl(comDesconto('lifetime_pro', cfg.discount))}).
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding-bottom: 8px;">
          <a href="${SITE_URL}/checkout?plan=lifetime&coupon=${cfg.couponCode}" style="display: inline-block; background-color: #DC2626; color: white; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 600;">
            Usar cupom e garantir acesso
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #475569; font-size: 12px; text-align: center; margin: 20px 0 0;">
      Enviado para ${email} — você experimentou o OneMed gratuitamente.
    </p>
  `
  return getBaseTemplate(content, `${cfg.subjectText} - ${SITE_NAME}`)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    // ── Verificação de CRON_SECRET (ativa somente se o secret estiver configurado) ──
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (cronSecret) {
      const providedSecret = req.headers.get('x-cron-secret') || ''
      if (providedSecret !== cronSecret) {
        console.error('send-followup-emails: x-cron-secret inválido ou ausente')
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        })
      }
    }

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
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
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
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('send-followup-emails error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
