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
  return data.access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date().toISOString()

    // Step 1: Mark expired accesses WITHOUT permission_id as expired immediately
    const { data: expiredWithoutPerm } = await supabase
      .from('accesses')
      .update({ status: 'expired' })
      .eq('access_type', 'trial')
      .eq('status', 'active')
      .is('drive_permission_id', null)
      .lte('expires_at', now)
      .select('id, email')

    const markedExpired = expiredWithoutPerm?.length || 0
    if (markedExpired > 0) {
      console.log(`Marked ${markedExpired} accesses as expired (no Drive permission)`)
    }

    // Step 2: Find expired accesses WITH permission_id (need Drive revocation)
    const { data: expiredAccesses, error: fetchErr } = await supabase
      .from('accesses')
      .select('id, email, drive_permission_id, drive_folder_id, expires_at')
      .eq('access_type', 'trial')
      .eq('status', 'active')
      .not('drive_permission_id', 'is', null)
      .lte('expires_at', now)

    if (fetchErr) throw fetchErr

    if (!expiredAccesses || expiredAccesses.length === 0) {
      return new Response(JSON.stringify({ revoked: 0, markedExpired }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get drive config for token
    const { data: config, error: configErr } = await supabase
      .from('drive_config')
      .select('*')
      .single()

    if (configErr || !config?.connected) {
      // Drive not connected — just mark them as expired without revoking
      const ids = expiredAccesses.map(a => a.id)
      for (const id of ids) {
        await supabase.from('accesses').update({ status: 'expired', drive_permission_id: null }).eq('id', id)
      }
      return new Response(JSON.stringify({ revoked: 0, markedExpired: markedExpired + ids.length, note: 'Drive não conectado, acesso expirado sem revogar permissão' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let accessToken = config.access_token
    const expiry = config.token_expiry ? new Date(config.token_expiry) : null
    if (!expiry || expiry < new Date()) {
      if (!config.refresh_token) {
        // Token expired, just mark as expired
        for (const access of expiredAccesses) {
          await supabase.from('accesses').update({ status: 'expired', drive_permission_id: null }).eq('id', access.id)
        }
        return new Response(JSON.stringify({ revoked: 0, markedExpired: markedExpired + expiredAccesses.length, note: 'Token expirado, acesso expirado sem revogar permissão' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      accessToken = await refreshAccessToken(config.refresh_token, GOOGLE_CLIENT_SECRET)
      await supabase.from('drive_config').update({
        access_token: accessToken,
        token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      }).eq('id', config.id)
    }

    let revoked = 0
    const errors: string[] = []

    for (const access of expiredAccesses) {
      try {
        const folderId = access.drive_folder_id || config.folder_id

        // Mark as expired first (avoid retrying on errors)
        await supabase.from('accesses').update({
          status: 'expired',
          drive_permission_id: null,
        }).eq('id', access.id)

        if (!folderId || !access.drive_permission_id) {
          revoked++
          continue
        }

        // Revoke permission from Google Drive
        const revokeRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${folderId}/permissions/${access.drive_permission_id}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` },
          }
        )

        if (revokeRes.ok || revokeRes.status === 404) {
          revoked++
          console.log(`Revoked Drive access for ${access.email}`)
        } else {
          const errBody = await revokeRes.json().catch(() => ({}))
          console.warn(`Failed to revoke Drive for ${access.email}: ${errBody?.error?.message || revokeRes.status}`)
          errors.push(`${access.email}: ${errBody?.error?.message || revokeRes.status}`)
        }
      } catch (e: any) {
        errors.push(`${access.email}: ${e.message}`)
      }
    }

    return new Response(JSON.stringify({ revoked, markedExpired, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
