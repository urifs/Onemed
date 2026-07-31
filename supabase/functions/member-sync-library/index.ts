// ─────────────────────────────────────────────────────────────────────────────
// OneMed · member-sync-library
//
// Espelha a pasta compartilhada do Google Drive na área de membros varrendo a
// árvore INTEIRA: pasta dentro de pasta dentro de pasta, sem limite de nível,
// sem pular nada.
//
// A versão anterior perdia conteúdo em três pontos:
//   1. só criava módulos até 2 níveis e descartava de vez qualquer pasta abaixo
//      do nível 10 — o conteúdo lá dentro simplesmente nunca era importado;
//   2. quando a listagem de uma pasta falhava no Drive (429/5xx/token expirado),
//      o `catch` engolia o erro, a subárvore inteira ficava de fora e o curso
//      ainda era reportado como "Concluído";
//   3. o estado da varredura vivia dentro do cursor HTTP — qualquer queda da
//      aba/rede no meio perdia a posição e o que faltava não era recuperado.
//
// Agora a varredura é uma FILA DURÁVEL no Postgres (`sync_folder_queue`): cada
// pasta encontrada vira uma linha, esta função consome pendências e enfileira
// as filhas. A profundidade deixa de existir como conceito (a fila é plana),
// atalho em ciclo é barrado pela PK (course_id, drive_folder_id), a retomada é
// exata de qualquer dispositivo, e um curso só é marcado 'complete' com ZERO
// pastas pendentes e ZERO pastas com erro. O tamanho de cada arquivo é gravado
// em `lessons.size_bytes` para permitir conferir contagem e bytes contra o
// Drive (RPCs `get_library_totals` / `get_library_sync_report`).
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  }
}

const GOOGLE_CLIENT_ID = '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com'

const FOLDER_MIME = 'application/vnd.google-apps.folder'
const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut'

// Orçamento de tempo por invocação. O cliente faz o loop chamando de novo com
// o cursor devolvido, então parar cedo nunca perde trabalho — tudo que já foi
// varrido está gravado na fila do banco.
const TIME_LIMIT_MS = 40_000
// Quantas pastas listar em paralelo dentro de uma invocação.
const FOLDER_CONCURRENCY = 6
// Tentativas por pasta antes de marcar 'error' (fica visível no relatório).
const MAX_FOLDER_ATTEMPTS = 5

async function secureCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode('timing-safe-compare'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const [macA, macB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, encoder.encode(a)),
    crypto.subtle.sign('HMAC', key, encoder.encode(b)),
  ])
  const bufA = new Uint8Array(macA), bufB = new Uint8Array(macB)
  if (bufA.length !== bufB.length) return false
  let diff = 0
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i]
  return diff === 0
}

async function refreshAccessToken(refreshToken: string, clientSecret: string): Promise<string> {
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
  if (!res.ok || !data.access_token) throw new Error('Failed to refresh Google token: ' + JSON.stringify(data))
  return data.access_token as string
}

// Listagem de uma página de uma pasta. Diferente da versão antiga, o erro
// SOBE — quem chama decide reenfileirar ou marcar a pasta como falha. Nunca
// engolir: uma pasta que falha em silêncio é conteúdo que some do curso.
async function driveList(accessToken: string, folderId: string, pageToken?: string): Promise<any> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'nextPageToken, files(id,name,mimeType,size,videoMediaMetadata(durationMillis),shortcutDetails)',
    pageSize: '1000',
    orderBy: 'folder,name_natural',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  })
  if (pageToken) params.set('pageToken', pageToken)

  let lastErr = 'erro desconhecido'
  for (let attempt = 0; attempt < 4; attempt++) {
    let res: Response
    try {
      res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    } catch (e) {
      lastErr = `rede: ${(e as Error).message}`
      await new Promise(r => setTimeout(r, 400 * 2 ** attempt))
      continue
    }
    if (res.ok) return res.json()
    const body = await res.text().catch(() => '')
    lastErr = `HTTP ${res.status}: ${body.slice(0, 200)}`
    // 403 de cota também é transitório — o Drive devolve isso sob rajada.
    const transient = res.status === 429 || res.status >= 500 || (res.status === 403 && /rateLimit|userRateLimit|quota/i.test(body))
    if (!transient) break
    await new Promise(r => setTimeout(r, 500 * 2 ** attempt))
  }
  throw new Error(lastErr)
}

function slugify(text: string): string {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'curso'
}

