// ─────────────────────────────────────────────────────────────────────────────
// OneMed · admin-database-backup
// Exporta TODAS as tabelas do schema public (estrutura de colunas + todas as
// linhas) como um arquivo NDJSON (uma linha JSON por registro), pra dar ao
// admin um jeito de baixar um backup completo direto do painel, pensado pra
// permitir migrar pra outro banco se precisar.
//
// Streama linha a linha em vez de montar tudo em memória — com ~100 mil
// linhas somadas entre as tabelas maiores (lessons, course_modules,
// accesses...), montar um array gigante e devolver de uma vez estouraria
// memória/tempo da function. Cada tabela é paginada em lotes de 1000.
//
// O que este arquivo NÃO cobre: RLS policies, triggers, functions, índices,
// foreign keys — isso já está versionado em supabase/migrations/ no git. Este
// backup é sobre os DADOS, que é a única coisa que não está em lugar nenhum
// além do próprio banco.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
const PAGE_SIZE = 1000

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // ── Confirma que quem está pedindo é admin, usando o JWT de quem chamou ──
  const authHeader = req.headers.get('Authorization') || ''
  const jwt = authHeader.replace('Bearer ', '')
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Não autenticado' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  const authClient = createClient(supabaseUrl, serviceKey)
  const { data: { user }, error: authErr } = await authClient.auth.getUser(jwt)
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
      status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
  const { data: isAdmin } = await authClient.rpc('has_role', { _user_id: user.id, _role: 'admin' })
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Apenas administradores' }), {
      status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: schemaRows, error: schemaErr } = await supabase.rpc('admin_schema_snapshot')
  if (schemaErr || !schemaRows) {
    return new Response(JSON.stringify({ error: 'Falha ao ler o schema: ' + (schemaErr?.message || 'desconhecido') }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()
  const tables = schemaRows as { table_name: string; columns: { column_name: string; data_type: string; is_nullable: string; column_default: string | null }[] }[]

  const stream = new ReadableStream({
    async start(controller) {
      const write = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))

      write({ type: 'meta', exported_at: new Date().toISOString(), tables: tables.map(t => t.table_name) })

      for (const t of tables) {
        const ddlCols = (t.columns || []).map(c => {
          const notNull = c.is_nullable === 'NO' ? ' NOT NULL' : ''
          const def = c.column_default ? ` DEFAULT ${c.column_default}` : ''
          return `  "${c.column_name}" ${sqlTypeFor(c.data_type)}${notNull}${def}`
        }).join(',\n')
        const ddl = `CREATE TABLE IF NOT EXISTS public."${t.table_name}" (\n${ddlCols}\n);`
        write({ type: 'schema', table: t.table_name, columns: t.columns, ddl })

        let from = 0
        while (true) {
          const { data, error } = await supabase.from(t.table_name).select('*').range(from, from + PAGE_SIZE - 1)
          if (error) {
            write({ type: 'error', table: t.table_name, message: error.message })
            break
          }
          for (const row of data || []) {
            write({ type: 'row', table: t.table_name, data: row })
          }
          if (!data || data.length < PAGE_SIZE) break
          from += PAGE_SIZE
        }
      }

      controller.close()
    },
  })

  const filename = `onemed-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.ndjson`

  return new Response(stream, {
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/x-ndjson',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})
