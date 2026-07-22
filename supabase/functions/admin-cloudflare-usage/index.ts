// ─────────────────────────────────────────────────────────────────────────────
// OneMed · admin-cloudflare-usage
// Puxa o número de requisições/dia do Worker de streaming (Cloudflare) via
// GraphQL Analytics, pro painel de egress mostrar o volume real do que
// substituiu member-stream-file — sem isso, o painel passaria a impressão
// de que o tráfego de streaming simplesmente sumiu, quando na verdade só
// mudou de lugar (pra um serviço que não cobra por banda).
//
// Cloudflare não expõe bytes transferidos nessa API (faz sentido: eles não
// cobram por isso), só contagem de requisições — ainda assim é um bom sinal
// de volume/atividade e serve pra detectar anomalias.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
const SCRIPT_NAME = 'onemed-stream-lesson'
const DAYS = 14

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

  try {
    const cfToken = Deno.env.get('CLOUDFLARE_API_TOKEN')!
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')!

    const until = new Date()
    const since = new Date(until.getTime() - DAYS * 24 * 60 * 60 * 1000)

    const query = `
      query {
        viewer {
          accounts(filter: { accountTag: "${accountId}" }) {
            workersInvocationsAdaptive(
              limit: ${DAYS + 2}
              filter: { datetime_geq: "${since.toISOString()}", datetime_leq: "${until.toISOString()}", scriptName: "${SCRIPT_NAME}" }
              orderBy: [date_ASC]
            ) {
              sum { requests errors }
              dimensions { date }
            }
          }
        }
      }
    `

    const cfRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    const cfData = await cfRes.json()
    if (!cfRes.ok || cfData.errors) {
      console.error('Cloudflare GraphQL error', JSON.stringify(cfData))
      return new Response(JSON.stringify({ error: 'Não foi possível consultar a Cloudflare' }), {
        status: 502, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const rows = cfData.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive || []
    const days = rows.map((r: any) => ({
      day: r.dimensions.date,
      requests: r.sum.requests,
      errors: r.sum.errors,
    }))

    return new Response(JSON.stringify({ days }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})
