// ─────────────────────────────────────────────────────────────────────────────
// OneMed · member-auth-request
// Porta de entrada da área de membros (/membros). Desde 13/08/2026 o login é
// E-MAIL + SENHA; antes bastava o e-mail (o servidor gerava um magic link e
// resgatava ele sozinho, então quem soubesse o e-mail de um aluno entrava na
// conta dele).
//
// Comprar e receber acesso continuam sendo só pelo e-mail: a senha é escolhida
// pelo próprio aluno na primeira vez que ele for entrar.
//
// Ações:
//   status        { email }                    → { hasPassword }
//   set-password  { email, password }          → cadastra a senha e já entra
//   login         { email, password }          → entra
//   admin-reset   { email }  (JWT de admin)    → libera novo cadastro de senha
//
// Todas passam pelo mesmo portão de sempre: e-mail válido, rate limit por IP e
// acesso ativo (trial/compra/admin). O que muda é só como a sessão é obtida.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const SENHA_MINIMA = 8

// Ponte de migração, já FECHADA. Enquanto o site novo subia, uma chamada SEM
// `action` continuava entrando só com o e-mail, pra ninguém ficar sem login com
// a versão antiga em cache no navegador. Com isto em false não existe mais
// nenhum caminho de entrada sem senha — e é isso que dá sentido ao resto: de
// nada adiantaria exigir senha na tela se a função ainda aceitasse o pedido
// antigo vindo de um curl.
const PERMITIR_LOGIN_SEM_SENHA = false

// Telas simultâneas por plano — espelha src/lib/plans.ts e o que os cards do
// checkout prometem. TODO plano precisa estar aqui: quando o mapa só tinha os
// dois vitalícios superiores, um plano de fora dele simplesmente sumia da
// conta (`.filter(!!n)`), e bastava uma linha de acesso mapeada para o limite
// de outra ignorar o plano real da pessoa.
const PLAN_DEVICE_LIMITS: Record<string, number> = {
  monthly: 1, annual: 2, lifetime: 2, lifetime_plus: 4, lifetime_pro: 6,
}
const DEFAULT_DEVICE_LIMIT = 2

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

// Geolocaliza o IP do login e grava/atualiza member_locations — melhor
// esforço, nunca derruba o login se a API de geolocalização falhar.
async function captureMemberLocation(supabase: ReturnType<typeof createClient>, ip: string, userId: string, email: string) {
  try {
    if (!ip || ip === 'unknown') return
    const geoRes = await fetch(`https://ipwho.is/${ip}`, { signal: AbortSignal.timeout(3000) })
    if (!geoRes.ok) return
    const geo = await geoRes.json()
    if (!geo.success || geo.latitude == null || geo.longitude == null) return
    await supabase.from('member_locations').upsert({
      user_id: userId,
      email,
      ip,
      city: geo.city || null,
      region: geo.region || null,
      country: geo.country || null,
      country_code: geo.country_code || null,
      latitude: geo.latitude,
      longitude: geo.longitude,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  } catch (err) {
    console.warn('captureMemberLocation falhou', err)
  }
}

// Rate-limit ATÔMICO via RPC (incremento-e-checa em um statement) — o antigo
// SELECT→compara→UPDATE era furável por corrida. Falha da RPC segue liberado
// (login não é caminho de custo pago), preservando o comportamento anterior.
async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  identifier: string,
  action = 'member_login',
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
) {
  const { data } = await supabase.rpc('rate_limit_hit', {
    _identifier: identifier,
    _action: action,
    _limit: maxAttempts,
    _window_seconds: Math.ceil(windowMs / 1000),
  })
  const row = Array.isArray(data) ? data[0] : data
  if (row && row.allowed === false) {
    const ws = new Date(row.window_start).getTime()
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((ws + windowMs - Date.now()) / 1000)) }
  }
  return { allowed: true }
}

