import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Contas de armazenamento extras no Google Drive.
 *
 * Uma função só, com ações, porque as três operações compartilham o mesmo
 * gate de admin e o mesmo refresh de token:
 *   - `list`       → contas conectadas + espaço livre (SEM tokens)
 *   - `connect`    → troca o code do OAuth por tokens e cadastra a conta
 *   - `disconnect` → remove a conta
 *
 * Por que existe: o Drive limita o DOWNLOAD DIÁRIO POR ARQUIVO em arquivos
 * que a conta não possui, e o limite é por bytes — uma aula de 3 GB esgota a
 * franquia dela num único download. Copiar o arquivo para uma conta nossa
 * remove o limite (dono não tem cota no próprio arquivo), mas a conta de
 * conteúdo atual está sem espaço. Daí conectar contas só para armazenar.
 *
 * A conexão de conteúdo (`drive_config`, a que serve as aulas hoje) NUNCA é
 * tocada aqui — são tabelas diferentes justamente para isso.
 */

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

const GOOGLE_CLIENT_ID = '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com'

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  })
}

async function refreshAccessToken(refreshToken: string, clientSecret: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token || null
}

/** Espaço da conta + e-mail dono do token. */
async function fetchQuota(accessToken: string) {
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/about?fields=storageQuota,user(emailAddress)',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) return null
  const d = await res.json()
  return {
    email: d.user?.emailAddress as string | undefined,
    // `limit` não vem em contas Workspace com armazenamento ilimitado.
    limit: d.storageQuota?.limit ? Number(d.storageQuota.limit) : null,
    usage: d.storageQuota?.usage ? Number(d.storageQuota.usage) : null,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    // ── gate de admin ──────────────────────────────────────────────────────
    // A tabela guarda refresh tokens do Google, que dão acesso permanente ao
    // Drive de alguém. Sem admin confirmado, nada acontece aqui.
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')
    if (!jwt) return json(req, { error: 'Não autenticado' }, 401)

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !userData?.user) return json(req, { error: 'Não autenticado' }, 401)

    const { data: isAdmin } = await admin.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin',
    })
    if (!isAdmin) return json(req, { error: 'Acesso restrito a administradores' }, 403)

    const { action = 'list', code, redirect_uri, id, label } = await req.json().catch(() => ({}))

    // ── conectar ───────────────────────────────────────────────────────────
    if (action === 'connect') {
      if (!code || !redirect_uri) return json(req, { error: 'Requisição incompleta' }, 400)

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri,
          grant_type: 'authorization_code',
        }),
      })
      const tokens = await tokenRes.json()
      if (tokens.error) return json(req, { error: tokens.error_description || tokens.error }, 400)

      const quota = await fetchQuota(tokens.access_token)
      if (!quota?.email) return json(req, { error: 'Não foi possível ler a conta do Google' }, 502)

      // Sem refresh_token a conta só serve por uma hora e depois morre em
      // silêncio no meio de uma cópia. O Google só o devolve com
      // `prompt=consent`; se não veio, é melhor recusar agora e pedir para
      // reconectar do que cadastrar algo que vai falhar depois.
      if (!tokens.refresh_token) {
        const { data: jaExiste } = await admin
          .from('drive_storage_accounts')
          .select('refresh_token')
          .eq('email', quota.email)
          .maybeSingle()
        if (!jaExiste?.refresh_token) {
          return json(req, {
            error: 'O Google não devolveu autorização permanente. Tente conectar de novo e confirme a tela de permissões.',
          }, 400)
        }
      }

      const row: Record<string, unknown> = {
        email: quota.email,
        access_token: tokens.access_token,
        token_expiry: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
        connected: true,
        storage_limit_bytes: quota.limit,
        storage_usage_bytes: quota.usage,
        quota_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      // Reconectar a mesma conta não pode apagar o refresh token válido que
      // já está salvo quando o Google decide não mandar outro.
      if (tokens.refresh_token) row.refresh_token = tokens.refresh_token
      if (label) row.label = label

      const { error: upsertErr } = await admin
        .from('drive_storage_accounts')
        .upsert(row, { onConflict: 'email' })
      if (upsertErr) return json(req, { error: upsertErr.message }, 500)

      return json(req, { success: true, email: quota.email })
    }

    // ── desconectar ────────────────────────────────────────────────────────
    if (action === 'disconnect') {
      if (!id) return json(req, { error: 'Conta não informada' }, 400)
      const { error } = await admin.from('drive_storage_accounts').delete().eq('id', id)
      if (error) return json(req, { error: error.message }, 500)
      return json(req, { success: true })
    }

    // ── listar ─────────────────────────────────────────────────────────────
    // Relê a cota de cada conta para o painel mostrar espaço atual, não o do
    // dia em que foi conectada. Os tokens NUNCA entram na resposta.
    const { data: accounts, error } = await admin
      .from('drive_storage_accounts')
      .select('id, email, label, connected, storage_limit_bytes, storage_usage_bytes, quota_checked_at, created_at')
      .order('created_at')
    if (error) return json(req, { error: error.message }, 500)

    const detailed = await Promise.all((accounts || []).map(async (acc) => {
      const { data: full } = await admin
        .from('drive_storage_accounts')
        .select('access_token, refresh_token, token_expiry')
        .eq('id', acc.id)
        .single()

      let accessToken = full?.access_token as string | null
      const expired = !full?.token_expiry || new Date(full.token_expiry).getTime() < Date.now() + 60_000
      if (expired && full?.refresh_token) {
        accessToken = await refreshAccessToken(full.refresh_token, GOOGLE_CLIENT_SECRET)
        if (accessToken) {
          await admin.from('drive_storage_accounts').update({
            access_token: accessToken,
            token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
          }).eq('id', acc.id)
        }
      }

      if (!accessToken) return { ...acc, connected: false, erro: 'Autorização expirada — reconecte a conta.' }

      const quota = await fetchQuota(accessToken)
      if (!quota) return { ...acc, connected: false, erro: 'Não foi possível ler a conta no Google.' }

      await admin.from('drive_storage_accounts').update({
        storage_limit_bytes: quota.limit,
        storage_usage_bytes: quota.usage,
        quota_checked_at: new Date().toISOString(),
      }).eq('id', acc.id)

      return {
        ...acc,
        connected: true,
        storage_limit_bytes: quota.limit,
        storage_usage_bytes: quota.usage,
        quota_checked_at: new Date().toISOString(),
      }
    }))

    return json(req, { accounts: detailed })
  } catch (err) {
    console.error(err)
    return json(req, { error: (err as Error).message }, 500)
  }
})
