// ─────────────────────────────────────────────────────────────────────────────
// OneMed · admin-capi-health
//
// Responde, sem adivinhação, se a Conversions API da Meta está utilizável:
// valida o META_CAPI_ACCESS_TOKEN contra a Graph API e devolve o erro cru
// quando não está. Existe porque o secret é mascarado na API de gestão do
// Supabase — não dá pra "ler o token e testar por fora", e o resultado das
// chamadas CAPI dentro do mp-webhook só ia pro console (a retenção de log
// deste projeto é de minutos, então o erro real se perdia).
//
// Só faz leitura: consulta o nó do pixel e o /debug_token. Não injeta evento
// nenhum, não polui o dataset.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  }
}

const CAPI_PIXEL_IDS = ['797374160058274', '2400702203708115']

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) })

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload, null, 2), {
      status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // admin logado, service role key, ou cron secret
    const authHeader = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    let authorized = !!authHeader && await secureCompare(authHeader, serviceKey)

    if (!authorized && authHeader) {
      const { data: userData } = await supabase.auth.getUser(authHeader)
      if (userData?.user) {
        const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' })
        authorized = !!isAdmin
      }
    }
    if (!authorized) return json({ error: 'Unauthorized' }, 401)

    const token = Deno.env.get('META_CAPI_ACCESS_TOKEN')
    if (!token) {
      return json({
        ok: false,
        token_present: false,
        summary: 'META_CAPI_ACCESS_TOKEN não está configurado nos secrets — nenhum evento de compra chega à Meta pelo servidor.',
      })
    }

    // 1) O token ainda é válido? /debug_token responde direto, incluindo a
    //    data de expiração — é o que separa "venceu" de "não tem permissão".
    const debugRes = await fetch(
      `https://graph.facebook.com/v19.0/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`,
    )
    const debug = await debugRes.json().catch(() => ({}))
    const info = debug?.data ?? {}
    const expiresAt = info.expires_at ? new Date(info.expires_at * 1000).toISOString() : null
    const dataAccessExpiresAt = info.data_access_expires_at ? new Date(info.data_access_expires_at * 1000).toISOString() : null

    // 2) O token enxerga cada pixel? Um token válido mas sem acesso ao dataset
    //    falha exatamente igual, do ponto de vista de quem só olha o volume.
    const pixels: Record<string, unknown>[] = []
    for (const pixelId of CAPI_PIXEL_IDS) {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${pixelId}?fields=id,name,is_unavailable,last_fired_time&access_token=${encodeURIComponent(token)}`,
      )
      const body = await res.json().catch(() => ({}))
      pixels.push({
        pixel_id: pixelId,
        reachable: res.ok,
        http_status: res.status,
        name: body?.name ?? null,
        last_fired_time: body?.last_fired_time ?? null,
        error: res.ok ? null : (body?.error?.message ?? 'erro desconhecido'),
        error_code: res.ok ? null : (body?.error?.code ?? null),
      })
    }

    const tokenValid = !!info.is_valid
    const allPixelsOk = pixels.every(p => p.reachable)
    const expired = !!expiresAt && new Date(expiresAt) < new Date()

    // 3) Como foram as últimas gravações reais de CAPI (tabela capi_events).
    const { data: recent } = await supabase
      .from('capi_events')
      .select('created_at, event_name, pixel_id, success, http_status, error')
      .order('created_at', { ascending: false })
      .limit(10)

    const { count: fails24h } = await supabase
      .from('capi_events')
      .select('*', { count: 'exact', head: true })
      .eq('success', false)
      .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())

    const { count: ok24h } = await supabase
      .from('capi_events')
      .select('*', { count: 'exact', head: true })
      .eq('success', true)
      .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())

    const ok = tokenValid && !expired && allPixelsOk

    return json({
      ok,
      summary: ok
        ? 'Conversions API operacional: token válido e os dois pixels acessíveis.'
        : expired
          ? `Token da CAPI VENCIDO em ${expiresAt}. Nenhuma compra está sendo enviada pelo servidor — renove o META_CAPI_ACCESS_TOKEN.`
          : !tokenValid
            ? `Token da CAPI inválido: ${debug?.data?.error?.message || debug?.error?.message || 'a Meta recusou o token'}`
            : 'Token válido, mas algum pixel não está acessível com ele — ver "pixels" abaixo.',
      token: {
        present: true,
        valid: tokenValid,
        expired,
        expires_at: expiresAt,          // null = token permanente
        data_access_expires_at: dataAccessExpiresAt,
        app_id: info.app_id ?? null,
        scopes: info.scopes ?? null,
        error: info.error?.message ?? debug?.error?.message ?? null,
      },
      pixels,
      envio_real: {
        ultimas_24h_ok: ok24h ?? 0,
        ultimas_24h_falha: fails24h ?? 0,
        ultimos_registros: recent ?? [],
      },
    })
  } catch (err) {
    console.error(err)
    return json({ ok: false, error: (err as Error).message }, 500)
  }
})
