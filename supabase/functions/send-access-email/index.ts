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
                      O maior acervo de conteúdos médicos da América Latina
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

function getTrialAccessEmail(email: string): string {
  const content = `
    <h1 style="color: white; font-size: 28px; margin: 0 0 20px; text-align: center;">
      Bem-vindo ao <span style="color: #EF4444;">OneMed</span>!
    </h1>

    <p style="color: #94A3B8; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
      Olá! Seu acesso de teste gratuito foi ativado com sucesso.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(153, 27, 27, 0.1) 100%); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3); margin: 20px 0;">
      <tr>
        <td style="padding: 24px;">
          <p style="color: #EF4444; font-size: 18px; font-weight: bold; margin: 0 0 12px;">
            Você tem 10 minutos de acesso gratuito!
          </p>
          <p style="color: #94A3B8; font-size: 14px; margin: 0;">
            Aproveite para explorar nosso acervo com mais de <strong style="color: white;">530 cursos</strong> e <strong style="color: white;">9.000 livros médicos</strong>.
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: white; font-size: 20px; margin: 30px 0 15px;">
      O que você pode acessar:
    </h2>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding: 10px 0;"><span style="color: #22C55E; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">Cursos completos de residência médica</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #22C55E; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">Livros de todas as especialidades</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #22C55E; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">Material preparatório para Revalida</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #22C55E; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">Atualizações constantes de conteúdo</span></td></tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding: 30px 0 10px;">
          <a href="${SITE_URL}/login" style="display: inline-block; background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold;">
            Acessar a Plataforma
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #94A3B8; font-size: 16px; line-height: 1.6; margin: 30px 0 20px;">
      Gostou do conteúdo? Garanta seu acesso completo com nossos planos:
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding: 10px 0 20px;">
          <a href="${SITE_URL}/checkout?plan=annual" style="display: inline-block; background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold;">
            Ver Planos e Preços
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #64748B; font-size: 13px; text-align: center; margin: 20px 0 0;">
      Entre com o email: <strong style="color: white;">${email}</strong>
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
    <h1 style="color: white; font-size: 28px; margin: 0 0 20px; text-align: center;">
      Compra Confirmada no <span style="color: #EF4444;">OneMed</span>!
    </h1>

    <p style="color: #94A3B8; font-size: 16px; line-height: 1.6; margin: 0 0 20px; text-align: center;">
      Parabéns, ${firstName}! Seu pagamento foi aprovado e seu acesso já está liberado.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(21, 128, 61, 0.1) 100%); border-radius: 12px; border: 1px solid rgba(34, 197, 94, 0.3); margin: 20px 0;">
      <tr>
        <td style="padding: 24px;">
          <h2 style="color: #22C55E; font-size: 20px; font-weight: bold; margin: 0 0 16px;">
            Detalhes da Compra
          </h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #94A3B8;">Plano:</td>
              <td style="padding: 8px 0; color: white; text-align: right; font-weight: bold;">${planLabel}</td>
            </tr>
            ${amount ? `<tr>
              <td style="padding: 8px 0; color: #94A3B8;">Valor:</td>
              <td style="padding: 8px 0; color: white; text-align: right; font-weight: bold;">R$ ${amount.toFixed(2).replace('.', ',')}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 8px 0; color: #94A3B8;">Duração:</td>
              <td style="padding: 8px 0; color: #22C55E; text-align: right; font-weight: bold;">${duration}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94A3B8;">Status:</td>
              <td style="padding: 8px 0; color: #22C55E; text-align: right; font-weight: bold;">Pagamento Aprovado</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <h2 style="color: white; font-size: 20px; margin: 30px 0 15px;">
      Como acessar o conteúdo:
    </h2>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding: 10px 0; color: #94A3B8; font-size: 15px;"><span style="color: #22C55E; font-weight: bold;">1.</span>&nbsp; Clique no botão abaixo para acessar a plataforma</td></tr>
      <tr><td style="padding: 10px 0; color: #94A3B8; font-size: 15px;"><span style="color: #22C55E; font-weight: bold;">2.</span>&nbsp; Faça login com o e-mail: <strong style="color: white;">${buyerEmail || 'seu email cadastrado'}</strong></td></tr>
      <tr><td style="padding: 10px 0; color: #94A3B8; font-size: 15px;"><span style="color: #22C55E; font-weight: bold;">3.</span>&nbsp; Sem senha — você recebe um link de acesso direto no e-mail</td></tr>
      <tr><td style="padding: 10px 0; color: #94A3B8; font-size: 15px;"><span style="color: #22C55E; font-weight: bold;">4.</span>&nbsp; Assista às aulas e leia os materiais direto pelo site!</td></tr>
    </table>

    <h2 style="color: white; font-size: 20px; margin: 30px 0 15px;">
      O que você pode acessar:
    </h2>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding: 10px 0;"><span style="color: #22C55E; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">+530 cursos completos de residência médica</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #22C55E; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">+9.000 livros de todas as especialidades</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #22C55E; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">Material preparatório para Revalida</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #22C55E; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">Apps Whitebook e WeMeds incluídos</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #22C55E; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">Atualizações constantes de conteúdo</span></td></tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding: 30px 0 20px;">
          <a href="${SITE_URL}/login${buyerEmail ? `?email=${encodeURIComponent(buyerEmail)}` : ''}" style="display: inline-block; background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); color: white; text-decoration: none; padding: 18px 50px; border-radius: 8px; font-size: 18px; font-weight: bold;">
            Acessar a Plataforma
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
      <tr>
        <td style="padding: 16px;">
          <p style="color: #F87171; font-size: 13px; margin: 0; text-align: center;">
            <strong>Importante:</strong> Faça login com o email <strong style="color: white;">${buyerEmail || 'cadastrado na compra'}</strong>
          </p>
        </td>
      </tr>
    </table>

    <p style="color: #64748B; font-size: 13px; text-align: center; margin-top: 30px;">
      Dúvidas? Entre em contato pelo WhatsApp acima.
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
