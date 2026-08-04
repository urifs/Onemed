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
// morrem com a requisição. O navegador já fatia vídeo/áudio grande antes de
// mandar (viaja só o trecho inicial), então aqui o teto é o do modelo.
const MAX_UPLOADS = 5
const MAX_UPLOAD_BYTES = 14 * 1024 * 1024

// O nível precisa mudar a pergunta DE VERDADE — uma frase solta não muda o
// comportamento do modelo. Cada nível vira um bloco de regras obrigatórias,
// incluindo como construir os distratores (é neles que a dificuldade mora).
const DIFFICULTY_TEXT: Record<string, string> = {
  basico: [
    'BÁSICO — regras obrigatórias deste nível:',
    '- Perguntas diretas de definição, reconhecimento e conceito fundamental ("o que é", "qual a função", valor normal).',
    '- Enunciado curto, SEM caso clínico.',
    '- Distratores claramente distinguíveis para quem estudou o material uma vez — de temas ou classes visivelmente diferentes.',
    '- PROIBIDO: exceções, condutas de segunda linha, estatísticas finas, pegadinhas.',
  ].join('\n'),
  intermediario: [
    'INTERMEDIÁRIO — regras obrigatórias deste nível:',
    '- Perguntas que exigem RELACIONAR conceitos: critérios diagnósticos, classificações, mecanismos, primeira conduta.',
    '- Enunciado pode trazer uma vinheta curta (1-2 frases).',
    '- Distratores plausíveis DO MESMO tema, que exigem atenção — mas sem pegadinha de leitura.',
    '- PROIBIDO: pergunta de definição pura (isso é nível básico).',
  ].join('\n'),
  avancado: [
    'AVANÇADO — regras obrigatórias deste nível:',
    '- Nível prova de residência: caso clínico com dados concretos (idade, achados, exames) exigindo raciocínio em 2 ou mais passos.',
    '- Cobre exceções, contraindicações, diagnósticos diferenciais próximos e condutas de segunda linha presentes no material.',
    '- Distratores MUITO próximos da correta: mesma classe de droga, critérios parecidos, condutas vizinhas — errar por desatenção deve ser fácil.',
    '- PROIBIDO: pergunta de definição simples ou de resposta óbvia pelo enunciado.',
  ].join('\n'),
}

// Mimes que o Gemini aceita inline. docx/xlsx ficam de fora — viram aviso.
const GEMINI_OK = /^(application\/pdf|image\/(png|jpe?g|webp|heic|heif)|video\/(mp4|webm|quicktime|x-matroska|mpeg)|audio\/|text\/)/i

// Vídeos MP4/MOV precisam do índice (caixa "moov") DENTRO do trecho enviado —
// quando o arquivo foi gravado com o moov no FIM (comum em gravação direta),
// o pedaço inicial é ilegível pra IA e derruba a chamada inteira com
// INVALID_ARGUMENT. Percorre as caixas de topo do MP4 procurando o moov.
function mp4TemMoov(bytes: Uint8Array): boolean {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let off = 0
  while (off + 8 <= bytes.length) {
    let size = dv.getUint32(off)
    const type = String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7])
    if (type === 'moov') return true
    if (size === 1) {
      if (off + 16 > bytes.length) return false
      size = dv.getUint32(off + 8) * 4294967296 + dv.getUint32(off + 12)
    } else if (size === 0) {
      return false
    }
    if (size < 8) return false
    off += size
  }
  return false
}

