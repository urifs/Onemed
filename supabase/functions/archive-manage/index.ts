// ─────────────────────────────────────────────────────────────────────────────
// OneMed · archive-manage — backend do Acervo Público (uploads dos assinantes)
//
// Ações (POST { action, ... }, sempre com JWT de assinante):
//   init      → cria/reusa o item + pasta no Drive + arquivo (só metadados) e
//               abre uma SESSÃO RETOMÁVEL de upload. O navegador manda os bytes
//               DIRETO pro Google usando a URI da sessão — sem limite de
//               tamanho, sem passar pelo nosso servidor e sem nunca ver o
//               token do Drive (a URI só serve pra aquele único upload).
//   finalize  → confere no Drive que os bytes chegaram e marca item/arquivos
//               como prontos (o cliente não tem como forjar: o tamanho é lido
//               da API, não do que ele diz).
//   delete    → apaga a pasta do item no Drive e as linhas no banco (dono/admin).
//   file_token→ assina URL do worker de streaming pra abrir/baixar um arquivo.
//
// Os bytes moram na CONTA DE ARMAZENAMENTO (drive_storage_accounts, 5 TB) —
// nunca na conta de conteúdo, que está sem espaço. A pasta-raiz "Acervo
// Público - OneMed" é criada na conta de armazenamento (id em
// drive_storage_accounts.acervo_folder_id) e compartilhada como leitura com a
// conta de conteúdo, porque é com o token DELA que o worker de streaming
// serve os arquivos.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
const GOOGLE_CLIENT_ID = '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com'
const STREAM_TTL_SECONDS = 6 * 60 * 60

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

// Client OAuth das contas de ARMAZENAMENTO (drive_storage_accounts) — pode ser
// diferente do client da conta de conteúdo; o refresh token fica amarrado ao
// client que o emitiu (mesma regra de drive-storage-token).
const STORAGE_CLIENT_ID = Deno.env.get('GOOGLE_STORAGE_CLIENT_ID') || GOOGLE_CLIENT_ID
const storageClientSecret = () =>
  Deno.env.get('GOOGLE_STORAGE_CLIENT_SECRET') || Deno.env.get('GOOGLE_CLIENT_SECRET')!

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken, client_id: clientId,
      client_secret: clientSecret, grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) throw new Error('Falha ao renovar o token do Drive')
  return data.access_token as string
}

// O acervo grava na CONTA DE ARMAZENAMENTO (5 TB), nunca na conta de conteúdo
// (sem espaço). Escolhe a conta conectada com mais espaço livre.
async function getStorageAccount(
  supabase: ReturnType<typeof createClient>,
  accountId?: string | null,
): Promise<{ token: string; account: any }> {
  let query = supabase.from('drive_storage_accounts').select('*').eq('connected', true)
  if (accountId) query = query.eq('id', accountId)
  const { data: accounts, error } = await query
  if (error || !accounts?.length) throw new Error('Nenhuma conta de armazenamento conectada')
  const account = accounts
    .map((a: any) => ({ ...a, free: Number(a.storage_limit_bytes || 0) - Number(a.storage_usage_bytes || 0) }))
    .sort((a: any, b: any) => b.free - a.free)[0]

  let token = account.access_token as string
  const expiry = account.token_expiry ? new Date(account.token_expiry) : null
  if (!expiry || expiry.getTime() < Date.now() + 5 * 60 * 1000) {
    token = await refreshAccessToken(account.refresh_token, STORAGE_CLIENT_ID, storageClientSecret())
    await supabase.from('drive_storage_accounts').update({
      access_token: token,
      token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
    }).eq('id', account.id)
  }
  return { token, account }
}

// Token da conta de CONTEÚDO — só para descobrir o e-mail dela e compartilhar
// a pasta do acervo como leitora: é com esse token que o worker de streaming
// busca os bytes, então ele precisa enxergar os arquivos do acervo.
async function getContentAccountEmail(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  try {
    const { data: config } = await supabase.from('drive_config').select('*').single()
    if (!config?.connected) return null
    let token = config.access_token as string
    const expiry = config.token_expiry ? new Date(config.token_expiry) : null
    if (!expiry || expiry.getTime() < Date.now() + 5 * 60 * 1000) {
      token = await refreshAccessToken(config.refresh_token, GOOGLE_CLIENT_ID, Deno.env.get('GOOGLE_CLIENT_SECRET')!)
      await supabase.from('drive_config').update({
        access_token: token, token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      }).eq('id', config.id)
    }
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    return data?.user?.emailAddress || null
  } catch {
    return null
  }
}

