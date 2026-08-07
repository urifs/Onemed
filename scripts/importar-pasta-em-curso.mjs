import fs from 'node:fs';
const MGMT = 'https://api.supabase.com/v1/projects/jrrybiohwqabsdurqudc/database/query';
const T = process.env.SUPABASE_MGMT_TOKEN;
const APLICAR = process.argv.includes('--aplicar');
const COURSE = '873557af-e319-4e58-a147-0dc9e0c1df3e';
const SEMANA6_ID = '4130779b-d132-4cd0-9334-37f28ad6a761';

const sql = async (query) => {
  const r = await fetch(MGMT, { method: 'POST', headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status}: ${t.slice(0, 400)}`);
  try { return JSON.parse(t); } catch { return []; }
};
const esc = (s) => String(s).replace(/'/g, "''");

function lessonType(mime, nome) {
  const n = (nome || '').toLowerCase(), m = mime || '';
  if (m.startsWith('video/') || /\.(mp4|mkv|avi|mov|ts|wmv)$/.test(n)) return 'video';
  if (m === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (m.includes('word') || /\.(doc|docx)$/.test(n)) return 'doc';
  if (m.includes('spreadsheet') || /\.(xls|xlsx)$/.test(n)) return 'sheet';
  if (m === 'text/plain' || n.endsWith('.txt')) return 'txt';
  if (m.startsWith('audio/') || /\.(mp3|wav|ogg)$/.test(n)) return 'audio';
  if (m.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/.test(n)) return 'image';
  return 'other';
}

const tree = JSON.parse(fs.readFileSync('medcurso_novo.json', 'utf8'));
const jaTem = new Set((await sql(`select drive_file_id from lessons where course_id='${COURSE}' and drive_file_id is not null`)).map(r => r.drive_file_id));
// nomes já existentes no curso, normalizados — evita duplicar a mesma aula que
// já veio da pasta antiga com prefixo diferente ("PED1-AULA X" vs "AULA X").
const norm = (s) => s.toLowerCase().replace(/\.[a-z0-9]{2,5}$/, '').replace(/[^a-z0-9]/g, '');
const nomesExistentes = new Set((await sql(`select title from lessons where course_id='${COURSE}'`)).map(r => norm(r.title)));

const arquivos = tree.filter(a => a.tipo === 'arquivo' && !jaTem.has(a.id));
const pastas = tree.filter(a => a.tipo === 'pasta');

// "Semana 8" → "SEMANA 8" (padrão das semanas 1-6 já existentes)
const topo = (p) => p.replace(/^Semana (\d+)/i, (_, n) => `SEMANA ${n}`);

const modCache = new Map();       // caminho normalizado -> id
modCache.set('SEMANA 6', SEMANA6_ID);
const sortBase = 26;              // SEMANA 6 é sort_order 25
const criados = { modulos: 0, aulas: 0 };
const pulados = [];

async function garantirModulo(caminhoDrive) {         // ex: "Semana 8/Cir 2/Aulas Bônus"
  const partes = caminhoDrive.split('/');
  let acumulado = '', paiId = null, depth = 0;
  for (const parte of partes) {
    depth++;
    const titulo = depth === 1 ? topo(parte) : parte;
    acumulado = acumulado ? `${acumulado}/${titulo}` : titulo;
    if (modCache.has(acumulado)) { paiId = modCache.get(acumulado); continue; }
    const existente = await sql(`select id from course_modules where course_id='${COURSE}' and path='${esc(acumulado)}' limit 1`);
    if (existente.length) { paiId = existente[0].id; modCache.set(acumulado, paiId); continue; }
    const folder = pastas.find(p => topo(p.caminho) === acumulado || p.caminho === acumulado.replace(/^SEMANA (\d+)/, (_, n) => `Semana ${n}`));
    const so = sortBase + modCache.size;
    if (!APLICAR) { console.log(`  + módulo: ${acumulado} (depth ${depth})`); modCache.set(acumulado, `dry-${acumulado}`); paiId = modCache.get(acumulado); criados.modulos++; continue; }
    const ins = await sql(`insert into course_modules (course_id, drive_folder_id, title, sort_order, parent_module_id, depth, path)
      values ('${COURSE}', ${folder ? `'${folder.id}'` : 'null'}, '${esc(titulo)}', ${so}, ${paiId ? `'${paiId}'` : 'null'}, ${depth}, '${esc(acumulado)}') returning id`);
    paiId = ins[0].id; modCache.set(acumulado, paiId); criados.modulos++;
  }
  return paiId;
}

let ordem = 0;
for (const a of arquivos.sort((x, y) => x.caminho.localeCompare(y.caminho, 'pt-BR'))) {
  if (nomesExistentes.has(norm(a.nome))) { pulados.push(a.caminho); continue; }
  const pastaCaminho = a.caminho.split('/').slice(0, -1).join('/');
  const modId = await garantirModulo(pastaCaminho);
  const tipo = lessonType(a.mime, a.nome);
  ordem++;
  if (!APLICAR) { criados.aulas++; continue; }
  await sql(`insert into lessons (course_id, module_id, drive_file_id, title, type, mime_type, size_bytes, sort_order, drive_path, last_seen_at)
    values ('${COURSE}', '${modId}', '${a.id}', '${esc(a.nome)}', '${tipo}', '${esc(a.mime)}', ${a.size || 'null'}, ${sortBase * 100 + ordem}, '${esc(topo(a.caminho))}', now())`);
  criados.aulas++;
}

console.log(APLICAR ? '── IMPORTADO ──' : '── SIMULAÇÃO (use --aplicar) ──');
console.log('módulos:', criados.modulos, '| aulas:', criados.aulas);
if (pulados.length) { console.log('pulados (já existem por nome):'); pulados.forEach(p => console.log('   -', p)); }
