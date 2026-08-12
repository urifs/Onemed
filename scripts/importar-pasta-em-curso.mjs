// Importa para um curso existente os arquivos de uma pasta do Drive que ainda
// NÃO estão na plataforma. Feito para o caso "o dono subiu mais conteúdo na
// mesma pasta" — roda quantas vezes precisar, sempre importando só a diferença.
//
//   node scripts/varrer-pasta-drive.mjs <folderId> arvore.json
//   SUPABASE_MGMT_TOKEN=... node scripts/importar-pasta-em-curso.mjs \
//     --curso=<uuid> --arvore=arvore.json [--maiuscula-topo] [--aplicar]
//
// Simulação por padrão: sem --aplicar não grava nada, só lista o que entraria.
//
// Espelha as convenções do member-sync-library (type, path, depth,
// parent_module_id, drive_path, last_seen_at). A numeração final de módulos e
// aulas quem define é o recalc_course_totals, que reordena por
// natural_key(path) — os sort_order daqui são só um lugar na fila.
const MGMT = 'https://api.supabase.com/v1/projects/jrrybiohwqabsdurqudc/database/query'
const T = process.env.SUPABASE_MGMT_TOKEN

const arg = (nome) => (process.argv.find(a => a.startsWith(`--${nome}=`)) || '').split('=')[1]
const COURSE = arg('curso')
const ARVORE = arg('arvore')
const APLICAR = process.argv.includes('--aplicar')
// "Semana 11" → "SEMANA 11": no MEDCURSO as semanas 1-10 já estavam em caixa
// alta, e sem isso a semana nova viraria um módulo separado com outro nome.
const MAIUSCULA_TOPO = process.argv.includes('--maiuscula-topo')

if (!COURSE || !ARVORE) {
  console.error('uso: node scripts/importar-pasta-em-curso.mjs --curso=<uuid> --arvore=<arquivo.json> [--maiuscula-topo] [--aplicar]')
  process.exit(1)
}