async function ensureAcervoRoot(supabase: ReturnType<typeof createClient>, token: string, account: any): Promise<string> {
  if (account.acervo_folder_id) return account.acervo_folder_id as string
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Acervo Público - OneMed', mimeType: 'application/vnd.google-apps.folder' }),
  })
  const data = await res.json()
  if (!res.ok || !data.id) throw new Error('Não foi possível criar a pasta do acervo no Drive')

  // Compartilha com a conta de conteúdo (leitora): permissão herda pros
  // arquivos e o worker de streaming consegue servi-los.
  const contentEmail = await getContentAccountEmail(supabase)
  if (contentEmail && contentEmail !== account.email) {
    const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions?sendNotificationEmail=false`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'user', emailAddress: contentEmail }),
    })
    if (!permRes.ok) console.error('acervo share error', await permRes.text())
  }

  await supabase.from('drive_storage_accounts').update({ acervo_folder_id: data.id }).eq('id', account.id)
  return data.id as string
}

async function createDriveFolder(token: string, name: string, parentId: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }),
  })
  const data = await res.json()
  if (!res.ok || !data.id) throw new Error('Não foi possível criar a pasta do item no Drive')
  return data.id as string
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) })
  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), { status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    const { data: userData } = await supabase.auth.getUser(jwt)
    if (!userData?.user) return json({ error: 'Faça login para usar o acervo' }, 401)
    const user = userData.user

    // Gate de assinante: mesmo my_member_status das telas, com o JWT do aluno.
    const asUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })
    const { data: st } = await asUser.rpc('my_member_status')
    const status = (Array.isArray(st) ? st[0] : st)?.status
    if (status !== 'active' && status !== 'admin') {
      return json({ error: 'O acervo público é exclusivo para assinantes.' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '')

    // ── INIT ─────────────────────────────────────────────────────────────────
    if (action === 'init') {
      const { token, account } = await getStorageAccount(supabase)

      // Cota do Drive: sem espaço, o Google recusa o upload no fim — melhor
      // recusar aqui com uma mensagem honesta do que estourar aos 100%.
      const aboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const about = await aboutRes.json()
      const limit = Number(about?.storageQuota?.limit || 0)
      const usage = Number(about?.storageQuota?.usage || 0)
      const fileSize = Number(body.file?.size || 0)
      if (limit > 0 && usage + fileSize >= limit) {
        return json({ error: 'O armazenamento do acervo está lotado no momento. Tente novamente em breve — o suporte já foi avisado.' }, 507)
      }
      // aproveita a leitura fresca pra manter o painel de contas atualizado
      await supabase.from('drive_storage_accounts').update({
        storage_limit_bytes: limit || null, storage_usage_bytes: usage || null,
        quota_checked_at: new Date().toISOString(),
      }).eq('id', account.id)

      const fileName = String(body.file?.name || '').slice(0, 255)
      const fileMime = String(body.file?.mime || 'application/octet-stream')
      const filePath = body.file?.path ? String(body.file.path).slice(0, 1024) : null
      if (!fileName) return json({ error: 'Arquivo sem nome.' }, 400)

      let itemId = body.itemId ? String(body.itemId) : null
      let itemFolderId: string | null = null

      if (itemId) {
        const { data: item } = await supabase.from('archive_items')
          .select('id, user_id, drive_folder_id').eq('id', itemId).maybeSingle()
        if (!item || item.user_id !== user.id) return json({ error: 'Item não encontrado.' }, 404)
        itemFolderId = item.drive_folder_id
      } else {
        const title = String(body.title || '').trim().slice(0, 200)
        const description = String(body.description || '').trim().slice(0, 4000) || null
        const category = String(body.category || 'Outros cursos').slice(0, 80)
        const kind = body.kind === 'folder' ? 'folder' : 'file'
        const isPublic = body.isPublic !== false
        if (!title) return json({ error: 'Dê um título ao seu material.' }, 400)

        const rootId = await ensureAcervoRoot(supabase, token, account)
        itemFolderId = await createDriveFolder(token, title.slice(0, 120), rootId)

        const { data: created, error: insErr } = await supabase.from('archive_items').insert({
          user_id: user.id, title, description, category, kind,
          is_public: isPublic, drive_folder_id: itemFolderId, status: 'pending',
          storage_account_id: account.id,
        }).select('id').single()
        if (insErr || !created) return json({ error: 'Não foi possível criar o item.' }, 500)
        itemId = created.id as string
      }
      if (!itemFolderId) return json({ error: 'Pasta do item não encontrada.' }, 500)

      // 1. arquivo só de metadados (já nasce com id conhecido)
      const metaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fileName, parents: [itemFolderId] }),
      })
      const meta = await metaRes.json()
      if (!metaRes.ok || !meta.id) return json({ error: 'Não foi possível preparar o upload no armazenamento.' }, 502)

      // 2. sessão retomável pro CONTEÚDO desse arquivo. O header Origin é o
      // que autoriza o navegador a mandar os PUTs direto pro Google (CORS).
      const origin = req.headers.get('origin') || ALLOWED_ORIGINS[0]
      const sessRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${meta.id}?uploadType=resumable&supportsAllDrives=true`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': fileMime,
          ...(fileSize > 0 ? { 'X-Upload-Content-Length': String(fileSize) } : {}),
          Origin: ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
        },
        body: JSON.stringify({}),
      })
      const sessionUri = sessRes.headers.get('location')
      if (!sessRes.ok || !sessionUri) {
        return json({ error: 'Não foi possível abrir a sessão de upload.' }, 502)
      }

      const { data: fileRow, error: fErr } = await supabase.from('archive_files').insert({
        item_id: itemId, drive_file_id: meta.id, name: fileName,
        path: filePath, mime_type: fileMime, size_bytes: fileSize || null, status: 'pending',
      }).select('id').single()
      if (fErr || !fileRow) return json({ error: 'Não foi possível registrar o arquivo.' }, 500)

      return json({ itemId, fileId: fileRow.id, sessionUri })
    }

    // ── FINALIZE ─────────────────────────────────────────────────────────────
    if (action === 'finalize') {
      const itemId = String(body.itemId || '')
      const { data: item } = await supabase.from('archive_items')
        .select('id, user_id, storage_account_id').eq('id', itemId).maybeSingle()
      if (!item || item.user_id !== user.id) return json({ error: 'Item não encontrado.' }, 404)

      const { token } = await getStorageAccount(supabase, item.storage_account_id)
      const { data: files } = await supabase.from('archive_files')
        .select('id, drive_file_id, status').eq('item_id', itemId)

      let ready = 0
      for (const f of files || []) {
        if (f.status === 'ready') { ready++; continue }
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${f.drive_file_id}?fields=size,mimeType`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) continue
        const meta = await res.json()
        const size = Number(meta.size || 0)
        if (size > 0) {
          await supabase.from('archive_files').update({
            status: 'ready', size_bytes: size, mime_type: meta.mimeType || null,
          }).eq('id', f.id)
          ready++
        }
      }
      if (ready > 0) {
        await supabase.from('archive_items').update({ status: 'ready' }).eq('id', itemId)
      }
      // Arquivos que nunca receberam bytes são lixo de upload abandonado.
      await supabase.from('archive_files').delete().eq('item_id', itemId).eq('status', 'pending')
      return json({ success: true, readyFiles: ready })
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (action === 'delete') {
      const itemId = String(body.itemId || '')
      const { data: item } = await supabase.from('archive_items')
        .select('id, user_id, drive_folder_id, storage_account_id').eq('id', itemId).maybeSingle()
      if (!item) return json({ error: 'Item não encontrado.' }, 404)
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
      if (item.user_id !== user.id && !isAdmin) return json({ error: 'Sem permissão.' }, 403)

      // Apagar a PASTA do item leva os arquivos junto (mesma conta dona).
      if (item.drive_folder_id) {
        try {
          const { token } = await getStorageAccount(supabase, item.storage_account_id)
          await fetch(`https://www.googleapis.com/drive/v3/files/${item.drive_folder_id}?supportsAllDrives=true`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
          })
        } catch (e) {
          console.error('drive delete error', e)
        }
      }
      await supabase.from('archive_items').delete().eq('id', itemId)
      return json({ success: true })
    }

    // ── FILE TOKEN (abrir/baixar via worker de streaming) ────────────────────
    if (action === 'file_token') {
      const fileId = String(body.fileId || '')
      const { data: f } = await supabase.from('archive_files')
        .select('id, drive_file_id, mime_type, status, item_id').eq('id', fileId).maybeSingle()
      if (!f || f.status !== 'ready') return json({ error: 'Arquivo não encontrado.' }, 404)
      const { data: item } = await supabase.from('archive_items')
        .select('id, user_id, is_public, status').eq('id', f.item_id).maybeSingle()
      if (!item || item.status !== 'ready') return json({ error: 'Arquivo não encontrado.' }, 404)
      if (!item.is_public && item.user_id !== user.id) {
        const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
        if (!isAdmin) return json({ error: 'Arquivo não encontrado.' }, 404)
      }

      const streamSecret = Deno.env.get('LESSON_STREAM_SECRET')!
      const streamBaseUrl = Deno.env.get('STREAM_PROXY_URL') || 'https://onemed-stream-lesson.onemed-stream.workers.dev'
      const mimeType = f.mime_type || ''
      const expiresAt = Math.floor(Date.now() / 1000) + STREAM_TTL_SECONDS
      // `intent: 'download'` assina também o sufixo `.dl` e devolve a URL com
      // `dlok=1` — sem isso o worker ignora o `dl` (por design, o dl sem
      // assinatura era o furo fechado em 09/08) e o botão "Baixar" do acervo
      // não baixava nada. Acervo é material entre assinantes, sem trava de
      // plano — quem pode ABRIR o arquivo pode baixá-lo.
      const querBaixar = body.intent === 'download'
      const sig = await hmacHex(streamSecret, `${f.drive_file_id}.${expiresAt}.${mimeType}${querBaixar ? '.dl' : ''}`)
      const url = `${streamBaseUrl}/?id=${encodeURIComponent(f.drive_file_id)}&exp=${expiresAt}&sig=${sig}&mime=${encodeURIComponent(mimeType)}`
        + (querBaixar ? '&dlok=1' : '')
      return json({ url, expiresAt })
    }

    return json({ error: 'Ação desconhecida.' }, 400)
  } catch (err: any) {
    console.error('archive-manage error', err)
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
