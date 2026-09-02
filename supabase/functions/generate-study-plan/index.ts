// ─────────────────────────────────────────────────────────────────────────────
// OneMed · generate-study-plan
//
// Gera um cronograma de estudos DETALHADO por IA (mesma chave/modelo dos
// flashcards) a partir do OBJETIVO que o aluno descreve, das horas semanais e
// da data-alvo opcional. Devolve semanas com temas e tarefas (cada tarefa com
// id, pra virar checklist), marcos, dicas e um MAPA MENTAL (árvore de temas).
// Salva em `study_plans` (service role) e devolve o registro pronto.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
const LLM_URL = 'https://integrations.emergentagent.com/llm/v1/chat/completions'
const LLM_MODEL = 'gemini/gemini-2.5-flash'
const MAX_WEEKS = 52

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function json(req: Request, payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) })

  // A function morre aos 150s. Uma geração pesada leva 60-80s, então a
  // repetição em caso de resposta inválida SÓ cabe se o relógio permitir —
  // senão o aluno espera 135s para receber 502 (ou 504, sem resposta nenhuma).
  const inicio = Date.now()
  const decorrido = () => Date.now() - inicio

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    if (!jwt) return json(req, { error: 'Faça login para gerar o cronograma' }, 401)
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt)
    if (authErr || !user) return json(req, { error: 'Sessão inválida' }, 401)

    // Limite de IA por plano (decisão do dono, 10/08): Mensal BLOQUEADO;
    // Anual 5/dia; Vitalício 10; Plus 20; Pro/admin sem limite de plano.
    let planoAtual = ''
    try {
      const asUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      })
      const { data: st } = await asUser.rpc('my_member_status')
      planoAtual = String((Array.isArray(st) ? st[0] : st)?.plan || '')
      if (planoAtual === 'monthly') {
        return json(req, { error: 'O Plano Mensal não inclui as ferramentas de IA. Faça upgrade de plano para liberar.' }, 403)
      }
    } catch { /* segue liberado no teto de segurança */ }

    const LIMITE_IA_POR_PLANO: Record<string, number> = { trial: 5, annual: 5, lifetime: 10, lifetime_plus: 20 }
    const TETO_SEGURANCA = 100
    const LIMITE_DIARIO = LIMITE_IA_POR_PLANO[planoAtual] ?? TETO_SEGURANCA
    try {
      const now = new Date()
      const { data: rl } = await supabase.from('rate_limits')
        .select('attempts, window_start').eq('identifier', user.id).eq('action', 'study_plan').maybeSingle()
      if (rl && (now.getTime() - new Date(rl.window_start).getTime()) < 24 * 3600 * 1000) {
        if (rl.attempts >= LIMITE_DIARIO) {
          // Janela de 24h desde a PRIMEIRA geração — "tente amanhã" mandava o
          // aluno voltar na hora errada.
          const faltamMin = Math.max(
            1,
            Math.ceil((new Date(rl.window_start).getTime() + 24 * 3600 * 1000 - now.getTime()) / 60000),
          )
          const quando = faltamMin >= 60
            ? `em ${Math.ceil(faltamMin / 60)}h`
            : `em ${faltamMin} minuto${faltamMin === 1 ? '' : 's'}`
          const msg = planoAtual === 'trial'
            ? `Você usou as ${LIMITE_DIARIO} utilizações liberadas no teste grátis. Assine um plano para continuar usando as ferramentas de IA da plataforma.`
            : LIMITE_DIARIO < TETO_SEGURANCA
              ? `Você usou os ${LIMITE_DIARIO} cronogramas de hoje do seu plano. O limite renova ${quando}. Planos superiores liberam mais — o Pro é sem limite.`
              : `Você já gerou ${LIMITE_DIARIO} cronogramas nas últimas 24 horas, que é o limite diário. Você poderá gerar de novo ${quando}.`
          return json(req, { error: msg }, 429)
        }
        await supabase.from('rate_limits').update({ attempts: rl.attempts + 1 }).eq('identifier', user.id).eq('action', 'study_plan')
      } else {
        await supabase.from('rate_limits').upsert(
          { identifier: user.id, action: 'study_plan', attempts: 1, window_start: now.toISOString() },
          { onConflict: 'identifier,action' })
      }
    } catch { /* tabela indisponível não derruba a geração */ }

    // A vaga do dia é cobrada ANTES de gerar (senão dava pra disparar 10 em
    // paralelo). Quando a geração falha, ela volta: o aluno não recebeu nada, e
    // sem isso ele queima o limite do plano em tentativas frustradas — foi
    // exatamente o que aconteceu com um cliente (5 tentativas, 0 cronogramas).
    const devolverVaga = async () => {
      try {
        const { data: rl } = await supabase.from('rate_limits')
          .select('attempts').eq('identifier', user.id).eq('action', 'study_plan').maybeSingle()
        if (rl && rl.attempts > 0) {
          await supabase.from('rate_limits').update({ attempts: rl.attempts - 1 })
            .eq('identifier', user.id).eq('action', 'study_plan')
        }
      } catch { /* devolver a vaga nunca pode derrubar a resposta */ }
    }

    const body = await req.json().catch(() => ({}))
    const objective = String(body.objective || '').trim().slice(0, 2000)
    const weeklyHours = Math.min(Math.max(Number(body.weeklyHours) || 0, 0), 100) || null
    const examDate = typeof body.examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.examDate) ? body.examDate : null
    const focusText = String(body.focus || '').trim().slice(0, 1000)
    if (objective.length < 10) {
      return json(req, { error: 'Descreva seu objetivo com mais detalhes (o que você quer alcançar e em quanto tempo).' }, 400)
    }

    // Quantas semanas até a prova, se houver data.
    let semanasAteProva: number | null = null
    if (examDate) {
      const diff = Math.ceil((new Date(examDate + 'T00:00:00Z').getTime() - Date.now()) / (7 * 24 * 3600 * 1000))
      if (diff > 0) semanasAteProva = Math.min(diff, MAX_WEEKS)
    }

    const prompt = [
      `Você é um mentor de estudos para medicina (residência, Revalida, faculdade). Monte um CRONOGRAMA DE ESTUDOS detalhado, realista e motivador, em português do Brasil, a partir do objetivo do aluno.`,
      `OBJETIVO DO ALUNO: ${objective}`,
      weeklyHours ? `HORAS DISPONÍVEIS POR SEMANA: ${weeklyHours}h — distribua as tarefas dentro desse tempo.` : `HORAS POR SEMANA: não informado — assuma um volume equilibrado (10 a 15h) e diga isso na visão geral.`,
      semanasAteProva ? `PRAZO: ${semanasAteProva} semanas até a data-alvo — o cronograma DEVE caber nesse prazo.` : `PRAZO: não informado — escolha uma duração adequada ao objetivo (entre 4 e 24 semanas).`,
      focusText ? `PREFERÊNCIAS/PONTOS FRACOS: ${focusText}` : '',
      `Regras:`,
      `- Divida em SEMANAS. Cada semana tem: "week" (número), "theme" (tema central curto), "focus" (1 frase), "goal" (o que dominar ao fim da semana) e "tasks".`,
      // Plano longo com 6 tarefas por semana não cabe na resposta do modelo:
      // 48 semanas × 6 tarefas passou de 32k tokens e vinha cortado.
      (semanasAteProva ?? 0) > 20
        ? `- Cada tarefa: {"id": string único curto (ex "s1t2"), "label": ação concreta e específica e CURTA (até 80 caracteres), "type": um de "estudo"|"revisao"|"pratica"|"simulado"|"descanso", "hours": número de horas}. Como o cronograma é longo, use 3 a 4 tarefas por semana e seja conciso em todos os textos.`
        : `- Cada tarefa: {"id": string único curto (ex "s1t2"), "label": ação concreta e específica, "type": um de "estudo"|"revisao"|"pratica"|"simulado"|"descanso", "hours": número de horas}. 3 a 6 tarefas por semana, somando aproximadamente as horas semanais.`,
      `- Inclua revisões espaçadas e simulados periódicos.`,
      `- "milestones": 3 a 6 marcos {"week": número, "label": conquista esperada}.`,
      `- "mindmap": um MAPA MENTAL em árvore do conteúdo — {"label": objetivo central, "children": [{"label": grande área, "children": [{"label": subtema, "children": []}]}]}. 4 a 7 grandes áreas, cada uma com 2 a 5 subtemas. É o resumo visual do que será estudado.`,
      `- "tips": 3 a 6 dicas práticas de método de estudo específicas para esse objetivo.`,
      `- "overview": 2 a 3 frases resumindo a estratégia do cronograma.`,
      `- "title": um título curto para o cronograma.`,
      // ORDEM IMPORTA: "weeks" é o campo mais longo e vai por ÚLTIMO de
      // propósito. Se a resposta estourar o teto de tokens e for cortada, o
      // que se perde são semanas do fim (o remendo devolve as inteiras) em
      // vez do mapa mental e das dicas, que sumiam por inteiro.
      `- Responda APENAS um objeto JSON válido, NESTA ORDEM de campos: {"title","overview","durationWeeks","weeklyHours","mindmap":{...},"milestones":[...],"tips":[...],"weeks":[...]}. Sem markdown, sem comentários.`,
    ].filter(Boolean).join('\n')

    const chamarLLM = () => fetch(LLM_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('EMERGENT_LLM_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        // 16384 truncava cronogramas longos NO MEIO do JSON: 26 semanas com
        // tarefas, marcos, mapa mental e dicas não cabem. O JSON cortado não
        // dá parse, e o aluno recebia "a IA não conseguiu" — de forma
        // intermitente, porque planos curtos cabiam. Mesmo teto do gerador de
        // questões, que passou pelo mesmo problema em 10/08.
        max_tokens: 32768,
      }),
    })

    // Fecha um JSON cortado no meio: descarta o trecho incompleto do fim e
    // fecha os colchetes/chaves que ficaram abertos. Um cronograma truncado
    // ainda traz as primeiras semanas inteiras — entregar 12 das 26 semanas é
    // muito melhor do que recusar tudo, que é o que acontecia.
    const remendar = (t: string): string | null => {
      const pilha: string[] = []
      let emTexto = false, escape = false, ultimoSeguro = -1
      // O fechamento tem que usar a pilha DO PONTO DE CORTE, não a do fim da
      // string: no fim estamos no meio de um objeto aninhado (mais fundo), e
      // fechar com aquela pilha gera colchete a mais e JSON inválido de novo.
      let pilhaSegura: string[] = []
      for (let i = 0; i < t.length; i++) {
        const c = t[i]
        if (escape) { escape = false; continue }
        if (c === '\\') { escape = true; continue }
        if (c === '"') { emTexto = !emTexto; continue }
        if (emTexto) continue
        if (c === '{' || c === '[') pilha.push(c === '{' ? '}' : ']')
        else if (c === '}' || c === ']') pilha.pop()
        // vírgula direto dentro de um array = item anterior fechou inteiro:
        // é o último lugar onde dá pra cortar sem perder metade de uma semana
        else if (c === ',' && pilha[pilha.length - 1] === ']') { ultimoSeguro = i; pilhaSegura = pilha.slice() }
      }
      if (!pilha.length || ultimoSeguro < 0) return null
      return t.slice(0, ultimoSeguro) + pilhaSegura.reverse().join('')
    }

    const extrair = (raw: string): any => {
      const semCerca = raw.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim()
      const candidatos = [semCerca]
      const ini = semCerca.indexOf('{')
      const fim = semCerca.lastIndexOf('}')
      if (ini >= 0 && fim > ini) candidatos.push(semCerca.slice(ini, fim + 1))
      const remendado = ini >= 0 ? remendar(semCerca.slice(ini)) : null
      if (remendado) candidatos.push(remendado)
      for (const t of candidatos) { try { return JSON.parse(t) } catch { /* próximo */ } }
      return null
    }

    const valido = (p: any) => p && Array.isArray(p.weeks) && p.weeks.length > 0

    let res = await chamarLLM()
    let data = await res.json()
    let plano = res.ok ? extrair(data.choices?.[0]?.message?.content || '') : null
    // Só repete se a SEGUNDA chamada couber no relógio (a primeira já mostrou
    // quanto custa). Sem essa conta, 2 × 70s = 140s e a function morre antes de
    // responder qualquer coisa.
    if (!valido(plano) && decorrido() + decorrido() < 130_000) {
      res = await chamarLLM()
      data = await res.json()
      if (res.ok) plano = extrair(data.choices?.[0]?.message?.content || '')
    }
    if (!valido(plano)) {
      console.error('study-plan LLM inválido:', String(data?.choices?.[0]?.message?.content || JSON.stringify(data)).slice(0, 300))
      await devolverVaga()
      return json(req, { error: 'A IA não conseguiu montar o cronograma agora. Tente de novo em instantes.' }, 502)
    }

    // Normaliza/garante ids únicos nas tarefas (o checklist depende deles).
    const usados = new Set<string>()
    plano.weeks = (plano.weeks as any[]).slice(0, MAX_WEEKS).map((w: any, wi: number) => {
      const tasks = (Array.isArray(w.tasks) ? w.tasks : []).map((t: any, ti: number) => {
        let id = String(t?.id || `s${wi + 1}t${ti + 1}`)
        while (usados.has(id)) id = `${id}_${ti}`
        usados.add(id)
        return {
          id,
          label: String(t?.label || '').slice(0, 400),
          type: ['estudo', 'revisao', 'pratica', 'simulado', 'descanso'].includes(t?.type) ? t.type : 'estudo',
          hours: Number(t?.hours) || null,
        }
      }).filter((t: any) => t.label)
      return {
        week: Number(w?.week) || wi + 1,
        theme: String(w?.theme || `Semana ${wi + 1}`).slice(0, 200),
        focus: String(w?.focus || '').slice(0, 400),
        goal: String(w?.goal || '').slice(0, 400),
        tasks,
      }
    })

    // O modelo às vezes devolve dicas como objeto {label, description} em vez
    // de string, e rótulos aninhados como objeto. Normaliza tudo pra formatos
    // fixos, senão o React quebra ao renderizar um objeto como filho.
    const asText = (v: any): string =>
      typeof v === 'string' ? v : (v && typeof v === 'object' ? String(v.label || v.title || v.text || '') : '')

    plano.tips = (Array.isArray(plano.tips) ? plano.tips : []).map((t: any) =>
      typeof t === 'string'
        ? { label: t.slice(0, 300), description: '' }
        : { label: String(t?.label || t?.title || '').slice(0, 200), description: String(t?.description || t?.text || '').slice(0, 600) },
    ).filter((t: any) => t.label || t.description)

    plano.milestones = (Array.isArray(plano.milestones) ? plano.milestones : []).map((m: any) => ({
      week: Number(m?.week) || null,
      label: asText(m).slice(0, 300) || String(m?.label || '').slice(0, 300),
    })).filter((m: any) => m.label)

    const normalizarNo = (n: any, prof = 0): any => {
      if (!n || prof > 5) return null
      return {
        label: asText(n).slice(0, 200),
        children: (Array.isArray(n.children) ? n.children : []).map((c: any) => normalizarNo(c, prof + 1)).filter(Boolean),
      }
    }
    plano.mindmap = plano.mindmap ? normalizarNo(plano.mindmap) : null

    const durationWeeks = plano.weeks.length
    const title = String(plano.title || 'Meu cronograma de estudos').slice(0, 200)

    const { data: saved, error: insErr } = await supabase.from('study_plans').insert({
      user_id: user.id,
      title,
      objective,
      weekly_hours: weeklyHours,
      duration_weeks: durationWeeks,
      exam_date: examDate,
      plan: plano,
      completed_tasks: [],
    }).select('*').single()
    if (insErr || !saved) {
      console.error('study_plans insert error', insErr)
      await devolverVaga()
      return json(req, { error: 'Não foi possível salvar o cronograma. Tente de novo.' }, 500)
    }

    return json(req, { plan: saved })
  } catch (err) {
    console.error('generate-study-plan erro:', (err as Error)?.message || err)
    return json(req, { error: 'Erro interno ao gerar o cronograma' }, 500)
  }
})
