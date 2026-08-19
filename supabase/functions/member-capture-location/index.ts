// ─────────────────────────────────────────────────────────────────────────────
// OneMed · member-capture-location
// Geolocaliza o IP do chamador e grava/atualiza member_locations — chamado
// pelo frontend uma vez por sessão de membro (useMemberPresence em
// MemberHeader.tsx), não só no login. Isso cobre quem já estava logado
// antes desta feature existir e cuja sessão nunca mais passa por
// member-auth-request/create-trial-access (o refresh token dela já foi
// emitido há muito tempo) — sem isso, esses usuários nunca apareceriam no
// mapa de localização do dashboard admin, mesmo estando online.
// Melhor esforço: nunca retorna erro que quebre a experiência do membro.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    if (!jwt) return jsonResponse(req, { error: 'Não autenticado' }, 401)
    const { data: userData } = await supabase.auth.getUser(jwt)
    if (!userData?.user) return jsonResponse(req, { error: 'Sessão inválida' }, 401)
    const user = userData.user
    const email = (user.email || '').toLowerCase()

    // Regra deste projeto (forense de 15/08): o IP do cliente é o
    // `cf-connecting-ip` — a Cloudflare está na frente e ele não é forjável.
    // O XFF esquerdo é escolhido pelo próprio cliente (qualquer um manda o IP
    // que quiser) e o `x-real-ip` chega null aqui.
    const ip = req.headers.get('cf-connecting-ip')
      || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
      || ''
    if (!ip) return jsonResponse(req, { skipped: true })

    const geoRes = await fetch(`https://ipwho.is/${ip}`, { signal: AbortSignal.timeout(3000) })
    if (!geoRes.ok) return jsonResponse(req, { skipped: true })
    const geo = await geoRes.json()
    if (!geo.success || geo.latitude == null || geo.longitude == null) return jsonResponse(req, { skipped: true })

    await supabase.from('member_locations').upsert({
      user_id: user.id,
      email,
      ip,
      city: geo.city || null,
      region: geo.region || null,
      country: geo.country || null,
      country_code: geo.country_code || null,
      latitude: geo.latitude,
      longitude: geo.longitude,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    return jsonResponse(req, { success: true })
  } catch (err: any) {
    console.error(err)
    return jsonResponse(req, { skipped: true })
  }
})
