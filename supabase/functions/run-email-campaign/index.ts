import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  }
}

const SITE_URL = 'https://onemedcursos.com.br'
const SITE_NAME = 'OneMed'
const FROM_EMAIL = 'contato@onemedcursos.com.br'
const WHATSAPP_URL = 'https://wa.me/5563999191551?text=Ol%C3%A1!%20Tenho%20interesse%20no%20OneMed.'

const BATCH_SIZE = 15
const SEND_DELAY_MS = 1000

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
          <tr>
            <td style="padding: 32px 40px; text-align: center; border-bottom: 1px solid #262626;">
              <span style="color: white; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">One</span><span style="color: #EF4444; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">Med</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #161616; border-radius: 10px; border: 1px solid #262626;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="color: #94A3B8; font-size: 14px; margin: 0 0 12px;">Precisa de ajuda? Fale com nosso suporte</p>
                    <a href="${WHATSAPP_URL}" style="display: inline-block; background-color: #16A34A; color: white; text-decoration: none; padding: 11px 22px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                      Falar no WhatsApp
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px 32px; border-top: 1px solid #262626;">
              <p style="color: #64748B; font-size: 13px; margin: 0 0 6px; text-align: center;">O maior acervo de conteúdos médicos da América Latina</p>
              <p style="color: #475569; font-size: 12px; margin: 0; text-align: center;">&copy; ${new Date().getFullYear()} OneMed. Todos os direitos reservados.</p>
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

function buildFollowupHtml(email: string, cfg: FollowupData): string {
  const content = `
    <h1 style="color: white; font-size: 24px; font-weight: 700; margin: 0 0 16px;">${cfg.subjectText}</h1>

    <p style="color: #94A3B8; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">${cfg.message} ${cfg.urgency}</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #161616; border-radius: 10px; border: 1px solid #262626; margin: 0 0 28px;">
      <tr>
        <td style="padding: 24px; text-align: center;">
          <p style="color: #4ADE80; font-size: 12px; font-weight: 700; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Cupom exclusivo — ${cfg.discount}% de desconto</p>
          <p style="color: white; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: 3px;">${cfg.couponCode}</p>
        </td>
      </tr>
    </table>

    <h2 style="color: white; font-size: 16px; font-weight: 700; margin: 0 0 12px;">O que você está perdendo</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 28px;">
      <tr><td style="padding: 6px 0; color: #CBD5E1; font-size: 14px;">+530 cursos de medicina</td></tr>
      <tr><td style="padding: 6px 0; color: #CBD5E1; font-size: 14px;">+9.000 livros médicos atualizados</td></tr>
      <tr><td style="padding: 6px 0; color: #CBD5E1; font-size: 14px;">Material completo para Residência e Revalida</td></tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #161616; border-radius: 10px; border: 1px solid #262626; margin: 0 0 24px;">
      <tr>
        <td style="padding: 20px;">
          <p style="color: #64748B; font-size: 12px; text-align: center; margin: 0 0 14px; text-transform: uppercase; letter-spacing: 0.5px;">Preço com o cupom</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="width: 50%; padding: 8px; text-align: center; border-right: 1px solid #262626;">
                <p style="color: #64748B; font-size: 11px; margin: 0; text-transform: uppercase;">Plano anual</p>
                <p style="color: #64748B; font-size: 13px; margin: 4px 0; text-decoration: line-through;">R$ 199,00</p>
                <p style="color: #4ADE80; font-size: 22px; font-weight: 700; margin: 0;">${cfg.annualPrice}</p>
              </td>
              <td style="width: 50%; padding: 8px; text-align: center;">
                <p style="color: #64748B; font-size: 11px; margin: 0; text-transform: uppercase;">Plano vitalício</p>
                <p style="color: #64748B; font-size: 13px; margin: 4px 0; text-decoration: line-through;">R$ 299,90</p>
                <p style="color: #4ADE80; font-size: 22px; font-weight: 700; margin: 0;">${cfg.lifetimePrice}</p>
              </td>
            </tr>
          </table>
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
    </p>`
  return getBaseTemplate(content, `${cfg.subjectText} - ${SITE_NAME}`)
}

interface FreeTrialData {
  subjectText: string
  message: string
  urgency: string
}

function buildFreeTrialHtml(email: string, cfg: FreeTrialData): string {
  const content = `
    <h1 style="color: white; font-size: 24px; font-weight: 700; margin: 0 0 16px;">${cfg.subjectText}</h1>

    <p style="color: #94A3B8; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">${cfg.message} ${cfg.urgency}</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #161616; border-radius: 10px; border-left: 3px solid #16A34A; margin: 0 0 28px;">
      <tr>
        <td style="padding: 20px 24px; text-align: center;">
          <p style="color: #4ADE80; font-size: 12px; font-weight: 700; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.5px;">Acesso gratuito</p>
          <p style="color: white; font-size: 22px; font-weight: 700; margin: 0;">10 minutos para explorar todo o conteúdo</p>
        </td>
      </tr>
    </table>

    <h2 style="color: white; font-size: 16px; font-weight: 700; margin: 0 0 12px;">O que você vai encontrar</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 28px;">
      <tr><td style="padding: 6px 0; color: #CBD5E1; font-size: 14px;">+530 cursos de medicina</td></tr>
      <tr><td style="padding: 6px 0; color: #CBD5E1; font-size: 14px;">+9.000 livros médicos atualizados</td></tr>
      <tr><td style="padding: 6px 0; color: #CBD5E1; font-size: 14px;">Material completo para Residência e Revalida</td></tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding-bottom: 8px;">
          <a href="${SITE_URL}" style="display: inline-block; background-color: #DC2626; color: white; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 600;">
            Testar grátis agora
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #475569; font-size: 12px; text-align: center; margin: 20px 0 0;">
      Enviado para ${email}.
    </p>`
  return getBaseTemplate(content, `${cfg.subjectText} - ${SITE_NAME}`)
}