const fs = await import('node:fs')
const sql = async (query) => {
  const r = await fetch(MGMT, { method: 'POST', headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
  const t = await r.text()
  if (!r.ok) throw new Error(`${r.status}: ${t.slice(0, 400)}`)
  try { return JSON.parse(t) } catch { return [] }
}
const esc = (s) => String(s).replace(/'/g, "''")

function lessonType(mime, nome) {
  const n = (nome || '').toLowerCase(), m = mime || ''
  if (m.startsWith('video/') || /\.(mp4|mkv|avi|mov|ts|wmv)$/.test(n)) return 'video'
  if (m === 'application/pdf' || n.endsWith('.pdf')) return 'pdf'
  if (m.includes('word') || /\.(doc|docx)$/.test(n)) return 'doc'
  if (m.includes('spreadsheet') || /\.(xls|xlsx)$/.test(n)) return 'sheet'
  if (m === 'text/plain' || n.endsWith('.txt')) return 'txt'
  if (m.startsWith('audio/') || /\.(mp3|wav|ogg)$/.test(n)) return 'audio'
  if (m.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/.test(n)) return 'image'
  return 'other'
}

const tree = JSON.parse(fs.readFileSync(ARVORE, 'utf8'))
const pastas = tree.filter(a => a.tipo === 'pasta')

const jaTem = new Set((await sql(`select drive_file_id from lessons where course_id='${COURSE}' and drive_file_id is not null`)).map(r => r.drive_file_id))
const norm = (s) => s.toLowerCase().replace(/\.[a-z0-9]{2,5}$/, '').replace(/[^a-z0-9]/g, '')
const nomesExistentes = new Set((await sql(`select title from lessons where course_id='${COURSE}'`)).map(r => norm(r.title)))

// Três armadilhas já conhecidas desta biblioteca, todas silenciosas:
//  .gdrive → ponteiro de 168 B deixado por ferramenta de backup, não é mídia
//  .html   → removidos da biblioteca pela migration 20260719200000
//  55855 B → stub SVG com nome de .mp4 que aparecia como aula quebrada
const descartado = (a) =>
  a.nome.toLowerCase().endsWith('.gdrive')
  || a.nome.toLowerCase().endsWith('.html')
  || a.size === 55855

const topo = (p) => (MAIUSCULA_TOPO ? p.replace(/^([^/]+)/, (s) => s.toUpperCase()) : p)

const descartados = tree.filter(a => a.tipo === 'arquivo' && descartado(a))
const arquivos = tree
  .filter(a => a.tipo === 'arquivo' && !jaTem.has(a.id) && !descartado(a) && !nomesExistentes.has(norm(a.nome)))
  .sort((x, y) => topo(x.caminho).localeCompare(topo(y.caminho), 'pt-BR', { numeric: true }))

const [{ max_mod }] = await sql(`select coalesce(max(sort_order),0)+1 as max_mod from course_modules where course_id='${COURSE}'`)
const [{ max_aula }] = await sql(`select coalesce(max(sort_order),0)+1 as max_aula from lessons where course_id='${COURSE}'`)
let proximoModSort = Number(max_mod)
let proximaAulaSort = Number(max_aula)

const modCache = new Map()
const criados = { modulos: [], aulas: 0 }

async function garantirModulo(caminhoDrive) {
  const partes = caminhoDrive.split('/')
  let acumulado = '', paiId = null, depth = 0
  for (const parte of partes) {
    depth++
    const titulo = depth === 1 ? topo(parte) : parte
    acumulado = acumulado ? `${acumulado}/${titulo}` : titulo
    if (modCache.has(acumulado)) { paiId = modCache.get(acumulado); continue }
    const existente = await sql(`select id from course_modules where course_id='${COURSE}' and path='${esc(acumulado)}' limit 1`)
    if (existente.length) { paiId = existente[0].id; modCache.set(acumulado, paiId); continue }
    // Casa a pasta pelo caminho ORIGINAL do Drive (antes do upper do topo).
    const folder = pastas.find(p => topo(p.caminho) === acumulado)
    const so = proximoModSort++
    if (!APLICAR) {
      modCache.set(acumulado, `dry-${acumulado}`); paiId = modCache.get(acumulado)
      criados.modulos.push(`${acumulado} (depth ${depth})`); continue
    }
    const ins = await sql(`insert into course_modules (course_id, drive_folder_id, title, sort_order, parent_module_id, depth, path)
      values ('${COURSE}', ${folder ? `'${folder.id}'` : 'null'}, '${esc(titulo)}', ${so}, ${paiId ? `'${paiId}'` : 'null'}, ${depth}, '${esc(acumulado)}') returning id`)
    paiId = ins[0].id; modCache.set(acumulado, paiId)
    criados.modulos.push(`${acumulado} (depth ${depth})`)
  }
  return paiId
}

for (const a of arquivos) {
  const modId = await garantirModulo(a.caminho.split('/').slice(0, -1).join('/'))
  const so = proximaAulaSort++
  if (!APLICAR) { criados.aulas++; continue }
  await sql(`insert into lessons (course_id, module_id, drive_file_id, title, type, mime_type, size_bytes, sort_order, drive_path, last_seen_at)
    values ('${COURSE}', '${modId}', '${a.id}', '${esc(a.nome)}', '${lessonType(a.mime, a.nome)}', '${esc(a.mime)}', ${a.size || 'null'}, ${so}, '${esc(topo(a.caminho))}', now())`)
  criados.aulas++
}

console.log(APLICAR ? '── IMPORTADO ──' : '── SIMULAÇÃO (use --aplicar para gravar) ──')
console.log(`descartados (ponteiro/stub/html): ${descartados.length}`)
console.log(`módulos criados: ${criados.modulos.length}`)
for (const m of criados.modulos) console.log(`   + ${m}`)
console.log(`aulas criadas: ${criados.aulas}`)
if (APLICAR) {
  await sql(`select public.recalc_course_totals('${COURSE}')`)
  const [t] = await sql(`select lesson_count, round(total_size_bytes/1e9::numeric,1) gb from courses where id='${COURSE}'`)
  console.log(`recalc_course_totals aplicado → ${t.lesson_count} aulas, ${t.gb} GB`)
}
