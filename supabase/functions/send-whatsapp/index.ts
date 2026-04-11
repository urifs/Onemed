import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

// ─── Phone normalization ───────────────────────────────────────────────────────
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null

  // Already has Brazil country code (55) + DDD (2) + number (8 or 9) = 12 or 13 digits
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits

  // Has DDD (2) + number (8 or 9) = 10 or 11 digits → prepend 55
  if (digits.length === 10 || digits.length === 11) return '55' + digits

  // International number with other country code (12–15 digits)
  if (digits.length >= 12 && digits.length <= 15) return digits

  return null
}

// ─── WhatsApp API ──────────────────────────────────────────────────────────────
async function sendWhatsAppTemplate(
  phoneNumberId: string,
  token: string,
  to: string,
  templateName: string,
  languageCode: string,
  bodyVariables: string[],
  headerVariable?: string,
): Promise<{ ok: boolean; error?: string }> {
  const components: Record<string, unknown>[] = []

  if (headerVariable) {
    components.push({
      type: 'header',
      parameters: [{ type: 'text', text: headerVariable }],
    })
  }

  if (bodyVariables.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyVariables.map(v => ({ type: 'text', text: v })),
    })
  }

  const body: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length > 0 ? { components } : {}),
    },
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      },
    )
    const data = await res.json()
    if (res.ok) return { ok: true }
    const msg = data?.error?.message || data?.error?.type || JSON.stringify(data)
    return { ok: false, error: msg }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  const corsHeaders = getCorsHeaders(req)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const whatsappToken = Deno.env.get('WHATSAPP_TOKEN')!
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!

    // ── Verificar autenticação e role admin ──────────────────────────────────
    const authHeader = req.headers.get('authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verificar JWT com Supabase Auth
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(jwt)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verificar role admin
    const { data: roleData } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Parse body ───────────────────────────────────────────────────────────
    const {
      audience,           // 'trial_expired' | 'trial_active' | 'buyers_approved' | 'buyers_all' | 'custom' | 'preview'
      custom_numbers,     // string[] — números avulsos
      template_name,      // string
      template_language,  // string (default: 'pt_BR')
      body_variables,     // string[]
      header_variable,    // string | undefined
    } = await req.json()

    if (!audience) {
      return new Response(JSON.stringify({ error: 'audience é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ── Buscar destinatários ─────────────────────────────────────────────────
    let rawNumbers: string[] = []

    if (audience === 'custom') {
      rawNumbers = (custom_numbers || []).filter(Boolean)
    } else {
      if (audience === 'trial_expired') {
        const { data } = await supabase
          .from('accesses')
          .select('whatsapp')
          .eq('access_type', 'trial')
          .eq('status', 'expired')
          .not('whatsapp', 'is', null)
        rawNumbers = (data || []).map((r: { whatsapp: string | null }) => r.whatsapp!).filter(Boolean)
      } else if (audience === 'trial_active') {
        const { data } = await supabase
          .from('accesses')
          .select('whatsapp')
          .eq('access_type', 'trial')
          .eq('status', 'active')
          .not('whatsapp', 'is', null)
        rawNumbers = (data || []).map((r: { whatsapp: string | null }) => r.whatsapp!).filter(Boolean)
      } else if (audience === 'buyers_approved') {
        const { data } = await supabase
          .from('buyers')
          .select('whatsapp')
          .eq('status', 'approved')
          .not('whatsapp', 'is', null)
        rawNumbers = (data || []).map((r: { whatsapp: string | null }) => r.whatsapp!).filter(Boolean)
      } else if (audience === 'buyers_all') {
        const { data } = await supabase
          .from('buyers')
          .select('whatsapp')
          .not('whatsapp', 'is', null)
        rawNumbers = (data || []).map((r: { whatsapp: string | null }) => r.whatsapp!).filter(Boolean)
      } else if (audience === 'all_with_whatsapp') {
        // Todos que têm WhatsApp cadastrado (accesses + buyers, sem duplicatas por número)
        const [{ data: accData }, { data: buyData }] = await Promise.all([
          supabase.from('accesses').select('whatsapp').not('whatsapp', 'is', null),
          supabase.from('buyers').select('whatsapp').not('whatsapp', 'is', null),
        ])
        const all = [
          ...(accData || []).map((r: { whatsapp: string | null }) => r.whatsapp!),
          ...(buyData || []).map((r: { whatsapp: string | null }) => r.whatsapp!),
        ].filter(Boolean)
        // Dedup por número normalizado
        const seen = new Set<string>()
        for (const n of all) {
          const norm = normalizePhone(n)
          if (norm) seen.add(norm)
        }
        rawNumbers = Array.from(seen)
      }
    }

    // Normalizar todos os números
    const normalized: string[] = []
    const invalidNumbers: string[] = []
    for (const raw of rawNumbers) {
      const n = normalizePhone(raw)
      if (n) normalized.push(n)
      else invalidNumbers.push(raw)
    }

    // Deduplicate
    const uniqueNumbers = [...new Set(normalized)]

    // ── Modo preview: apenas contar destinatários ────────────────────────────
    if (audience === 'preview' || !template_name) {
      return new Response(
        JSON.stringify({ preview: true, total: uniqueNumbers.length, invalid: invalidNumbers.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const lang = template_language || 'pt_BR'
    const vars: string[] = body_variables || []

    // ── Enviar mensagens ─────────────────────────────────────────────────────
    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const phone of uniqueNumbers) {
      const result = await sendWhatsAppTemplate(
        phoneNumberId,
        whatsappToken,
        phone,
        template_name,
        lang,
        vars,
        header_variable,
      )

      if (result.ok) {
        sent++
      } else {
        failed++
        errors.push(`${phone}: ${result.error}`)
        console.error(`WhatsApp send failed for ${phone}:`, result.error)
      }

      // Pequeno delay para não sobrecarregar a API (10 msg/s seguro)
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`send-whatsapp: sent=${sent}, failed=${failed}, invalid=${invalidNumbers.length}`)

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        total: uniqueNumbers.length,
        invalid: invalidNumbers.length,
        errors: errors.slice(0, 20), // limitar a 20 erros no response
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: unknown) {
    console.error('send-whatsapp error:', err)
    const message = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
