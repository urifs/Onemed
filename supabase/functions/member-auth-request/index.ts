// ─────────────────────────────────────────────────────────────────────────────
// OneMed · member-auth-request
// Passwordless login gate for the member platform (/membros).
//   1. Validate email
//   2. Rate limit (5 tentativas / 15min por IP)
//   3. Confirm the email has an active trial/purchase, or belongs to an admin
//   4. Provision (or reuse) the Supabase Auth user + generate a magic link
//   5. Send a branded email via Resend with the sign-in button
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const SITE_NAME = 'OneMed'
const FROM_EMAIL = 'contato@onemedcursos.com.br'

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

async function checkRateLimit(supabase: ReturnType<typeof createClient>, identifier: string) {
  const maxAttempts = 5
  const windowMs = 15 * 60 * 1000
  const now = new Date()
  const { data: existing } = await supabase.from('rate_limits')
    .select('attempts, window_start').eq('identifier', identifier).eq('action', 'member_login').maybeSingle()

  if (!existing || (now.getTime() - new Date(existing.window_start).getTime()) > windowMs) {
    await supabase.from('rate_limits').upsert(
      { identifier, action: 'member_login', attempts: 1, window_start: now.toISOString() },
      { onConflict: 'identifier,action' },
    )
    return { allowed: true }
  }
  if (existing.attempts >= maxAttempts) {
    return { allowed: false, retryAfterSeconds: Math.ceil((new Date(existing.window_start).getTime() + windowMs - now.getTime()) / 1000) }
  }
  await supabase.from('rate_limits').update({ attempts: existing.attempts + 1 }).eq('identifier', identifier).eq('action', 'member_login')
  return { allowed: true }
}

function loginEmailHtml(actionLink: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Entrar no OneMed</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#0A0A0A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0A0A0A;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#111111;border-radius:16px;border:1px solid rgba(239,68,68,0.2);">
        <tr><td style="padding:40px 40px 20px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);">
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
            <tr>
              <td style="background:linear-gradient(135deg,#DC2626 0%,#991B1B 100%);width:50px;height:50px;border-radius:12px;text-align:center;vertical-align:middle;">
                <span style="color:white;font-size:24px;font-weight:bold;">+</span>
              </td>
              <td style="padding-left:12px;">
                <span style="color:white;font-size:28px;font-weight:bold;">One</span><span style="color:#EF4444;font-size:28px;font-weight:bold;">Med</span>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="color:white;font-size:26px;margin:0 0 20px;text-align:center;">Seu link de acesso à <span style="color:#EF4444;">plataforma</span></h1>
          <p style="color:#94A3B8;font-size:16px;line-height:1.6;margin:0 0 28px;text-align:center;">
            Clique no botão abaixo para entrar na sua área de membros. O link expira em 1 hora e só pode ser usado uma vez.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td align="center" style="padding:10px 0 20px;">
              <a href="${actionLink}" style="display:inline-block;background:linear-gradient(135deg,#DC2626 0%,#991B1B 100%);color:white;text-decoration:none;padding:18px 50px;border-radius:8px;font-size:16px;font-weight:bold;">
                Entrar na Plataforma
              </a>
            </td></tr>
          </table>
          <p style="color:#64748B;font-size:13px;text-align:center;margin:24px 0 0;">
            Não foi você? Pode ignorar este e-mail com segurança.
          </p>
        </td></tr>
        <tr><td style="padding:30px 40px;background-color:#0A0A0A;border-radius:0 0 16px 16px;border-top:1px solid rgba(255,255,255,0.1);">
          <p style="color:#475569;font-size:12px;margin:0;text-align:center;">&copy; 2026 OneMed. Todos os direitos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { email: rawEmail } = await req.json().catch(() => ({}))
    const email = String(rawEmail || '').trim().toLowerCase()

    if (!EMAIL_REGEX.test(email)) return jsonResponse(req, { error: 'Email inválido' }, 400)

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    const rate = await checkRateLimit(supabase, ip)
    if (!rate.allowed) {
      return jsonResponse(req, { error: 'Muitas tentativas. Tente novamente em alguns minutos.', retryAfterSeconds: rate.retryAfterSeconds }, 429)
    }

    const [{ data: activeAccess }, { data: buyer }, { data: isAdminEmail }] = await Promise.all([
      supabase.from('accesses').select('id').eq('email', email).eq('status', 'active').limit(1).maybeSingle(),
      supabase.from('buyers').select('id').eq('email', email).eq('access_granted', true).limit(1).maybeSingle(),
      supabase.rpc('is_admin_email', { _email: email }),
    ])

    if (!activeAccess && !buyer && !isAdminEmail) {
      return jsonResponse(req, { error: 'Nenhum acesso ativo encontrado para este email. Faça um trial gratuito ou verifique sua compra.' }, 404)
    }

    const origin = req.headers.get('origin')
    const redirectTo = `${ALLOWED_ORIGINS.includes(origin || '') ? origin : ALLOWED_ORIGINS[0]}/membros`

    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })
    if (linkErr || !linkData?.properties?.action_link) {
      console.error('generateLink error', linkErr)
      return jsonResponse(req, { error: 'Não foi possível gerar o link de acesso. Tente novamente.' }, 500)
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: `${SITE_NAME} <${FROM_EMAIL}>`,
        to: [email],
        subject: `Seu link de acesso ao ${SITE_NAME}`,
        html: loginEmailHtml(linkData.properties.action_link),
      }),
    })
    if (!emailRes.ok) {
      const errBody = await emailRes.json().catch(() => ({}))
      console.error('Resend error', errBody)
      return jsonResponse(req, { error: 'Não foi possível enviar o email. Tente novamente.' }, 500)
    }

    return jsonResponse(req, { success: true })
  } catch (err: any) {
    console.error(err)
    return jsonResponse(req, { error: err.message }, 500)
  }
})
