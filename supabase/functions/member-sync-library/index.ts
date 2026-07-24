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

const MAX_MODULE_DEPTH = 2 // course > module > (deeper folders flatten into nearest module)
const MAX_LESSONS_PER_COURSE = 15000 // safety cap so a "5000 livros" style dump doesn't blow up the UI

// ─── constant-time compare for x-cron-secret ───────────────────────────────
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

async function driveList(accessToken: string, folderId: string, pageToken?: string): Promise<any> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'nextPageToken, files(id,name,mimeType,size,videoMediaMetadata(durationMillis),shortcutDetails)',
    pageSize: '200',
    orderBy: 'folder,name_natural',
  })
  if (pageToken) params.set('pageToken', pageToken)

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.ok) return res.json()
    if (res.status === 429 || res.status >= 500) {
      await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
      continue
    }
    const err = await res.json().catch(() => ({}))
    throw new Error(`Drive list failed (${res.status}): ${err.error?.message || 'unknown'}`)
  }
  throw new Error('Drive list failed after retries')
}

function slugify(text: string): string {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'curso'
}

function lessonType(mimeType: string, name: string = ''): string {
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

const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

// Drive shortcuts (e.g. a course folder mirrored via "Add shortcut to Drive")
// never carry mimeType='...folder' themselves — the real folder/file lives at
// shortcutDetails.targetId. Resolve here so shortcuts sync exactly like real
// folders/files instead of silently vanishing from every listing.
function resolveShortcut(f: any): { id: string; mimeType: string } | null {
  if (f.mimeType !== SHORTCUT_MIME) return { id: f.id, mimeType: f.mimeType }
  const targetId = f.shortcutDetails?.targetId
  const targetMimeType = f.shortcutDetails?.targetMimeType
  if (!targetId || !targetMimeType) return null // broken/inaccessible shortcut
  return { id: targetId, mimeType: targetMimeType }
}

// Order matters: earlier entries win when a title matches more than one
// category (e.g. "RadioPosts - Tomografia na Emergência" must hit Radiologia
// before the generic Emergência bucket). Specific/narrow categories are
// checked before broad catch-alls like "Extensivo & Intensivo".
const CATS: [string, string[]][] = [
  ['Pediatria', ['pediatr', 'sbp -', 'emergência pediátrica', 'emergencia pediatrica', 'atendimento pediátrico', 'atendimento pediatrico', 'aep -']],
  ['Cardiologia & ECG', ['cardio', 'ecg', 'eletrocardiogra', 'medeletro', 'medneif', 'med neif', 'incor', 'dislipidem', 'ausculta', 'littman', 'infarto', 'metas', 'facilitando eletro']],
  ['Radiologia & Imagem', ['radiolog', 'radiop', 'você radiolog', 'voce radiolog', 'usg', 'ultrassonog', 'tomografia', 'imagem', 'medimagem']],
  ['Prescrições & Plantão', ['prescriç', 'prescric', 'medicações no ps', 'medicacoes', 'anamnese', 'plantão', 'plantao', 'antibiotico', 'antibiótico', 'atb']],
  ['Revalida', ['revalida', 'hardwork', 'hardtopics', 'alphamed', 'redbook', 'revalideii', 'foco no crm', 'exclusive']],
  ['Intercâmbio & Carreira Internacional', ['usmle', 'reino unido', 'estágio', 'estagio', ' eua', 'exterior', 'inglês', 'ingles', 'idiomas', 'mundo afora', 'cv premium', 'cv medical', 'rd medicine', 'english pronunciation']],
  ['Emergência, PS & Trauma', ['emergênc', 'emergenc', 'herlon', 'meustaff', 'raciocínio', 'raciocinio', 'ps zerado', 'pszerado', 'ps medway', 'ps med', 'sala de parada', 'sutura', 'intubaç', 'ventilaç', 'trauma', 'escola de emerg', 'treinamento em emerg', 'sangramento', 'pronto atendimento', 'bora salvar', ' cdt', 'medway - pronto', 'uti ', 'terapia intensiva', 'acls', 'intubaclass', 'ventilamed', 'emerg.simm']],
  ['Cirurgia & GO', ['cirurg', 'ginecolog', 'obstetr', 'go papers', 'r4 go', 'r+ go']],
  ['Semiologia & Clínica', ['semiolog', 'exame clínico', 'exame clinico', 'clínica médica', 'clinica medica', 'celmo', 'aps101', 'clinica medico']],
  ['Farmacologia & Bioquímica', ['farmacolog', 'bioquím', 'bioquim']],
  ['Especialidades', ['dermato', 'endocrino', 'anestesi', 'anestreview', 'psiquiatr', 'psicopat', 'neuro', 'pneumolog', 'nefro', 'gasometria', 'esporte', 'laboratorial', 'diabetes', 'ortopedia', 'ortoacademy', 'infectoflix', 'infecto', 'clube de revistas', 'diretrizes', 'paulo muzy']],
  ['Anatomia & Ciclo Básico', ['anatom', 'ciclo básico', 'ciclo basico', 'internato', 'muscleflix']],
  ['Resumos, Cards & Livros', ['resumo', 'mapas mentais', 'medcards', 'flashcard', 'memorex', 'memorimed', 'livros', 'medlivros', 'apostila', 'planner', 'planilha', 'fichas', 'medrout']],
  ['Banco de Questões & Simulados', ['banco de quest', 'banco quest', 'quest', 'simulad', 'provas', 'compilad', 'osce', 'medfoco', 'caderno']],
  ['Extensivo & Intensivo · Residência', ['medcof', 'medcurso', 'medway', 'extensivo', 'semiextensivo', 'sanarflix', 'sanar', 'afya', 'eu médico residente', 'eu medico residente', 'intensiv', 'medcel', 'aristo', 'jj mentoria', 'estratégia med', 'casal med', 'cpmed', 'med grupo', 'descomplicando a medicina']],
  ['Carreira, Gestão & Marketing', ['marketing', 'instagram', 'empreendedor', 'ia para', 'direito médico', 'ética', 'etica', 'perícia', 'pericia', 'legista', 'escolha de espec', 'caminho das espec', 'praxys', 'progeb', 'saúde da família', 'saude da familia', 'medicina intuitiva', 'como se preparar', 'produtividade', 'características', 'atitudes', 'hospitais públicos', 'blindar', 'erros que impedem', 'sexto ano', 'programa ppa', 'renda na faculdade']],
]
function categoryOf(name: string): string {
  // Strip known false-positive substrings before matching (e.g. "Distúrbios
  // Hidroeletrolíticos" contains "eletro" but has nothing to do with ECG).
  const s = name.toLowerCase().replace(/hidroeletrol[íi]tic\w*/g, '')
  for (const [label, keys] of CATS) if (keys.some(k => s.includes(k))) return label
  return 'Outros cursos'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Two ways in: the x-cron-secret used by the automated backfill, or a
    // logged-in admin session (the "Sincronizar Cursos" button in /admin/drive).
    const BATCH_SIZE = 250
    const SYNC_SECRET = Deno.env.get('MEMBER_SYNC_SECRET')
    const provided = req.headers.get('x-cron-secret') || ''
    const cronOk = !!SYNC_SECRET && (await secureCompare(provided, SYNC_SECRET))

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

    if (!cronOk && !adminOk) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

    const START_TIME = Date.now()
    const TIME_LIMIT = 15000 // 15s limit to leave plenty of time for DB inserts before 60s gateway timeout
    let timeLimitReached = false

    const body = await req.json().catch(() => ({}))
    const cursor: string | undefined = body.cursor || undefined
    const batchSize: number = Math.min(Math.max(Number(body.batchSize) || 6, 1), 20)
    // Admin-triggered syncs re-crawl courses we've already imported too, so
    // lessons/materials added to Drive after the first import get picked up.
    const forceResync: boolean = !!body.forceResync && adminOk

    const { data: config, error: cfgErr } = await supabase.from('drive_config').select('*').single()
    if (cfgErr || !config?.connected) {
      return new Response(JSON.stringify({ error: 'Google Drive não conectado' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    let accessToken = config.access_token
    const expiry = config.token_expiry ? new Date(config.token_expiry) : null
    if (!expiry || expiry < new Date()) {
      if (!config.refresh_token) {
        return new Response(JSON.stringify({ error: 'Token expirado. Reconecte o Google Drive.' }), {
          status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        })
      }
      accessToken = await refreshAccessToken(config.refresh_token, GOOGLE_CLIENT_SECRET)
      await supabase.from('drive_config').update({
        access_token: accessToken,
        token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      }).eq('id', config.id)
    }

    // Known slugs (across all previous batches) so we skip duplicate folders
    // that mirror the same course from a different backup Google account.
    const { data: existingCourses } = await supabase.from('courses').select('id, slug, drive_folder_id, lesson_count')
    const knownSlugs = new Set((existingCourses || []).map(c => c.slug))
    const knownFolderIds = new Set((existingCourses || []).map(c => c.drive_folder_id))
    const courseIdByFolderId = new Map((existingCourses || []).map(c => [c.drive_folder_id, c.id]))

    const ROOT_FOLDER_ID = config.folder_id || '1w3J0LxztajJuD8r9BzR1os97vTyQfnT-'

    // Top-level page of course folders. Includes shortcut-type entries too —
    // several courses (e.g. "MEDCURSO 2026", "MEDCOF 2026") live in the root
    // as "Add shortcut to Drive" links rather than real folders, and Drive
    // never reports a shortcut's mimeType as '...folder' — resolved below.
    const params = new URLSearchParams({
      q: `'${ROOT_FOLDER_ID}' in parents and (mimeType='${FOLDER_MIME}' or mimeType='${SHORTCUT_MIME}') and trashed=false`,
      fields: 'nextPageToken, files(id,name,mimeType,shortcutDetails)',
      pageSize: String(batchSize),
      orderBy: 'name_natural',
    })
    if (cursor) params.set('pageToken', cursor)
    const topRes = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!topRes.ok) {
      const err = await topRes.json().catch(() => ({}))
      throw new Error(`Drive top-level list failed: ${err.error?.message || topRes.status}`)
    }
    const topData = await topRes.json()
    const courseFolders: { id: string; name: string }[] = (topData.files || [])
      .map((f: any) => {
        const resolved = resolveShortcut(f)
        if (!resolved || resolved.mimeType !== FOLDER_MIME) return null // broken shortcut or points at a file, not a course
        return { id: resolved.id, name: f.name }
      })
      .filter((f: any): f is { id: string; name: string } => !!f)

    let coursesCreated = 0
    let coursesResynced = 0
    let coursesSkippedDuplicate = 0
    let lessonsImported = 0
    let modulesImported = 0
    const details: { course: string; action: 'created' | 'updated' | 'skipped' | 'error'; message?: string; files?: string[] }[] = []

    for (const folder of courseFolders) {
      if (timeLimitReached) break // Stop processing folders if we're out of time

      let courseRow: { id: string } | null = null
      let isUpdate = false

      if (knownFolderIds.has(folder.id)) {
        if (!forceResync) {
          details.push({ course: folder.name, action: 'skipped', message: 'Curso já importado (re-sincronização não forçada).' })
          continue // already synced this exact folder before
        }
        const existingCourse = (existingCourses || []).find(c => c.drive_folder_id === folder.id)
        if (!existingCourse) {
          details.push({ course: folder.name, action: 'error', message: 'Falha ao encontrar curso existente no banco.' })
          continue
        }

        // Skip re-crawling massive courses to prevent Edge Function 60s timeout
        if ((existingCourse.lesson_count || 0) > 1000) {
          console.log(`Skipping massive course ${folder.name} to prevent Edge Function timeout. Use local script to resync.`)
          details.push({ course: folder.name, action: 'skipped', message: 'Curso muito grande (>1000 aulas), ignorado para evitar timeout na nuvem.' })
          continue
        }

        courseRow = { id: existingCourse.id }
        isUpdate = true
        coursesResynced++
      } else {
        const baseSlug = slugify(folder.name)
        const slug = baseSlug
        if (knownSlugs.has(slug)) {
          details.push({ course: folder.name, action: 'skipped', message: 'Curso duplicado (já sincronizado por outra pasta do Drive).' })
          coursesSkippedDuplicate++
          continue // same course already mirrored from another Drive account — keep the canonical one
        }
        knownSlugs.add(slug)
        knownFolderIds.add(folder.id)

        const { data: newCourseRow, error: courseErr } = await supabase.from('courses').insert({
          drive_folder_id: folder.id,
          title: folder.name.trim(),
          slug,
          category: categoryOf(folder.name),
          synced_at: new Date().toISOString(),
        }).select('id').single()

        if (courseErr || !newCourseRow) {
          console.error('course insert failed', folder.name, courseErr)
          details.push({ course: folder.name, action: 'error', message: `Erro ao inserir curso: ${courseErr?.message}` })
          continue
        }
        courseRow = newCourseRow
        isUpdate = false
        coursesCreated++
      }

      if (!courseRow) continue
      const course = courseRow

      // Recursive crawl: course folder -> modules (subfolders) -> lessons (files).
      // Files are only collected here (module folders are still created
      // immediately) — turning them into lesson rows is deferred until the
      // whole course has been walked, so videos can be sorted ahead of every
      // other file type instead of just following Drive's listing order.
      let moduleSortCounter = 0
      const collected: { f: any; resolved: { id: string; mimeType: string }; moduleId: string | null }[] = []

      async function crawl(folderId: string, moduleId: string | null, depth: number) {
        if (timeLimitReached) return
        
        let pageToken: string | undefined = undefined
        do {
          if (Date.now() - START_TIME > TIME_LIMIT) {
            console.warn(`Time limit reached during crawl of ${folder.name}. Aborting early.`)
            timeLimitReached = true
            return
          }

          const page = await driveList(accessToken, folderId, pageToken)
          const files: any[] = page.files || []
          for (const f of files) {
            if (collected.length >= MAX_LESSONS_PER_COURSE) break

            const resolved = resolveShortcut(f)
            if (!resolved) continue // broken/inaccessible shortcut

            if (resolved.mimeType === FOLDER_MIME) {
              if (depth < MAX_MODULE_DEPTH) {
                const { data: modRow } = await supabase.from('course_modules').upsert({
                  course_id: course.id,
                  drive_folder_id: resolved.id,
                  title: f.name.trim(),
                  sort_order: moduleSortCounter++,
                }, { onConflict: 'course_id,drive_folder_id' }).select('id').single()
                modulesImported++
                await crawl(resolved.id, modRow?.id ?? moduleId, depth + 1)
              } else {
                // deep nesting flattens into the nearest module
                await crawl(resolved.id, moduleId, depth + 1)
              }
            } else if (resolved.mimeType === 'text/html') {
              // Stray .html exports (e.g. a Google Doc downloaded as "Web
              // Page") aren't real course material — skip so they don't show
              // up as a broken/unplayable "arquivo" in the member area.
              continue
            } else {
              collected.push({ f, resolved, moduleId })
            }
          }
          pageToken = page.nextPageToken
        } while (pageToken && collected.length < MAX_LESSONS_PER_COURSE)
      }

      await crawl(folder.id, null, 0)

      // Video media always comes first, every other file type after — stable
      // within each bucket so files otherwise keep Drive's original order.
      const ordered = [
        ...collected.filter(c => lessonType(c.resolved.mimeType, c.f.name) === 'video'),
        ...collected.filter(c => lessonType(c.resolved.mimeType, c.f.name) !== 'video'),
      ]

      let materialCount = 0
      let totalDuration = 0
      let lessonSortCounter = 0
      const pendingLessons: any[] = []
      const LESSON_FLUSH_SIZE = 250

      async function flushLessons(force = false) {
        if (pendingLessons.length === 0) return
        if (!force && pendingLessons.length < LESSON_FLUSH_SIZE) return
        const batch = pendingLessons.splice(0, pendingLessons.length)
        const { error } = await supabase.from('lessons').upsert(batch, { onConflict: 'course_id,drive_file_id' })
        if (error) console.error('lesson batch upsert failed', folder.name, error)
      }

      for (const { f, resolved, moduleId } of ordered) {
        let type = lessonType(resolved.mimeType, f.name)
        if (f.videoMediaMetadata) type = 'video'
        
        // Shortcut targets don't carry videoMediaMetadata/size on the
        // shortcut item itself — only real files do.
        const duration = f.mimeType !== SHORTCUT_MIME && f.videoMediaMetadata?.durationMillis
          ? Math.round(Number(f.videoMediaMetadata.durationMillis) / 1000)
          : null
        pendingLessons.push({
          course_id: course.id,
          module_id: moduleId,
          drive_file_id: resolved.id,
          title: f.name.trim(),
          type,
          mime_type: resolved.mimeType,
          duration_seconds: duration,
          size_bytes: f.mimeType !== SHORTCUT_MIME && f.size ? Number(f.size) : null,
          sort_order: lessonSortCounter++,
        })
        await flushLessons()
        if (type !== 'video') materialCount++
        if (duration) totalDuration += duration
      }
      await flushLessons(true)
      const lessonCount = ordered.length
      lessonsImported += lessonCount

      await supabase.from('courses').update({
        lesson_count: lessonCount,
        material_count: materialCount,
        total_duration_seconds: totalDuration,
      }).eq('id', course.id)

      details.push({
        course: folder.name,
        action: isUpdate ? 'updated' : 'created',
        message: `${lessonCount} aulas/arquivos importados.`,
        files: ordered.map(c => c.f.name)
      })
    }

    const nextCursor = topData.nextPageToken || null

    return new Response(JSON.stringify({
      done: !nextCursor,
      cursor: nextCursor,
      coursesInBatch: courseFolders.length,
      coursesCreated,
      coursesResynced,
      coursesSkippedDuplicate,
      modulesImported,
      lessonsImported,
      details,
    }), { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