function lessonType(mimeType: string, name = ''): string {
  const n = name.toLowerCase()
  if (mimeType?.startsWith('video/') || n.endsWith('.mp4') || n.endsWith('.mkv') || n.endsWith('.avi') || n.endsWith('.mov') || n.endsWith('.ts') || n.endsWith('.wmv')) return 'video'
  if (mimeType === 'application/pdf' || n.endsWith('.pdf')) return 'pdf'
  if (mimeType?.includes('word') || mimeType === 'application/vnd.google-apps.document' || n.endsWith('.doc') || n.endsWith('.docx')) return 'doc'
  if (mimeType?.includes('spreadsheet') || mimeType === 'application/vnd.ms-excel' || n.endsWith('.xls') || n.endsWith('.xlsx')) return 'sheet'
  if (mimeType === 'text/plain' || n.endsWith('.txt')) return 'txt'
  if (mimeType?.startsWith('audio/') || n.endsWith('.mp3') || n.endsWith('.wav') || n.endsWith('.ogg')) return 'audio'
  if (mimeType?.startsWith('image/') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.png') || n.endsWith('.gif') || n.endsWith('.webp')) return 'image'
  return 'other'
}

function resolveShortcut(f: any): { id: string; mimeType: string } | null {
  if (f.mimeType === SHORTCUT_MIME) {
    if (!f.shortcutDetails?.targetId || !f.shortcutDetails?.targetMimeType) return null
    return { id: f.shortcutDetails.targetId, mimeType: f.shortcutDetails.targetMimeType }
  }
  return { id: f.id, mimeType: f.mimeType }
}

function categoryOf(name: string) {
  const n = name.toLowerCase()
  if (n.includes('apostila') || n.includes('livro')) return 'LIVRO'
  if (n.includes('quest') || n.includes('simulado')) return 'QUESTAO'
  if (n.includes('resumo') || n.includes('mapa mental')) return 'RESUMO'
  return 'CURSO'
}

type SyncDetail = { course: string; action: 'created' | 'updated' | 'skipped' | 'error'; message?: string; files?: string[] }

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

    // ── autenticação: cron secret ou admin logado ────────────────────────────
    const SYNC_SECRET = Deno.env.get('MEMBER_SYNC_SECRET')
    const providedSecret = req.headers.get('x-cron-secret') || ''
    const cronOk = !!SYNC_SECRET && SYNC_SECRET !== 'NOT_SET' && (await secureCompare(providedSecret, SYNC_SECRET))

    let adminOk = false
    if (!cronOk) {
      const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
      if (jwt) {
        const { data: userData } = await supabase.auth.getUser(jwt)
        if (userData?.user) {
          const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' })
          adminOk = !!isAdmin
        }
      }
    }
    if (!cronOk && !adminOk) return json({ error: 'Unauthorized' }, 401)

    const START_TIME = Date.now()
    const outOfTime = () => Date.now() - START_TIME > TIME_LIMIT_MS

    const body = await req.json().catch(() => ({}))
    const forceResync: boolean = !!body.forceResync
    const topPageSize: number = Math.min(Math.max(Number(body.batchSize) || 20, 1), 100)

    // Cursor: minúsculo de propósito. Todo o estado pesado da varredura mora
    // na tabela `sync_folder_queue`, não no cursor que trafega a cada chamada.
    let stage: 'discover' | 'crawl' = 'discover'
    let topPageToken: string | undefined
    const rawCursor = body.cursor
    if (rawCursor && typeof rawCursor === 'object') {
      stage = rawCursor.stage === 'crawl' ? 'crawl' : 'discover'
      topPageToken = rawCursor.topPageToken || undefined
    } else if (typeof rawCursor === 'string' && rawCursor.startsWith('{')) {
      try {
        const p = JSON.parse(rawCursor)
        stage = p.stage === 'crawl' ? 'crawl' : 'discover'
        topPageToken = p.topPageToken || undefined
      } catch { /* cursor de formato antigo: recomeça a descoberta, a fila preserva o progresso */ }
    }

    // ── Google Drive: token válido ───────────────────────────────────────────
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
    const { data: config, error: cfgErr } = await supabase.from('drive_config').select('*').single()
    if (cfgErr || !config?.connected) {
      return json({ error: 'Configuração do Google Drive não encontrada no banco.' }, 400)
    }

    let accessToken = config.access_token as string
    const expiry = config.token_expiry ? new Date(config.token_expiry) : null
    // Renova com folga: um token que vence no meio da varredura derrubaria
    // dezenas de listagens de uma vez.
    if (!expiry || expiry.getTime() < Date.now() + 5 * 60 * 1000) {
      if (!config.refresh_token) return json({ error: 'Token expirado. Reconecte o Google Drive.' }, 401)
      accessToken = await refreshAccessToken(config.refresh_token, GOOGLE_CLIENT_SECRET)
      await supabase.from('drive_config').update({
        access_token: accessToken,
        token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      }).eq('id', config.id)
    }
    const ROOT_FOLDER_ID = config.folder_id || '1w3J0LxztajJuD8r9BzR1os97vTyQfnT-'

    const details: SyncDetail[] = []
    let coursesCreated = 0
    let coursesResynced = 0
    let lessonsImported = 0
    let modulesImported = 0
    let foldersCrawled = 0
    const touchedCourses = new Set<string>()

    // ═══ ETAPA 1 · DESCOBERTA ════════════════════════════════════════════════
    // Percorre as pastas de topo (= cursos) e garante uma linha em `courses` +
    // a semente da fila de varredura para cada curso que ainda precisa varrer.
    if (stage === 'discover') {
      const params = new URLSearchParams({
        q: `'${ROOT_FOLDER_ID}' in parents and trashed=false`,
        fields: 'nextPageToken, files(id,name,mimeType,size,videoMediaMetadata(durationMillis),shortcutDetails)',
        pageSize: String(topPageSize),
        orderBy: 'folder,name_natural',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
      })
      if (topPageToken) params.set('pageToken', topPageToken)

      const topRes = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!topRes.ok) throw new Error(`Falha ao listar a pasta raiz: ${await topRes.text()}`)
      const topData = await topRes.json()
      const entries: any[] = topData.files || []

      const { data: existingCourses } = await supabase
        .from('courses')
        .select('id, slug, drive_folder_id, sync_status, deep_synced_at')
      const bySlug = new Set((existingCourses || []).map((c: any) => c.slug))
      const byFolder = new Map((existingCourses || []).map((c: any) => [c.drive_folder_id, c]))

      for (const f of entries) {
        const resolved = resolveShortcut(f)
        if (!resolved) {
          details.push({ course: f.name, action: 'error', message: 'Atalho quebrado no Drive (aponta para item inexistente).' })
          continue
        }
        // Arquivo solto na raiz não tem curso a que pertencer. Antes era
        // ignorado sem aviso nenhum; agora pelo menos aparece no relatório.
        if (resolved.mimeType !== FOLDER_MIME) {
          details.push({ course: f.name, action: 'skipped', message: 'Arquivo solto na raiz da biblioteca (fora de qualquer curso) — mova para dentro de uma pasta de curso para importar.' })
          continue
        }

        const existing = byFolder.get(resolved.id) as any
        let courseId: string

        if (existing) {
          // Só pula quem já foi varrido A FUNDO e fechou completo. Curso que
          // veio da sincronização antiga (rasa) tem deep_synced_at nulo e é
          // revarrido automaticamente — é isso que recupera o que faltava.
          const alreadyComplete = existing.sync_status === 'complete' && !!existing.deep_synced_at
          if (alreadyComplete && !forceResync) {
            details.push({ course: f.name, action: 'skipped', message: 'Já varrido por completo (marque "Reimportar tudo" para conferir de novo).' })
            continue
          }
          courseId = existing.id
          coursesResynced++
        } else {
          const baseSlug = slugify(f.name)
          // Duas pastas de topo podem ter exatamente o mesmo nome (ex: duas
          // turmas "Medcof 2024"): isso não faz delas o mesmo curso. Desambigua
          // pelo fim do ID da pasta em vez de descartar a segunda.
          const slug = bySlug.has(baseSlug) ? `${baseSlug}-${resolved.id.slice(-6).toLowerCase()}` : baseSlug
          bySlug.add(slug)

          const { data: newCourse, error: courseErr } = await supabase.from('courses').insert({
            drive_folder_id: resolved.id,
            title: f.name.trim(),
            slug,
            category: categoryOf(f.name),
            sync_status: 'crawling',
            synced_at: new Date().toISOString(),
          }).select('id').single()

          if (courseErr || !newCourse) {
            details.push({ course: f.name, action: 'error', message: `Erro ao inserir curso: ${courseErr?.message}` })
            continue
          }
          courseId = newCourse.id
          coursesCreated++
        }

        // (Re)semeia a fila. Numa reimportação, tudo que já estava marcado como
        // varrido volta para 'pending' — inclusive as pastas que tinham falhado.
        if (forceResync) {
          await supabase.from('sync_folder_queue')
            .update({ state: 'pending', page_token: null, attempts: 0, error: null, updated_at: new Date().toISOString() })
            .eq('course_id', courseId)
            .neq('state', 'pending')
        }
        await supabase.from('sync_folder_queue')
          .upsert({ course_id: courseId, drive_folder_id: resolved.id, module_id: null, path: '', depth: 0 },
                  { onConflict: 'course_id,drive_folder_id', ignoreDuplicates: true })

        await supabase.from('courses').update({ sync_status: 'crawling', title: f.name.trim(), synced_at: new Date().toISOString() }).eq('id', courseId)
        details.push({ course: f.name, action: existing ? 'updated' : 'created', message: 'Na fila de varredura profunda.' })
      }

      const nextCursor = topData.nextPageToken
        ? { stage: 'discover', topPageToken: topData.nextPageToken }
        : { stage: 'crawl' }

      return json({
        done: false,
        stage: 'discover',
        cursor: nextCursor,
        coursesCreated, coursesResynced, modulesImported, lessonsImported, foldersCrawled,
        details,
      })
    }

    // ═══ ETAPA 2 · VARREDURA PROFUNDA ════════════════════════════════════════
    // Consome a fila de pastas pendentes até acabar o orçamento de tempo.
    // Cada pasta processada enfileira as filhas — profundidade ilimitada.
    const perCourseFiles = new Map<string, string[]>()

    while (!outOfTime()) {
      const { data: pending, error: qErr } = await supabase
        .from('sync_folder_queue')
        .select('course_id, drive_folder_id, module_id, path, depth, page_token, attempts')
        .eq('state', 'pending')
        .order('course_id')
        .order('depth')
        .limit(FOLDER_CONCURRENCY)

      if (qErr) throw new Error(`Erro ao ler a fila de varredura: ${qErr.message}`)
      if (!pending || pending.length === 0) break

      await Promise.all(pending.map(async (row: any) => {
        touchedCourses.add(row.course_id)

        let page: any
        try {
          page = await driveList(accessToken, row.drive_folder_id, row.page_token || undefined)
        } catch (e) {
          const attempts = (row.attempts || 0) + 1
          const failed = attempts >= MAX_FOLDER_ATTEMPTS
          // Marcar 'error' aqui é o ponto central da correção: a pasta que o
          // Drive recusou fica REGISTRADA. O curso não fecha como completo e o
          // relatório aponta exatamente o que ficou de fora.
          await supabase.from('sync_folder_queue').update({
            attempts,
            state: failed ? 'error' : 'pending',
            error: String((e as Error).message).slice(0, 500),
            updated_at: new Date().toISOString(),
          }).eq('course_id', row.course_id).eq('drive_folder_id', row.drive_folder_id)
          return
        }

        const files: any[] = page.files || []
        const childFolders: any[] = []
        const lessons: any[] = []
        const now = new Date().toISOString()

        for (const f of files) {
          const resolved = resolveShortcut(f)
          if (!resolved) continue // atalho quebrado: não há alvo para importar
          if (resolved.mimeType === FOLDER_MIME) {
            childFolders.push({ id: resolved.id, name: f.name })
          } else if (resolved.mimeType === 'text/html') {
            continue // páginas .html soltas do Drive não são aula
          } else {
            let type = lessonType(resolved.mimeType, f.name)
            if (f.videoMediaMetadata) type = 'video'
            lessons.push({
              course_id: row.course_id,
              module_id: row.module_id,
              drive_file_id: resolved.id,
              title: f.name.trim(),
              type,
              mime_type: resolved.mimeType,
              duration_seconds: f.mimeType !== SHORTCUT_MIME && f.videoMediaMetadata?.durationMillis
                ? Math.round(Number(f.videoMediaMetadata.durationMillis) / 1000) : null,
              // O tamanho de cada arquivo é gravado justamente para permitir
              // conferir a soma contra o Drive e provar que não faltou nada.
              size_bytes: f.mimeType !== SHORTCUT_MIME && f.size ? Number(f.size) : null,
              drive_path: row.path || null,
              last_seen_at: now,
            })
          }
        }

        // 1) Aulas desta pasta.
        if (lessons.length) {
          for (let i = 0; i < lessons.length; i += 200) {
            const chunk = lessons.slice(i, i + 200)
            const { error } = await supabase.from('lessons').upsert(chunk, { onConflict: 'course_id,drive_file_id' })
            if (error) {
              // Falha de gravação também não pode passar batido: devolve a
              // pasta para a fila em vez de dar o conteúdo como importado.
              await supabase.from('sync_folder_queue').update({
                attempts: (row.attempts || 0) + 1,
                error: `Falha ao gravar aulas: ${error.message}`.slice(0, 500),
                updated_at: new Date().toISOString(),
              }).eq('course_id', row.course_id).eq('drive_folder_id', row.drive_folder_id)
              return
            }
          }
          lessonsImported += lessons.length
          const acc = perCourseFiles.get(row.course_id) || []
          if (acc.length < 40) acc.push(...lessons.slice(0, 40 - acc.length).map(l => l.title))
          perCourseFiles.set(row.course_id, acc)
        }

        // 2) Subpastas viram módulos (em qualquer nível) e entram na fila.
        for (const child of childFolders) {
          const childPath = row.path ? `${row.path}/${child.name.trim()}` : child.name.trim()
          const { data: modRow, error: modErr } = await supabase.from('course_modules').upsert({
            course_id: row.course_id,
            drive_folder_id: child.id,
            title: child.name.trim(),
            parent_module_id: row.module_id,
            depth: (row.depth || 0) + 1,
            path: childPath,
          }, { onConflict: 'course_id,drive_folder_id' }).select('id').single()

          if (modErr || !modRow) continue
          modulesImported++

          // ignoreDuplicates faz o trabalho de "já visitei essa pasta": atalho
          // que aponta para uma pasta já vista não vira laço infinito.
          await supabase.from('sync_folder_queue').upsert({
            course_id: row.course_id,
            drive_folder_id: child.id,
            module_id: modRow.id,
            path: childPath,
            depth: (row.depth || 0) + 1,
          }, { onConflict: 'course_id,drive_folder_id', ignoreDuplicates: true })
        }

        // 3) Fecha (ou avança a paginação) desta pasta.
        if (page.nextPageToken) {
          await supabase.from('sync_folder_queue').update({
            page_token: page.nextPageToken, attempts: 0, error: null, updated_at: new Date().toISOString(),
          }).eq('course_id', row.course_id).eq('drive_folder_id', row.drive_folder_id)
        } else {
          await supabase.from('sync_folder_queue').update({
            state: 'done', page_token: null, error: null, updated_at: new Date().toISOString(),
          }).eq('course_id', row.course_id).eq('drive_folder_id', row.drive_folder_id)
          foldersCrawled++
        }
      }))
    }

    // ── fecha os cursos que não têm mais pendências ──────────────────────────
    for (const courseId of touchedCourses) {
      const { count: stillPending } = await supabase.from('sync_folder_queue')
        .select('*', { count: 'exact', head: true }).eq('course_id', courseId).eq('state', 'pending')
      await supabase.rpc('recalc_course_totals', { _course_id: courseId })
      if ((stillPending || 0) === 0) {
        const { data: c } = await supabase.from('courses')
          .select('title, lesson_count, total_size_bytes, folder_count, sync_status, sync_error').eq('id', courseId).single()
        if (c) {
          details.push({
            course: c.title,
            action: c.sync_status === 'complete' ? 'updated' : 'error',
            message: c.sync_status === 'complete'
              ? `Varredura completa: ${c.folder_count} pastas, ${c.lesson_count} arquivos, ${(Number(c.total_size_bytes) / 1e9).toFixed(1)} GB.`
              : `ATENÇÃO — varredura incompleta: ${c.sync_error}. Rode "Reimportar tudo" para tentar de novo.`,
            files: perCourseFiles.get(courseId),
          })
        }
      }
    }

    const { count: remaining } = await supabase.from('sync_folder_queue')
      .select('*', { count: 'exact', head: true }).eq('state', 'pending')

    const isDone = (remaining || 0) === 0
    let totals: any = null
    if (isDone) {
      // Relatório final: os números que se compara com o Drive.
      const { data } = await supabase.rpc('get_library_totals')
      totals = data
      if (totals) {
        details.push({
          course: 'Verificação final',
          action: totals.folders_error > 0 || totals.courses_incomplete > 0 ? 'error' : 'updated',
          message: `${totals.courses} cursos · ${totals.folders_done} pastas varridas · ${totals.lessons} arquivos · ` +
            `${(Number(totals.total_size_bytes) / 1e12).toFixed(2)} TB` +
            (totals.folders_error > 0 ? ` · ${totals.folders_error} pasta(s) com erro em ${totals.courses_incomplete} curso(s)` : ' · nenhuma pasta ficou de fora'),
        })
      }
    }

    return json({
      done: isDone,
      stage: 'crawl',
      cursor: isDone ? null : { stage: 'crawl' },
      foldersRemaining: remaining || 0,
      coursesCreated, coursesResynced, modulesImported, lessonsImported, foldersCrawled,
      totals,
      details,
    })
  } catch (err: any) {
    console.error(err)
    return json({ error: err.message }, 500)
  }
})
