// ─────────────────────────────────────────────────────────────────────────────
// OneMed · admin-database-backup
// Exporta TODAS as tabelas do schema public (estrutura de colunas + todas as
// linhas) como NDJSON (uma linha JSON por registro), pra dar ao admin um jeito
// de baixar um backup completo direto do painel.
//
// Reescrito em 2026-07-25: a versão anterior streamava TUDO numa única
// resposta HTTP de longa duração — com ~230 mil linhas somadas entre todas as
// tabelas, isso estourava o tempo de execução da function no meio da maior
// tabela (lessons) e devolvia um arquivo cortado (sem o marcador "done"),
// sem erro nenhum pro cliente perceber além do aviso client-side.
//
// Agora cada chamada devolve só UMA página (até PAGE_SIZE linhas de UMA
// tabela) e um cursor pro cliente pedir a próxima — o cliente (DatabasePage)
// fica no controle do loop completo, com retry por página em vez de por
// backup inteiro. Cada chamada individual é rápida (uma query só), então não
// tem como estourar timeout — e se uma página falhar, só ela precisa ser
// refeita, o backup inteiro não se perde.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
// O projeto tem max_rows=1000 configurado no PostgREST (Settings > API) —
// pedir mais que isso num .range() não dá erro nenhum, o PostgREST simplesmente
// devolve só os primeiros 1000 e ignora o resto em silêncio. Isso já causou
// perda silenciosa de dados aqui uma vez: com PAGE_SIZE maior que o max_rows
// real, "recebi menos linhas que pedi" parecia significar "tabela acabou"
// quando na verdade só tinha sido cortada pelo servidor. Por isso a
// detecção de "tabela terminou" abaixo NÃO depende de PAGE_SIZE == o que
// realmente veio — ela sempre confirma contra o total exato da tabela
// (COUNT via count:'exact' na primeira página), então funciona mesmo que
// max_rows mude de novo no futuro sem avisar ninguém.
const PAGE_SIZE = 1000
// Página adaptativa POR BYTES: tabelas novas guardam JSONB pesado (decks de
// questões com imagens embutidas chegam a centenas de KB por linha) — 1000
// linhas dessas numa resposta estouraria a function. Quando uma página passa
// do teto, a próxima pede metade das linhas; quando volta a ficar leve, cresce
// de novo. A detecção de fim de tabela é por COUNT exato, então o tamanho de
// página variável não afeta a completude.
const PAGE_BYTE_BUDGET = 6 * 1024 * 1024
const PAGE_LIGHT_BYTES = 1 * 1024 * 1024
const PAGE_SIZE_MIN = 50

// auth.users entra como "tabela virtual" no fim da lista: as contas dos
// alunos moram lá (todas as tabelas de user_id apontam para ela) e um restore
// sem elas perderia logins e senhas. Paginada via RPC dedicada
// (admin_backup_auth_users), porque o PostgREST não expõe o schema auth.
const AUTH_TABLE = 'auth.users'
// ≤ metade do max_rows do PostgREST (1000): uma página de RPC nunca é cortada
// em silêncio antes do LIMIT pedido, então "veio menos que o pedido" é sinal
// confiável de fim — não existe COUNT via .range() para RPC.
const AUTH_PAGE_SIZE = 500

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function sqlTypeFor(dataType: string): string {
  const map: Record<string, string> = {
    'character varying': 'text', 'timestamp with time zone': 'timestamptz',
    'timestamp without time zone': 'timestamp', 'double precision': 'double precision',
  }
  return map[dataType] || dataType
}

interface Cursor {
  orderedTables: string[]
  tableIndex: number
  offset: number
  tableTotal?: number // COUNT exato da tabela atual — undefined até a 1ª página dela ser buscada
  pageSize?: number // página adaptativa por bytes (ver PAGE_BYTE_BUDGET)
}

