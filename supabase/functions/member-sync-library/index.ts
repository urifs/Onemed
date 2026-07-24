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

const MAX_MODULE_DEPTH = 2
const MAX_LESSONS_PER_COURSE = 100000 

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
    pageSize: '1000',
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
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const providedSecret = req.headers.get('x-cron-secret') || ''
    const expectedSecret = Deno.env.get('MEMBER_SYNC_SECRET') || 'NOT_SET'
    const adminOk = expectedSecret !== 'NOT_SET' && (await secureCompare(providedSecret, expectedSecret))
    
    const tokenHeader = req.headers.get('Authorization')
    const hasValidToken = tokenHeader && tokenHeader.startsWith('Bearer ')

    if (!adminOk && !hasValidToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }
    
    let supabase = supabaseClient
    if (!adminOk && hasValidToken) {
      supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: tokenHeader } } }
      )
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) throw new Error('Unauthorized')
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin' && profile?.role !== 'owner') {
        throw new Error('Forbidden: Admins only')
      }
    }

    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

    const START_TIME = Date.now()
    const TIME_LIMIT = 45000 
    let timeLimitReached = false

    const body = await req.json().catch(() => ({}))
    const rawCursor = body.cursor || undefined
    const batchSize: number = Math.min(Math.max(Number(body.batchSize) || 6, 1), 20)
    const forceResync: boolean = !!body.forceResync && adminOk

    let topPageToken: string | undefined = undefined
    let courseFolderIndex = 0
    let crawlState: any = null

    if (rawCursor) {
      if (typeof rawCursor === 'string' && rawCursor.startsWith('{')) {
        try {
          const p = JSON.parse(rawCursor)
          topPageToken = p.topPageToken
          courseFolderIndex = p.courseFolderIndex || 0
          crawlState = p.crawlState || null
        } catch(e) {}
      } else if (typeof rawCursor === 'string') {
        topPageToken = rawCursor
      } else if (typeof rawCursor === 'object') {
        topPageToken = rawCursor.topPageToken
        courseFolderIndex = rawCursor.courseFolderIndex || 0
        crawlState = rawCursor.crawlState || null
      }
    }

    const { data: config, error: cfgErr } = await supabase.from('drive_config').select('*').single()
    if (cfgErr || !config?.refresh_token || !config?.root_folder_id) {
      return new Response(JSON.stringify({ error: 'Configuração do Google Drive não encontrada no banco.' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const accessToken = await refreshAccessToken(config.refresh_token, GOOGLE_CLIENT_SECRET)
    const ROOT_FOLDER_ID = config.root_folder_id

    const params = new URLSearchParams({
      q: `'${ROOT_FOLDER_ID}' in parents and (mimeType='${FOLDER_MIME}' or mimeType='${SHORTCUT_MIME}') and trashed=false`,
      fields: 'nextPageToken, files(id,name,mimeType,shortcutDetails)',
      pageSize: String(batchSize),
      orderBy: 'name_natural',
    })
    if (topPageToken) params.set('pageToken', topPageToken)
    
    // We only fetch the top list if we are not locked in a crawlState that has NO top items loaded
    // But since we need the `files` array for `courseFolderIndex` to mean anything, we MUST fetch it 
    // using `topPageToken`, so we get the exact same page!
    const topRes = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!topRes.ok) {
      const errTxt = await topRes.text()
      throw new Error(`Failed to list top folder: ${errTxt}`)
    }
    const topData = await topRes.json()
    const allCourseFolders = topData.files || []
    
    const { data: existingCourses } = await supabase.from('courses').select('id, drive_folder_id, lesson_count')
    const knownSlugs = new Set((existingCourses || []).map(c => slugify(c.id))) // just to avoid exact duplicates
    const knownFolderIds = new Set((existingCourses || []).map(c => c.drive_folder_id))

    let coursesCreated = 0
    let coursesResynced = 0
    let coursesSkippedDuplicate = 0
    let lessonsImported = 0
    let modulesImported = 0
    const details: { course: string; action: 'created' | 'updated' | 'skipped' | 'error'; message?: string; files?: string[] }[] = []

    let newNextCursor: any = null

    // We start from `courseFolderIndex`
    for (let i = courseFolderIndex; i < allCourseFolders.length; i++) {
      if (timeLimitReached) {
        newNextCursor = { topPageToken, courseFolderIndex: i, crawlState: null }
        break
      }

      const f = allCourseFolders[i]
      const resolved = resolveShortcut(f)
      if (!resolved || resolved.mimeType !== FOLDER_MIME) continue
      const folder = { id: resolved.id, name: f.name }

      let courseId: string
      let isUpdate = false
      
      let stack: { folderId: string, moduleId: string | null, depth: number, pageToken?: string }[] = []
      let moduleSortCounter = 0
      let lessonSortCounter = 0
      let materialCount = 0
      let totalDuration = 0
      let collectedCount = 0

      if (crawlState && crawlState.folderId === folder.id) {
        // Resume from where we left off
        courseId = crawlState.courseId
        isUpdate = crawlState.isUpdate
        stack = crawlState.stack
        moduleSortCounter = crawlState.moduleSortCounter
        lessonSortCounter = crawlState.lessonSortCounter
        materialCount = crawlState.materialCount
        totalDuration = crawlState.totalDuration
        collectedCount = crawlState.collectedCount
        crawlState = null // consume it
      } else {
        if (knownFolderIds.has(folder.id)) {
          if (!forceResync) {
            details.push({ course: folder.name, action: 'skipped', message: 'Curso já importado (re-sincronização não forçada).' })
            continue
          }
          const existingCourse = (existingCourses || []).find(c => c.drive_folder_id === folder.id)
          if (!existingCourse) {
            details.push({ course: folder.name, action: 'error', message: 'Falha ao encontrar curso existente no banco.' })
            continue
          }
          courseId = existingCourse.id
          isUpdate = true
          coursesResynced++
        } else {
          const baseSlug = slugify(folder.name)
          const slug = baseSlug
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
          courseId = newCourseRow.id
          isUpdate = false
          coursesCreated++
        }
        
        stack = [{ folderId: folder.id, moduleId: null, depth: 0 }]
      }

      const LESSON_FLUSH_SIZE = 2000
      let pendingLessons: any[] = []

      async function flushLessons(force = false) {
        if (pendingLessons.length === 0) return
        if (!force && pendingLessons.length < LESSON_FLUSH_SIZE) return
        const batch = pendingLessons.splice(0, pendingLessons.length)
        const { error } = await supabase.from('lessons').upsert(batch, { onConflict: 'course_id,drive_file_id' })
        if (error) console.error('lesson batch upsert failed', folder.name, error)
      }

      let courseTimeLimitReached = false

      while (stack.length > 0) {
        if (Date.now() - START_TIME > TIME_LIMIT) {
          timeLimitReached = true
          courseTimeLimitReached = true
          break
        }

        const current = stack.pop()!
        
        try {
          const page = await driveList(accessToken, current.folderId, current.pageToken)
          const files: any[] = page.files || []
          
          if (page.nextPageToken) {
            stack.push({ ...current, pageToken: page.nextPageToken }) // put it back to process next page
          }

          let localLessons = []

          for (const f of files) {
            if (collectedCount >= MAX_LESSONS_PER_COURSE) break

            const resolved = resolveShortcut(f)
            if (!resolved) continue 

            if (resolved.mimeType === FOLDER_MIME) {
              if (current.depth < MAX_MODULE_DEPTH) {
                const { data: modRow } = await supabase.from('course_modules').upsert({
                  course_id: courseId,
                  drive_folder_id: resolved.id,
                  title: f.name.trim(),
                  sort_order: moduleSortCounter++,
                }, { onConflict: 'course_id,drive_folder_id' }).select('id').single()
                modulesImported++
                stack.push({ folderId: resolved.id, moduleId: modRow?.id ?? current.moduleId, depth: current.depth + 1 })
              } else {
                stack.push({ folderId: resolved.id, moduleId: current.moduleId, depth: current.depth + 1 })
              }
            } else if (resolved.mimeType === 'text/html') {
              continue
            } else {
              let type = lessonType(resolved.mimeType, f.name)
              if (f.videoMediaMetadata) type = 'video'
              const duration = f.mimeType !== SHORTCUT_MIME && f.videoMediaMetadata?.durationMillis ? Math.round(Number(f.videoMediaMetadata.durationMillis) / 1000) : null
              
              localLessons.push({
                course_id: courseId,
                module_id: current.moduleId,
                drive_file_id: resolved.id,
                title: f.name.trim(),
                type,
                mime_type: resolved.mimeType,
                duration_seconds: duration,
                size_bytes: f.mimeType !== SHORTCUT_MIME && f.size ? Number(f.size) : null,
              })
            }
          }

          // Sort local lessons so videos come first (at least within this page)
          localLessons.sort((a, b) => {
             if (a.type === 'video' && b.type !== 'video') return -1
             if (b.type === 'video' && a.type !== 'video') return 1
             return 0
          })

          for (const l of localLessons) {
             l.sort_order = lessonSortCounter++
             pendingLessons.push(l)
             collectedCount++
             if (l.type !== 'video') materialCount++
             if (l.duration_seconds) totalDuration += l.duration_seconds
          }

          await flushLessons()
          
        } catch (e) {
           console.error("Error processing folder", current.folderId, e)
           // If a single folder fails, we skip it and continue the stack
        }
      }

      await flushLessons(true)

      const addedCount = lessonSortCounter // lessonSortCounter acts as count for this session
      lessonsImported += addedCount

      if (courseTimeLimitReached) {
         // Save state and yield
         details.push({
           course: folder.name,
           action: isUpdate ? 'updated' : 'created',
           message: `Sincronização em andamento (já importados: ${collectedCount})...`,
         })
         
         newNextCursor = {
           topPageToken,
           courseFolderIndex: i, // stay on the same course
           crawlState: {
              courseId,
              folderId: folder.id,
              courseName: folder.name,
              isUpdate,
              stack,
              moduleSortCounter,
              lessonSortCounter,
              materialCount,
              totalDuration,
              collectedCount
           }
         }
         break 
      } else {
        // Course completely done
        // Retrieve total count to update course correctly
        const { count: finalLessonCount } = await supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('course_id', courseId)
        
        await supabase.from('courses').update({
          lesson_count: finalLessonCount || collectedCount,
          material_count: materialCount,
          total_duration_seconds: totalDuration,
        }).eq('id', courseId)
  
        details.push({
          course: folder.name,
          action: isUpdate ? 'updated' : 'created',
          message: `Concluído: ${finalLessonCount || collectedCount} aulas/arquivos.`,
        })
      }
    }

    if (!newNextCursor && !timeLimitReached) {
      if (topData.nextPageToken) {
         newNextCursor = { topPageToken: topData.nextPageToken, courseFolderIndex: 0, crawlState: null }
      } else {
         newNextCursor = null // completely done!
      }
    }

    return new Response(JSON.stringify({
      done: !newNextCursor,
      cursor: newNextCursor,
      coursesInBatch: allCourseFolders.length,
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
