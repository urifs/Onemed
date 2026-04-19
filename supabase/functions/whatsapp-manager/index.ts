// Proxy admin para gerenciar a instância WhatsApp via Evolution API.
// Requer autenticação admin. Modos: get-config, save-config, get-status,
// create-instance, disconnect, get-messages.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://onemedcursos.com.br',
  'http://localhost:5173',
  'http://localhost:3000',
]

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  try {
    // Extrai user_id do JWT sem chamada extra ao Supabase Auth
    // (verify_jwt:true já valida a assinatura do token no runtime)
    const token = (req.headers.get('authorization') || '').replace('Bearer ', '')
    if (!token) return json(req, { error: 'Unauthorized' }, 401)

    let userId: string | null = null
    try {
      // JWT usa base64url — converter para base64 padrão antes do atob
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
      const payload = JSON.parse(atob(b64))
      userId = payload.sub ?? null
    } catch {
      return json(req, { error: 'Unauthorized' }, 401)
    }
    if (!userId) return json(req, { error: 'Unauthorized' }, 401)

    const { data: role } = await supabase
      .from('user_roles').select('role')
      .eq('user_id', userId).eq('role', 'admin').maybeSingle()
    if (!role) return json(req, { error: 'Forbidden' }, 403)

    const body = await req.json().catch(() => ({}))
    const { mode } = body

    // ── get-config ────────────────────────────────────────────────────────────
    if (mode === 'get-config') {
      const { data } = await supabase.from('whatsapp_config').select('*').maybeSingle()
      return json(req, { config: data })
    }

    // ── save-config ───────────────────────────────────────────────────────────
    if (mode === 'save-config') {
      const allowed = [
        'evolution_api_url', 'evolution_api_key', 'instance_name',
        'auto_reply_message', 'trigger_keyword',
      ]
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      for (const k of allowed) {
        if (body[k] !== undefined) patch[k] = body[k]
      }

      const { data: existing } = await supabase.from('whatsapp_config').select('id').maybeSingle()
      if (existing) {
        await supabase.from('whatsapp_config').update(patch).eq('id', existing.id)
      } else {
        await supabase.from('whatsapp_config').insert(patch)
      }
      return json(req, { success: true })
    }

    // ── get-status ────────────────────────────────────────────────────────────
    if (mode === 'get-status') {
      const { data: config } = await supabase.from('whatsapp_config').select('*').maybeSingle()
      if (!config?.evolution_api_url || !config?.evolution_api_key) {
        return json(req, { status: 'not_configured' })
      }

      const apiUrl = (config.evolution_api_url as string).replace(/\/$/, '')
      const inst = config.instance_name || 'onemed'
      const apiKey = config.evolution_api_key as string

      // Verifica estado da conexão
      const stateRes = await fetch(`${apiUrl}/instance/connectionState/${inst}`, {
        headers: { apikey: apiKey },
      }).catch(() => null)

      if (!stateRes || !stateRes.ok) {
        await supabase.from('whatsapp_config')
          .update({ connected: false, phone_number: null }).eq('id', config.id)
        return json(req, { status: 'disconnected' })
      }

      const stateData = await stateRes.json().catch(() => ({}))
      const state: string = stateData.instance?.state || stateData.state || ''

      if (state === 'open') {
        // Busca número do telefone conectado (best effort)
        let phone: string | null = null
        try {
          const infoRes = await fetch(`${apiUrl}/instance/fetchInstances?instanceName=${inst}`, {
            headers: { apikey: apiKey },
          })
          if (infoRes.ok) {
            const raw = await infoRes.json().catch(() => [])
            const arr = Array.isArray(raw) ? raw : [raw]
            const found = arr.find((i: any) =>
              i.instance?.instanceName === inst || i.instanceName === inst,
            )
            phone = found?.instance?.owner?.replace('@s.whatsapp.net', '') ||
              found?.owner?.replace('@s.whatsapp.net', '') || null
          }
        } catch { /* best effort */ }

        await supabase.from('whatsapp_config')
          .update({ connected: true, phone_number: phone }).eq('id', config.id)
        return json(req, { status: 'connected', phone })
      }

      // Não conectado — tenta obter QR Code
      let qrcode: string | null = null
      try {
        const qrRes = await fetch(`${apiUrl}/instance/connect/${inst}`, {
          headers: { apikey: apiKey },
        })
        if (qrRes.ok) {
          const qrData = await qrRes.json().catch(() => ({}))
          qrcode = qrData.base64 || qrData.qrcode?.base64 || null
        }
      } catch { /* best effort */ }

      await supabase.from('whatsapp_config')
        .update({ connected: false, phone_number: null }).eq('id', config.id)
      return json(req, { status: qrcode ? 'connecting' : 'disconnected', qrcode })
    }

    // ── create-instance ───────────────────────────────────────────────────────
    if (mode === 'create-instance') {
      const { data: config } = await supabase.from('whatsapp_config').select('*').maybeSingle()
      if (!config?.evolution_api_url || !config?.evolution_api_key) {
        return json(req, { error: 'Configure a URL e chave da Evolution API primeiro' }, 400)
      }

      const apiUrl = (config.evolution_api_url as string).replace(/\/$/, '')
      const inst = config.instance_name || 'onemed'
      const apiKey = config.evolution_api_key as string
      const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`

      const createRes = await fetch(`${apiUrl}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({
          instanceName: inst,
          integration: 'WHATSAPP-BAILEYS',
          qrcode: true,
          webhook: {
            url: webhookUrl,
            byEvents: true,
            base64: true,
            events: ['MESSAGES_UPSERT'],
          },
        }),
      })

      // 409 = instância já existe, continua normalmente
      if (!createRes.ok && createRes.status !== 409) {
        const err = await createRes.json().catch(() => ({}))
        return json(req, { error: (err as any).message || `Erro ${createRes.status} ao criar instância` }, 400)
      }

      // Obtém QR Code
      const qrRes = await fetch(`${apiUrl}/instance/connect/${inst}`, {
        headers: { apikey: apiKey },
      })
      const qrData = await qrRes.json().catch(() => ({}))
      const qrcode = qrData.base64 || qrData.qrcode?.base64 || null

      return json(req, { success: true, qrcode })
    }

    // ── disconnect ────────────────────────────────────────────────────────────
    if (mode === 'disconnect') {
      const { data: config } = await supabase.from('whatsapp_config').select('*').maybeSingle()
      if (!config?.evolution_api_url || !config?.evolution_api_key) {
        return json(req, { error: 'API não configurada' }, 400)
      }

      const apiUrl = (config.evolution_api_url as string).replace(/\/$/, '')
      const inst = config.instance_name || 'onemed'
      const apiKey = config.evolution_api_key as string

      // Logout mantém a instância mas desconecta o WhatsApp
      await fetch(`${apiUrl}/instance/logout/${inst}`, {
        method: 'DELETE',
        headers: { apikey: apiKey },
      }).catch(() => null)

      await supabase.from('whatsapp_config')
        .update({ connected: false, phone_number: null }).eq('id', config.id)
      return json(req, { success: true })
    }

    // ── get-messages ──────────────────────────────────────────────────────────
    if (mode === 'get-messages') {
      const { data } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(50)
      return json(req, { messages: data || [] })
    }

    return json(req, { error: 'Mode inválido' }, 400)
  } catch (err: any) {
    console.error('whatsapp-manager error:', err)
    return json(req, { error: err.message || 'Erro interno' }, 500)
  }
})