// CAPTCHA (Cloudflare Turnstile) — verificação server-side. Inerte enquanto
// TURNSTILE_SECRET_KEY não estiver configurado (não quebra o login atual);
// quando o dono provisionar o Turnstile + a env, passa a exigir o token.
async function verificarCaptcha(token: string, ip: string): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) return true
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token || '', ...(ip && ip !== 'unknown' ? { remoteip: ip } : {}) }),
    })
    const data = await res.json().catch(() => ({}))
    return !!data?.success
  } catch (err) {
    console.error('verificarCaptcha falhou', err)
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || serviceKey
    const supabase = createClient(supabaseUrl, serviceKey)

    const body = await req.json().catch(() => ({}))
    const email = String(body?.email || '').trim().toLowerCase()
    const senha = String(body?.password || '')
    const captchaToken = String(body?.captchaToken || '')
    const acao = String(body?.action || '') || (PERMITIR_LOGIN_SEM_SENHA ? 'legacy' : '')

    if (!EMAIL_REGEX.test(email)) return jsonResponse(req, { error: 'Email inválido' }, 400)

    // x-real-ip PRIMEIRO: é setado pela plataforma e não é forjável. O
    // x-forwarded-for esquerdo é a parte controlada pelo cliente — um
    // atacante mandando um XFF diferente por requisição zerava o rate limit
    // por IP (5/15min), liberando enumeração/abuso do login sem trava.
    const ip = req.headers.get('x-real-ip')
      || (req.headers.get('x-forwarded-for') || '').split(',').map(s => s.trim()).filter(Boolean).pop()
      || 'unknown'

    // ── admin-reset: só admin, e não passa pelo portão de aluno ─────────────
    // Como não existe "esqueci minha senha" por e-mail, é por aqui que o
    // suporte destrava quem perdeu a senha: apaga a marca e devolve a conta pro
    // estado "ainda não cadastrou", pra pessoa escolher outra.
    if (acao === 'admin-reset') {
      const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
      if (!jwt) return jsonResponse(req, { error: 'Não autenticado' }, 401)
      const { data: quem } = await supabase.auth.getUser(jwt)
      if (!quem?.user) return jsonResponse(req, { error: 'Sessão inválida' }, 401)
      const { data: ehAdmin } = await supabase.rpc('has_role', { _user_id: quem.user.id, _role: 'admin' })
      if (!ehAdmin) return jsonResponse(req, { error: 'Apenas administradores' }, 403)

      const { data: cred } = await supabase.from('member_credentials')
        .select('user_id, origem').ilike('email', email).maybeSingle()
      if (!cred) return jsonResponse(req, { error: 'Esta conta ainda não tem senha cadastrada.' }, 404)

      // Conta do PAINEL não pode ser resetada por aqui. A senha dela é a do
      // /admin/login, e não existe autoatendimento pra recuperar: resetar
      // tranca a pessoa fora do painel até alguém com acesso ao banco entrar.
      // Aconteceu de verdade com a conta visualizadora em 13/08.
      if (cred.origem === 'painel') {
        return jsonResponse(req, {
          error: 'Esta é uma conta do painel administrativo. Troque a senha dela em Contas do Painel, não por aqui.',
        }, 409)
      }

      // A senha antiga precisa MORRER junto com a marca: só apagar a linha
      // deixaria a senha antiga valendo, e o próximo "cadastrar senha" seria
      // uma segunda senha válida na mesma conta.
      const aleatoria = crypto.randomUUID() + crypto.randomUUID()
      const { error: updErr } = await supabase.auth.admin.updateUserById(cred.user_id, { password: aleatoria })
      if (updErr) {
        console.error('admin-reset updateUserById', updErr)
        return jsonResponse(req, { error: 'Não foi possível redefinir a senha agora.' }, 500)
      }
      await supabase.from('member_credentials').delete().eq('user_id', cred.user_id)
      await supabase.rpc('log_security_event', {
        _event: 'member_password_reset_by_admin', _actor_user_id: quem.user.id,
        _actor_email: quem.user.email ?? null, _target: email, _ip: ip, _detail: { origem: cred.origem },
      }).then(() => {}, () => {})
      return jsonResponse(req, { success: true })
    }

    // Sem .limit(1).maybeSingle() de propósito: uma conta pode ter mais de
    // uma linha "active" em accesses (ex: grant manual antigo nunca
    // desativado ao fazer upgrade) — pegar só uma arbitrária já causou o
    // limite de telas cair pro plano errado. Busca todas e decide com .some().
    const [{ data: activeAccesses }, { data: buyerRows }, { data: isAdminEmail }] = await Promise.all([
      supabase.from('accesses').select('id, access_type, expires_at').eq('email', email).eq('status', 'active'),
      supabase.from('buyers').select('id, plan').eq('email', email).eq('access_granted', true),
      supabase.rpc('is_admin_email', { _email: email }),
    ])

    // Admins juggle this login constantly while testing/debugging the
    // platform itself — rate limiting them out of their own site is a
    // self-inflicted lockout, not abuse prevention.
    if (!isAdminEmail) {
      // `status` é consultado a cada e-mail digitado na tela de login, então
      // gasta um contador próprio e mais folgado — se dividisse o contador do
      // login, errar a senha 2× já esgotaria a cota de quem está tentando
      // entrar direito.
      const rate = acao === 'status'
        ? await checkRateLimit(supabase, ip, 'member_status', 20)
        : acao === 'set-password'
          ? await checkRateLimit(supabase, ip, 'member_set_password', 5, 60 * 60 * 1000)
          : await checkRateLimit(supabase, ip)
      if (!rate.allowed) {
        return jsonResponse(req, { error: 'Muitas tentativas. Tente novamente em alguns minutos.', retryAfterSeconds: rate.retryAfterSeconds }, 429)
      }
    } else if (acao === 'status') {
      // Admin é isento do rate-limit geral (loga o tempo todo durante testes),
      // MAS o `status` de e-mail admin ganha um teto GENEROSO por IP — senão dá
      // pra enumerar quais e-mails são do painel sem nenhuma trava (o que
      // alimenta o brute-force). 60/15min não atrapalha o dono digitando o
      // próprio e-mail; barra a varredura em massa.
      const rate = await checkRateLimit(supabase, ip, 'member_status_admin', 60)
      if (!rate.allowed) {
        return jsonResponse(req, { error: 'Muitas tentativas. Tente novamente em alguns minutos.', retryAfterSeconds: rate.retryAfterSeconds }, 429)
      }
    }

    if (!activeAccesses?.length && !buyerRows?.length && !isAdminEmail) {
      return jsonResponse(req, { error: 'Nenhum acesso ativo encontrado para este email. Faça um trial gratuito ou verifique sua compra.' }, 404)
    }

    const { data: credencial } = await supabase.from('member_credentials')
      .select('user_id, origem').ilike('email', email).maybeSingle()
    const temSenha = !!credencial

    // A origem viaja junto porque muda o que a tela precisa dizer. Quem é
    // afiliado ou tem conta no painel JÁ tinha escolhido uma senha — na mesma
    // conta do Auth — e caía no campo "Sua senha" achando que nunca havia
    // cadastrado nada. Sem essa dica, a pessoa fica adivinhando.
    if (acao === 'status') {
      return jsonResponse(req, {
        success: true,
        hasPassword: temSenha,
        passwordSource: temSenha ? (credencial?.origem || 'membro') : null,
      })
    }

    // Limite de dispositivos simultâneos por conta (2 no padrão, 4 pra
    // Vitalício Plus, 6 pra Vitalício Pro): mantém só as sessões mais
    // recentes (a que acabou de ser criada entra nessa contagem), o que
    // derruba o refresh token do dispositivo mais antigo no próximo refresh.
    const finalizarLogin = async (userId: string) => {
      // Cada acesso/compra vale o limite do SEU plano — tipo desconhecido
      // ('paid' do webhook antigo, 'trial') cai no padrão — e a conta usa o
      // MAIOR entre eles. Linha vencida não entra: um anual expirado (que o
      // cron ainda não revogou) não pode continuar valendo telas.
      const agora = Date.now()
      const valido = (expiresAt: string | null | undefined) =>
        !expiresAt || new Date(expiresAt).getTime() > agora
      const limiteDe = (plano: string | null | undefined) =>
        (plano && PLAN_DEVICE_LIMITS[plano]) || DEFAULT_DEVICE_LIMIT
      const planLimits = [
        ...(activeAccesses || []).filter(a => valido(a.expires_at)).map(a => limiteDe(a.access_type)),
        ...(buyerRows || []).map(b => limiteDe(b.plan)),
      ]
      const maxSessions = planLimits.length > 0 ? Math.max(...planLimits) : DEFAULT_DEVICE_LIMIT
      const { error: limitErr } = await supabase.rpc('enforce_session_limit', { _user_id: userId, _max_sessions: maxSessions })
      if (limitErr) console.error('enforce_session_limit error', limitErr)

      // Geolocalização não pode ficar no caminho crítico do login — uma
      // resposta lenta do ipwho.is já deixou o login inteiro estourar o
      // timeout do fetch no frontend ("Failed to send a request to the
      // Edge Function"). waitUntil mantém o isolate vivo até terminar, sem
      // segurar a resposta pro cliente.
      const locationPromise = captureMemberLocation(supabase, ip, userId, email)
      // @ts-ignore EdgeRuntime é um global específico do runtime da Supabase
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(locationPromise)
      } else {
        await locationPromise
      }
    }

    // Sessão a partir da SENHA. É o mesmo endpoint que o supabase-js usaria no
    // navegador; feito aqui pra que o portão acima (acesso ativo, rate limit) e
    // o limite de telas continuem valendo antes de qualquer sessão existir.
    const entrarComSenha = async () => {
      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: senha }),
      })
      const dados = await res.json().catch(() => ({}))
      if (!res.ok || !dados?.access_token) return null
      return dados as { access_token: string; refresh_token: string; user?: { id?: string } }
    }

    // ── cadastrar senha (primeira vez) ──────────────────────────────────────
    if (acao === 'set-password') {
      if (!(await verificarCaptcha(captchaToken, ip))) {
        return jsonResponse(req, { error: 'Verificação de segurança falhou. Recarregue a página e tente novamente.' }, 403)
      }
      if (senha.length < SENHA_MINIMA) {
        return jsonResponse(req, { error: `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` }, 400)
      }
      // Trava central desta escolha de produto: cadastrar senha é de UMA vez
      // só. Sem isso, qualquer pessoa que soubesse o e-mail poderia trocar a
      // senha de um aluno quando quisesse, e o login com senha não valeria
      // nada. Quem esqueceu passa pelo suporte (admin-reset).
      if (temSenha) {
        return jsonResponse(req, {
          error: 'Esta conta já tem uma senha cadastrada. Use sua senha para entrar ou fale com o suporte.',
        }, 409)
      }

      // generateLink PROVISIONA a conta do Auth se ela ainda não existir — é o
      // caso de quem comprou e nunca entrou. O link em si é descartado: quem
      // dá a sessão aqui é a senha recém-criada, o que já prova que ela ficou
      // valendo de verdade.
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({ type: 'magiclink', email })
      const userId = linkData?.user?.id
      if (linkErr || !userId) {
        console.error('generateLink (set-password)', linkErr)
        return jsonResponse(req, { error: 'Não foi possível criar sua senha agora. Tente novamente.' }, 500)
      }

      const { error: updErr } = await supabase.auth.admin.updateUserById(userId, {
        password: senha, email_confirm: true,
      })
      if (updErr) {
        console.error('updateUserById (set-password)', updErr)
        return jsonResponse(req, { error: 'Não foi possível criar sua senha agora. Tente novamente.' }, 500)
      }

      // A marca é gravada ANTES de devolver a sessão: se a resposta se perder
      // no caminho, a senha já vale e a pessoa entra por ela — o contrário
      // (senha valendo sem marca) deixaria a conta aberta pra outra pessoa
      // "cadastrar" por cima.
      const { error: credErr } = await supabase.from('member_credentials')
        .upsert({ user_id: userId, email, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      if (credErr) {
        console.error('member_credentials upsert', credErr)
        return jsonResponse(req, { error: 'Não foi possível concluir o cadastro da senha. Tente novamente.' }, 500)
      }

      const sessao = await entrarComSenha()
      if (!sessao) {
        // Senha gravada, sessão não veio: a pessoa não fica travada, entra
        // pela tela de login normalmente com a senha que acabou de escolher.
        return jsonResponse(req, { success: true, passwordCreated: true }, 200)
      }
      await finalizarLogin(userId)
      return jsonResponse(req, {
        success: true, passwordCreated: true,
        access_token: sessao.access_token, refresh_token: sessao.refresh_token,
      })
    }

    // ── entrar com senha ────────────────────────────────────────────────────
    if (acao === 'login') {
      if (!temSenha) {
        return jsonResponse(req, { error: 'Esta conta ainda não tem senha. Cadastre a sua para entrar.', needsPassword: true }, 409)
      }
      if (!(await verificarCaptcha(captchaToken, ip))) {
        return jsonResponse(req, { error: 'Verificação de segurança falhou. Recarregue a página e tente novamente.' }, 403)
      }
      // Lockout por CONTA-ALVO (vale INCLUSIVE para admin, que é isento do
      // limite por IP acima): agrega as senhas erradas de TODOS os IPs contra
      // este e-mail. É o que fecha o brute-force distribuído da conta admin —
      // um atacante que troca de IP a cada tentativa driblava o limite por IP,
      // mas não este contador por conta. Sucesso zera o contador, então um
      // login legítimo nunca trava (só falhas repetidas travam).
      const LOCK_MAX = 10
      const LOCK_WINDOW = 20 * 60
      const { data: fails } = await supabase.rpc('rate_limit_count', {
        _identifier: email, _action: 'login_fail', _window_seconds: LOCK_WINDOW,
      })
      if ((Number(fails) || 0) >= LOCK_MAX) {
        return jsonResponse(req, { error: 'Muitas tentativas de senha para esta conta. Aguarde cerca de 20 minutos e tente novamente.' }, 429)
      }
      const sessao = await entrarComSenha()
      if (!sessao?.user?.id) {
        await supabase.rpc('rate_limit_bump', { _identifier: email, _action: 'login_fail', _window_seconds: LOCK_WINDOW })
          .then(() => {}, () => {})
        return jsonResponse(req, { error: 'Senha incorreta. Tente novamente.' }, 401)
      }
      await supabase.rpc('rate_limit_reset', { _identifier: email, _action: 'login_fail' }).then(() => {}, () => {})
      await finalizarLogin(sessao.user.id)
      return jsonResponse(req, { success: true, access_token: sessao.access_token, refresh_token: sessao.refresh_token })
    }

    if (acao !== 'legacy') return jsonResponse(req, { error: 'Ação inválida' }, 400)

    // ── login antigo, só com e-mail (ponte de migração) ──────────────────────
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error('generateLink error', linkErr)
      return jsonResponse(req, { error: 'Não foi possível gerar o acesso. Tente novamente.' }, 500)
    }

    // Redeem the link ourselves instead of emailing it — GoTrue returns the
    // session as a URL fragment on the 303 redirect, so we read it off the
    // Location header without ever exposing the underlying magic link.
    // A buyer's very first login has no confirmed auth.users row yet, so
    // GoTrue files the token as a "signup" confirmation instead of a
    // "magiclink" one — verifying with the wrong type reports it as expired.
    // Try both; whichever matches the token's real type wins.
    const hashedToken = linkData.properties.hashed_token
    let access_token: string | null = null
    let refresh_token: string | null = null
    for (const verifyType of ['magiclink', 'signup']) {
      const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${hashedToken}&type=${verifyType}&redirect_to=${encodeURIComponent(ALLOWED_ORIGINS[0])}`
      const verifyRes = await fetch(verifyUrl, { redirect: 'manual' })
      const location = verifyRes.headers.get('location')
      if (!location) continue
      const fragment = new URLSearchParams(new URL(location).hash.slice(1))
      access_token = fragment.get('access_token')
      refresh_token = fragment.get('refresh_token')
      if (access_token && refresh_token) break
    }

    if (!access_token || !refresh_token) {
      console.error('verify redeem failed for both magiclink and signup types')
      return jsonResponse(req, { error: 'Não foi possível concluir o login. Tente novamente.' }, 500)
    }

    if (linkData.user?.id) await finalizarLogin(linkData.user.id)

    return jsonResponse(req, { success: true, access_token, refresh_token })
  } catch (err: any) {
    console.error(err)
    return jsonResponse(req, { error: err.message }, 500)
  }
})
