// Preenche lessons.duration_seconds usando SÓ o metadado do Drive
// (videoMediaMetadata.durationMillis).
//
//   SUPABASE_MGMT_TOKEN=... SUPABASE_SECRET_KEY=... \
//     node scripts/preencher-duracoes.mjs --curso=<uuid> [--aplicar]
//
// ⚠️ Diferente da Edge Function admin-backfill-lesson-durations, este script
// NÃO tem fallback que lê bytes do arquivo: se o Drive não souber a duração,
// a aula fica sem e pronto. É de propósito — ler bytes consome a franquia de
// download DAQUELE arquivo, e um vídeo de 3 GB esgota a dele num único
// download, deixando a aula fora do ar para todos os alunos por ~24h.
const MGMT = 'https://api.supabase.com/v1/projects/jrrybiohwqabsdurqudc/database/query'
const SB = process.env.SUPABASE_URL || 'https://jrrybiohwqabsdurqudc.supabase.co'

const arg = (n) => (process.argv.find(a => a.startsWith(`--${n}=`)) || '').split('=')[1]
const COURSE = arg('curso')
const APLICAR = process.argv.includes('--aplicar')
if (!COURSE) {
  console.error('uso: node scripts/preencher-duracoes.mjs --curso=<uuid> [--aplicar]')
  process.exit(1)
}

const sql = async (query) => {
  const r = await fetch(MGMT, { method: 'POST', headers: { Authorization: `Bearer ${process.env.SUPABASE_MGMT_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
  const t = await r.text(); if (!r.ok) throw new Error(`${r.status}: ${t.slice(0, 300)}`)
  try { return JSON.parse(t) } catch { return [] }
}

const tk = await (await fetch(`${SB}/functions/v1/drive-access-token`, {
  headers: { Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}` },
})).json()
if (!tk.accessToken) { console.error('sem token do Drive'); process.exit(1) }

const alvos = await sql(`select id, title, drive_file_id from lessons
  where course_id='${COURSE}' and type='video'
    and coalesce(duration_seconds,0)=0 and drive_file_id is not null`)

let ok = 0, sem = 0, total = 0
for (const a of alvos) {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${a.drive_file_id}?fields=videoMediaMetadata&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${tk.accessToken}` },
  })
  const ms = Number((await r.json().catch(() => ({})))?.videoMediaMetadata?.durationMillis)
  if (!Number.isFinite(ms) || ms <= 0) { sem++; continue }
  const seg = Math.round(ms / 1000)
  total += seg; ok++
  if (APLICAR) await sql(`update lessons set duration_seconds=${seg}, duration_checked_at=now() where id='${a.id}'`)
}
console.log(`${APLICAR ? 'GRAVADO' : 'SIMULAÇÃO'} — ${ok}/${alvos.length} com duração | sem metadado: ${sem} | soma: ${(total / 3600).toFixed(1)}h`)
if (APLICAR && ok) {
  await sql(`select public.recalc_course_totals('${COURSE}')`)
  console.log('recalc_course_totals aplicado')
}
