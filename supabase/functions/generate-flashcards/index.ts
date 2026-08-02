import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Gera flashcards (estilo Anki) a partir de aulas e arquivos do acervo, com
// Gemini 2.5 Flash pela chave universal da Emergent (endpoint compatível com
// OpenAI). Testado contra produção antes de escrever isto:
//   - PDF real do acervo (446KB) → flashcards fiéis ao conteúdo em ~10s
//   - VÍDEO real: os primeiros 16MB de um .mp4 foram transcritos normalmente
//     — o Gemini lê o pedaço truncado quando o índice (moov) está no início
//     do arquivo, que é o caso comum. Quando não estiver, o modelo recebe o
//     título e segue com o que tiver; melhor um baralho do título do que erro.
//
// O orçamento de mídia existe porque o Gemini aceita ~20MB de dados inline
// por requisição: PDFs entram INTEIROS (truncar PDF quebra o arquivo — o
// índice fica no fim) e vídeo/áudio entram em pedaço a partir do começo.

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  })
}

const LLM_URL = 'https://integrations.emergentagent.com/llm/v1/chat/completions'
const LLM_MODEL = 'gemini/gemini-2.5-flash'

// 13MB brutos ≈ 17,3MB em base64 — folga sob o teto de ~20MB do Gemini,
// sobrando espaço pro prompt.
const MEDIA_BUDGET = 13 * 1024 * 1024
const VIDEO_CHUNK = 10 * 1024 * 1024
const MAX_LESSONS = 8
const MAX_CARDS = 30
// Uploads do próprio aluno: chegam em base64 no corpo da requisição e são
// usados SÓ nesta geração — nunca gravados em Storage nem em tabela alguma;
// morrem com a requisição. 3 arquivos, 12MB brutos no total.
const MAX_UPLOADS = 3
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024

const DIFFICULTY_TEXT: Record<string, string> = {
  basico: 'BÁSICO: perguntas diretas sobre definições e conceitos fundamentais do conteúdo.',
  intermediario: 'INTERMEDIÁRIO: perguntas que exigem relacionar conceitos, critérios diagnósticos, classificações e condutas.',
  avancado: 'AVANÇADO: casos aplicados, exceções, diagnósticos diferenciais, detalhes que caem em prova de residência.',
}

// Mimes que o Gemini aceita inline. docx/xlsx ficam de fora — viram aviso.
const GEMINI_OK = /^(application\/pdf|image\/(png|jpe?g|webp|heic|heif)|video\/(mp4|webm|quicktime|x-matroska|mpeg)|audio\/|text\/)/i

