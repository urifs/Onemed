import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
const FROM_EMAIL = 'contato@onemedcursos.com.br'
const WHATSAPP_URL = 'https://wa.me/5563999191551?text=Ol%C3%A1!%20Tenho%20interesse%20no%20OneMed.'

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

function getTrialAccessEmail(email: string): string {
  const content = `
    <h1 style="color: white; font-size: 24px; font-weight: 700; margin: 0 0 16px;">
      Seu acesso está liberado
    </h1>

    <p style="color: #94A3B8; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      Olá! Seu teste gratuito de 10 minutos foi ativado — dá tempo de conhecer o acervo
      com mais de <strong style="color: white;">530 cursos</strong> e <strong style="color: white;">9.000 livros médicos</strong>.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 28px;">
      <tr><td style="padding: 8px 0; color: #CBD5E1; font-size: 14px; border-bottom: 1px solid #262626;">Cursos completos de residência médica</td></tr>
      <tr><td style="padding: 8px 0; color: #CBD5E1; font-size: 14px; border-bottom: 1px solid #262626;">Livros de todas as especialidades</td></tr>
      <tr><td style="padding: 8px 0; color: #CBD5E1; font-size: 14px; border-bottom: 1px solid #262626;">Material preparatório para Revalida</td></tr>
      <tr><td style="padding: 8px 0; color: #CBD5E1; font-size: 14px;">Conteúdo atualizado mensalmente</td></tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding-bottom: 24px;">
          <a href="${SITE_URL}/login" style="display: inline-block; background-color: #DC2626; color: white; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 600;">
            Acessar a plataforma
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #94A3B8; font-size: 14px; line-height: 1.6; margin: 0 0 12px;">
      Gostou? Garanta acesso completo com nossos planos anual ou vitalício.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding-bottom: 8px;">
          <a href="${SITE_URL}/checkout?plan=annual" style="display: inline-block; border: 1px solid #404040; color: #E5E5E5; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Ver planos e preços
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #64748B; font-size: 13px; margin: 20px 0 0;">
      Login sem senha — use o e-mail <strong style="color: #94A3B8;">${email}</strong>.
    </p>
  `
  return getBaseTemplate(content, `Bem-vindo ao ${SITE_NAME}!`)
}

function getPaymentApprovedEmail(firstName: string, plan: string, amount?: number, buyerEmail?: string): string {
  const planLabels: Record<string, string> = { lifetime: 'Vitalício', annual: 'Anual' }
  const planDuration: Record<string, string> = { lifetime: 'para sempre', annual: 'por 1 ano' }
  const planLabel = planLabels[plan] || plan
  const duration = planDuration[plan] || ''

  const content = `
    <h1 style="color: white; font-size: 24px; font-weight: 700; margin: 0 0 16px;">
      Pagamento aprovado
    </h1>

    <p style="color: #94A3B8; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      Parabéns, ${firstName}. Seu acesso já está liberado na plataforma.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #161616; border-radius: 10px; border-left: 3px solid #16A34A; margin: 0 0 28px;">
      <tr>
        <td style="padding: 20px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 4px 0; color: #94A3B8; font-size: 14px;">Plano</td>
              <td style="padding: 4px 0; color: white; text-align: right; font-size: 14px; font-weight: 600;">${planLabel} (${duration})</td>
            </tr>
            ${amount ? `<tr>
              <td style="padding: 4px 0; color: #94A3B8; font-size: 14px;">Valor</td>
              <td style="padding: 4px 0; color: white; text-align: right; font-size: 14px; font-weight: 600;">R$ ${amount.toFixed(2).replace('.', ',')}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 4px 0; color: #94A3B8; font-size: 14px;">Status</td>
              <td style="padding: 4px 0; color: #4ADE80; text-align: right; font-size: 14px; font-weight: 600;">Aprovado</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <h2 style="color: white; font-size: 16px; font-weight: 700; margin: 0 0 12px;">
      Como acessar
    </h2>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 28px;">
      <tr><td style="padding: 6px 0; color: #94A3B8; font-size: 14px;">1. Clique no botão abaixo para abrir a plataforma</td></tr>
      <tr><td style="padding: 6px 0; color: #94A3B8; font-size: 14px;">2. Entre com o e-mail <strong style="color: white;">${buyerEmail || 'cadastrado na compra'}</strong></td></tr>
      <tr><td style="padding: 6px 0; color: #94A3B8; font-size: 14px;">3. Sem senha — você recebe um link de acesso por e-mail</td></tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding-bottom: 8px;">
          <a href="${SITE_URL}/login${buyerEmail ? `?email=${encodeURIComponent(buyerEmail)}` : ''}" style="display: inline-block; background-color: #DC2626; color: white; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 600;">
            Acessar a plataforma
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #64748B; font-size: 13px; text-align: center; margin: 24px 0 0;">
      Dúvidas? Fale com a gente pelo WhatsApp abaixo.
    </p>
  `
  return getBaseTemplate(content, `Pagamento aprovado — Bem-vindo ao ${SITE_NAME}`)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
    const body = await req.json()
    const { name, type, plan, amount } = body
    const to = body.to || body.email  // accept both 'to' and 'email' fields

    const firstName = name?.split(' ')[0] || 'Olá'

    let subject = ''
    let html = ''

    if (type === 'trial_access') {
      subject = `Bem-vindo ao ${SITE_NAME}! Seu acesso de teste foi ativado`
      html = getTrialAccessEmail(to)
    } else if (type === 'payment_approved') {
      subject = `Pagamento aprovado — Bem-vindo ao ${SITE_NAME}`
      html = getPaymentApprovedEmail(firstName, plan, amount, to)
    } else {
      return new Response(JSON.stringify({ error: 'Tipo de e-mail inválido' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${SITE_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Resend error:', data)
      return new Response(JSON.stringify({ error: data.message }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
