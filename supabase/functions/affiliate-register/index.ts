// ─────────────────────────────────────────────────────────────────────────────
// OneMed · affiliate-register — cadastro E login de afiliado (sem código)
//
// A conta de afiliado é independente da de assinante/admin e o MESMO e-mail
// pode ter as duas. Sem código de verificação, a segurança vem do desenho:
//
//   • e-mail livre no Auth        → cria o usuário direto com a senha.
//   • e-mail existente + LOGADO   → a sessão é a prova de posse: o afiliado
//     (JWT do próprio e-mail)       nasce no MESMO usuário e a senha passa a
//                                   valer pro login dele.
//   • e-mail existente, deslogado → o afiliado nasce num usuário-ALIAS
//                                   interno (email aleatório @alias), sem
//                                   tocar na conta do assinante — definir
//                                   senha na conta de outra pessoa é que
//                                   seria o roubo de conta.
//
// action=login: resolve o e-mail REAL do afiliado pro usuário certo (direto ou
// alias) e faz o grant de senha no GoTrue por aqui — o cliente nunca precisa
// saber se existe alias.
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

function escapeHtml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function checkRateLimit(supabase: ReturnType<typeof createClient>, identifier: string, action: string, max: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data } = await supabase.from('rate_limits')
    .select('attempts, window_start')
    .eq('identifier', identifier)
    .eq('action', action)
    .maybeSingle()
  if (data && data.window_start >= windowStart && (data.attempts ?? 0) >= max) return false
  await supabase.from('rate_limits').upsert({
    identifier, action,
    attempts: data && data.window_start >= windowStart ? (data.attempts ?? 0) + 1 : 1,
    window_start: data && data.window_start >= windowStart ? data.window_start : new Date().toISOString(),
  }, { onConflict: 'identifier,action' })
  return true
}

async function generateInitialCoupon(supabase: ReturnType<typeof createClient>, name: string): Promise<string | null> {
  const base = (name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z]/g, '').slice(0, 10) || 'AFILIADO').toUpperCase()
  // Sufixo de 3 caracteres alfanuméricos (~46 mil combos por nome) em vez dos
  // 2 dígitos antigos (só 100): nomes comuns esgotavam as 100 tentativas e o
  // afiliado nascia sem cupom.
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const rand = (n: number) => Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')
  for (let i = 0; i < 12; i++) {
    const code = `${base}${rand(3)}`
    const { data: created, error } = await supabase.from('coupons')
      .insert({ code, discount_percent: 10, active: true, description: 'Cupom de afiliado' })
      .select('code').maybeSingle()
    if (!error && created) return created.code as string
  }
  return null
}

