// ─────────────────────────────────────────────────────────────────────────────
// OneMed · affiliate-register
//
// Cadastro de afiliado: cria o usuário no Auth (email+senha, já confirmado —
// o frontend faz signInWithPassword logo em seguida), a linha em `affiliates`,
// um cupom inicial de 10% exclusivo, e envia o e-mail de boas-vindas com o
// botão do painel.
//
// Segurança: se o e-mail já tem conta na plataforma (assinante, admin ou outro
// afiliado), recusa com 409 — definir senha num usuário existente seria
// permitir tomar a conta de um assinante que só usa magic link.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
const SITE_URL = 'https://onemedcursos.com.br'
const FROM_EMAIL = 'contato@onemedcursos.com.br'

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

async function checkRateLimit(supabase: ReturnType<typeof createClient>, identifier: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data } = await supabase.from('rate_limits')
    .select('attempts, window_start')
    .eq('identifier', identifier)
    .eq('action', 'affiliate_register')
    .maybeSingle()
  if (data && data.window_start >= windowStart && (data.attempts ?? 0) >= 10) return false
  await supabase.from('rate_limits').upsert({
    identifier, action: 'affiliate_register',
    attempts: data && data.window_start >= windowStart ? (data.attempts ?? 0) + 1 : 1,
    window_start: data && data.window_start >= windowStart ? data.window_start : new Date().toISOString(),
  }, { onConflict: 'identifier,action' })
  return true
}

// Cupom inicial: primeiro nome + 2 dígitos, tentando até achar código livre.
async function generateInitialCoupon(supabase: ReturnType<typeof createClient>, name: string): Promise<string | null> {
  const base = (name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z]/g, '').slice(0, 10) || 'AFILIADO').toUpperCase()
  for (let i = 0; i < 12; i++) {
    const code = `${base}${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`
    const { data: created, error } = await supabase.from('coupons')
      .insert({ code, discount_percent: 10, active: true, description: 'Cupom de afiliado' })
      .select('code').maybeSingle()
    if (!error && created) return created.code as string
  }
  return null
}

