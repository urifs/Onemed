import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { extrairAudioDeMp4, extrairAudioDeTsProgressivo, type LerRange } from '../_shared/media-audio.ts'
import { PDFDocument, PDFDict, PDFName, PDFRawStream } from 'https://esm.sh/pdf-lib@1.17.1'

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
// Todo vídeo e todo áudio entram: o que vai para o modelo é a TRILHA DE ÁUDIO
// extraída (ver _shared/media-audio.ts), então o container deixou de importar.
// A lista antiga barrava `video/mp2t` — 12.015 aulas do acervo que as
// ferramentas de IA nunca leram uma única vez.
const GEMINI_OK = /^(application\/pdf|image\/(png|jpe?g|webp|heic|heif)|video\/|audio\/|text\/)/i


/**
 * Recorta um PDF grande nas primeiras páginas que cabem no orçamento.
 *
 * 5.699 apostilas do acervo passam de 13 MB e viravam "usado só o título" —
 * a ferramenta cobrava do aluno e não lia uma linha do material. Uma apostila
 * começa pelo sumário e pelos capítulos iniciais, então as primeiras páginas
 * são a melhor aproximação possível dentro do que o modelo aceita.
 *
 * `ignoreEncryption` é necessário: as apostilas das editoras vêm com senha de
 * proprietário (medido em 07/2026 — AES-256 com P=2580), que bloqueia edição
 * mas permite leitura e cópia.
 */
async function primeirasPaginas(bytes: Uint8Array, orcamento: number): Promise<Uint8Array | null> {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false })
    const total = doc.getPageCount()
    if (!total) return null
    // Estimativa pela média de bytes por página, com margem de 15%.
    let paginas = Math.max(1, Math.floor((orcamento * 0.85) / (bytes.length / total)))
    for (let tentativa = 0; tentativa < 4; tentativa++) {
      paginas = Math.min(paginas, total)
      const novo = await PDFDocument.create()
      const copiadas = await novo.copyPages(doc, Array.from({ length: paginas }, (_, i) => i))
      for (const pg of copiadas) novo.addPage(pg)
      const saida = await novo.save()
      if (saida.length <= orcamento || paginas <= 1) return saida
      // Estourou: reduz proporcionalmente e tenta de novo.
      paginas = Math.max(1, Math.floor(paginas * (orcamento / saida.length) * 0.9))
    }
    return null
  } catch {
    return null
  }
}

// ── imagens embutidas no PDF ──────────────────────────────────────────────
// Questão de prova que depende de figura (ECG, radiografia, foto clínica)
// virava texto com um marcador "IMG" — o modelo enxerga a imagem no PDF mas
// não tem como devolvê-la em JSON. A saída: extrair as imagens JPEG do
// próprio PDF (stream DCTDecode é um .jpg pronto, sem reencodar), mapeadas
// por página; o modelo marca em qual PÁGINA está a imagem da questão e o
// servidor anexa a imagem de verdade ao card.
//
// Limites deliberados: só JPEG puro (FlateDecode+DCT ou PNG-like exigiriam
// decodificação, caro no edge); ignora imagens minúsculas (ícones/bullets)
// e as repetidas em 3+ páginas (logo/marca d'água de editora).
const IMG_MIN_BYTES = 10 * 1024
const IMG_MAX_BYTES = 500 * 1024
const IMG_TOTAL_BUDGET = 2_500 * 1024
const IMG_MAX_COUNT = 24

async function extrairImagensPdf(bytes: Uint8Array): Promise<Map<number, Uint8Array[]>> {
  const porPagina = new Map<number, Uint8Array[]>()
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false })
    // 1ª passada: em quais páginas cada objeto de imagem aparece (pra pular
    // logos repetidos) e o JPEG de cada um.
    const usoPorTag = new Map<string, { jpeg: Uint8Array; paginas: number[] }>()
    doc.getPages().forEach((page, pi) => {
      let xo: unknown
      try {
        const res = page.node.Resources()
        xo = res instanceof PDFDict ? res.lookup(PDFName.of('XObject')) : undefined
      } catch { return }
      if (!(xo instanceof PDFDict)) return
      for (const [, ref] of xo.entries()) {
        try {
          const tag = String(ref)
          const ja = usoPorTag.get(tag)
          if (ja) { ja.paginas.push(pi + 1); continue }
          const obj = doc.context.lookup(ref)
          if (!(obj instanceof PDFRawStream)) continue
          const d = obj.dict
          if (String(d.lookup(PDFName.of('Subtype')) || '') !== '/Image') continue
          const filtro = String(d.lookup(PDFName.of('Filter')) || '')
          // Só DCTDecode puro: o conteúdo bruto do stream JÁ É o JPEG.
          if (!/DCTDecode/.test(filtro) || /Flate/.test(filtro)) continue
          const jpeg = obj.contents
          if (jpeg.length < IMG_MIN_BYTES || jpeg.length > IMG_MAX_BYTES) continue
          usoPorTag.set(tag, { jpeg, paginas: [pi + 1] })
        } catch { /* objeto quebrado: ignora */ }
      }
    })
    // 2ª passada: descarta o que aparece em 3+ páginas e monta o mapa final.
    let total = 0, count = 0
    for (const { jpeg, paginas } of usoPorTag.values()) {
      if (paginas.length >= 3) continue
      if (count >= IMG_MAX_COUNT || total + jpeg.length > IMG_TOTAL_BUDGET) break
      total += jpeg.length; count++
      for (const p of paginas) {
        if (!porPagina.has(p)) porPagina.set(p, [])
        porPagina.get(p)!.push(jpeg)
      }
    }
  } catch { /* PDF que o pdf-lib não abre: segue sem imagens */ }
  return porPagina
}

function b64(bytes: Uint8Array): string {
  let out = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(out)
}

