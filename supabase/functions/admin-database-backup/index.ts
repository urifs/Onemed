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
const PAGE_SIZE = 2000

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
      const orderedTables = [...tables].sort((a, b) => (a.estimated_rows || 0) - (b.estimated_rows || 0)).map(t => t.table_name)

      const lines: string[] = []
      lines.push(JSON.stringify({ type: 'meta', exported_at: new Date().toISOString(), tables: tables.map(t => t.table_name) }))
      for (const t of tables) {
        const ddlCols = (t.columns || []).map(c => {
          const notNull = c.is_nullable === 'NO' ? ' NOT NULL' : ''
          const def = c.column_default ? ` DEFAULT ${c.column_default}` : ''
          return `  "${c.column_name}" ${sqlTypeFor(c.data_type)}${notNull}${def}`
        }).join(',\n')
        const ddl = `CREATE TABLE IF NOT EXISTS public."${t.table_name}" (\n${ddlCols}\n);`
        lines.push(JSON.stringify({ type: 'schema', table: t.table_name, columns: t.columns, ddl }))
      }

      const nextCursor: Cursor = { orderedTables, tableIndex: 0, offset: 0 }
      try { await supabase.rpc('record_egress', { _source: 'admin-database-backup', _bytes: byteLengthOf(lines) }) } catch { /* egress tracking é best-effort */ }
      return new Response(JSON.stringify({ lines, cursor: nextCursor, done: false, totalTables: orderedTables.length }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ── Chamadas seguintes: uma página de UMA tabela por vez. Filtra a
    // ordem congelada contra o schema atual, caso alguma tabela tenha sido
    // removida no meio de um backup muito longo. ──
    const orderedTables = cursor.orderedTables.filter(name => tableByName.has(name))
    let { tableIndex, offset } = cursor

    if (tableIndex >= orderedTables.length) {
      return new Response(JSON.stringify({
        lines: [JSON.stringify({ type: 'done', tables_exported: orderedTables, complete: true })],
        cursor: null, done: true,
      }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const tableName = orderedTables[tableIndex]
    const { data, error } = await supabase.from(tableName).select('*').range(offset, offset + PAGE_SIZE - 1)

    const lines: string[] = []
    if (error) {
      lines.push(JSON.stringify({ type: 'error', table: tableName, message: error.message }))
      tableIndex += 1
      offset = 0
    } else {
      for (const row of data || []) lines.push(JSON.stringify({ type: 'row', table: tableName, data: row }))
      if (!data || data.length < PAGE_SIZE) {
        tableIndex += 1
        offset = 0
      } else {
        offset += PAGE_SIZE
      }
    }

    const done = tableIndex >= orderedTables.length
    if (done) {
      lines.push(JSON.stringify({ type: 'done', tables_exported: orderedTables, complete: true }))
    }

    const nextCursor: Cursor | null = done ? null : { orderedTables, tableIndex, offset }
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
