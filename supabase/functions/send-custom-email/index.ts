import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: rgba(34, 197, 94, 0.1); border-radius: 12px; border: 1px solid rgba(34, 197, 94, 0.3);">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="color: #94A3B8; font-size: 14px; margin: 0 0 12px;">Precisa de ajuda? Fale com nosso suporte!</p>
                    <a href="${WHATSAPP_URL}" style="display: inline-block; background-color: #22C55E; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: bold;">
                      Suporte via WhatsApp
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #0A0A0A; border-radius: 0 0 16px 16px; border-top: 1px solid rgba(255,255,255,0.1);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="color: #64748B; font-size: 14px; margin: 0 0 10px;">O maior acervo de conteúdos médicos da América Latina</p>
                    <p style="color: #475569; font-size: 12px; margin: 0;">&copy; 2026 OneMed. Todos os direitos reservados.</p>
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

interface FollowupData {
  subjectText: string
  message: string
  couponCode: string
  discount: number
  urgency: string
  annualPrice: string
  lifetimePrice: string
}

function getFollowupEmailHtml(email: string, cfg: FollowupData): string {
  const content = `
    <h1 style="color: white; font-size: 28px; margin: 0 0 20px; text-align: center;">${cfg.subjectText}</h1>

    <p style="color: #94A3B8; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Olá!</p>
    <p style="color: #94A3B8; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">${cfg.message}</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(21, 128, 61, 0.15) 100%); border-radius: 12px; border: 2px dashed rgba(34, 197, 94, 0.5); margin: 20px 0;">
      <tr>
        <td style="padding: 24px; text-align: center;">
          <p style="color: #22C55E; font-size: 14px; font-weight: bold; margin: 0 0 8px; text-transform: uppercase;">Cupom Exclusivo</p>
          <p style="color: white; font-size: 32px; font-weight: bold; margin: 0 0 8px; letter-spacing: 4px;">${cfg.couponCode}</p>
          <p style="color: #22C55E; font-size: 20px; font-weight: bold; margin: 0;">${cfg.discount}% DE DESCONTO</p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(153, 27, 27, 0.1) 100%); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3); margin: 20px 0;">
      <tr>
        <td style="padding: 24px; text-align: center;">
          <p style="color: white; font-size: 18px; font-weight: bold; margin: 0;">${cfg.urgency}</p>
        </td>
      </tr>
    </table>

    <h2 style="color: white; font-size: 20px; margin: 30px 0 15px;">O que você está perdendo:</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding: 10px 0;"><span style="color: #EF4444; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">+530 cursos de medicina</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #EF4444; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">+9.000 livros médicos atualizados</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #EF4444; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">Material completo para Residência e Revalida</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #EF4444; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">Atualizações constantes</span></td></tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
      <tr>
        <td style="background-color: #1a1a1a; border-radius: 12px; padding: 20px;">
          <p style="color: #22C55E; font-size: 14px; text-align: center; margin: 0 0 15px;">Preços com seu cupom de ${cfg.discount}% de desconto:</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="width: 50%; padding: 10px; text-align: center; border-right: 1px solid #333;">
                <p style="color: #64748B; font-size: 12px; margin: 0;">PLANO ANUAL</p>
                <p style="color: #64748B; font-size: 14px; margin: 5px 0; text-decoration: line-through;">R$ 199,00</p>
                <p style="color: #22C55E; font-size: 24px; font-weight: bold; margin: 0;">${cfg.annualPrice}</p>
                <p style="color: #94A3B8; font-size: 12px; margin: 5px 0 0;">12 meses de acesso</p>
              </td>
              <td style="width: 50%; padding: 10px; text-align: center;">
                <p style="color: #64748B; font-size: 12px; margin: 0;">PLANO VITALÍCIO</p>
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
      Este email foi enviado para <strong style="color: #94A3B8;">${email}</strong> pois você experimentou o OneMed gratuitamente.
    </p>
  `
  return getBaseTemplate(content, `${cfg.subjectText} - ${SITE_NAME}`)
}

interface FreeTrialData {
  subjectText: string
  message: string
  urgency: string
}