serve(async (req) => {
  // Relógio da requisição: usado para decidir se ainda cabe uma segunda
  // chamada ao modelo sem estourar o limite de execução da function.
  const inicioReq = Date.now()
  // Declarada FORA do try: o catch final precisa devolver a geração cobrada, e
  // `devolverVagaDoLimite` nasce lá dentro (depende do usuário autenticado).
  let devolverVagaNoCatch: (() => Promise<void>) | null = null
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

    // Limite de uso das ferramentas de IA por plano (decisão do dono, 10/08):
    // Mensal BLOQUEADO; Anual 5/dia; Vitalício 10; Plus 20; Pro e admin sem
    // limite de plano — só o teto de segurança contra abuso/script. O
    // my_member_status é o mesmo das telas (chamado com o JWT do aluno, então
    // auth.uid() vale). Falha na consulta NÃO bloqueia nem restringe: cai no
    // teto de segurança, permissivo — pior negar a quem tem direito.
    let planoAtual = ''
    try {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
      const asUser = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      })
      const { data: st } = await asUser.rpc('my_member_status')
      planoAtual = String((Array.isArray(st) ? st[0] : st)?.plan || '')
      if (planoAtual === 'monthly') {
        return json(req, {
          error: 'O Plano Mensal não inclui as ferramentas de geração por IA. Faça upgrade de plano para liberar.',
        }, 403)
      }
    } catch { /* segue liberado no teto de segurança */ }

    // ── entrada ────────────────────────────────────────────────────────────
    const { lessonIds, archiveFileIds, difficulty, count, extraText, format, uploads, mode, importExisting, importStart } = await req.json()
    // 'questions' = banco de questões: sempre múltipla escolha, com enunciado
    // no estilo de prova de residência. Reusa todo o pipeline dos flashcards.
    const modo = mode === 'questions' ? 'questions' : 'flashcards'
    // Importação de banco EXISTENTE (só no modo questões): em vez de criar
    // questões novas, TRANSCREVE as do PDF selecionado — quantidade e gabarito
    // são os do documento; explicações só são geradas quando o PDF não traz.
    const importar = modo === 'questions' && importExisting === true
    const rlAction = modo === 'questions' ? 'questions' : 'flashcards'

    // Importação PAGINADA: um banco de 100-150 questões não cabe numa única
    // chamada (a function é cortada aos 150s). O cliente chama em sequência,
    // cada uma transcrevendo o bloco que couber no tempo, e junta tudo. Esta
    // chamada começa na questão nº `startImport` do documento. startImport > 1
    // é uma CONTINUAÇÃO — não conta de novo no limite diário (a operação
    // inteira é UMA geração, cobrada na primeira chamada).
    const startImport = importar ? Math.max(1, Math.floor(Number(importStart) || 1)) : 1
    const ehContinuacao = importar && startImport > 1

    // Limite efetivo do dia: o do plano (5/10/20) ou o teto de segurança de
    // 100 para Pro/admin (e para quem a resolução de plano não pegou). Cada
    // "ferramenta" tem seu contador (rlAction 'flashcards' vs 'questions'),
    // como o dono pediu — 5 flashcards E 5 questões no Anual, não 5 no total.
    const LIMITE_IA_POR_PLANO: Record<string, number> = { trial: 5, annual: 5, lifetime: 10, lifetime_plus: 20 }
    const TETO_SEGURANCA = 100
    const LIMITE_DIARIO = LIMITE_IA_POR_PLANO[planoAtual] ?? TETO_SEGURANCA
    // Devolve a vaga contada. Melhor esforço: falhar aqui não pode derrubar a
    // resposta de erro que o aluno precisa ver.
    //
    // ⚠️ Toda saída de ERRO tem que passar por `falhar()` abaixo. Antes, a vaga
    // só era devolvida no caso de conteúdo ilegível, então timeout, erro do
    // modelo e resposta inválida cobravam uma geração do dia sem entregar nada
    // — em 3 dias de produção, 5 de 42 tentativas (12%) terminaram assim.
    const devolverVagaDoLimite = async () => {
      if (ehContinuacao) return
      try {
        const { data: rl } = await supabase.from('rate_limits')
          .select('attempts').eq('identifier', user.id).eq('action', rlAction).maybeSingle()
        if (rl && rl.attempts > 0) {
          await supabase.from('rate_limits').update({ attempts: rl.attempts - 1 })
            .eq('identifier', user.id).eq('action', rlAction)
        }
      } catch { /* contador é secundário diante da mensagem de erro */ }
    }

    /** Erro ao aluno DEVOLVENDO a geração cobrada — nada foi entregue. */
    const falhar = async (msg: string, status = 502) => {
      await devolverVagaDoLimite()
      return json(req, { error: msg }, status)
    }
    devolverVagaNoCatch = devolverVagaDoLimite

    // Continuação de importação paginada não passa pelo contador — a primeira
    // chamada já cobrou a operação inteira.
    if (!ehContinuacao) try {
      const now = new Date()
      const { data: rl } = await supabase.from('rate_limits')
        .select('attempts, window_start')
        .eq('identifier', user.id).eq('action', rlAction).maybeSingle()
      if (rl && (now.getTime() - new Date(rl.window_start).getTime()) < 24 * 3600 * 1000) {
        if (rl.attempts >= LIMITE_DIARIO) {
          // A janela é de 24h a partir da PRIMEIRA geração, não do fim do dia —
          // dizer só "tente amanhã" mandava o aluno voltar na hora errada.
          const faltamMin = Math.max(
            1,
            Math.ceil((new Date(rl.window_start).getTime() + 24 * 3600 * 1000 - now.getTime()) / 60000),
          )
          const quando = faltamMin >= 60
            ? `em ${Math.ceil(faltamMin / 60)}h`
            : `em ${faltamMin} minuto${faltamMin === 1 ? '' : 's'}`
          const oQue = modo === 'questions' ? 'bancos de questões' : 'baralhos de flashcards'
          // Trial → convite pra assinar (é um teto de experimentação, não
          // renovável). Plano pago com limite baixo → aponta o upgrade. Teto de
          // segurança (Pro/admin) → mensagem antiga de "limite diário".
          const msg = planoAtual === 'trial'
            ? `Você usou as ${LIMITE_DIARIO} utilizações liberadas no teste grátis. Assine um plano para continuar usando as ferramentas de IA da plataforma.`
            : LIMITE_DIARIO < TETO_SEGURANCA
              ? `Você usou as ${LIMITE_DIARIO} gerações de ${oQue} de hoje do seu plano. O limite renova ${quando}. Planos superiores liberam mais gerações por dia — o Pro é sem limite.`
              : `Você já gerou ${LIMITE_DIARIO} ${oQue} nas últimas 24 horas, que é o limite diário. Você poderá gerar de novo ${quando}.`
          return json(req, { error: msg }, 429)
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
    // Fontes: aulas da biblioteca E/OU arquivos do Acervo Público — o teto de
    // 8 fontes vale pro conjunto.
    const archIds: string[] = Array.isArray(archiveFileIds) ? archiveFileIds.slice(0, MAX_LESSONS) : []
    const ids: string[] = Array.isArray(lessonIds) ? lessonIds.slice(0, Math.max(MAX_LESSONS - archIds.length, 0)) : []

    const enviados: { name: string; mime: string; data: string }[] = (Array.isArray(uploads) ? uploads : [])
      .slice(0, MAX_UPLOADS)
      .filter((u: { name?: unknown; mime?: unknown; data?: unknown }) =>
        typeof u?.name === 'string' && typeof u?.mime === 'string' && typeof u?.data === 'string' && u.data.length > 0)
      .map((u: { name: string; mime: string; data: string }) => ({
        name: u.name.slice(0, 120), mime: u.mime, data: u.data,
      }))

    if (ids.length === 0 && archIds.length === 0 && enviados.length === 0) {
      return await falhar('Selecione ao menos uma aula, arquivo ou envie um arquivo seu', 400)
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
    if (ids.length > 0 && !lessons?.length) return await falhar('Conteúdo não encontrado', 404)

    // Arquivos do Acervo Público: consultados com o JWT DO ALUNO — a RLS do
    // acervo (assinante-nunca-trial + item público-ou-próprio) decide o que
    // ele pode usar; nada de service role aqui.
    let archFiles: { id: string; name: string; mime_type: string | null; size_bytes: number | null; drive_file_id: string; item_title: string }[] = []
    if (archIds.length > 0) {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
      const asUser = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      })
      const { data: rows } = await asUser
        .from('archive_files')
        .select('id, name, mime_type, size_bytes, drive_file_id, archive_items(title)')
        .in('id', archIds)
        .eq('status', 'ready')
      archFiles = (rows || []).map((r: { id: string; name: string; mime_type: string | null; size_bytes: number | null; drive_file_id: string; archive_items?: { title?: string } }) => ({
        id: r.id, name: r.name, mime_type: r.mime_type, size_bytes: r.size_bytes,
        drive_file_id: r.drive_file_id, item_title: r.archive_items?.title || '',
      }))
      if (!archFiles.length && ids.length === 0 && enviados.length === 0) {
        return await falhar('Conteúdo do acervo não encontrado', 404)
      }
    }

    // ── monta as partes multimodais dentro do orçamento ────────────────────
    const warnings: string[] = []
    const parts: unknown[] = []
    let budget = MEDIA_BUDGET
    // ── DUAS contas de leitura ────────────────────────────────────────────
    // O `downloadQuotaExceeded` do Google acompanha a conta que PEDE, não o
    // arquivo (medido: mesmo arquivo, mesmo instante, 403 numa conta e 206 na
    // outra). A conta de conteúdo ficou com o download restringido e derrubou
    // a leitura de aulas em toda a plataforma; a conta de armazenamento tem
    // leitura das mesmas pastas e assume. Ordem igual à do Worker de
    // streaming: armazenamento primeiro, conteúdo como reserva.
    let driveTokens: string[] | null = null

    const getDriveTokens = async (): Promise<string[]> => {
      if (driveTokens) return driveTokens
      const lista: string[] = []
      for (const fn of ['drive-storage-token', 'drive-access-token']) {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
            body: '{}',
          })
          if (!res.ok) continue
          const t = (await res.json()).accessToken
          if (t) lista.push(t)
        } catch { /* conta indisponível: a próxima assume */ }
      }
      driveTokens = lista
      return lista
    }

    // Tenta o arquivo em cada conta: 403 (cota) e 404 (sem acesso) mandam
    // tentar a próxima; qualquer outra resposta é definitiva.
    const lerDoDrive = async (fileId: string, range?: string): Promise<Uint8Array | null> => {
      for (const tok of await getDriveTokens()) {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${tok}`, ...(range ? { Range: range } : {}) },
        })
        if (res.ok || res.status === 206) return new Uint8Array(await res.arrayBuffer())
        await res.body?.cancel().catch(() => {})
        if (res.status !== 403 && res.status !== 404) return null
      }
      return null
    }

    // ── áudio da aula: é ISSO que a IA passa a ler nos vídeos ─────────────
    // Antes ia "os primeiros 10 MB do arquivo", que só é decifrável quando o
    // índice do MP4 está no começo — e 76% das aulas do acervo têm o índice no
    // FIM. Nesses casos o modelo recebia lixo e a ferramenta caía no título.
    // Agora vai a voz do professor, que é onde o conteúdo da aula está.
    const lerRangeDrive = (fileId: string): LerRange =>
      (a, b) => lerDoDrive(fileId, `bytes=${a}-${b}`)

    const lerRangeStorage = (caminho: string): LerRange => async (a, b) => {
      const { data } = await supabase.storage.from('lesson-media').createSignedUrl(caminho, 120)
      if (!data?.signedUrl) return null
      const res = await fetch(data.signedUrl, { headers: { Range: `bytes=${a}-${b}` } })
      if (!(res.ok || res.status === 206)) { await res.body?.cancel().catch(() => {}); return null }
      return new Uint8Array(await res.arrayBuffer())
    }

    /**
     * Devolve a trilha de áudio de uma aula/arquivo em AAC, ou null se não der.
     * MPEG-TS não tem índice e é lido do começo; o resto passa pelo `moov`.
     */
    const audioDaFonte = async (
      mime: string, tamanho: number, driveId: string | null, storagePath: string | null, orcamento: number,
    ) => {
      if (!tamanho || tamanho <= 0) return null
      const ler = storagePath ? lerRangeStorage(storagePath) : driveId ? lerRangeDrive(driveId) : null
      if (!ler) return null
      const opts = { maxAudio: Math.max(1024 * 1024, Math.min(orcamento, 11 * 1024 * 1024)) }
      try {
        if (/mp2t|mpegts|x-flv/i.test(mime)) return await extrairAudioDeTsProgressivo(ler, tamanho, opts)
        const r = await extrairAudioDeMp4(ler, tamanho, opts)
        if (r) return r
        // Container que não é MP4 (mkv, webm) nem TS: tenta TS mesmo assim —
        // vários arquivos do acervo têm extensão mentirosa (medido em 08/2026:
        // 62 ".flv" que eram MPEG-TS por dentro).
        return await extrairAudioDeTsProgressivo(ler, tamanho, opts)
      } catch (err) {
        console.error('Falha ao extrair áudio', mime, (err as Error)?.message)
        return null
      }
    }

    const sourceTitles: string[] = []
    // PDFs cujo conteúdo foi lido — candidatos à extração de imagens. A
    // extração só roda com UM PDF na geração: a referência do modelo é o
    // número da página, que ficaria ambíguo entre dois documentos.
    const pdfLidos: { nome: string; bytes: Uint8Array }[] = []
    // Quantas fontes tiveram o CONTEÚDO realmente lido (não só o título).
    // Sem isto, uma aula em vídeo que a IA não consegue abrir virava 15
    // questões inventadas a partir do NOME do arquivo — com cara de legítimas,
    // para um aluno de medicina estudar. É pior do que não gerar nada.
    let fontesLidas = 0

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
      // Vídeo enviado pelo aluno passa pelo mesmo extrator: o arquivo já está
      // inteiro em memória, então a leitura por faixa é só um recorte.
      if (/^video\//i.test(up.mime)) {
        const raw = Uint8Array.from(atob(up.data), c => c.charCodeAt(0))
        const lerLocal: LerRange = (a2, b2) => Promise.resolve(raw.subarray(a2, Math.min(b2 + 1, raw.length)))
        const audio = /mp2t|mpegts/i.test(up.mime)
          ? await extrairAudioDeTsProgressivo(lerLocal, raw.length, { maxAudio: Math.min(budget, 11 * 1024 * 1024) })
          : await extrairAudioDeMp4(lerLocal, raw.length, { maxAudio: Math.min(budget, 11 * 1024 * 1024) })
        if (audio && audio.bytes.length) {
          sourceTitles.push(up.name)
          budget -= audio.bytes.length
          parts.push({ type: 'text', text: `Material enviado pelo aluno: "${up.name}" — áudio do vídeo:` })
          parts.push({ type: 'file', file: { file_data: `data:audio/aac;base64,${b64(audio.bytes)}` } })
          fontesLidas++
          continue
        }
        warnings.push(`Não foi possível extrair o áudio de "${up.name}" — usado só o nome.`)
        sourceTitles.push(up.name)
        parts.push({ type: 'text', text: `Material (somente nome do arquivo): "${up.name}"` })
        continue
      }
      sourceTitles.push(up.name)
      budget -= rawSize
      parts.push({ type: 'text', text: `Material enviado pelo aluno: "${up.name}":` })
      parts.push({ type: 'file', file: { file_data: `data:${up.mime};base64,${up.data}` } })
      fontesLidas++
      if (up.mime === 'application/pdf') {
        pdfLidos.push({ nome: up.name, bytes: Uint8Array.from(atob(up.data), c => c.charCodeAt(0)) })
      }
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

      // Vídeo e áudio: manda a TRILHA DE ÁUDIO em vez de um pedaço do arquivo.
      if (isAv) {
        const audio = await audioDaFonte(mime, lesson.size_bytes || 0, lesson.drive_file_id, lesson.storage_path, budget)
        if (audio && audio.bytes.length) {
          budget -= audio.bytes.length
          parts.push({ type: 'text', text: `Material: "${lesson.title}" (curso: ${courseTitle}) — ÁUDIO da aula, primeiros ${audio.minutos.toFixed(0)} min. A fala do professor É o conteúdo. Extraia o conteúdo MÉDICO dito (definições, condutas, valores, critérios, casos) e ignore abertura, saudação, avisos de turma e "o que veremos hoje" — não faça cartas sobre a estrutura da aula:` })
          parts.push({ type: 'file', file: { file_data: `data:audio/aac;base64,${b64(audio.bytes)}` } })
          fontesLidas++
          continue
        }
        warnings.push(`Não foi possível extrair o áudio de "${lesson.title}" — usado só o título.`)
        parts.push({ type: 'text', text: `Material (somente título): "${lesson.title}" (curso: ${courseTitle})` })
        continue
      }

      // PDFs e imagens vão inteiros.
      const want = lesson.size_bytes || 0
      if (want > budget && mime !== 'application/pdf') {
        warnings.push(`"${lesson.title}" é grande demais para esta geração — usado só o título.`)
        parts.push({ type: 'text', text: `Material (somente título): "${lesson.title}" (curso: ${courseTitle})` })
        continue
      }
      if (want <= 0) continue

      let bytes: Uint8Array | null = null
      try {
        if (lesson.storage_path) {
          const { data: blob } = await supabase.storage.from('lesson-media').download(lesson.storage_path)
          if (blob) bytes = new Uint8Array(await blob.arrayBuffer())
        } else if (lesson.drive_file_id) {
          bytes = await lerDoDrive(lesson.drive_file_id)
        }
      } catch { /* cai no aviso abaixo */ }

      // PDF acima do orçamento: em vez de descartar (5.699 apostilas do acervo
      // caíam aqui e viravam "só o título"), manda as primeiras páginas — que
      // é onde estão o sumário e a maior parte do conteúdo de uma apostila.
      if (bytes && mime === 'application/pdf' && bytes.length > budget) {
        const cortado = await primeirasPaginas(bytes, budget)
        if (cortado) {
          warnings.push(`"${lesson.title}" é grande: a IA leu as primeiras páginas.`)
          bytes = cortado
        }
      }

      if (!bytes || bytes.length === 0) {
        warnings.push(`Não foi possível ler "${lesson.title}" — usado só o título.`)
        parts.push({ type: 'text', text: `Material (somente título): "${lesson.title}" (curso: ${courseTitle})` })
        continue
      }

      if (bytes.length > budget) {
        warnings.push(`"${lesson.title}" é grande demais para esta geração — usado só o título.`)
        parts.push({ type: 'text', text: `Material (somente título): "${lesson.title}" (curso: ${courseTitle})` })
        continue
      }

      budget -= bytes.length
      parts.push({ type: 'text', text: `Material: "${lesson.title}" (curso: ${courseTitle}):` })
      parts.push({ type: 'file', file: { file_data: `data:${mime};base64,${b64(bytes)}` } })
      fontesLidas++
      if (mime === 'application/pdf') pdfLidos.push({ nome: lesson.title, bytes })
    }

    // ── arquivos do Acervo Público (mesma régua das aulas) ─────────────────
    // Os bytes moram no Drive da conta de armazenamento, mas a pasta-raiz do
    // acervo é compartilhada como leitura com a conta de conteúdo — o mesmo
    // token do drive-access-token que serve o streaming lê esses arquivos.
    for (const af of archFiles) {
      sourceTitles.push(af.name)
      const mime = af.mime_type || 'application/octet-stream'
      const isAv = /^(video|audio)\//i.test(mime)

      if (!GEMINI_OK.test(mime)) {
        warnings.push(`"${af.name}" tem um formato que a IA não lê direto — usado só o nome.`)
        parts.push({ type: 'text', text: `Material do Acervo Público (somente nome): "${af.name}" (em «${af.item_title}»)` })
        continue
      }

      if (isAv) {
        const audio = await audioDaFonte(mime, af.size_bytes || 0, af.drive_file_id, null, budget)
        if (audio && audio.bytes.length) {
          budget -= audio.bytes.length
          parts.push({ type: 'text', text: `Material do Acervo Público: "${af.name}" (em «${af.item_title}») — ÁUDIO, primeiros ${audio.minutos.toFixed(0)} min. Extraia o conteúdo MÉDICO dito e ignore abertura e avisos:` })
          parts.push({ type: 'file', file: { file_data: `data:audio/aac;base64,${b64(audio.bytes)}` } })
          fontesLidas++
          continue
        }
        warnings.push(`Não foi possível extrair o áudio de "${af.name}" — usado só o nome.`)
        parts.push({ type: 'text', text: `Material do Acervo Público (somente nome): "${af.name}" (em «${af.item_title}»)` })
        continue
      }

      const want = af.size_bytes || 0
      if (want > budget && mime !== 'application/pdf') {
        warnings.push(`"${af.name}" é grande demais para esta geração — usado só o nome.`)
        parts.push({ type: 'text', text: `Material do Acervo Público (somente nome): "${af.name}" (em «${af.item_title}»)` })
        continue
      }
      if (want <= 0) continue

      let bytes: Uint8Array | null = null
      try {
        bytes = await lerDoDrive(af.drive_file_id)
      } catch { /* cai no aviso abaixo */ }

      if (bytes && mime === 'application/pdf' && bytes.length > budget) {
        const cortado = await primeirasPaginas(bytes, budget)
        if (cortado) {
          warnings.push(`"${af.name}" é grande: a IA leu as primeiras páginas.`)
          bytes = cortado
        }
      }

      if (!bytes || bytes.length === 0) {
        warnings.push(`Não foi possível ler "${af.name}" — usado só o nome.`)
        parts.push({ type: 'text', text: `Material do Acervo Público (somente nome): "${af.name}" (em «${af.item_title}»)` })
        continue
      }

      if (bytes.length > budget) {
        warnings.push(`"${af.name}" é grande demais para esta geração — usado só o nome.`)
        parts.push({ type: 'text', text: `Material do Acervo Público (somente nome): "${af.name}" (em «${af.item_title}»)` })
        continue
      }

      budget -= bytes.length
      parts.push({ type: 'text', text: `Material do Acervo Público: "${af.name}" (em «${af.item_title}»):` })
      parts.push({ type: 'file', file: { file_data: `data:${mime};base64,${b64(bytes)}` } })
      fontesLidas++
      if (mime === 'application/pdf') pdfLidos.push({ nome: af.name, bytes })
    }

    // Nenhuma fonte foi lida de verdade: sem o complemento escrito pelo aluno,
    // o modelo só teria os NOMES dos arquivos para trabalhar. Recusar aqui é
    // melhor do que devolver questões inventadas a partir de um título — o
    // aluno estuda em cima disso achando que veio da aula.
    if (fontesLidas === 0 && !complemento) {
      // A vaga do limite diário já foi contada lá em cima, antes de saber se
      // haveria conteúdo legível. Recusar SEM devolver o contador cobra do
      // aluno uma geração que nunca aconteceu — e o plano Anual só tem 5 no dia.
      await devolverVagaDoLimite()
      const soVideo = sourceTitles.length > 0
      return json(req, {
        error: soVideo
          ? 'Não consegui ler o conteúdo do material selecionado (é comum em aulas em vídeo). Escolha a apostila ou o PDF do módulo, ou envie um arquivo — assim as questões saem do conteúdo, e não do título da aula.'
          : 'Selecione um conteúdo ou envie um arquivo para gerar.',
        warnings,
      }, 422)
    }

    // ── imagens do PDF: extrai e ensina o modelo a referenciá-las ──────────
    // Só com UM PDF lido — com dois, "página 5" seria ambígua. O modelo marca
    // a página; o servidor anexa a imagem daquela página ao card no final.
    let imagensPdf: Map<number, Uint8Array[]> | null = null
    if (pdfLidos.length === 1) {
      imagensPdf = await extrairImagensPdf(pdfLidos[0].bytes)
      if (imagensPdf.size === 0) imagensPdf = null
    }
    const regraImagens = imagensPdf
      ? [
        `IMAGENS DO DOCUMENTO: as figuras das páginas ${[...imagensPdf.keys()].sort((a, b) => a - b).join(', ')} foram extraídas e podem ser EXIBIDAS junto das questões.`,
        `- Quando uma questão depender de uma imagem/figura do documento (ECG, radiografia, foto clínica, esquema, tabela em imagem), adicione ao objeto JSON dela os campos "img" (o número da PÁGINA do documento onde a figura está) e "imgDesc" (descrição objetiva da figura em 1 frase).`,
        `- A figura será mostrada ACIMA do enunciado — escreva o enunciado referindo-se a ela naturalmente ("Observe a imagem acima…").`,
        `- NUNCA escreva marcadores como "IMG", [IMAGEM] ou [FIGURA] no texto — se o documento mostrar um marcador desses no lugar de uma figura, não o transcreva.`,
      ].join('\n')
      : `Se uma questão depender de uma figura que você não pode exibir, descreva a figura no enunciado entre colchetes ("[Imagem: …]") — NUNCA escreva marcadores soltos como "IMG", [IMAGEM] ou [FIGURA].`

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
        regraImagens,
        formato === 'multiple_choice'
          ? `- Responda APENAS um array JSON válido: [{"front":"...","options":["...","...","...","..."],"correct":0,"back":"...","why":["...","...","...","..."]}] — "correct" é o índice (0-3) da alternativa certa; "img"/"imgDesc" só nas cartas que dependem de figura. Sem markdown, sem comentários.`
          : `- Responda APENAS um array JSON válido: [{"front":"...","back":"..."}] — "img"/"imgDesc" só nas cartas que dependem de figura. Sem markdown, sem comentários.`,
      ].filter(Boolean).join('\n'),
    }

    // Prompt de TRANSCRIÇÃO (importar banco existente): fidelidade total ao
    // PDF — enunciados, alternativas na mesma ordem e gabarito do documento.
    // Só as explicações podem ser geradas, e apenas quando o PDF não as tem.
    // 10, não 20: transcrever questão de prova (enunciado longo + alternativas
    // + justificativa de cada uma) é caro, e lote de 20 estourava o limite de
    // saída do modelo — a resposta vinha cortada e o parser salvava só um
    // pedaço. Lote menor cabe inteiro e ainda deixa o laço avançar rápido.
    const LOTE_IMPORT = 10
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
        `- "n": o NÚMERO da questão no documento original (ex.: a "Questão 7" do documento tem "n": 7).`,
        `- NÃO pule questões, NÃO mude a ordem, NÃO altere o texto das alternativas.`,
        `- Se o documento tiver MENOS questões que o intervalo pedido, transcreva só as que existem de fato e PARE — NUNCA repita uma questão já transcrita, nunca crie variações dela e nunca invente questões para completar o intervalo.`,
        regraImagens,
        `- Responda APENAS um array JSON válido: [{"n":1,"front":"...","options":["..."],"correct":0,"back":"...","why":["..."]}] — "img"/"imgDesc" só nas questões que dependem de figura. Sem markdown, sem comentários. Se as questões pedidas não existirem no documento, responda [].`,
      ].filter(Boolean).join('\n'),
    })

    // ── chama o Gemini ─────────────────────────────────────────────────────
    // ── relógio: a function é CORTADA aos 150s ────────────────────────────
    // Quando isso acontece o processo morre sem responder: o aluno fica com a
    // tela girando para sempre e a geração do dia já foi cobrada, sem forma de
    // devolver. Medido em produção (3 dias): 5 de 42 tentativas terminaram
    // assim. Então a chamada ao modelo passa a ter prazo PRÓPRIO, menor que o
    // da plataforma — quem para é a função, com tempo de sobra para avisar e
    // devolver a vaga.
    const PRAZO_TOTAL_MS = 138_000
    const restanteMs = () => PRAZO_TOTAL_MS - (Date.now() - inicioReq)

    const chamarLLM = (conteudo: unknown[]) => fetch(LLM_URL, {
      method: 'POST',
      // Margem de 6s para montar a resposta depois que a chamada volta.
      signal: AbortSignal.timeout(Math.max(5_000, restanteMs() - 6_000)),
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
        // 16384 ainda cortava: uma questão de múltipla escolha com "back" e
        // "why" para 4 alternativas gasta ~500 tokens, então 30 questões não
        // cabiam e o aluno pedia 30 e recebia ~21 (o parser salvava o pedaço
        // completo e o resto se perdia em silêncio).
        max_tokens: 32768,
      }),
    })

    // `img`/`imgDesc`/`n` são efêmeros (vêm do modelo e morrem no pós-
    // processo); `image` é o que persiste — a figura em data URI nos viewers.
    type Carta = {
      front: string; back: string; options?: string[]; correct?: number; why?: string[];
      img?: number; imgDesc?: string; image?: string; n?: number;
    }

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
      const t0Chamada = Date.now()
      let llmRes: Response
      let llmData: Record<string, unknown>
      try {
        llmRes = await chamarLLM(conteudo)
        llmData = await llmRes.json()
      } catch (err) {
        // Estourou o prazo próprio (ou a rede caiu): devolve null e quem chama
        // trata como rodada sem resultado — melhor do que a function ser morta.
        console.error('Chamada ao modelo interrompida:', (err as Error)?.message)
        return null
      }

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
      // A repetição automática DOBRA o tempo da rodada. Num PDF grande cada
      // chamada leva ~75s, então repetir levava a requisição a 150s — o limite
      // em que a function é cortada com 504 e o aluno não recebe nada. Só
      // repete se o que já se passou couber mais uma chamada do mesmo tamanho.
      const gastoNaChamada = Date.now() - t0Chamada
      const cabeRepetir = gastoNaChamada * 1.2 < restanteMs()
      if (cartas.length === 0 && cabeRepetir) {
        console.warn('Resposta inválida do modelo; repetindo a chamada uma vez')
        try {
          llmRes = await chamarLLM(conteudo)
          llmData = await llmRes.json()
          if (llmRes.ok) cartas = validar(extrairCartas((llmData as any).choices?.[0]?.message?.content || '') || [], teto)
        } catch { /* sem tempo: entrega o que houver */ }
      }
      return cartas
    }

    let cards: Carta[]
    // Paginação da importação: preenchidos no ramo importar; no ramo normal
    // ficam como "operação concluída numa chamada só".
    let importDone = true
    let importNextStart: number | null = null
    if (importar) {
      // Importação: transcreve o banco em lotes até o documento acabar, o
      // relógio apertar ou bater o teto de segurança.
      //
      // Duas armadilhas já custaram caro aqui, as duas reproduzidas com provas
      // de residência reais (43 páginas, ~100 questões):
      //
      // 1. Parar quando o lote vem incompleto (`lote.length < LOTE_IMPORT`)
      //    entregava UMA questão. Transcrever questão de prova é caro em
      //    tokens (enunciado com caso clínico + 5 alternativas + justificativa
      //    de cada uma), então o primeiro lote de 20 estourava o limite de
      //    saída, o parser recuperava só a primeira questão inteira, e o laço
      //    encerrava achando que o documento tinha acabado. Era o "só gerou 01"
      //    relatado pelos alunos. Agora só encerra quando o lote não traz
      //    NENHUMA questão nova.
      // 2. Sem trava de tempo, o laço rodava 6 lotes e a function morria com
      //    504 aos 150s — o aluno não recebia nada. Agora para antes disso e
      //    entrega o que já transcreveu, dizendo quantas vieram.
      const MAX_IMPORT = 120
      // A function é cortada com 504 aos 150s. Só vale começar um lote novo se
      // ele couber INTEIRO no que sobra — checar o relógio antes de chamar não
      // basta: com 100s no relógio e um lote de 50s, a chamada terminaria em
      // 150s e o aluno não receberia nada. A estimativa vem do lote anterior
      // (o primeiro assume 55s, medido em provas reais) com 30% de folga.
      const LIMITE_MS = 132_000
      let duracaoLote = 55_000
      cards = []
      // Assinatura anti-enchimento: quando o documento tem menos questões que
      // o intervalo pedido, o modelo às vezes "completa" repetindo uma questão
      // com variação mínima de texto ("imagem abaixo" → "imagem acima") — que
      // escapa do dedupe por texto exato. A repetição verdadeira tem as MESMAS
      // alternativas e um enunciado quase igual; questões legítimas diferentes
      // que compartilham alternativas (séries "julgue os itens") têm
      // enunciados diferentes e passam.
      // Acentos são removidos DE VERDADE (o modelo duplica a mesma questão
      // "corrigindo" a acentuação do PDF: "acao" numa cópia, "ação" na outra —
      // sem isto, as duas versões pareceriam textos diferentes).
      const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
      const tokensDe = (s: string) => new Set(
        normalizar(s).replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean),
      )
      // CONTENÇÃO, não Jaccard de união: a cópia às vezes vem com uma frase a
      // mais ("...dor torácica:" vs "...dor torácica: Qual é o diagnóstico?"),
      // e a frase extra dilui a união pra baixo do corte. Interseção sobre o
      // MENOR conjunto dá 1.0 quando um enunciado contém o outro.
      const similaridade = (a: Set<string>, b: Set<string>) => {
        let inter = 0
        for (const t of a) if (b.has(t)) inter++
        return inter / (Math.min(a.size, b.size) || 1)
      }
      const porAssinatura = new Map<string, Set<string>[]>()
      const ehRepeticaoDisfarcada = (c: Carta): boolean => {
        if (!Array.isArray(c.options)) return false
        const assin = normalizar(c.options.join('|'))
        const toks = tokensDe(c.front)
        const irmas = porAssinatura.get(assin)
        if (irmas?.some(t => similaridade(t, toks) >= 0.8)) return true
        if (!porAssinatura.has(assin)) porAssinatura.set(assin, [])
        porAssinatura.get(assin)!.push(toks)
        return false
      }
      // Onde parar/continuar: começa em startImport (1 na 1ª chamada, ou o
      // ponto que a chamada anterior devolveu em importNextStart).
      let proximoInicio = startImport
      let cortadoPorTempo = false
      let documentoAcabou = false
      for (let inicio = startImport; inicio < startImport + MAX_IMPORT; inicio += LOTE_IMPORT) {
        const decorrido = Date.now() - inicioReq
        if (decorrido + duracaoLote * 1.3 > LIMITE_MS) { cortadoPorTempo = true; proximoInicio = inicio; break }
        const t0Lote = Date.now()
        const lote = await obterCartas(promptImport(inicio), LOTE_IMPORT + 5)
        duracaoLote = Date.now() - t0Lote
        if (lote === null) {
          // falha de LLM no meio: entrega o que já foi transcrito nesta chamada
          // e sinaliza para o cliente continuar do mesmo ponto.
          if (cards.length > 0) { cortadoPorTempo = true; proximoInicio = inicio; break }
          return await falhar('A IA não conseguiu ler este banco de questões agora. Tente novamente em instantes.')
        }
        // Dedupe em duas camadas:
        // - Entre lotes, por ENUNCIADO (o modelo às vezes repete a questão de
        //   fronteira). Não por número: provas com numeração reiniciada por
        //   seção repetem "Questão 1" legitimamente em lotes diferentes.
        // - DENTRO do lote, também pelo NÚMERO "n" do documento: documento
        //   menor que o intervalo pedido fazia o modelo "completar" repetindo
        //   questões com variações de texto ("imagem abaixo" → "imagem
        //   acima"), que escapam do dedupe por enunciado — o n repetido no
        //   mesmo lote não mente: é enchimento.
        const vistos = new Set(cards.map(c => c.front))
        const numerosNoLote = new Set<number>()
        const novos = lote.filter(c => {
          if (vistos.has(c.front)) return false
          if (typeof c.n === 'number') {
            if (numerosNoLote.has(c.n)) return false
            numerosNoLote.add(c.n)
          }
          if (ehRepeticaoDisfarcada(c)) return false
          vistos.add(c.front)
          return true
        })
        cards.push(...novos)
        // Lote sem nada novo = documento acabou (ou o modelo travou). Lote
        // curto NÃO é sinal de fim: pode ser só o limite de tokens da resposta.
        if (novos.length === 0) { documentoAcabou = true; break }
        proximoInicio = inicio + LOTE_IMPORT
      }
      // importDone = a operação inteira terminou (documento acabou ou bateu o
      // teto). Só o corte por tempo pede continuação. Numa continuação sem
      // nenhuma questão nova, é o fim — o cliente para.
      importDone = !cortadoPorTempo || (ehContinuacao && cards.length === 0)
      importNextStart = importDone ? null : proximoInicio

      if (cards.length === 0) {
        // Continuação que veio vazia: o documento acabou na chamada anterior —
        // não é erro, só encerra. Primeira chamada vazia: PDF não é banco.
        if (ehContinuacao) {
          return json(req, { title: 'Banco de questões', difficulty: nivel, format: formato, cards: [], warnings, importDone: true, importNextStart: null, source: [] })
        }
        return await falhar('Não encontrei questões no documento selecionado. Confira se o PDF é mesmo um banco de questões.', 422)
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
        return await falhar('A IA não conseguiu processar este conteúdo agora. Tente novamente em instantes.')
      }
      if (geradas.length === 0) {
        return await falhar('A IA devolveu uma resposta inválida. Tente gerar de novo.')
      }
      cards = geradas

      // Completa o que faltou. Mesmo com o teto de tokens maior, uma resposta
      // longa pode voltar curta — e entregar 21 quando o aluno pediu 30, sem
      // dizer nada, é o tipo de falha que ele lê como "não funciona". Aqui a
      // diferença é pedida numa segunda chamada, informando o que já existe
      // para o modelo não repetir.
      // A chamada de complemento dobra o tempo (uma geração pesada já leva
      // ~80s sozinha). Só vale a pena quando faltou bastante E ainda há folga
      // no relógio da function — estourar o limite entregaria ZERO questões,
      // que é bem pior do que entregar algumas a menos.
      const faltouMuito = cards.length < nCards * 0.9
      // 75s, não 90s: com 6 fontes a primeira chamada já leva ~80s, e uma
      // segunda em cima disso chegou a 146s — perto demais do limite de 150s
      // em que a function é cortada com 504 e o aluno não recebe nada.
      const temFolga = Date.now() - inicioReq < 75_000
      if (faltouMuito && temFolga) {
        const jaFeitas = cards.map(c => `- ${c.front}`).join('\n')
        // Nome próprio (não `complemento`): esse identificador já existe no
        // escopo de fora, com outro significado — o texto extra do aluno.
        const promptFaltantes = {
          type: 'text',
          text: [
            `${(promptNormal as { text: string }).text}`,
            ``,
            `ATENÇÃO: já existem as ${cards.length} ${modo === 'questions' ? 'questões' : 'cartas'} abaixo. Gere APENAS as ${nCards - cards.length} que faltam, sobre pontos AINDA NÃO cobertos. Não repita nenhuma delas:`,
            jaFeitas.slice(0, 6000),
          ].join('\n'),
        }
        const extras = await obterCartas(promptFaltantes, nCards - cards.length)
        if (extras?.length) {
          const vistos = new Set(cards.map(c => c.front))
          cards.push(...extras.filter(c => !vistos.has(c.front)))
        }
      }
      cards = cards.slice(0, nCards)
      if (cards.length < nCards) {
        warnings.push(`O material rendeu ${cards.length} de ${nCards} ${modo === 'questions' ? 'questões' : 'cartas'} — gere de novo ou escolha mais conteúdo para completar.`)
      }
    }

    // ── anexa as figuras de verdade aos cards que as pedem ─────────────────
    // O modelo devolveu "img" (página da figura) e "imgDesc" (descrição). Se a
    // imagem daquela página foi extraída, vira data URI no card; senão, a
    // descrição entra no enunciado pra questão continuar respondível.
    const limparPlaceholder = (s: string) => s
      .replace(/["'“”\[\(]\s*(?:IMG|IMAGEM|FIGURA)\s*["'“”\]\)]/gi, ' ')
      .replace(/\bIMG\b/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
    // Cursor por página: duas questões na mesma página pegam figuras
    // diferentes quando existem; quando só há uma, compartilham ("as questões
    // 5 e 6 referem-se à imagem").
    const cursorPagina = new Map<number, number>()
    const pegarImagem = (pagina: number): Uint8Array | null => {
      if (!imagensPdf) return null
      // O modelo às vezes conta capa/numeração visual diferente da física —
      // tenta a página exata e as vizinhas.
      for (const p of [pagina, pagina + 1, pagina - 1]) {
        const arr = imagensPdf.get(p)
        if (!arr?.length) continue
        const i = cursorPagina.get(p) ?? 0
        cursorPagina.set(p, i + 1)
        return arr[Math.min(i, arr.length - 1)]
      }
      return null
    }
    let figuraPerdidaAvisada = false
    for (const c of cards) {
      const pagina = typeof c.img === 'number' && isFinite(c.img) ? Math.round(c.img) : null
      const desc = typeof c.imgDesc === 'string' ? c.imgDesc.trim() : ''
      delete c.img
      delete c.imgDesc
      delete c.n
      c.front = limparPlaceholder(c.front)
      if (pagina === null) continue
      const jpeg = pegarImagem(pagina)
      if (jpeg) {
        c.image = `data:image/jpeg;base64,${b64(jpeg)}`
      } else if (desc) {
        c.front = `[Imagem: ${desc}]\n\n${c.front}`
        if (!figuraPerdidaAvisada) {
          warnings.push('Algumas figuras do material não puderam ser extraídas — nessas questões a imagem foi descrita em texto no enunciado.')
          figuraPerdidaAvisada = true
        }
      }
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
      return await falhar('Nenhum conteúdo pôde ser lido para gerar os flashcards', 422)
    }
    const title = sourceTitles[0].replace(/\.[a-z0-9]{2,5}$/i, '')
      + (sourceTitles.length > 1 ? ` +${sourceTitles.length - 1}` : '')

    return json(req, {
      title,
      difficulty: nivel,
      format: formato,
      cards,
      warnings,
      // Importação paginada: o cliente usa importDone/importNextStart para
      // decidir se pede o próximo bloco. No modo normal, importDone=true.
      importDone,
      importNextStart,
      source: [
        ...(lessons || []).map((l: { id: string; title: string }) => ({ id: l.id, title: l.title })),
        ...archFiles.map(af => ({ id: af.id, title: `${af.name} (Acervo Público)` })),
        ...enviados.map(u => ({ id: null, title: `${u.name} (arquivo enviado)` })),
      ],
    })
  } catch (err) {
    console.error('Erro inesperado:', (err as Error)?.message || err)
    // Nada foi entregue: a geração cobrada volta para o aluno.
    if (devolverVagaNoCatch) await devolverVagaNoCatch().catch(() => {})
    const abortou = /abort|timeout|deadline/i.test(String((err as Error)?.message || ''))
    return json(req, {
      error: abortou
        ? 'A geração passou do tempo e foi interrompida — nenhuma geração foi descontada do seu dia. Tente pedir menos questões, ou escolher menos conteúdos de uma vez.'
        : 'Erro interno ao gerar os flashcards',
    }, abortou ? 504 : 500)
  }
})