function welcomeEmailHtml(name: string): string {
  const firstName = escapeHtml(name.split(' ')[0])
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
            <!-- Percentuais espelham AFFILIATE_COMMISSION_PERCENT do
                 mp-webhook, que é quem calcula de verdade. Mudou lá, muda
                 aqui — o e-mail estava anunciando a tabela antiga, MENOR
                 que a paga. -->
            • <b>20%</b> nas assinaturas do plano Mensal<br/>
            • <b>25%</b> nas do Anual e do Vitalício<br/>
            • <b>30%</b> nas do Vitalício Plus e do Vitalício Pro<br/>
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

async function sendWelcome(email: string, name: string) {
  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `OneMed <${FROM_EMAIL}>`,
        to: [email],
        subject: 'Sua conta de afiliado OneMed foi criada!',
        html: welcomeEmailHtml(name),
      }),
    })
    if (!res.ok) console.error('welcome email failed', await res.text())
  } catch (e) {
    console.error('welcome email error', e)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }
  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), { status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceKey)

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || 'register')
    const cleanEmail = String(body.email || '').toLowerCase().trim()

    const clientIp = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
      || req.headers.get('x-real-ip') || 'unknown'

    if (!EMAIL_REGEX.test(cleanEmail)) return json({ error: 'E-mail inválido.' }, 400)
    const password = body.password
    if (typeof password !== 'string' || password.length < 8) {
      return json({ error: 'A senha precisa ter pelo menos 8 caracteres.' }, 400)
    }

    // ── LOGIN ────────────────────────────────────────────────────────────────
    if (action === 'login') {
      if (!(await checkRateLimit(supabase, `${clientIp}:${cleanEmail}`, 'affiliate_login', 12))) {
        return json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, 429)
      }
      const { data: aff } = await supabase.from('affiliates')
        .select('user_id').eq('email', cleanEmail).maybeSingle()
      if (!aff) return json({ error: 'E-mail ou senha incorretos.' }, 401)

      // e-mail de LOGIN do usuário do afiliado (pode ser o real ou um alias)
      const { data: authUser } = await supabase.auth.admin.getUserById(aff.user_id)
      const loginEmail = authUser?.user?.email
      if (!loginEmail) return json({ error: 'E-mail ou senha incorretos.' }, 401)

      const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: Deno.env.get('SUPABASE_ANON_KEY') || '', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password }),
      })
      const tokenData = await tokenRes.json()
      if (!tokenRes.ok || !tokenData?.access_token) {
        return json({ error: 'E-mail ou senha incorretos.' }, 401)
      }
      return json({
        success: true,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
      })
    }

    // ── REGISTER ─────────────────────────────────────────────────────────────
    const cleanName = String(body.name || '').trim()
    if (cleanName.length < 3) return json({ error: 'Informe seu nome completo.' }, 400)
    if (!(await checkRateLimit(supabase, clientIp, 'affiliate_register', 10))) {
      return json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }, 429)
    }

    // um afiliado por e-mail
    const { data: alreadyAff } = await supabase.from('affiliates')
      .select('id').eq('email', cleanEmail).maybeSingle()
    if (alreadyAff) {
      return json({ error: 'Este e-mail já é afiliado. Use o botão Entrar para acessar o painel.' }, 409)
    }

    // sessão do próprio e-mail = prova de posse (assinante logado no menu)
    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    let sessionUser: any = null
    if (jwt) {
      const { data: u } = await supabase.auth.getUser(jwt)
      if (u?.user && (u.user.email || '').toLowerCase() === cleanEmail) sessionUser = u.user
    }

    let userId: string
    let mode: 'new' | 'self' | 'alias'

    if (sessionUser) {
      // mesmo usuário da sessão: senha passa a valer pro login dele
      const { error: pwErr } = await supabase.auth.admin.updateUserById(sessionUser.id, {
        password, email_confirm: true,
      })
      if (pwErr) {
        console.error('updateUser password error', pwErr)
        return json({ error: 'Não foi possível criar a conta agora. Tente novamente.' }, 500)
      }
      userId = sessionUser.id
      mode = 'self'
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: cleanEmail, password, email_confirm: true,
        user_metadata: { affiliate: true, name: cleanName },
      })
      if (created?.user) {
        userId = created.user.id
        mode = 'new'
      } else if (/already|registered|exists/i.test(String(createErr?.message || ''))) {
        // e-mail já é de um assinante/admin e a pessoa NÃO está logada nele:
        // o afiliado nasce num usuário-alias, sem tocar na conta existente.
        const alias = `afiliado-${crypto.randomUUID().slice(0, 12)}@alias.onemedcursos.com.br`
        const { data: aliasCreated, error: aliasErr } = await supabase.auth.admin.createUser({
          email: alias, password, email_confirm: true,
          user_metadata: { affiliate: true, name: cleanName, real_email: cleanEmail },
        })
        if (aliasErr || !aliasCreated?.user) {
          console.error('alias createUser error', aliasErr)
          return json({ error: 'Não foi possível criar a conta agora. Tente novamente.' }, 500)
        }
        userId = aliasCreated.user.id
        mode = 'alias'
      } else {
        console.error('createUser error', createErr)
        return json({ error: 'Não foi possível criar a conta agora. Tente novamente.' }, 500)
      }
    }

    const couponCode = await generateInitialCoupon(supabase, cleanName)
    // ref_code é o token IMUTÁVEL do link de indicação (?ref=): nasce igual ao
    // cupom (link familiar), mas NUNCA muda quando o afiliado troca o cupom —
    // é o que garante que links antigos continuem atribuindo a venda. Fallback
    // único quando não há cupom.
    const refCode = couponCode || `AF${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
    const { error: affErr } = await supabase.from('affiliates').insert({
      user_id: userId, name: cleanName, email: cleanEmail, coupon_code: couponCode, ref_code: refCode,
    })
    if (affErr) {
      console.error('affiliates insert error', affErr)
      // usuário criado só pra isto (novo/alias) não pode ficar órfão
      if (mode !== 'self') await supabase.auth.admin.deleteUser(userId)
      return json({ error: 'Não foi possível criar a conta agora. Tente novamente.' }, 500)
    }

    await sendWelcome(cleanEmail, cleanName)
    return json({ success: true, couponCode, mode })
  } catch (err: any) {
    console.error('affiliate-register error', err)
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
