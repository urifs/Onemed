// Webhook receptor para Evolution API.
// Chamado pelo servidor Evolution API quando uma mensagem chega no WhatsApp Business.
// Verifica a palavra-chave configurada e envia a resposta automática.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const body = await req.json().catch(() => null)
    if (!body) return new Response('ok', { status: 200 })

    // Evolution API envia event como 'messages.upsert' ou 'MESSAGES_UPSERT'
    const event: string = body.event || ''
    if (!event.toLowerCase().includes('messages') || !event.toLowerCase().includes('upsert')) {
      return new Response('ok', { status: 200 })
    }

    const msgData = body.data
    if (!msgData) return new Response('ok', { status: 200 })

    // Ignora mensagens enviadas por nós
    if (msgData.key?.fromMe === true) return new Response('ok', { status: 200 })

    const remoteJid: string = msgData.key?.remoteJid || ''

    // Ignora grupos e broadcasts
    if (remoteJid.endsWith('@g.us') || remoteJid.endsWith('@broadcast')) {
      return new Response('ok', { status: 200 })
    }

    // Extrai texto da mensagem (suporta os formatos mais comuns)
    const msg = msgData.message || {}
    const text = (
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.imageMessage?.caption ||
      msg.videoMessage?.caption ||
      msg.documentMessage?.caption ||
      ''
    ).trim()

    const messageId: string | null = msgData.key?.id || null
    const phone = remoteJid.replace('@s.whatsapp.net', '')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    // Busca configuração PRIMEIRO — a validação de apikey depende dela, e assim
    // um flood sem apikey válido custa só 1 SELECT (o de dedup passa a rodar
    // depois da autenticação, não antes). BAIXO-14.
    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('*')
      .maybeSingle()

    if (!config?.evolution_api_url || !config?.evolution_api_key) {
      return new Response('ok', { status: 200 })
    }

    // Valida que o webhook veio da instância correta
    const webhookInstance = body.instance || body.instanceName || ''
    if (webhookInstance && config.instance_name && webhookInstance !== config.instance_name) {
      return new Response('ok', { status: 200 })
    }

    // Valida apikey ANTES de qualquer outro trabalho de banco. EXIGE o apikey:
    // antes, omitir o campo pulava a checagem e um estranho dirigia a instância
    // pra mandar auto-reply pra números arbitrários. Ausente = inválido.
    // (200 pra não servir de sonda.)
    if (body.apikey !== config.evolution_api_key) {
      return new Response('ok', { status: 200 })
    }

    // Deduplicação por message_id — só depois de a autenticação passar.
    if (messageId) {
      const { data: dup } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('message_id', messageId)
        .maybeSingle()
      if (dup) return new Response('ok', { status: 200 })
    }

    const keyword = (config.trigger_keyword || 'Tenho interesse').toLowerCase().trim()
    const matched = text.toLowerCase().includes(keyword)

    let replied = false
    let replyText: string | null = null
    let errorMsg: string | null = null

    // Verifica se esse contato já recebeu resposta automática antes (anti-duplicidade)
    if (matched && config.auto_reply_message) {
      const { data: alreadyReplied } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('remote_jid', remoteJid)
        .eq('replied', true)
        .limit(1)
        .maybeSingle()

      if (alreadyReplied) {
        // Contato já respondido — loga a mensagem mas não responde
        await supabase.from('whatsapp_messages').insert({
          message_id: messageId,
          remote_jid: remoteJid,
          phone_number: phone,
          message_text: text,
          replied: false,
          reply_text: null,
          error: null,
        })
        return new Response('ok', { status: 200 })
      }
    }

    if (matched && config.auto_reply_message) {
      const apiUrl = (config.evolution_api_url as string).replace(/\/$/, '')
      const inst = config.instance_name || 'onemed'

      try {
        const sendRes = await fetch(`${apiUrl}/message/sendText/${inst}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.evolution_api_key as string,
          },
          body: JSON.stringify({
            number: remoteJid,
            text: config.auto_reply_message,
          }),
        })

        if (sendRes.ok) {
          replied = true
          replyText = config.auto_reply_message as string
        } else {
          const errData = await sendRes.json().catch(() => ({}))
          errorMsg = JSON.stringify(errData)
        }
      } catch (e: any) {
        errorMsg = e.message || 'Erro ao enviar resposta'
      }
    }

    await supabase.from('whatsapp_messages').insert({
      message_id: messageId,
      remote_jid: remoteJid,
      phone_number: phone,
      message_text: text,
      replied,
      reply_text: replyText,
      error: errorMsg,
    })

    return new Response('ok', { status: 200 })
  } catch (err: any) {
    console.error('whatsapp-webhook error:', err)
    return new Response('ok', { status: 200 })
  }
})