function b64(bytes: Uint8Array): string {
  let out = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(out)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // ── quem pede ──────────────────────────────────────────────────────────
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    if (!jwt) return json(req, { error: 'Faça login para gerar flashcards' }, 401)
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt)
    if (authErr || !user) return json(req, { error: 'Sessão inválida' }, 401)

    // ── limite de uso: gerar chama uma IA paga, 15 baralhos/dia por conta ──
    try {
      const now = new Date()
      const { data: rl } = await supabase.from('rate_limits')
        .select('attempts, window_start')
        .eq('identifier', user.id).eq('action', 'flashcards').maybeSingle()
      if (rl && (now.getTime() - new Date(rl.window_start).getTime()) < 24 * 3600 * 1000) {
        if (rl.attempts >= 15) {
          return json(req, { error: 'Você atingiu o limite de 15 gerações por dia. Tente novamente amanhã.' }, 429)
        }
        await supabase.from('rate_limits').update({ attempts: rl.attempts + 1 })
          .eq('identifier', user.id).eq('action', 'flashcards')
      } else {
        await supabase.from('rate_limits').upsert(
          { identifier: user.id, action: 'flashcards', attempts: 1, window_start: now.toISOString() },
          { onConflict: 'identifier,action' },
        )
      }
    } catch { /* tabela indisponível não pode derrubar a geração */ }

    // ── entrada ────────────────────────────────────────────────────────────
    const { lessonIds, difficulty, count, extraText, format, uploads } = await req.json()
    const ids: string[] = Array.isArray(lessonIds) ? lessonIds.slice(0, MAX_LESSONS) : []

    const enviados: { name: string; mime: string; data: string }[] = (Array.isArray(uploads) ? uploads : [])
      .slice(0, MAX_UPLOADS)
      .filter((u: { name?: unknown; mime?: unknown; data?: unknown }) =>
        typeof u?.name === 'string' && typeof u?.mime === 'string' && typeof u?.data === 'string' && u.data.length > 0)
      .map((u: { name: string; mime: string; data: string }) => ({
        name: u.name.slice(0, 120), mime: u.mime, data: u.data,
      }))

    if (ids.length === 0 && enviados.length === 0) {
      return json(req, { error: 'Selecione ao menos uma aula, arquivo ou envie um arquivo seu' }, 400)
    }
    const nCards = Math.min(Math.max(Number(count) || 10, 1), MAX_CARDS)
    const nivel = DIFFICULTY_TEXT[difficulty] ? difficulty : 'intermediario'
    // 'classic' = frente/verso aberto; 'multiple_choice' = alternativas pra
    // marcar, com a certa indicada e a explicação no verso.
    const formato = format === 'multiple_choice' ? 'multiple_choice' : 'classic'
    const complemento = String(extraText || '').slice(0, 2000)

    const { data: lessons } = ids.length > 0
      ? await supabase
        .from('lessons')
        .select('id, title, type, mime_type, drive_file_id, storage_path, size_bytes, courses(title)')
        .in('id', ids)
      : { data: [] as never[] }
    if (ids.length > 0 && !lessons?.length) return json(req, { error: 'Conteúdo não encontrado' }, 404)

    // ── monta as partes multimodais dentro do orçamento ────────────────────
    const warnings: string[] = []
    const parts: unknown[] = []
    let budget = MEDIA_BUDGET
    let driveToken: string | null = null

    const getDriveToken = async (): Promise<string | null> => {
      if (driveToken) return driveToken
      const res = await fetch(`${supabaseUrl}/functions/v1/drive-access-token`, {
        headers: { Authorization: `Bearer ${serviceKey}` },
      })
      if (!res.ok) return null
      driveToken = (await res.json()).accessToken || null
      return driveToken
    }

    const sourceTitles: string[] = []

    // ── arquivos enviados pelo aluno (nunca persistidos) ───────────────────
    let uploadRaw = 0
    for (const up of enviados) {
      const rawSize = Math.floor(up.data.length * 3 / 4)
      uploadRaw += rawSize
      if (uploadRaw > MAX_UPLOAD_BYTES || rawSize > budget) {
        warnings.push(`"${up.name}" ultrapassou o limite de tamanho dos uploads — ignorado.`)
        continue
      }
      if (!GEMINI_OK.test(up.mime)) {
        warnings.push(`"${up.name}" tem um formato que a IA não lê (envie PDF, imagem, áudio, vídeo ou texto).`)
        continue
      }
      sourceTitles.push(up.name)
      budget -= rawSize
      parts.push({ type: 'text', text: `Material enviado pelo aluno: "${up.name}":` })
      parts.push({ type: 'file', file: { file_data: `data:${up.mime};base64,${up.data}` } })
    }

    for (const lesson of (lessons || [])) {
      const courseTitle = (lesson as { courses?: { title?: string } }).courses?.title || ''
      sourceTitles.push(lesson.title)

      const mime = lesson.mime_type || 'application/octet-stream'
      const isAv = /^(video|audio)\//i.test(mime)

      if (!GEMINI_OK.test(mime)) {
        warnings.push(`"${lesson.title}" tem um formato que a IA não lê direto — usado só o título.`)
        parts.push({ type: 'text', text: `Material (somente título): "${lesson.title}" (curso: ${courseTitle})` })
        continue
      }

      // PDFs precisam ir inteiros; áudio/vídeo pode ir em pedaço.
      const want = isAv ? Math.min(VIDEO_CHUNK, budget) : (lesson.size_bytes || 0)
      if (!isAv && want > budget) {
        warnings.push(`"${lesson.title}" é grande demais para esta geração — usado só o título.`)
        parts.push({ type: 'text', text: `Material (somente título): "${lesson.title}" (curso: ${courseTitle})` })
        continue
      }
      if (want <= 0) continue

      let bytes: Uint8Array | null = null
      try {
        if (lesson.storage_path) {
          const { data: blob } = await supabase.storage.from('lesson-media').download(lesson.storage_path)
          if (blob) {
            const buf = new Uint8Array(await blob.arrayBuffer())
            bytes = isAv ? buf.subarray(0, want) : buf
          }
        } else if (lesson.drive_file_id) {
          const tok = await getDriveToken()
          if (tok) {
            const res = await fetch(
              `https://www.googleapis.com/drive/v3/files/${lesson.drive_file_id}?alt=media`,
              {
                headers: {
                  Authorization: `Bearer ${tok}`,
                  ...(isAv ? { Range: `bytes=0-${want - 1}` } : {}),
                },
              },
            )
            if (res.ok || res.status === 206) bytes = new Uint8Array(await res.arrayBuffer())
          }
        }
      } catch { /* cai no aviso abaixo */ }

      if (!bytes || bytes.length === 0) {
        warnings.push(`Não foi possível ler "${lesson.title}" — usado só o título.`)
        parts.push({ type: 'text', text: `Material (somente título): "${lesson.title}" (curso: ${courseTitle})` })
        continue
      }

      budget -= bytes.length
      parts.push({ type: 'text', text: `Material: "${lesson.title}" (curso: ${courseTitle})${isAv ? ' — trecho inicial da aula em vídeo/áudio' : ''}:` })
      parts.push({ type: 'file', file: { file_data: `data:${mime};base64,${b64(bytes)}` } })
    }

    // ── prompt ─────────────────────────────────────────────────────────────
    parts.push({
      type: 'text',
      text: [
        `Você é um professor de medicina criando flashcards de estudo (estilo Anki) em português do Brasil.`,
        `Crie EXATAMENTE ${nCards} flashcards a partir dos materiais acima.`,
        `Nível de dificuldade — ${DIFFICULTY_TEXT[nivel]}`,
        complemento ? `Instruções extras do aluno (considere na geração): ${complemento}` : '',
        `Regras:`,
        `- FRENTE: uma pergunta objetiva e específica (nunca "o que o texto diz sobre...").`,
        formato === 'multiple_choice'
          ? `- Cada carta tem 4 ALTERNATIVAS plausíveis (distratores realistas, do mesmo tema), exatamente UMA correta, em posição variada.`
          : `- VERSO: resposta direta na primeira linha; depois, se couber, 1-2 frases de explicação.`,
        formato === 'multiple_choice'
          ? `- "back" traz a justificativa da alternativa CORRETA em 1-2 frases.`
          : '',
        formato === 'multiple_choice'
          ? `- "why" é um array paralelo a "options": why[i] explica em 1 frase por que a alternativa i está errada (na posição da correta, por que está certa).`
          : '',
        `- Cada carta testa UM conceito. Sem cartas duplicadas ou triviais.`,
        `- Se um material for um trecho de vídeo/áudio, use o que foi falado nele.`,
        formato === 'multiple_choice'
          ? `- Responda APENAS um array JSON válido: [{"front":"...","options":["...","...","...","..."],"correct":0,"back":"...","why":["...","...","...","..."]}] — "correct" é o índice (0-3) da alternativa certa. Sem markdown, sem comentários.`
          : `- Responda APENAS um array JSON válido: [{"front":"...","back":"..."}] — sem markdown, sem comentários.`,
      ].filter(Boolean).join('\n'),
    })

    // ── chama o Gemini ─────────────────────────────────────────────────────
    const llmRes = await fetch(LLM_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('EMERGENT_LLM_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: 'user', content: parts }],
        temperature: 0.4,
      }),
    })

    const llmData = await llmRes.json()
    if (!llmRes.ok) {
      console.error('LLM error', llmRes.status, JSON.stringify(llmData).slice(0, 500))
      return json(req, { error: 'A IA não conseguiu processar este conteúdo agora. Tente novamente em instantes.' }, 502)
    }

    const raw: string = llmData.choices?.[0]?.message?.content || ''
    // O modelo às vezes embrulha em ```json ... ``` mesmo instruído a não fazer.
    const jsonText = raw.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim()
    let cards: { front: string; back: string; options?: string[]; correct?: number; why?: string[] }[]
    try {
      const parsed = JSON.parse(jsonText)
      const lista = (Array.isArray(parsed) ? parsed : parsed.cards || [])
      cards = lista
        .filter((c: { front?: unknown; back?: unknown }) => typeof c?.front === 'string' && typeof c?.back === 'string')
        .filter((c: { options?: unknown; correct?: unknown }) =>
          formato !== 'multiple_choice'
          || (Array.isArray(c.options) && c.options.length >= 2 && c.options.every((o: unknown) => typeof o === 'string')
              && typeof c.correct === 'number' && c.correct >= 0 && c.correct < (c.options as string[]).length))
        .slice(0, MAX_CARDS)
    } catch {
      console.error('Resposta não-JSON do modelo:', raw.slice(0, 300))
      return json(req, { error: 'A IA devolveu uma resposta inválida. Tente gerar de novo.' }, 502)
    }
    if (cards.length === 0) {
      return json(req, { error: 'Nenhum flashcard pôde ser gerado deste conteúdo.' }, 422)
    }

    if (sourceTitles.length === 0) {
      return json(req, { error: 'Nenhum conteúdo pôde ser lido para gerar os flashcards' }, 422)
    }
    const title = sourceTitles[0].replace(/\.[a-z0-9]{2,5}$/i, '')
      + (sourceTitles.length > 1 ? ` +${sourceTitles.length - 1}` : '')

    return json(req, {
      title,
      difficulty: nivel,
      format: formato,
      cards,
      warnings,
      source: [
        ...(lessons || []).map((l: { id: string; title: string }) => ({ id: l.id, title: l.title })),
        ...enviados.map(u => ({ id: null, title: `${u.name} (arquivo enviado)` })),
      ],
    })
  } catch (err) {
    console.error('Erro inesperado:', (err as Error)?.message || err)
    return json(req, { error: 'Erro interno ao gerar os flashcards' }, 500)
  }
})
