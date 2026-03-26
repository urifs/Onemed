import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_CLIENT_ID = '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com'

async function refreshAccessToken(refreshToken: string, clientSecret: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`)
  }
  return data.access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Proteção: apenas chamadas com service role key (internas) ou JWT de admin
    const authHeader = req.headers.get('Authorization') || ''
    let isAuthorized = false

    if (!authHeader) {
      // Chamadas internas sem header (supabase.functions.invoke sem auth explícito)
      isAuthorized = true
    } else if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')

      // Decodifica o payload JWT para checar o role (sem verificar assinatura)
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
        if (payload.role === 'service_role') {
          // Chamada interna com service role key
          isAuthorized = true
        } else if (payload.sub || payload.email) {
          // JWT de usuário — verificar se é admin
          const { data: { user }, error } = await supabase.auth.getUser(token)
          if (!error && user) {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)
              .eq('role', 'admin')
              .maybeSingle()
            if (roleData) isAuthorized = true
          }
        }
      } catch {
        // JWT inválido — não autorizado
      }
    }

    if (!isAuthorized) {
      console.error('drive-share-folder: chamada não autorizada rejeitada')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { email, accessId } = await req.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get drive config
    const { data: config, error } = await supabase.from('drive_config').select('*').single()
    if (error || !config?.connected) {
      return new Response(JSON.stringify({ error: 'Google Drive não conectado' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let accessToken = config.access_token
    const expiry = config.token_expiry ? new Date(config.token_expiry) : null

    // Refresh token if expired
    if (!expiry || expiry < new Date()) {
      if (!config.refresh_token) {
        return new Response(JSON.stringify({ error: 'Token expirado. Reconecte o Google Drive.' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      accessToken = await refreshAccessToken(config.refresh_token, GOOGLE_CLIENT_SECRET)
      await supabase.from('drive_config').update({
        access_token: accessToken,
        token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      }).eq('id', config.id)
    }

    const folderId = config.folder_id
    if (!folderId) {
      return new Response(JSON.stringify({ error: 'Nenhuma pasta configurada' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Share folder with user
    const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'user',
        emailAddress: email,
        sendNotificationEmail: false,
      }),
    })

    if (!permRes.ok) {
      const err = await permRes.json()
      console.error('Drive share error:', err)
      return new Response(JSON.stringify({ error: err.error?.message || 'Erro ao compartilhar' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const perm = await permRes.json()

    // Update access record with permission ID for later revocation
    if (accessId) {
      await supabase.from('accesses').update({
        drive_folder_id: folderId,
        drive_folder_name: config.folder_name,
        drive_permission_id: perm.id,
        status: 'active',
      }).eq('id', accessId)
    }

    return new Response(JSON.stringify({ success: true, permissionId: perm.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
