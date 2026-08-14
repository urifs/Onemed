// ─────────────────────────────────────────────────────────────────────────────
// OneMed · admin-panel-accounts
//
// Gestão das contas com acesso ao painel admin (/admin/contas). Passa pelo
// servidor porque criar usuário, trocar senha e apagar papel exigem a API
// administrativa do Auth (service role). SÓ admin de verdade usa — a conta
// visualizadora é gerenciada por aqui, nunca gerencia.
//
// Ações: create { email, password, role } · set_role { userId, role }
//        reset_password { userId, password } · remove { userId }
// Trava de segurança: nunca deixa o painel ficar SEM nenhum admin (demover ou
// remover o último admin é recusado).
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) })
  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), { status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Quem chama precisa estar logado E ser admin (visualizador não passa).
    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    const { data: userData } = await supabase.auth.getUser(jwt)
    if (!userData?.user) return json({ error: 'Não autenticado.' }, 401)
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' })
    if (!isAdmin) return json({ error: 'Apenas administradores gerenciam contas do painel.' }, 403)

    // Trilha de auditoria (append-only) — best-effort, nunca derruba a ação.
    const ip = req.headers.get('x-real-ip')
      || (req.headers.get('x-forwarded-for') || '').split(',').map(s => s.trim()).filter(Boolean).pop()
      || 'unknown'
    const audit = (event: string, target: string, detail: Record<string, unknown> = {}) =>
      supabase.rpc('log_security_event', {
        _event: event, _actor_user_id: userData.user.id, _actor_email: userData.user.email ?? null,
        _target: target, _ip: ip, _detail: detail,
      }).then(() => {}, () => {})

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '')

    // Quantos admins existem — usado pela trava do "último admin".
    const contarAdmins = async (): Promise<number> => {
      const { count } = await supabase.from('user_roles')
        .select('id', { count: 'exact', head: true }).eq('role', 'admin')
      return count ?? 0
    }

    if (action === 'create') {
      const email = String(body.email || '').toLowerCase().trim()
      const password = String(body.password || '')
      const role = body.role === 'viewer' ? 'viewer' : 'admin'
      if (!EMAIL_REGEX.test(email)) return json({ error: 'Informe um e-mail válido.' }, 400)
      if (password.length < 12) return json({ error: 'A senha precisa de pelo menos 12 caracteres.' }, 400)

      // E-mail já existente (ex: assinante) ganha o papel sem criar usuário
      // novo — mas aí a senha NÃO é alterada (senão viraria roubo de conta).
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true,
      })
      let userId = created?.user?.id as string | undefined
      let reaproveitado = false
      if (createErr) {
        if (!/already|registered|exists/i.test(createErr.message || '')) {
          return json({ error: createErr.message || 'Não foi possível criar a conta.' }, 400)
        }
        const { data: page } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
        userId = page?.users?.find((u: { email?: string }) => (u.email || '').toLowerCase() === email)?.id
        reaproveitado = true
        if (!userId) return json({ error: 'E-mail já cadastrado, mas não foi possível localizar a conta.' }, 409)
      }

      const { error: roleErr } = await supabase.from('user_roles')
        .upsert({ user_id: userId, role }, { onConflict: 'user_id,role' })
      if (roleErr) {
        // upsert exige constraint; se não houver, tenta insert simples ignorando duplicata
        const { error: insErr } = await supabase.from('user_roles').insert({ user_id: userId, role })
        if (insErr && !/duplicate/i.test(insErr.message || '')) {
          return json({ error: 'Conta criada, mas não foi possível atribuir o papel.' }, 500)
        }
      }
      await audit('admin_account_create', email, { role, reaproveitado })
      return json({ success: true, userId, reaproveitado })
    }

    if (action === 'set_role') {
      const userId = String(body.userId || '')
      const role = body.role === 'viewer' ? 'viewer' : 'admin'
      if (!userId) return json({ error: 'Conta inválida.' }, 400)
      if (role === 'viewer') {
        const { data: alvoAdmin } = await supabase.from('user_roles')
          .select('id').eq('user_id', userId).eq('role', 'admin').maybeSingle()
        if (alvoAdmin && (await contarAdmins()) <= 1) {
          return json({ error: 'Este é o último administrador — o painel não pode ficar sem nenhum.' }, 409)
        }
      }
      await supabase.from('user_roles').delete().eq('user_id', userId).in('role', ['admin', 'viewer'])
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role })
      if (error) return json({ error: 'Não foi possível trocar o papel.' }, 500)
      await audit('admin_account_set_role', userId, { role })
      return json({ success: true })
    }

    if (action === 'reset_password') {
      const userId = String(body.userId || '')
      const password = String(body.password || '')
      if (!userId) return json({ error: 'Conta inválida.' }, 400)
      if (password.length < 12) return json({ error: 'A senha precisa de pelo menos 12 caracteres.' }, 400)
      const { error } = await supabase.auth.admin.updateUserById(userId, { password })
      if (error) return json({ error: error.message || 'Não foi possível trocar a senha.' }, 500)
      await audit('admin_account_reset_password', userId, {})
      return json({ success: true })
    }

    if (action === 'remove') {
      const userId = String(body.userId || '')
      if (!userId) return json({ error: 'Conta inválida.' }, 400)
      const { data: alvoAdmin } = await supabase.from('user_roles')
        .select('id').eq('user_id', userId).eq('role', 'admin').maybeSingle()
      if (alvoAdmin && (await contarAdmins()) <= 1) {
        return json({ error: 'Este é o último administrador — o painel não pode ficar sem nenhum.' }, 409)
      }
      // Remove só o ACESSO AO PAINEL (papel). A conta de usuário continua —
      // pode ser um assinante da plataforma; apagar o usuário levaria junto
      // progresso, favoritos etc.
      const { error } = await supabase.from('user_roles')
        .delete().eq('user_id', userId).in('role', ['admin', 'viewer'])
      if (error) return json({ error: 'Não foi possível remover o acesso.' }, 500)
      await audit('admin_account_remove', userId, {})
      return json({ success: true })
    }

    return json({ error: 'Ação desconhecida.' }, 400)
  } catch (err) {
    console.error('admin-panel-accounts error', err)
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
