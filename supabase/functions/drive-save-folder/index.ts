import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000']
const GOOGLE_CLIENT_ID = '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com'

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

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
  if (!res.ok || !data.access_token) throw new Error('Falha ao renovar token Google')
  return data.access_token as string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Só admin: isto grava a pasta-raiz que a sync varre e que o
    // drive-share-folder compartilha — o verify_jwt padrão só exige um JWT
    // válido, então qualquer conta de trial passava sem esta checagem.
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(jwt)
    const { data: roleData } = user
      ? await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      : { data: null }
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Apenas administradores' }), {
        status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const { folder_id, target } = await req.json()
    const trimmedId = folder_id?.trim()
    // 'backup' salva a pasta de backup exclusivo (planos Vitalício Plus/Pro)
    // em vez da pasta principal de streaming das aulas.
    const isBackup = target === 'backup'

    if (!trimmedId) {
      return new Response(JSON.stringify({ error: 'folder_id é obrigatório' }), {
        status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }

    const { data: existing } = await supabase.from('drive_config').select('*').maybeSingle()

    let folderName = trimmedId
    let accessToken: string | null = existing?.access_token ?? null
    if (existing?.refresh_token) {
      const expiry = existing.token_expiry ? new Date(existing.token_expiry) : null
      if (!accessToken || !expiry || expiry < new Date()) {
        const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
        accessToken = await refreshAccessToken(existing.refresh_token, GOOGLE_CLIENT_SECRET)
        await supabase.from('drive_config').update({
          access_token: accessToken,
          token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
        }).eq('id', existing.id)
      }

      try {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${trimmedId}?fields=id,name`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        if (res.ok) {
          const meta = await res.json()
          if (meta?.name) folderName = meta.name
        }
      } catch (e) {
        console.warn('Falha ao buscar nome da pasta no Drive:', e)
      }
    }

    if (existing) {
      await supabase.from('drive_config').update(
        isBackup
          ? { backup_folder_id: trimmedId, backup_folder_name: folderName }
          : { folder_id: trimmedId, folder_name: folderName }
      ).eq('id', existing.id)
    } else {
      await supabase.from('drive_config').insert(
        isBackup
          ? { backup_folder_id: trimmedId, backup_folder_name: folderName, connected: false }
          : { folder_id: trimmedId, folder_name: folderName, connected: false }
      )
    }

    return new Response(JSON.stringify({ success: true, folder_name: folderName }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
})
