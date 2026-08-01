// ─────────────────────────────────────────────────────────────────────────────
// OneMed · drive-storage-token
// Função interna, service-to-service: devolve um access_token válido de uma
// CONTA DE ARMAZENAMENTO extra (tabela drive_storage_accounts), renovando pelo
// refresh_token quando preciso.
//
// Separada de `drive-access-token` de propósito: aquela serve a conta de
// CONTEÚDO (a que entrega as aulas hoje) e é chamada pelo worker de streaming
// a cada play. Esta serve as contas usadas só para copiar/guardar arquivo, e é
// chamada pelos scripts de migração. Misturar as duas faria um erro de script
// de migração conseguir mexer na conta que serve os alunos.
//
// Nunca exposta ao navegador: exige a service_role key, comparada em tempo
// constante.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Client OAuth usado SÓ pelo fluxo de contas de armazenamento.
//
// Pode ser um client diferente do que serve o Drive de conteúdo, e isso é
// proposital: o refresh token do Google fica amarrado ao client que o emitiu.
// Trocar o client das funções de conteúdo invalidaria o refresh token salvo em
// `drive_config` e derrubaria o acervo inteiro para os alunos. Aqui a troca é
// isolada — se os secrets abaixo não existirem, cai no client atual e nada
// muda.
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_STORAGE_CLIENT_ID')
  || '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com'
const CLIENT_SECRET_ENV = Deno.env.get('GOOGLE_STORAGE_CLIENT_SECRET') ? 'GOOGLE_STORAGE_CLIENT_SECRET' : 'GOOGLE_CLIENT_SECRET'

async function secureCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode('timing-safe-compare'),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, encoder.encode(a)),
    crypto.subtle.sign('HMAC', key, encoder.encode(b)),
  ])
  const a8 = new Uint8Array(sigA)
  const b8 = new Uint8Array(sigB)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < 32; i++) diff |= a8[i] ^ b8[i]
  return diff === 0
}

async function refreshAccessToken(refreshToken: string, clientSecret: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken, client_id: GOOGLE_CLIENT_ID,
      client_secret: clientSecret, grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) {
    console.error('Google token refresh failed', res.status, JSON.stringify(data))
    throw new Error('Failed to refresh Google token')
  }
  return data.access_token as string
}

serve(async (req) => {
  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token || !(await secureCompare(token, serviceKey))) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }

    const GOOGLE_CLIENT_SECRET = Deno.env.get(CLIENT_SECRET_ENV)!
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

    const { email } = await req.json().catch(() => ({}))

    // Sem e-mail, usa a conta conectada com MAIS espaço livre — é o que um
    // script de migração quer por padrão.
    let query = supabase
      .from('drive_storage_accounts')
      .select('id, email, access_token, refresh_token, token_expiry, storage_limit_bytes, storage_usage_bytes')
      .eq('connected', true)
    if (email) query = query.eq('email', email)

    const { data: rows, error } = await query
    if (error) throw error
    if (!rows?.length) {
      return new Response(JSON.stringify({ error: 'Nenhuma conta de armazenamento conectada' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      })
    }

    const livre = (r: typeof rows[number]) =>
      r.storage_limit_bytes == null
        ? Number.MAX_SAFE_INTEGER // ilimitado (Workspace)
        : Number(r.storage_limit_bytes) - Number(r.storage_usage_bytes ?? 0)
    const account = [...rows].sort((a, b) => livre(b) - livre(a))[0]

    let accessToken = account.access_token as string | null
    const expirado = !account.token_expiry
      || new Date(account.token_expiry).getTime() < Date.now() + 60_000

    if (expirado) {
      if (!account.refresh_token) {
        return new Response(JSON.stringify({ error: `Conta ${account.email} precisa ser reconectada` }), {
          status: 401, headers: { 'Content-Type': 'application/json' },
        })
      }
      accessToken = await refreshAccessToken(account.refresh_token, GOOGLE_CLIENT_SECRET)
      await supabase.from('drive_storage_accounts').update({
        access_token: accessToken,
        token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      }).eq('id', account.id)
    }

    return new Response(JSON.stringify({
      accessToken,
      email: account.email,
      freeBytes: livre(account),
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