const encoder = new TextEncoder()
function byteLengthOf(lines: string[]): number {
  return lines.reduce((s, l) => s + encoder.encode(l).byteLength + 1, 0)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })
  const cors = getCorsHeaders(req)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // ── Confirma que quem está pedindo é admin, usando o JWT de quem chamou ──
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const authClient = createClient(supabaseUrl, serviceKey)
    const { data: { user }, error: authErr } = await authClient.auth.getUser(jwt)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const { data: isAdmin } = await authClient.rpc('has_role', { _user_id: user.id, _role: 'admin' })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas administradores' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const body = await req.json().catch(() => ({}))
    const cursor: Cursor | null = body?.cursor ?? null

    const { data: schemaRows, error: schemaErr } = await supabase.rpc('admin_schema_snapshot')
    if (schemaErr || !schemaRows) {
      return new Response(JSON.stringify({ error: 'Falha ao ler o schema: ' + (schemaErr?.message || 'desconhecido') }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const tables = schemaRows as { table_name: string; columns: { column_name: string; data_type: string; is_nullable: string; column_default: string | null }[]; estimated_rows: number }[]
    const tableByName = new Map(tables.map(t => [t.table_name, t]))

    // ── Primeira chamada: sem cursor ainda. Devolve meta + DDL de TODAS as
    // tabelas (rápido e pequeno) e fixa a ordem de exportação (menor pra
    // maior) — essa ordem congelada é devolvida no cursor e o cliente manda
    // ela de volta em toda chamada seguinte, então a ordenação nunca muda no
    // meio do backup mesmo que as estatísticas do banco mudem entretanto. ──
    if (!cursor) {
      // auth.users por último: é a tabela virtual servida por RPC.
      const orderedTables = [...tables].sort((a, b) => (a.estimated_rows || 0) - (b.estimated_rows || 0)).map(t => t.table_name)
      orderedTables.push(AUTH_TABLE)

      const lines: string[] = []
      lines.push(JSON.stringify({ type: 'meta', exported_at: new Date().toISOString(), tables: [...tables.map(t => t.table_name), AUTH_TABLE] }))
      for (const t of tables) {
        const ddlCols = (t.columns || []).map(c => {
          const notNull = c.is_nullable === 'NO' ? ' NOT NULL' : ''
          const def = c.column_default ? ` DEFAULT ${c.column_default}` : ''
          return `  "${c.column_name}" ${sqlTypeFor(c.data_type)}${notNull}${def}`
        }).join(',\n')
        const ddl = `CREATE TABLE IF NOT EXISTS public."${t.table_name}" (\n${ddlCols}\n);`
        lines.push(JSON.stringify({ type: 'schema', table: t.table_name, columns: t.columns, ddl }))
      }
      lines.push(JSON.stringify({
        type: 'schema', table: AUTH_TABLE, columns: null,
        ddl: '-- auth.users: contas do GoTrue (linhas como jsonb, sem os tokens voláteis de fluxos pendentes). Restaurar via API de admin do Auth ou INSERT direto em auth.users.',
      }))

      const nextCursor: Cursor = { orderedTables, tableIndex: 0, offset: 0 }
      try { await supabase.rpc('record_egress', { _source: 'admin-database-backup', _bytes: byteLengthOf(lines) }) } catch { /* egress tracking é best-effort */ }
      return new Response(JSON.stringify({ lines, cursor: nextCursor, done: false, totalTables: orderedTables.length }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── Chamadas seguintes: uma página de UMA tabela por vez. Filtra a
    // ordem congelada contra o schema atual, caso alguma tabela tenha sido
    // removida no meio de um backup muito longo. ──
    const orderedTables = cursor.orderedTables.filter(name => tableByName.has(name) || name === AUTH_TABLE)
    let { tableIndex, offset, tableTotal } = cursor
    let pageSize = Math.max(PAGE_SIZE_MIN, Math.min(PAGE_SIZE, cursor.pageSize ?? PAGE_SIZE))

    if (tableIndex >= orderedTables.length) {
      return new Response(JSON.stringify({
        lines: [JSON.stringify({ type: 'done', tables_exported: orderedTables, complete: true })],
        cursor: null, done: true,
      }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const tableName = orderedTables[tableIndex]

    const lines: string[] = []
    let tableDone: boolean

    if (tableName === AUTH_TABLE) {
      // Tabela virtual: auth.users via RPC (PostgREST não expõe o schema auth).
      const needsCount = tableTotal === undefined
      if (needsCount) {
        const { data: authTotal, error: cntErr } = await supabase.rpc('admin_backup_auth_users_count')
        if (!cntErr && typeof authTotal === 'number') tableTotal = authTotal
      }
      const { data, error } = await supabase.rpc('admin_backup_auth_users', { _offset: offset, _limit: AUTH_PAGE_SIZE })
      if (error) {
        lines.push(JSON.stringify({ type: 'error', table: tableName, message: error.message }))
        tableDone = true
      } else {
        const rows = (data || []) as unknown[]
        for (const row of rows) lines.push(JSON.stringify({ type: 'row', table: tableName, data: row }))
        const newOffset = offset + rows.length
        // AUTH_PAGE_SIZE (500) < max_rows do PostgREST (1000), então "veio
        // menos que o pedido" é fim de verdade — e o COUNT confirma quando veio.
        tableDone = tableTotal !== undefined ? newOffset >= tableTotal : rows.length < AUTH_PAGE_SIZE
        offset = newOffset
      }
    } else {
      // Na primeira página de cada tabela, pede o COUNT exato junto — é essa
      // contagem (não "quantas linhas vieram nesta página") que decide quando
      // a tabela realmente terminou, então uma página truncada pelo max_rows
      // do PostgREST nunca é confundida com "acabou".
      const needsCount = tableTotal === undefined
      const query = needsCount
        ? supabase.from(tableName).select('*', { count: 'exact' }).range(offset, offset + pageSize - 1)
        : supabase.from(tableName).select('*').range(offset, offset + pageSize - 1)
      const { data, error, count } = await query

      if (error) {
        lines.push(JSON.stringify({ type: 'error', table: tableName, message: error.message }))
        tableDone = true
      } else {
        for (const row of data || []) lines.push(JSON.stringify({ type: 'row', table: tableName, data: row }))
        if (needsCount && typeof count === 'number') tableTotal = count
        const newOffset = offset + (data?.length || 0)
        // Sem COUNT confiável (nunca deveria acontecer, mas por segurança):
        // cai de volta pro critério antigo de "veio menos que o pedido".
        tableDone = tableTotal !== undefined ? newOffset >= tableTotal : (!data || data.length < pageSize)
        offset = newOffset
      }
    }

    // Página adaptativa: pesada → próxima pede metade; leve → cresce de volta.
    const pageBytes = byteLengthOf(lines)
    if (pageBytes > PAGE_BYTE_BUDGET) pageSize = Math.max(PAGE_SIZE_MIN, Math.floor(pageSize / 2))
    else if (pageBytes < PAGE_LIGHT_BYTES && pageSize < PAGE_SIZE) pageSize = Math.min(PAGE_SIZE, pageSize * 2)

    if (tableDone) {
      tableIndex += 1
      offset = 0
      tableTotal = undefined
      pageSize = PAGE_SIZE // peso é característica da tabela — a próxima recomeça leve
    }

    const done = tableIndex >= orderedTables.length
    if (done) {
      lines.push(JSON.stringify({ type: 'done', tables_exported: orderedTables, complete: true }))
    }

    const nextCursor: Cursor | null = done ? null : { orderedTables, tableIndex, offset, tableTotal, pageSize }
    const responseBody = JSON.stringify({
      lines, cursor: nextCursor, done, table: tableName, totalTables: orderedTables.length, tableIndex,
    })
    try { await supabase.rpc('record_egress', { _source: 'admin-database-backup', _bytes: byteLengthOf(lines) }) } catch { /* egress tracking é best-effort */ }
    return new Response(responseBody, { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err: any) {
    console.error('admin-database-backup error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