function buildCustomHtml(body: string, subject: string): string {
  const paragraphs = body
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p style="color: #94A3B8; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
  const content = `
    <h1 style="color: white; font-size: 22px; font-weight: 700; margin: 0 0 20px;">${subject}</h1>
    ${paragraphs}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
      <tr>
        <td align="center">
          <a href="${SITE_URL}" style="display: inline-block; background-color: #DC2626; color: white; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 600;">
            Acessar OneMed
          </a>
        </td>
      </tr>
    </table>`
  return getBaseTemplate(content, subject)
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Auth: cron secret OR valid user JWT
    const cronSecret = Deno.env.get('CRON_SECRET')
    const providedCron = req.headers.get('x-cron-secret') || ''
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')

    let authed = false
    if (cronSecret && providedCron === cronSecret) {
      authed = true
    } else if (jwt) {
      // Um JWT válido só prova que é um usuário logado — inclusive um trial
      // de 10min descartável. Sem checar a role, qualquer membro conseguia
      // disparar um envio de campanha de email em massa.
      const { data: { user } } = await supabase.auth.getUser(jwt)
      if (user) {
        const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
        authed = !!isAdmin
      }
    }
    // FAIL-CLOSED: removido o antigo ramo `else if (!cronSecret) authed = true`,
    // que liberava qualquer chamada anônima enquanto o CRON_SECRET não estivesse
    // configurado. Requer x-cron-secret (cron) ou JWT de admin (painel).
    // ⚠️ Configure CRON_SECRET nos secrets ANTES de deployar, senão o cron para.

    if (!authed) {
      console.error('run-email-campaign: unauthorized')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // Optional campaign_id targeting
    let targetCampaignId: string | null = null
    try {
      const body = await req.json()
      targetCampaignId = body?.campaign_id ?? null
    } catch { /* no body */ }

    const now = new Date().toISOString()

    const { data: campaign, error: fetchErr } = await (
      targetCampaignId
        ? supabase.from('email_campaigns').select('*').eq('id', targetCampaignId).eq('status', 'scheduled').maybeSingle()
        : supabase.from('email_campaigns').select('*').eq('status', 'scheduled').lte('scheduled_at', now).order('scheduled_at', { ascending: true }).limit(1).maybeSingle()
    )

    if (fetchErr) {
      console.error('run-email-campaign: erro ao buscar campanhas:', fetchErr)
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (!campaign) {
      return new Response(JSON.stringify({ ok: true, message: 'Nenhuma campanha pendente' }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    await supabase.from('email_campaigns').update({ status: 'running' }).eq('id', campaign.id)

    const emails: string[] = campaign.recipient_emails || []
    const start = campaign.processed_index as number
    const end = Math.min(start + BATCH_SIZE, emails.length)
    const batch = emails.slice(start, end)

    let sent = campaign.sent_count as number
    let failed = campaign.failed_count as number

    for (let i = 0; i < batch.length; i++) {
      const email = batch[i]
      try {
        let html: string
        if (campaign.template_type === 'followup') {
          html = buildFollowupHtml(email, campaign.template_data as FollowupData)
        } else if (campaign.template_type === 'free_trial') {
          html = buildFreeTrialHtml(email, campaign.template_data as FreeTrialData)
        } else {
          html = buildCustomHtml(campaign.template_data?.body || '', campaign.subject)
        }

        const resendCtrl = new AbortController()
        const resendTimeout = setTimeout(() => resendCtrl.abort(), 15000)
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
              to: [email],
              subject: campaign.subject,
              html,
            }),
            signal: resendCtrl.signal,
          })
        } finally {
          clearTimeout(resendTimeout)
        }

        const data = await res.json()
        if (res.ok) {
          sent++
          console.log(`[campaign ${campaign.id}] Enviado para ${email}, id: ${data.id}`)
        } else {
          failed++
          console.error(`[campaign ${campaign.id}] Resend erro para ${email}:`, data.message)
        }
      } catch (e: any) {
        failed++
        console.error(`[campaign ${campaign.id}] Exceção para ${email}:`, e.message)
      }

      if (i < batch.length - 1) {
        await sleep(SEND_DELAY_MS)
      }
    }

    const newIndex = end
    const isDone = newIndex >= emails.length

    await supabase.from('email_campaigns').update({
      status: isDone ? 'completed' : 'scheduled',
      processed_index: newIndex,
      sent_count: sent,
      failed_count: failed,
      completed_at: isDone ? new Date().toISOString() : null,
    }).eq('id', campaign.id)

    console.log(`[campaign ${campaign.id}] Batch ${start}-${end}. ${isDone ? 'COMPLETO' : 'Continua'}. Enviados: ${sent}, Erros: ${failed}`)

    return new Response(
      JSON.stringify({ ok: true, campaignId: campaign.id, processed: batch.length, sent, failed, done: isDone }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('run-email-campaign erro:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