function welcomeEmailHtml(name: string): string {
  const firstName = name.split(' ')[0]
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#e11d2e;padding:20px 32px;">
        <span style="color:#ffffff;font-size:20px;font-weight:bold;">OneMed</span>
      </td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Bem-vindo ao programa de afiliados, ${firstName}!</h1>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#3f3f46;">
          Sua conta de afiliado OneMed foi criada com sucesso. A partir de agora você ganha comissão
          em toda venda feita com o seu link:
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
          <tr><td style="font-size:14px;color:#3f3f46;line-height:1.9;">
            • <b>15%</b> nas assinaturas do plano Mensal<br/>
            • <b>20%</b> nas do Anual e do Vitalício<br/>
            • <b>25%</b> nas do Vitalício Plus<br/>
            • <b>30%</b> nas do Vitalício Pro<br/>
            • Conta <b>Vitalício Pro grátis</b> a partir de 5 vendas
          </td></tr>
        </table>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
          No seu painel você encontra o link de divulgação com seu cupom de 10% já aplicado,
          o material de divulgação pronto e o acompanhamento de cada venda em tempo real.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#e11d2e;">
          <a href="${SITE_URL}/afiliado" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">Acessar meu painel</a>
        </td></tr></table>
        <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;">Qualquer dúvida, é só responder este e-mail.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }
  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), { status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json().catch(() => ({}))
    const { name, email, password } = body
    const cleanName = String(name || '').trim()
    const cleanEmail = String(email || '').toLowerCase().trim()

    if (cleanName.length < 3) return json({ error: 'Informe seu nome completo.' }, 400)
    if (!EMAIL_REGEX.test(cleanEmail)) return json({ error: 'E-mail inválido.' }, 400)
    if (typeof password !== 'string' || password.length < 8) {
      return json({ error: 'A senha precisa ter pelo menos 8 caracteres.' }, 400)
    }

    const clientIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
      || req.headers.get('x-real-ip') || 'unknown'
    if (!(await checkRateLimit(supabase, clientIp))) {
      return json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }, 429)
    }

    // E-mail novo → cria direto. E-mail que JÁ tem conta (assinante/admin) →
    // a conta de afiliado é permitida sobre o mesmo e-mail, mas exige prova de
    // posse: um código de 6 dígitos enviado ao próprio e-mail. Sem isso,
    // qualquer um definiria senha na conta de um assinante que só usa magic
    // link e a tomaria.
    const providedCode = String(body?.code || '').trim()

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { affiliate: true, name: cleanName },
    })
    if (createErr || !created?.user) {
      const msg = String(createErr?.message || '')
      if (!/already|registered|exists/i.test(msg)) {
        console.error('createUser error', createErr)
        return json({ error: 'Não foi possível criar a conta agora. Tente novamente.' }, 500)
      }

      // conta existente: acha o usuário e checa se já é afiliado
      const usersRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users?filter=${encodeURIComponent(cleanEmail)}`, {
        headers: {
          apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
      })
      const usersData = await usersRes.json()
      const existing = (usersData?.users || []).find((u: any) => (u.email || '').toLowerCase() === cleanEmail)
      if (!existing) return json({ error: 'Não foi possível criar a conta agora. Tente novamente.' }, 500)

      const { data: alreadyAff } = await supabase.from('affiliates')
        .select('id').eq('user_id', existing.id).maybeSingle()
      if (alreadyAff) {
        return json({ error: 'Este e-mail já é afiliado. Use o botão Entrar para acessar o painel.' }, 409)
      }

      const sha = async (v: string) => {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
      }

      if (!providedCode) {
        // 1ª etapa: gera e envia o código de confirmação
        const code = String(Math.floor(100000 + Math.random() * 900000))
        await supabase.from('affiliate_email_codes').upsert({
          email: cleanEmail, code_hash: await sha(code), attempts: 0,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        }, { onConflict: 'email' })
        try {
          const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: `OneMed <${FROM_EMAIL}>`,
              to: [cleanEmail],
              subject: `${code} é o seu código de confirmação — Afiliados OneMed`,
              html: `<!DOCTYPE html><html><body style="margin:0;padding:32px 16px;background:#f4f4f5;font-family:Arial,sans-serif;">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
                  <tr><td style="background:#e11d2e;padding:20px 32px;"><span style="color:#fff;font-size:20px;font-weight:bold;">OneMed</span></td></tr>
                  <tr><td style="padding:32px;">
                    <h1 style="margin:0 0 12px;font-size:20px;color:#18181b;">Confirme que este e-mail é seu</h1>
                    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#3f3f46;">
                      Este e-mail já tem uma conta na OneMed. Para criar também a sua conta de
                      <b>afiliado</b> com ele, digite o código abaixo na tela de cadastro:
                    </p>
                    <p style="margin:0 0 20px;font-size:34px;letter-spacing:8px;font-weight:bold;color:#e11d2e;text-align:center;">${code}</p>
                    <p style="margin:0;font-size:12px;color:#a1a1aa;">O código vale por 15 minutos. Se não foi você, ignore este e-mail — nada muda na sua conta.</p>
                  </td></tr>
                </table></body></html>`,
            }),
          })
        } catch (e) { console.error('code email error', e) }
        return json({ needsVerification: true })
      }

      // 2ª etapa: valida o código e cria o afiliado sobre a conta existente
      const { data: codeRow } = await supabase.from('affiliate_email_codes')
        .select('*').eq('email', cleanEmail).maybeSingle()
      if (!codeRow || new Date(codeRow.expires_at) < new Date() || codeRow.attempts >= 5) {
        return json({ error: 'Código expirado. Peça um novo código.' }, 400)
      }
      if ((await sha(providedCode)) !== codeRow.code_hash) {
        await supabase.from('affiliate_email_codes').update({ attempts: codeRow.attempts + 1 }).eq('email', cleanEmail)
        return json({ error: 'Código incorreto. Confira o e-mail e tente de novo.' }, 400)
      }
      await supabase.from('affiliate_email_codes').delete().eq('email', cleanEmail)

      // posse comprovada: a senha passa a valer pro login desta conta — e o
      // e-mail é confirmado junto (o código É a confirmação; sem isso, conta
      // criada mas nunca logada por magic link travaria no login com
      // "email_not_confirmed").
      const { error: pwErr } = await supabase.auth.admin.updateUserById(existing.id, { password, email_confirm: true })
      if (pwErr) {
        console.error('updateUser password error', pwErr)
        return json({ error: 'Não foi possível definir a senha. Tente novamente.' }, 500)
      }

      const couponCodeExisting = await generateInitialCoupon(supabase, cleanName)
      const { error: affExistingErr } = await supabase.from('affiliates').insert({
        user_id: existing.id, name: cleanName, email: cleanEmail, coupon_code: couponCodeExisting,
      })
      if (affExistingErr) {
        console.error('affiliates insert (existing user) error', affExistingErr)
        return json({ error: 'Não foi possível criar a conta agora. Tente novamente.' }, 500)
      }
      try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `OneMed <${FROM_EMAIL}>`,
            to: [cleanEmail],
            subject: 'Sua conta de afiliado OneMed foi criada!',
            html: welcomeEmailHtml(cleanName),
          }),
        })
      } catch (e) { console.error('welcome email error', e) }
      return json({ success: true, couponCode: couponCodeExisting })
    }

    const couponCode = await generateInitialCoupon(supabase, cleanName)

    const { error: affErr } = await supabase.from('affiliates').insert({
      user_id: created.user.id,
      name: cleanName,
      email: cleanEmail,
      coupon_code: couponCode,
    })
    if (affErr) {
      // Sem a linha de afiliado a conta não serve pra nada — desfaz o usuário
      // pra pessoa poder tentar de novo do zero.
      console.error('affiliates insert error', affErr)
      await supabase.auth.admin.deleteUser(created.user.id)
      return json({ error: 'Não foi possível criar a conta agora. Tente novamente.' }, 500)
    }

    // Boas-vindas: falha de e-mail não pode derrubar o cadastro.
    try {
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `OneMed <${FROM_EMAIL}>`,
          to: [cleanEmail],
          subject: 'Sua conta de afiliado OneMed foi criada!',
          html: welcomeEmailHtml(cleanName),
        }),
      })
      if (!emailRes.ok) console.error('welcome email failed', await emailRes.text())
    } catch (e) {
      console.error('welcome email error', e)
    }

    return json({ success: true, couponCode })
  } catch (err: any) {
    console.error('affiliate-register error', err)
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