function getFreeTrialEmailHtml(email: string, cfg: FreeTrialData): string {
  const content = `
    <h1 style="color: white; font-size: 28px; margin: 0 0 20px; text-align: center;">${cfg.subjectText}</h1>

    <p style="color: #94A3B8; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Olá!</p>
    <p style="color: #94A3B8; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">${cfg.message}</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(21, 128, 61, 0.15) 100%); border-radius: 12px; border: 1px solid rgba(34, 197, 94, 0.3); margin: 20px 0;">
      <tr>
        <td style="padding: 24px; text-align: center;">
          <p style="color: #22C55E; font-size: 14px; font-weight: bold; margin: 0 0 8px; text-transform: uppercase;">Acesso Gratuito</p>
          <p style="color: white; font-size: 24px; font-weight: bold; margin: 0 0 8px;">10 minutos</p>
          <p style="color: #94A3B8; font-size: 14px; margin: 0;">para explorar todo o conteúdo sem compromisso</p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(153, 27, 27, 0.1) 100%); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3); margin: 20px 0;">
      <tr>
        <td style="padding: 24px; text-align: center;">
          <p style="color: white; font-size: 18px; font-weight: bold; margin: 0;">${cfg.urgency}</p>
        </td>
      </tr>
    </table>

    <h2 style="color: white; font-size: 20px; margin: 30px 0 15px;">O que você vai encontrar:</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding: 10px 0;"><span style="color: #EF4444; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">+530 cursos de medicina</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #EF4444; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">+9.000 livros médicos atualizados</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #EF4444; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">Material completo para Residência e Revalida</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #EF4444; font-size: 16px;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">Atualizações constantes</span></td></tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
      <tr>
        <td align="center" style="padding: 10px 0 20px;">
          <a href="${SITE_URL}" style="display: inline-block; background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); color: white; text-decoration: none; padding: 18px 48px; border-radius: 8px; font-size: 18px; font-weight: bold;">
            Quero Testar Grátis
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #64748B; font-size: 12px; text-align: center; margin: 10px 0 0;">
      Clique no botão acima para acessar o teste gratuito de 10 minutos
    </p>
    <p style="color: #475569; font-size: 12px; text-align: center; margin: 16px 0 0;">
      Este email foi enviado para <strong style="color: #94A3B8;">${email}</strong>.
    </p>
  `
  return getBaseTemplate(content, `${cfg.subjectText} - ${SITE_NAME}`)
}

function getCustomEmailHtml(body: string, subject: string): string {
  const paragraphs = body
    .split('\n\n')
    .filter(p => p.trim())
    .map(p =>
      `<p style="color: #94A3B8; font-size: 16px; line-height: 1.8; margin: 0 0 16px;">${p.replace(/\n/g, '<br>')}</p>`
    )
    .join('')

  const content = `
    <h1 style="color: white; font-size: 26px; margin: 0 0 24px; text-align: center;">${subject}</h1>
    ${paragraphs}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 30px;">
      <tr>
        <td align="center">
          <a href="${SITE_URL}" style="display: inline-block; background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); color: white; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: bold;">
            Acessar OneMed
          </a>
        </td>
      </tr>
    </table>
  `
  return getBaseTemplate(content, subject)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  const cors = getCorsHeaders(req)

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verifica que o chamador tem um JWT válido (usuário autenticado no Supabase)
    // Proteção adicional: CORS restrito a onemedcursos.com.br + ProtectedRoute no frontend
    const authHeader = req.headers.get('Authorization')
    const jwt = authHeader?.replace('Bearer ', '') ?? ''
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: ' + (authErr?.message ?? 'invalid token') }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Um JWT válido só prova que é um usuário logado — inclusive um trial de
    // 10min descartável. Sem essa checagem, qualquer membro podia usar esta
    // função como relay pra mandar email arbitrário usando o domínio/Resend
    // da OneMed.
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized: admin only' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { to, subject, templateType, templateData } = await req.json()

    if (!to || !subject || !templateType) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: to, subject, templateType' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    let html: string
    if (templateType === 'followup') {
      html = getFollowupEmailHtml(to, templateData as FollowupData)
    } else if (templateType === 'free_trial') {
      html = getFreeTrialEmailHtml(to, templateData as FreeTrialData)
    } else {
      html = getCustomEmailHtml(templateData?.body || '', subject)
    }

    const resendController = new AbortController()
    const resendTimeout = setTimeout(() => resendController.abort(), 15000)
    let res: Response
    try {
      res = await fetch('https://api.resend.com/emails', {
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
        signal: resendController.signal,
      })
    } finally {
      clearTimeout(resendTimeout)
    }

    const data = await res.json()
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data.message || 'Resend error' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('send-custom-email error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
