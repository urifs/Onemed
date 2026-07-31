// ─────────────────────────────────────────────────────────────────────────────
// OneMed · admin-capi-backfill
//
// Reenvia para a Meta as compras aprovadas que nunca chegaram pela Conversions
// API. Existe por causa do apagão de 14/07/2026 a 31/07/2026: o
// META_CAPI_ACCESS_TOKEN venceu (erro 190) e o mp-webhook seguiu chamando a
// Graph API sem que ninguém visse a recusa — 17 dias de compras sem sinal
// server-side.
//
// A Meta só aceita evento com `event_time` de até 7 dias atrás; compra mais
// antiga que isso é perda definitiva e a função não tenta (nem finge que deu
// certo). Roda em modo simulação por padrão: só grava quando `apply: true`.
//
// A lógica de envio é uma cópia da do mp-webhook de propósito. Cada Edge
// Function deste projeto é publicada como um único index.ts (multipart), e um
// incidente anterior derrubou 7 funções ao mudar a forma de publicar — não
// vale arriscar um módulo compartilhado para poupar 100 linhas.
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

const CAPI_PIXEL_IDS = ['797374160058274', '2400702203708115']

const PLAN_CONTENT_NAMES: Record<string, string> = {
  monthly: 'Plano Mensal',
  annual: 'Plano Anual',
  lifetime: 'Plano Vitalício',
  lifetime_plus: 'Plano Vitalício Plus',
  lifetime_pro: 'Plano Vitalício Pro',
}

// A Meta descarta evento com mais de 7 dias.
const MAX_AGE_DAYS = 7

async function sha256hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.toLowerCase().trim())
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

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

    const body = await req.json().catch(() => ({}))
    const apply: boolean = body.apply === true

    const accessToken = Deno.env.get('META_CAPI_ACCESS_TOKEN')
    if (!accessToken) return json({ error: 'META_CAPI_ACCESS_TOKEN não configurado.' }, 400)

    // Antes de tocar em qualquer coisa: o token funciona? Sem isso o backfill
    // só transformaria 40 compras perdidas em 40 falhas registradas.
    const check = await fetch(
      `https://graph.facebook.com/v19.0/${CAPI_PIXEL_IDS[0]}?fields=id&access_token=${encodeURIComponent(accessToken)}`,
    )
    if (!check.ok) {
      const err = await check.json().catch(() => ({}))
      return json({
        error: 'Token da CAPI inválido — renove antes de reenviar.',
        meta_error: err?.error?.message ?? null,
        meta_error_code: err?.error?.code ?? null,
      }, 400)
    }

    const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 3600 * 1000)

    const { data: buyers, error: buyersErr } = await supabase
      .from('buyers')
      .select('id, email, name, whatsapp, plan, amount, payment_id, fbp, fbc, fbclid, client_ip, client_user_agent, updated_at')
      .eq('status', 'approved')
      .not('payment_id', 'is', null)
      .gte('updated_at', cutoff.toISOString())
      .order('updated_at', { ascending: true })

    if (buyersErr) throw new Error(buyersErr.message)

    // Quem já teve entrega confirmada não é reenviado — o event_id é o mesmo,
    // então a Meta deduplicaria, mas gastar chamada à toa não ajuda ninguém.
    const { data: sent } = await supabase
      .from('capi_events')
      .select('event_id')
      .eq('success', true)
      .eq('event_name', 'Purchase')
    const alreadySent = new Set((sent ?? []).map((r: { event_id: string }) => r.event_id))

    const pending = (buyers ?? []).filter(b => !alreadySent.has(`purchase_${b.payment_id}`))

    if (!apply) {
      return json({
        modo: 'simulação',
        janela_dias: MAX_AGE_DAYS,
        vendas_na_janela: buyers?.length ?? 0,
        ja_entregues: (buyers?.length ?? 0) - pending.length,
        a_reenviar: pending.length,
        valor_total: pending.reduce((acc, b) => acc + Number(b.amount ?? 0), 0),
        amostra: pending.slice(0, 10).map(b => ({ email: b.email, plano: b.plan, valor: b.amount, quando: b.updated_at })),
        aviso: 'Nada foi enviado. Repita com {"apply": true} para reenviar de verdade.',
      })
    }

    let ok = 0, failed = 0
    const errors: string[] = []

    for (const b of pending) {
      const eventId = `purchase_${b.payment_id}`
      const userData: Record<string, string> = { em: await sha256hex(b.email) }

      if (b.whatsapp) {
        const digits = String(b.whatsapp).replace(/\D/g, '')
        if (digits.length >= 8) userData.ph = await sha256hex(digits)
      }
      if (b.name) {
        const parts = String(b.name).trim().split(/\s+/)
        if (parts[0]) userData.fn = await sha256hex(parts[0])
        if (parts.length > 1) userData.ln = await sha256hex(parts[parts.length - 1])
      }
      const fbc = b.fbc || (b.fbclid ? `fb.1.${Math.floor(new Date(b.updated_at).getTime() / 1000)}.${b.fbclid}` : undefined)
      if (b.fbp) userData.fbp = b.fbp
      if (fbc) userData.fbc = fbc
      if (b.client_ip) userData.client_ip_address = b.client_ip
      if (b.client_user_agent) userData.client_user_agent = b.client_user_agent

      // Hora real da aprovação, não "agora": senão a Meta atribui a venda ao
      // dia do reenvio e o relatório de campanha fica torto.
      const eventTime = Math.floor(new Date(b.updated_at).getTime() / 1000)

      const payload = {
        data: [{
          event_name: 'Purchase',
          event_time: eventTime,
          event_id: eventId,
          action_source: 'website',
          event_source_url: 'https://onemedcursos.com.br/payment/success',
          user_data: userData,
          custom_data: {
            value: Number(b.amount ?? 0),
            currency: 'BRL',
            content_name: PLAN_CONTENT_NAMES[b.plan] || 'Plano Anual',
            content_category: 'Subscription',
            content_ids: [b.plan],
            content_type: 'product',
            num_items: 1,
            order_id: String(b.payment_id),
          },
        }],
      }

      for (const pixelId of CAPI_PIXEL_IDS) {
        try {
          const res = await fetch(
            `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
          )
          const respJson = await res.json().catch(() => ({}))
          if (res.ok) ok++
          else {
            failed++
            const msg = `${b.email} / ${pixelId}: ${respJson?.error?.message ?? res.status}`
            if (errors.length < 10) errors.push(msg)
          }
          await supabase.from('capi_events').insert({
            event_name: 'Purchase', event_id: eventId, pixel_id: pixelId, buyer_id: b.id,
            email: b.email, value: Number(b.amount ?? 0), success: res.ok,
            http_status: res.status, events_received: respJson?.events_received ?? null,
            match_keys: Object.keys(userData),
            error: res.ok ? null : String(respJson?.error?.message ?? '').slice(0, 500),
          })
        } catch (err) {
          failed++
          if (errors.length < 10) errors.push(`${b.email} / ${pixelId}: ${(err as Error).message}`)
        }
      }
    }

    return json({
      modo: 'aplicado',
      janela_dias: MAX_AGE_DAYS,
      compras_reenviadas: pending.length,
      envios_ok: ok,
      envios_com_falha: failed,
      erros: errors,
    })
  } catch (err) {
    console.error(err)
    return json({ error: (err as Error).message }, 500)
  }
})
