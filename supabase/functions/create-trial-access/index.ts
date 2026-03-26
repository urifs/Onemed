import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://onemedcursos.com.br',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TRIAL_DURATION_MINUTES = 30

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { email, whatsapp } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Block if email already purchased
    const { data: buyer } = await supabase
      .from('buyers')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('status', 'approved')
      .maybeSingle()

    if (buyer) {
      return new Response(JSON.stringify({ error: 'Este email já possui acesso completo ao OneMed. Acesse pelo link enviado no seu email.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if email already had a trial
    const { data: existing } = await supabase
      .from('accesses')
      .select('id, status, expires_at')
      .eq('email', normalizedEmail)
      .eq('access_type', 'trial')
      .maybeSingle()

    if (existing) {
      if (existing.status === 'active') {
        const expiresAt = new Date(existing.expires_at)
        const now = new Date()
        const diffMs = expiresAt.getTime() - now.getTime()
        if (diffMs > 0) {
          const minutesRemaining = Math.floor(diffMs / 60000)
          const secondsRemaining = Math.floor((diffMs % 60000) / 1000)
          return new Response(JSON.stringify({
            alreadyActive: true,
            minutesRemaining,
            secondsRemaining,
            email: normalizedEmail
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }
      // Trial expirado ou outro status — bloqueia nova tentativa
      return new Response(JSON.stringify({ error: 'Este email já utilizou o período de teste gratuito. Para continuar com acesso ilimitado, adquira um plano.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get drive config
    const { data: driveConfig } = await supabase
      .from('drive_config')
      .select('folder_id, folder_name, connected')
      .maybeSingle()

    // Create trial access
    const newAccessId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + TRIAL_DURATION_MINUTES * 60 * 1000).toISOString()

    const { error: insertError } = await supabase.from('accesses').insert({
      id: newAccessId,
      email: normalizedEmail,
      whatsapp: whatsapp || null,
      access_type: 'trial',
      status: 'active',
      expires_at: expiresAt,
      drive_folder_id: driveConfig?.folder_id || null,
      drive_folder_name: driveConfig?.folder_name || null,
    })

    if (insertError) throw insertError

    // Track visit (fire and forget)
    supabase.from('visits').insert({ page: 'trial', user_agent: '' }).then(() => {}).catch(() => {})

    // If Drive is configured, sharing must succeed before returning success
    if (driveConfig?.connected && driveConfig?.folder_id) {
      let driveResult: any
      try {
        driveResult = await supabase.functions.invoke('drive-share-folder', {
          body: { email: normalizedEmail, accessId: newAccessId },
        })
      } catch (e: any) {
        await supabase.from('accesses').delete().eq('id', newAccessId)
        console.error('Drive share invoke failed:', e?.message)
        return new Response(JSON.stringify({ error: 'Erro ao conectar com o Google Drive. Tente novamente.' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (driveResult.error) {
        await supabase.from('accesses').delete().eq('id', newAccessId)
        console.error('Drive share failed:', JSON.stringify(driveResult.error))
        return new Response(JSON.stringify({
          error: 'Use um email Gmail para acessar o trial. Se já usa Gmail, tente novamente.',
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      console.log('Drive shared for:', normalizedEmail)
    }

    // Send email (fire and forget — don't block the response)
    supabase.functions.invoke('send-access-email', {
      body: {
        to: normalizedEmail,
        type: 'trial_access',
        folderId: driveConfig?.folder_id || null,
        folderName: driveConfig?.folder_name || null,
      },
    }).then((res) => {
      if (res.error) console.warn('Trial email error:', JSON.stringify(res.error))
    }).catch((e: any) => console.warn('Trial email failed:', e))

    return new Response(JSON.stringify({
      success: true,
      accessId: newAccessId,
      email: normalizedEmail,
      minutesRemaining: TRIAL_DURATION_MINUTES,
      secondsRemaining: 0,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error('create-trial-access error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
