import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SITE_URL = 'https://onemedcursos.com.br'
const SITE_NAME = 'OneMed'
const FROM_EMAIL = 'contato@onemedcursos.com.br'
const WHATSAPP_URL = 'https://wa.me/5545991220048?text=Ol%C3%A1!%20Tenho%20interesse%20no%20OneMed.'

// Máximo de emails processados por invocação do cron (evita timeout)
const BATCH_SIZE = 15
// Delay entre cada envio em ms (anti-spam)
const SEND_DELAY_MS = 1000

// ─── Templates (mesmos do send-custom-email) ─────────────────────────────────

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
          <tr><td style="padding: 40px;">${content}</td></tr>
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: rgba(34, 197, 94, 0.1); border-radius: 12px; border: 1px solid rgba(34, 197, 94, 0.3);">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="color: #94A3B8; font-size: 14px; margin: 0 0 12px;">Precisa de ajuda? Fale com nosso suporte!</p>
                    <a href="${WHATSAPP_URL}" style="display: inline-block; background-color: #22C55E; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: bold;">Suporte via WhatsApp</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #0A0A0A; border-radius: 0 0 16px 16px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="color: #64748B; font-size: 14px; text-align: center; margin: 0 0 10px;">O maior acervo de conteudos medicos da America Latina</p>
              <p style="color: #475569; font-size: 12px; text-align: center; margin: 0;">&copy; 2026 OneMed. Todos os direitos reservados.</p>
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
    <h1 style="color: white; font-size: 28px; margin: 0 0 20px; text-align: center;">${cfg.subjectText}</h1>
    <p style="color: #94A3B8; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Ola!</p>
    <p style="color: #94A3B8; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">${cfg.message}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(21,128,61,0.15) 100%); border-radius: 12px; border: 2px dashed rgba(34,197,94,0.5); margin: 20px 0;">
      <tr><td style="padding: 24px; text-align: center;">
        <p style="color: #22C55E; font-size: 14px; font-weight: bold; margin: 0 0 8px; text-transform: uppercase;">Cupom Exclusivo</p>
        <p style="color: white; font-size: 32px; font-weight: bold; margin: 0 0 8px; letter-spacing: 4px;">${cfg.couponCode}</p>
        <p style="color: #22C55E; font-size: 20px; font-weight: bold; margin: 0;">${cfg.discount}% DE DESCONTO</p>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(153,27,27,0.1) 100%); border-radius: 12px; border: 1px solid rgba(239,68,68,0.3); margin: 20px 0;">
      <tr><td style="padding: 24px; text-align: center;"><p style="color: white; font-size: 18px; font-weight: bold; margin: 0;">${cfg.urgency}</p></td></tr>
    </table>
    <h2 style="color: white; font-size: 20px; margin: 30px 0 15px;">O que voce esta perdendo:</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td style="padding: 10px 0;"><span style="color: #EF4444;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">+530 cursos de medicina</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #EF4444;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">+9.000 livros medicos atualizados</span></td></tr>
      <tr><td style="padding: 10px 0;"><span style="color: #EF4444;">•</span><span style="color: #CBD5E1; font-size: 15px; margin-left: 10px;">Material completo para Residencia e Revalida</span></td></tr>
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
      <tr><td style="background-color: #1a1a1a; border-radius: 12px; padding: 20px;">
        <p style="color: #22C55E; font-size: 14px; text-align: center; margin: 0 0 15px;">Precos com ${cfg.discount}% de desconto:</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="width: 50%; padding: 10px; text-align: center; border-right: 1px solid #333;">
              <p style="color: #64748B; font-size: 12px; margin: 0;">PLANO ANUAL</p>
              <p style="color: #64748B; font-size: 14px; margin: 5px 0; text-decoration: line-through;">R$ 199,00</p>
              <p style="color: #22C55E; font-size: 24px; font-weight: bold; margin: 0;">${cfg.annualPrice}</p>
            </td>
            <td style="width: 50%; padding: 10px; text-align: center;">
              <p style="color: #64748B; font-size: 12px; margin: 0;">PLANO VITALICIO</p>
              <p style="color: #64748B; font-size: 14px; margin: 5px 0; text-decoration: line-through;">R$ 299,90</p>
              <p style="color: #22C55E; font-size: 24px; font-weight: bold; margin: 0;">${cfg.lifetimePrice}</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td align="center" style="padding: 10px 0 20px;">
        <a href="${SITE_URL}/checkout?plan=lifetime&coupon=${cfg.couponCode}" style="display: inline-block; background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold;">
          Usar Cupom e Garantir Acesso
        </a>
      </td></tr>
    </table>
    <p style="color: #64748B; font-size: 12px; text-align: center; margin: 10px 0 0;">
      Use o codigo <strong style="color: #22C55E;">${cfg.couponCode}</strong> no checkout para aplicar o desconto
    </p>
    <p style="color: #475569; font-size: 12px; text-align: center; margin: 16px 0 0;">
      Este email foi enviado para <strong style="color: #94A3B8;">${email}</strong> pois voce experimentou o OneMed gratuitamente.
    </p>`
  return getBaseTemplate(content, `${cfg.subjectText} - ${SITE_NAME}`)
}

function buildCustomHtml(body: string, subject: string): string {
  const paragraphs = body
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p style="color: #94A3B8; font-size: 16px; line-height: 1.8; margin: 0 0 16px;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
  const content = `
    <h1 style="color: white; font-size: 26px; margin: 0 0 24px; text-align: center;">${subject}</h1>
    ${paragraphs}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 30px;">
      <tr><td align="center">
        <a href="${SITE_URL}" style="display: inline-block; background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); color: white; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: bold;">Acessar OneMed</a>
      </td></tr>
    </table>`
  return getBaseTemplate(content, subject)
}

// ─── Main handler ─────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (cronSecret) {
      const provided = req.headers.get('x-cron-secret') || ''
      if (provided !== cronSecret) {
        console.error('run-email-campaign: x-cron-secret inválido')
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      }
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Busca a próxima campanha agendada que está na hora
    const now = new Date().toISOString()
    const { data: campaign, error: fetchErr } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (fetchErr) {
      console.error('run-email-campaign: erro ao buscar campanhas:', fetchErr)
      return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 })
    }

    if (!campaign) {
      return new Response(JSON.stringify({ ok: true, message: 'Nenhuma campanha pendente' }), { status: 200 })
    }

    // Marca como running
    await supabase
      .from('email_campaigns')
      .update({ status: 'running' })
      .eq('id', campaign.id)

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
        } else {
          html = buildCustomHtml(campaign.template_data?.body || '', campaign.subject)
        }

        const res = await fetch('https://api.resend.com/emails', {
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
        })

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

      // Delay entre envios (exceto no último do batch)
      if (i < batch.length - 1) {
        await sleep(SEND_DELAY_MS)
      }
    }

    const newIndex = end
    const isDone = newIndex >= emails.length

    await supabase
      .from('email_campaigns')
      .update({
        status: isDone ? 'completed' : 'scheduled',
        processed_index: newIndex,
        sent_count: sent,
        failed_count: failed,
        completed_at: isDone ? new Date().toISOString() : null,
      })
      .eq('id', campaign.id)

    console.log(`[campaign ${campaign.id}] Batch ${start}-${end} concluído. ${isDone ? 'COMPLETO' : 'Continua próximo cron'}. Enviados: ${sent}, Erros: ${failed}`)

    return new Response(
      JSON.stringify({ ok: true, campaignId: campaign.id, processed: batch.length, sent, failed, done: isDone }),
      { status: 200 }
    )
  } catch (err: any) {
    console.error('run-email-campaign erro:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