const MP4_FAMILY = /^(video\/(mp4|quicktime)|audio\/(mp4|x-m4a))/i

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

    // Plano Mensal não usa as ferramentas de IA — o mesmo my_member_status
    // das telas decide (chamado com o JWT do aluno, então auth.uid() vale).
    // Falha na consulta NÃO bloqueia: pior negar a um assinante com direito
    // do que deixar passar uma geração.
    try {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
      const asUser = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      })
      const { data: st } = await asUser.rpc('my_member_status')
      const planoAtual = (Array.isArray(st) ? st[0] : st)?.plan
      if (planoAtual === 'monthly') {
        return json(req, {
          error: 'O Plano Mensal não inclui as ferramentas de geração por IA. Faça upgrade de plano para liberar.',
        }, 403)
      }
    } catch { /* segue liberado */ }

    // ── entrada ────────────────────────────────────────────────────────────
    const { lessonIds, difficulty, count, extraText, format, uploads, mode, importExisting } = await req.json()
    // 'questions' = banco de questões: sempre múltipla escolha, com enunciado
    // no estilo de prova de residência. Reusa todo o pipeline dos flashcards.
    const modo = mode === 'questions' ? 'questions' : 'flashcards'
    // Importação de banco EXISTENTE (só no modo questões): em vez de criar
    // questões novas, TRANSCREVE as do PDF selecionado — quantidade e gabarito
    // são os do documento; explicações só são geradas quando o PDF não traz.
    const importar = modo === 'questions' && importExisting === true
    // Limites separados por modo — 15 gerações/dia de cada.
    const rlAction = modo === 'questions' ? 'questions' : 'flashcards'

    // ── limite de uso: gerar chama uma IA paga, 15 gerações/dia por modo ───
    try {
      const now = new Date()
      const { data: rl } = await supabase.from('rate_limits')
        .select('attempts, window_start')
        .eq('identifier', user.id).eq('action', rlAction).maybeSingle()
      if (rl && (now.getTime() - new Date(rl.window_start).getTime()) < 24 * 3600 * 1000) {
        if (rl.attempts >= 15) {
          return json(req, { error: 'Você atingiu o limite de 15 gerações por dia. Tente novamente amanhã.' }, 429)
        }
        await supabase.from('rate_limits').update({ attempts: rl.attempts + 1 })
          .eq('identifier', user.id).eq('action', rlAction)
      } else {
        await supabase.from('rate_limits').upsert(
          { identifier: user.id, action: rlAction, attempts: 1, window_start: now.toISOString() },
          { onConflict: 'identifier,action' },
        )
      }
    } catch { /* tabela indisponível não pode derrubar a geração */ }
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
    const formato = (modo === 'questions' || format === 'multiple_choice') ? 'multiple_choice' : 'classic'
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
      if (MP4_FAMILY.test(up.mime)) {
        const raw = Uint8Array.from(atob(up.data), c => c.charCodeAt(0))
        if (!mp4TemMoov(raw)) {
          warnings.push(`"${up.name}" está num formato de vídeo que a IA não lê em trecho — usado só o nome.`)
          sourceTitles.push(up.name)
          parts.push({ type: 'text', text: `Material (somente nome do arquivo): "${up.name}"` })
          continue
        }
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

      // Pedaço de MP4 sem o índice dentro = ilegível pra IA. Cai pro título
      // com aviso em vez de derrubar a geração inteira.
      if (isAv && bytes.length < (lesson.size_bytes || Infinity) && MP4_FAMILY.test(mime) && !mp4TemMoov(bytes)) {
        warnings.push(`"${lesson.title}" é um vídeo num formato que a IA não lê em trecho — usado só o título.`)
        parts.push({ type: 'text', text: `Material (somente título): "${lesson.title}" (curso: ${courseTitle})` })
        continue
      }

      budget -= bytes.length
      parts.push({ type: 'text', text: `Material: "${lesson.title}" (curso: ${courseTitle})${isAv ? ' — trecho inicial da aula em vídeo/áudio' : ''}:` })
      parts.push({ type: 'file', file: { file_data: `data:${mime};base64,${b64(bytes)}` } })
    }

    // ── prompt ─────────────────────────────────────────────────────────────
    const promptNormal = {
      type: 'text',
      text: [
        modo === 'questions'
          ? `Você é um elaborador de provas de medicina criando um BANCO DE QUESTÕES em português do Brasil, no estilo das provas de residência médica (enunciado objetivo, quando couber um mini caso clínico).`
          : `Você é um professor de medicina criando flashcards de estudo (estilo Anki) em português do Brasil.`,
        `Crie EXATAMENTE ${nCards} ${modo === 'questions' ? 'questões' : 'flashcards'} a partir dos materiais acima.`,
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
    }

    // Prompt de TRANSCRIÇÃO (importar banco existente): fidelidade total ao
    // PDF — enunciados, alternativas na mesma ordem e gabarito do documento.
    // Só as explicações podem ser geradas, e apenas quando o PDF não as tem.
    const LOTE_IMPORT = 20
    const promptImport = (inicio: number) => ({
      type: 'text',
      text: [
        `O material acima JÁ É um banco de questões pronto. Sua tarefa é TRANSCREVÊ-LO fielmente para JSON — você NÃO deve criar questões novas.`,
        `Transcreva as questões de número ${inicio} a ${inicio + LOTE_IMPORT - 1} do documento (na ordem em que aparecem). Se o documento tiver menos questões que isso, transcreva até a última e pare.`,
        complemento ? `Instruções extras do aluno: ${complemento}` : '',
        `Regras OBRIGATÓRIAS:`,
        `- "front": o enunciado EXATAMENTE como está no documento (inclua o caso clínico se houver). Não resuma, não reescreva.`,
        `- "options": TODAS as alternativas do documento, na MESMA ordem e com o MESMO texto. Se a questão tiver 5 alternativas, envie as 5.`,
        `- "correct": o índice (começando em 0) da alternativa correta SEGUNDO O GABARITO do próprio documento. Nunca invente gabarito: se o documento não indicar a resposta de uma questão em lugar nenhum, resolva-a com máximo rigor técnico.`,
        `- "back": a explicação de por que a correta está certa. Se o documento tiver comentário/explicação, use-o como base; se NÃO tiver, escreva você a explicação (2-3 frases, técnica e direta).`,
        `- "why": array paralelo a "options" — why[i] explica em 1 frase por que a alternativa i está errada (na posição da correta, por que está certa). Use os comentários do documento quando existirem; senão, gere.`,
        `- NÃO pule questões, NÃO mude a ordem, NÃO altere o texto das alternativas.`,
        `- Responda APENAS um array JSON válido: [{"front":"...","options":["..."],"correct":0,"back":"...","why":["..."]}] — sem markdown, sem comentários. Se as questões pedidas não existirem no documento, responda [].`,
      ].filter(Boolean).join('\n'),
    })

    // ── chama o Gemini ─────────────────────────────────────────────────────
    const chamarLLM = (conteudo: unknown[]) => fetch(LLM_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('EMERGENT_LLM_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: 'user', content: conteudo }],
        temperature: importar ? 0.1 : 0.4,
        // Sem isto, resposta longa (30 questões com justificativas) vinha
        // CORTADA no limite padrão do provedor e o JSON quebrava no meio.
        max_tokens: 16384,
      }),
    })

    type Carta = { front: string; back: string; options?: string[]; correct?: number; why?: string[] }

    // O modelo às vezes embrulha em ```json ... ```, põe texto antes/depois,
    // ou é cortado no meio da última carta. Este parser recupera o máximo:
    // 1) parse direto; 2) recorte do primeiro '[' em diante; 3) poda até o
    // fim da última carta completa ('}') e fecha o array.
    const extrairCartas = (raw: string): Carta[] | null => {
      const semCerca = raw.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim()
      const candidatos: string[] = [semCerca]
      const ini = semCerca.indexOf('[')
      if (ini >= 0) {
        const fim = semCerca.lastIndexOf(']')
        if (fim > ini) candidatos.push(semCerca.slice(ini, fim + 1))
        const ultimaChave = semCerca.lastIndexOf('}')
        if (ultimaChave > ini) candidatos.push(semCerca.slice(ini, ultimaChave + 1) + ']')
      }
      for (const texto of candidatos) {
        try {
          const parsed = JSON.parse(texto)
          const lista = Array.isArray(parsed) ? parsed : parsed.cards || []
          if (Array.isArray(lista)) return lista as Carta[]
        } catch { /* tenta o próximo candidato */ }
      }
      return null
    }

    const validar = (lista: Carta[], teto: number): Carta[] => lista
      .filter((c) => typeof c?.front === 'string' && typeof c?.back === 'string')
      .filter((c) =>
        formato !== 'multiple_choice'
        || (Array.isArray(c.options) && c.options.length >= 2 && c.options.every((o: unknown) => typeof o === 'string')
            && typeof c.correct === 'number' && c.correct >= 0 && c.correct < (c.options as string[]).length))
      .slice(0, teto)

    // Uma rodada completa: chamada + fallback sem mídia (400) + parse + uma
    // repetição automática em resposta inválida.
    let avisoMidiaDado = false
    const obterCartas = async (promptFinal: unknown, teto: number): Promise<Carta[] | null> => {
      const conteudo = [...parts, promptFinal]
      let llmRes = await chamarLLM(conteudo)
      let llmData = await llmRes.json()

      if (!llmRes.ok && llmRes.status === 400) {
        const soTexto = (conteudo as { type: string }[]).filter(p => p.type === 'text')
        if (soTexto.length < conteudo.length) {
          console.warn('LLM 400 com mídia; tentando só com texto:', JSON.stringify(llmData).slice(0, 300))
          if (!avisoMidiaDado) {
            warnings.push('Um dos arquivos não pôde ser lido pela IA — a geração usou os títulos do conteúdo.')
            avisoMidiaDado = true
          }
          llmRes = await chamarLLM(soTexto)
          llmData = await llmRes.json()
        }
      }
      if (!llmRes.ok) {
        console.error('LLM error', llmRes.status, JSON.stringify(llmData).slice(0, 500))
        return null
      }
      let cartas = validar(extrairCartas(llmData.choices?.[0]?.message?.content || '') || [], teto)
      if (cartas.length === 0) {
        console.warn('Resposta inválida do modelo; repetindo a chamada uma vez')
        llmRes = await chamarLLM(conteudo)
        llmData = await llmRes.json()
        if (llmRes.ok) cartas = validar(extrairCartas(llmData.choices?.[0]?.message?.content || '') || [], teto)
      }
      return cartas
    }

    let cards: Carta[]
    if (importar) {
      // Importação: transcreve o banco inteiro em lotes até o documento
      // acabar (lote incompleto) ou bater o teto de segurança.
      const MAX_IMPORT = 120
      cards = []
      for (let inicio = 1; inicio <= MAX_IMPORT; inicio += LOTE_IMPORT) {
        const lote = await obterCartas(promptImport(inicio), LOTE_IMPORT + 5)
        if (lote === null) {
          // falha de LLM no meio: entrega o que já foi transcrito, com aviso
          if (cards.length > 0) {
            warnings.push('A leitura parou antes do fim do documento — gere de novo se faltarem questões.')
            break
          }
          return json(req, { error: 'A IA não conseguiu ler este banco de questões agora. Tente novamente em instantes.' }, 502)
        }
        // dedupe do lote de fronteira (o modelo às vezes repete a última questão)
        const vistos = new Set(cards.map(c => c.front))
        const novos = lote.filter(c => !vistos.has(c.front))
        cards.push(...novos)
        if (lote.length < LOTE_IMPORT) break
        if (novos.length === 0) break
      }
      if (cards.length === 0) {
        return json(req, { error: 'Não encontrei questões no documento selecionado. Confira se o PDF é mesmo um banco de questões.' }, 422)
      }
      // A transcrição fiel traz junto os prefixos do documento ("Questão 3.",
      // "A)"), que duplicariam a numeração/letras da interface. Tirar o
      // prefixo não mexe na ordem — o gabarito continua o do PDF.
      for (const c of cards) {
        c.front = c.front.replace(/^\s*quest[ãa]o\s*\d+\s*[\.\):\-–]?\s*/i, '')
        if (Array.isArray(c.options)) {
          c.options = c.options.map(o => o.replace(/^\s*[A-Ea-e]\s*[\)\.:\-–]\s+/, ''))
        }
      }
    } else {
      const geradas = await obterCartas(promptNormal, MAX_CARDS)
      if (geradas === null) {
        return json(req, { error: 'A IA não conseguiu processar este conteúdo agora. Tente novamente em instantes.' }, 502)
      }
      if (geradas.length === 0) {
        return json(req, { error: 'A IA devolveu uma resposta inválida. Tente gerar de novo.' }, 502)
      }
      cards = geradas
    }

    // Embaralha as alternativas de cada carta AQUI, não no prompt: o modelo
    // tem viés de posição (concentra a correta nas mesmas letras) e pedir
    // "varie as letras" não conserta viés estatístico. Com Fisher-Yates por
    // carta, a letra da correta fica uniforme de verdade — why[] e correct
    // são remapeados junto.
    //
    // IMPORTAÇÃO NÃO EMBARALHA: as alternativas e o gabarito têm que ficar
    // idênticos ao PDF de origem.
    for (const c of importar ? [] : cards) {
      if (!Array.isArray(c.options) || typeof c.correct !== 'number') continue
      const n = c.options.length
      const perm = [...Array(n).keys()]
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[perm[i], perm[j]] = [perm[j], perm[i]]
      }
      const opts = c.options
      const whys = Array.isArray(c.why) ? c.why : null
      c.options = perm.map(o => opts[o])
      if (whys) c.why = perm.map(o => whys[o] ?? '')
      c.correct = perm.indexOf(c.correct)
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
