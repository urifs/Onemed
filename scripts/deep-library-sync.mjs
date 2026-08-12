#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// OneMed · varredura profunda + auditoria da biblioteca do Drive
//
// Mesma lógica da Edge Function `member-sync-library`, só que rodando fora do
// runtime de borda para poder varrer a biblioteca inteira de uma vez (a Edge
// Function trabalha em janelas de 40s guiadas pelo painel admin; aqui dá para
// fazer os ~34 mil diretórios em poucos minutos, com 24 listagens em paralelo).
//
// Serve para dois usos:
//   • `audit`  — só varre o Drive e compara com o banco, sem escrever nada.
//                É a PROVA de que não falta conteúdo: compara arquivo a
//                arquivo (por ID do Drive) e soma os bytes dos dois lados.
//   • `sync`   — varre e grava (cursos, módulos em qualquer profundidade,
//                aulas, fila de varredura) e recalcula os totais por curso.
//
// Uso:
//   SUPABASE_MGMT_TOKEN=... SUPABASE_SECRET_KEY=... node scripts/deep-library-sync.mjs audit
//   SUPABASE_MGMT_TOKEN=... SUPABASE_SECRET_KEY=... node scripts/deep-library-sync.mjs sync
//
// Nenhuma credencial fica no arquivo: tudo vem de variável de ambiente.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';

// Mesma limpeza de emoji da member-sync-library: o nome do Drive entra sem
// pictograma, senão a varredura offline reintroduz o que o edge function tirou.
const RE_EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F3FB}-\u{1F3FF}\u{200B}\u{200D}\u{20E3}]/gu;
function semEmoji(nome) {
  return String(nome ?? '')
    .replace(RE_EMOJI, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([–\-—·:])\s*$/g, '')
    .replace(/^\s*[–\-—·]\s+/, '')
    .trim();
}


const MODE = (process.argv[2] || 'audit').toLowerCase();
if (!['audit', 'sync'].includes(MODE)) {
  console.error('uso: node scripts/deep-library-sync.mjs [audit|sync]');
  process.exit(1);
}

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jrrybiohwqabsdurqudc';
const MGMT_TOKEN = req('SUPABASE_MGMT_TOKEN');
const SECRET_KEY = req('SUPABASE_SECRET_KEY'); // sb_secret_... (service role)
const CONC = Number(process.env.CONCURRENCY || 24);
// Opcional: restringe a varredura a cursos específicos (IDs das pastas de topo
// do Drive, separados por vírgula). Útil para reconferir um curso só sem
// revarrer a biblioteca inteira.
const ONLY_ROOTS = (process.env.ONLY_ROOT_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const WORK_DIR = process.env.WORK_DIR || path.join(process.cwd(), '.library-audit');

function req(name) {
  const v = process.env[name];
  if (!v) { console.error(`falta a variável de ambiente ${name}`); process.exit(1); }
  return v;
}

const REST = `https://${PROJECT_REF}.supabase.co/rest/v1`;
const FN = `https://${PROJECT_REF}.supabase.co/functions/v1`;
const MGMT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

const FOLDER = 'application/vnd.google-apps.folder';
const SHORTCUT = 'application/vnd.google-apps.shortcut';

fs.mkdirSync(WORK_DIR, { recursive: true });

// ─── infra HTTP ──────────────────────────────────────────────────────────────
async function sql(query) {
  for (let a = 0; a < 6; a++) {
    const r = await fetch(MGMT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${MGMT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (r.ok) return r.json();
    const body = await r.text();
    if (r.status >= 500 || r.status === 429) { await sleep(1500 * (a + 1)); continue; }
    throw new Error(`SQL ${r.status}: ${body.slice(0, 300)}`);
  }
  throw new Error('SQL falhou após as tentativas');
}

async function rest(pathAndQuery, { method = 'POST', body, prefer } = {}) {
  const headers = {
    apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  for (let a = 0; a < 6; a++) {
    const r = await fetch(`${REST}/${pathAndQuery}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (r.ok) { const t = await r.text(); return t ? JSON.parse(t) : null; }
    const t = await r.text();
    if (r.status >= 500 || r.status === 429) { await sleep(1000 * (a + 1)); continue; }
    throw new Error(`REST ${r.status} em ${pathAndQuery}: ${t.slice(0, 400)}`);
  }
  throw new Error(`REST falhou após as tentativas em ${pathAndQuery}`);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── token do Google Drive ───────────────────────────────────────────────────
// Reaproveita a Edge Function `drive-access-token`, que já sabe renovar com o
// refresh_token guardado em `drive_config` — o client secret do Google não
// precisa sair do Supabase.
let token = null, tokenAt = 0;
async function getToken(force = false) {
  if (!force && token && Date.now() - tokenAt < 40 * 60 * 1000) return token;
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(`${FN}/drive-access-token`, { method: 'POST', headers: { Authorization: `Bearer ${SECRET_KEY}` } });
      const j = await r.json();
      if (j.accessToken) { token = j.accessToken; tokenAt = Date.now(); return token; }
    } catch { /* tenta de novo */ }
    await sleep(1000 * (a + 1));
  }
  throw new Error('não foi possível obter um access token do Google Drive');
}

let apiCalls = 0, retries = 0;

async function driveList(folderId, pageToken) {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'nextPageToken, files(id,name,mimeType,size,videoMediaMetadata(durationMillis),shortcutDetails)',
    pageSize: '1000',
    orderBy: 'folder,name_natural',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });
  if (pageToken) params.set('pageToken', pageToken);

  let lastErr = 'erro desconhecido';
  for (let attempt = 0; attempt < 8; attempt++) {
    const t = await getToken();
    let res;
    try {
      res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { headers: { Authorization: `Bearer ${t}` } });
    } catch (e) {
      lastErr = `rede: ${e.message}`; retries++;
      await sleep(Math.min(500 * 2 ** attempt, 20000)); continue;
    }
    apiCalls++;
    if (res.ok) return res.json();
    const body = await res.text().catch(() => '');
    lastErr = `HTTP ${res.status}: ${body.slice(0, 200)}`;
    if (res.status === 401) { await getToken(true); retries++; continue; }
    const transient = res.status === 429 || res.status >= 500 || (res.status === 403 && /rateLimit|userRateLimit|quota/i.test(body));
    if (!transient) break;
    retries++;
    await sleep(Math.min(700 * 2 ** attempt, 30000));
  }
  throw new Error(lastErr);
}

function resolveShortcut(f) {
  if (f.mimeType === SHORTCUT) {
    if (!f.shortcutDetails?.targetId || !f.shortcutDetails?.targetMimeType) return null;
    return { id: f.shortcutDetails.targetId, mimeType: f.shortcutDetails.targetMimeType, viaShortcut: true };
  }
  return { id: f.id, mimeType: f.mimeType, viaShortcut: false };
}

function lessonType(mimeType, name = '') {
  const n = name.toLowerCase();
  if (mimeType?.startsWith('video/') || /\.(mp4|mkv|avi|mov|ts|wmv)$/.test(n)) return 'video';
  if (mimeType === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (mimeType?.includes('word') || mimeType === 'application/vnd.google-apps.document' || /\.(doc|docx)$/.test(n)) return 'doc';
  if (mimeType?.includes('spreadsheet') || mimeType === 'application/vnd.ms-excel' || /\.(xls|xlsx)$/.test(n)) return 'sheet';
  if (mimeType === 'text/plain' || n.endsWith('.txt')) return 'txt';
  if (mimeType?.startsWith('audio/') || /\.(mp3|wav|ogg)$/.test(n)) return 'audio';
  if (mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/.test(n)) return 'image';
  return 'other';
}

// ─── 1 · varredura completa do Drive ─────────────────────────────────────────
async function crawlDrive(rootFolderId) {
  const filesOut = fs.createWriteStream(path.join(WORK_DIR, 'drive_files.ndjson'));
  const foldersOut = fs.createWriteStream(path.join(WORK_DIR, 'drive_folders.ndjson'));
  const visited = new Set();   // `${rootId}::${folderId}` — barra ciclo de atalho
  const seenFiles = new Set(); // `${rootId}::${fileId}`   — mesma chave do banco
  const hardErrors = [];
  let folders = 0, files = 0, bytes = 0n, brokenShortcuts = 0, looseRootFiles = 0;

  const queue = [];
  const t0 = Date.now();
  const ticker = setInterval(() => {
    process.stderr.write(`  [${((Date.now() - t0) / 1000) | 0}s] fila=${queue.length} pastas=${folders} arquivos=${files} ${(Number(bytes) / 1e12).toFixed(2)}TB erros=${hardErrors.length}\n`);
  }, 5000);

  // nível raiz: cada pasta de topo é um curso
  const topEntries = [];
  let pt;
  do {
    const p = await driveList(rootFolderId, pt);
    topEntries.push(...(p.files || []));
    pt = p.nextPageToken;
  } while (pt);

  const courses = [];
  for (const f of topEntries) {
    const r = resolveShortcut(f);
    if (!r) { brokenShortcuts++; continue; }
    if (r.mimeType !== FOLDER) { looseRootFiles++; continue; }
    if (ONLY_ROOTS.length && !ONLY_ROOTS.includes(r.id)) continue;
    courses.push({ id: r.id, name: semEmoji(f.name) });
    visited.add(`${r.id}::${r.id}`);
    folders++;
    foldersOut.write(JSON.stringify({ id: r.id, name: semEmoji(f.name), parentId: rootFolderId, relPath: '', depth: 0, rootId: r.id, rootName: semEmoji(f.name) }) + '\n');
    queue.push({ folderId: r.id, relPath: '', depth: 0, rootId: r.id, rootName: semEmoji(f.name) });
  }

  async function worker() {
    while (queue.length) {
      const task = queue.shift();
      if (!task) continue;
      let page;
      try {
        page = await driveList(task.folderId, task.pageToken);
      } catch (e) {
        hardErrors.push({ rootId: task.rootId, rootName: task.rootName, folderId: task.folderId, relPath: task.relPath, error: e.message });
        continue;
      }
      if (page.nextPageToken) queue.push({ ...task, pageToken: page.nextPageToken });

      for (const f of page.files || []) {
        const r = resolveShortcut(f);
        if (!r) { brokenShortcuts++; continue; }
        const name = semEmoji(f.name);
        if (r.mimeType === FOLDER) {
          const key = `${task.rootId}::${r.id}`;
          if (visited.has(key)) continue;
          visited.add(key);
          const relPath = task.relPath ? `${task.relPath}/${name}` : name;
          folders++;
          foldersOut.write(JSON.stringify({
            id: r.id, name, parentId: task.folderId, relPath, depth: task.depth + 1,
            rootId: task.rootId, rootName: task.rootName,
          }) + '\n');
          queue.push({ folderId: r.id, relPath, depth: task.depth + 1, rootId: task.rootId, rootName: task.rootName });
        } else {
          const key = `${task.rootId}::${r.id}`;
          if (seenFiles.has(key)) continue;
          seenFiles.add(key);
          const size = !r.viaShortcut && f.size ? BigInt(f.size) : 0n;
          bytes += size;
          files++;
          filesOut.write(JSON.stringify({
            id: r.id, name, mimeType: r.mimeType,
            size: !r.viaShortcut && f.size ? String(f.size) : null,
            durationMs: !r.viaShortcut && f.videoMediaMetadata?.durationMillis ? String(f.videoMediaMetadata.durationMillis) : null,
            parentFolderId: task.folderId, parentRelPath: task.relPath, depth: task.depth + 1,
            rootId: task.rootId, rootName: task.rootName,
          }) + '\n');
        }
      }
    }
  }

  await Promise.all(Array.from({ length: CONC }, () => worker()));
  clearInterval(ticker);
  filesOut.end(); foldersOut.end();
  await Promise.all([
    new Promise(r => filesOut.on('finish', r)),
    new Promise(r => foldersOut.on('finish', r)),
  ]);

  return { courses, folders, files, bytes, brokenShortcuts, looseRootFiles, hardErrors, apiCalls, retries, elapsedSec: ((Date.now() - t0) / 1000) | 0 };
}

function* readNdjson(file) {
  // Os arquivos passam de 100 MB; lê em blocos em vez de carregar tudo.
  // StringDecoder e não Buffer.toString(): os nomes têm acento, e um bloco
  // pode cortar um caractere UTF-8 no meio.
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(1 << 20);
  const decoder = new StringDecoder('utf8');
  let rest = '';
  try {
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (n <= 0) break;
      const chunk = rest + decoder.write(buf.subarray(0, n));
      const lines = chunk.split('\n');
      rest = lines.pop();
      for (const l of lines) if (l) yield JSON.parse(l);
    }
    rest += decoder.end();
    if (rest.trim()) yield JSON.parse(rest);
  } finally { fs.closeSync(fd); }
}

// ─── 2 · estado atual do banco ───────────────────────────────────────────────
async function loadDbLessonKeys() {
  const keys = new Map(); // `${rootFolderId}::${driveFileId}` → size
  const PAGE = 25000;
  for (let off = 0; ; off += PAGE) {
    const rows = await sql(
      `select c.drive_folder_id || '::' || l.drive_file_id as k, coalesce(l.size_bytes, 0) as b
         from lessons l join courses c on c.id = l.course_id
        where l.missing_since is null
        order by l.course_id, l.drive_file_id limit ${PAGE} offset ${off}`);
    for (const r of rows) keys.set(r.k, BigInt(r.b));
    process.stderr.write(`  aulas lidas do banco: ${keys.size}\r`);
    if (rows.length < PAGE) break;
  }
  process.stderr.write('\n');
  return keys;
}

// ─── 3 · gravação (modo sync) ────────────────────────────────────────────────
function slugify(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'curso';
}

// Mesmo classificador da Edge Function member-sync-library — categorias com os
// nomes exibidos na plataforma (src/lib/courseCategories.ts), sinal mais
// específico primeiro.
function categoryOf(name) {
  const n = name.toLowerCase();
  if (/(ecg|eletrocardiogram|cardio|littman|ausculta|infarto|dislipidemia)/.test(n)) return 'Cardiologia & ECG';
  if (/(revalida|hardwork|\binep\b)/.test(n)) return 'Revalida';
  if (/(quest|simulado|provas|\bosce\b|\btep\b)/.test(n)) return 'Banco de Questões & Simulados';
  if (/(livro|apostila)/.test(n)) return 'Livros & Apostilas';
  if (/(resumo|memorex|flashcard|anki|mapa[s]? menta|ficha|planner|planilha|cards)/.test(n)) return 'Resumos, Cards & Mapas Mentais';
  if (/(prescri|antibi[oó]tic|plant[aã]o|receita)/.test(n)) return 'Prescrições & Plantão';
  if (/(emerg|trauma|sutura|intuba|ventila|\buti\b|terapia intensiva|pronto[ -]?socorro|pronto[ -]?atendimento|\bps\b|sala de parada|\bacls\b|\batls\b)/.test(n)) return 'Emergência, PS & Trauma';
  if (/(pediatr|neonat)/.test(n)) return 'Pediatria';
  if (/(cirurgia|cir[uú]rgic|ginecolog|obstetr|\bgo\b)/.test(n)) return 'Cirurgia & GO';
  if (/(radiolog|imagem|tomograf|ultrassom|ultrassonograf|\busg\b)/.test(n)) return 'Radiologia & Imagem';
  if (/(semiolog|cl[ií]nica m[eé]dica|exame cl[ií]nico|racioc[ií]nio cl[ií]nico)/.test(n)) return 'Semiologia & Clínica';
  if (/(farmacolog|bioqu[ií]mic)/.test(n)) return 'Farmacologia & Bioquímica';
  if (/(anatomia|ciclo b[aá]sico|histolog|embriolog|fisiolog|internato)/.test(n)) return 'Anatomia & Ciclo Básico';
  if (/(usmle|ingl[eê]s|exterior|\beua\b|interc[aâ]mbio|match)/.test(n)) return 'Intercâmbio & Carreira Internacional';
  if (/(marketing|carreira|empreend|instagram|renda|gest[aã]o|per[ií]cia|legista|produtividade)/.test(n)) return 'Carreira, Gestão & Marketing';
  if (/(extensivo|intensivo|intensiv[aã]o|resid[eê]ncia|medcof|medcurso|medcel|medway|medgrupo|sanar|estrat[eé]gia|aristo|\bmed \d{4}\b)/.test(n)) return 'Extensivo & Intensivo · Residência';
  return 'Outros cursos';
}

async function writeCourse(course, folders, files, protectedKeys, courseIndex, usedSlugs) {
  // curso: cria só se ainda não existe. `slug` é NOT NULL UNIQUE, então duas
  // pastas de topo com o mesmo nome ganham o fim do ID da pasta como sufixo —
  // são turmas diferentes, não o mesmo curso.
  let courseId = courseIndex.get(course.id);
  if (!courseId) {
    const base = slugify(course.name);
    const slug = usedSlugs.has(base) ? `${base}-${course.id.slice(-6).toLowerCase()}` : base;
    usedSlugs.add(slug);
    const [created] = await rest('courses?select=id', {
      body: [{
        drive_folder_id: course.id, title: course.name, slug,
        category: categoryOf(course.name), sync_status: 'crawling',
        synced_at: new Date().toISOString(),
      }],
      prefer: 'return=representation',
    });
    courseId = created.id;
    courseIndex.set(course.id, courseId);
  } else {
    await rest(`courses?id=eq.${courseId}`, {
      method: 'PATCH',
      body: { title: course.name, sync_status: 'crawling', synced_at: new Date().toISOString() },
      prefer: 'return=minimal',
    });
  }

  // módulos: nível a nível, para o pai já existir quando o filho for gravado
  const moduleIdByFolder = new Map(); // driveFolderId → module uuid (raiz = null)
  moduleIdByFolder.set(course.id, null);
  const byDepth = new Map();
  for (const f of folders) {
    if (f.depth === 0) continue;
    if (!byDepth.has(f.depth)) byDepth.set(f.depth, []);
    byDepth.get(f.depth).push(f);
  }
  for (const depth of [...byDepth.keys()].sort((a, b) => a - b)) {
    const batch = byDepth.get(depth).map(f => ({
      course_id: courseId, drive_folder_id: f.id, title: f.name,
      parent_module_id: moduleIdByFolder.get(f.parentId) ?? null,
      depth: f.depth, path: f.relPath,
    }));
    for (let i = 0; i < batch.length; i += 500) {
      const res = await rest(`course_modules?on_conflict=course_id,drive_folder_id&select=id,drive_folder_id`, {
        body: batch.slice(i, i + 500),
        prefer: 'resolution=merge-duplicates,return=representation',
      });
      for (const m of res || []) moduleIdByFolder.set(m.drive_folder_id, m.id);
    }
  }

  // aulas
  const now = new Date().toISOString();
  const normal = [], protectedRows = [];
  for (const f of files) {
    if (f.mimeType === 'text/html') continue; // .html solto do Drive não é aula
    if (/\.gdrive$/i.test(f.name || '')) continue; // ponteiro de 168 bytes, não é mídia
    const base = {
      course_id: courseId,
      module_id: moduleIdByFolder.get(f.parentFolderId) ?? null,
      drive_file_id: f.id,
      title: f.name,
      type: lessonType(f.mimeType, f.name),
      duration_seconds: f.durationMs ? Math.round(Number(f.durationMs) / 1000) : null,
      size_bytes: f.size ? Number(f.size) : null,
      drive_path: f.parentRelPath || null,
      last_seen_at: now,
      missing_since: null,
    };
    // Aulas já migradas para o Supabase Storage (os .wmv retranscodificados)
    // não podem ter o mime_type sobrescrito pelo do Drive — voltaria a ser
    // video/x-ms-wmv e nenhum navegador tocaria de novo.
    if (protectedKeys.has(`${courseId}::${f.id}`)) protectedRows.push(base);
    else normal.push({ ...base, mime_type: f.mimeType });
  }
  for (const [arr, label] of [[normal, 'normal'], [protectedRows, 'protegida']]) {
    for (let i = 0; i < arr.length; i += 500) {
      await rest(`lessons?on_conflict=course_id,drive_file_id`, {
        body: arr.slice(i, i + 500),
        prefer: 'resolution=merge-duplicates,return=minimal',
      });
    }
  }

  // fila de varredura: tudo que foi listado com sucesso entra como 'done'
  const queueRows = folders.map(f => ({
    course_id: courseId, drive_folder_id: f.id,
    module_id: moduleIdByFolder.get(f.id) ?? null,
    path: f.relPath, depth: f.depth, state: 'done',
    page_token: null, attempts: 0, error: null, updated_at: now,
  }));
  for (let i = 0; i < queueRows.length; i += 500) {
    await rest(`sync_folder_queue?on_conflict=course_id,drive_folder_id`, {
      body: queueRows.slice(i, i + 500),
      prefer: 'resolution=merge-duplicates,return=minimal',
    });
  }

  await sql(`select recalc_course_totals('${courseId}'::uuid)`);
  return { courseId, modules: moduleIdByFolder.size - 1, lessons: normal.length + protectedRows.length };
}

// ─── main ────────────────────────────────────────────────────────────────────
const [{ folder_id: ROOT }] = await sql('select folder_id from drive_config limit 1');
console.log(`pasta raiz da biblioteca: ${ROOT}`);
console.log(`modo: ${MODE.toUpperCase()} · varrendo o Drive inteiro (isso leva alguns minutos)…`);

const crawl = await crawlDrive(ROOT);
console.log(`\nDRIVE: ${crawl.courses.length} cursos · ${crawl.folders} pastas · ${crawl.files} arquivos · ${(Number(crawl.bytes) / 1e12).toFixed(3)} TB`);
console.log(`       ${crawl.apiCalls} chamadas à API · ${crawl.retries} tentativas repetidas · ${crawl.hardErrors.length} pastas que falharam · ${crawl.brokenShortcuts} atalhos quebrados · ${crawl.looseRootFiles} arquivos soltos na raiz`);

if (crawl.hardErrors.length) {
  console.log('\n⚠ PASTAS QUE O DRIVE RECUSOU A LISTAR (conteúdo não conferido):');
  for (const e of crawl.hardErrors.slice(0, 20)) console.log(`   ${e.rootName}/${e.relPath} → ${e.error}`);
  fs.writeFileSync(path.join(WORK_DIR, 'folder_errors.json'), JSON.stringify(crawl.hardErrors, null, 2));
}

if (MODE === 'sync') {
  // agrupa a varredura por curso e grava
  const foldersByRoot = new Map(), filesByRoot = new Map();
  for (const f of readNdjson(path.join(WORK_DIR, 'drive_folders.ndjson'))) {
    if (!foldersByRoot.has(f.rootId)) foldersByRoot.set(f.rootId, []);
    foldersByRoot.get(f.rootId).push(f);
  }
  for (const f of readNdjson(path.join(WORK_DIR, 'drive_files.ndjson'))) {
    if (!filesByRoot.has(f.rootId)) filesByRoot.set(f.rootId, []);
    filesByRoot.get(f.rootId).push(f);
  }

  const prot = await sql(`select c.id || '::' || l.drive_file_id as k from lessons l join courses c on c.id = l.course_id where l.storage_path is not null`);
  const protectedKeys = new Set(prot.map(r => r.k));

  const existing = await sql('select id, drive_folder_id, slug from courses');
  const courseIndex = new Map(existing.map(c => [c.drive_folder_id, c.id]));
  const usedSlugs = new Set(existing.map(c => c.slug));

  const runStartedAt = new Date().toISOString();
  let done = 0;
  for (const course of crawl.courses) {
    const r = await writeCourse(course, foldersByRoot.get(course.id) || [], filesByRoot.get(course.id) || [], protectedKeys, courseIndex, usedSlugs);
    done++;
    process.stderr.write(`  [${done}/${crawl.courses.length}] ${course.name} → ${r.modules} módulos, ${r.lessons} arquivos\n`);
  }

  // Arquivos que sumiram do Drive: só MARCA, nunca apaga — apagar levaria
  // junto o progresso do aluno (FK CASCADE em lesson_progress). Só faz sentido
  // se a varredura foi 100% limpa; com pasta que falhou, "não vi o arquivo"
  // pode significar só que não consegui olhar.
  if (!crawl.hardErrors.length && !ONLY_ROOTS.length) {
    const marked = await sql(
      `update lessons set missing_since = now()
        where missing_since is null
          and (last_seen_at is null or last_seen_at < '${runStartedAt}'::timestamptz)
        returning id`);
    console.log(`arquivos que sumiram do Drive (marcados, não apagados): ${marked.length}`);
    const restored = await sql(
      `update lessons set missing_since = null
        where missing_since is not null and last_seen_at >= '${runStartedAt}'::timestamptz
        returning id`);
    if (restored.length) console.log(`arquivos que voltaram a aparecer no Drive: ${restored.length}`);
  } else if (ONLY_ROOTS.length) {
    console.log('varredura restrita a cursos específicos — marcação de "sumiu do Drive" pulada.');
  } else {
    console.log('varredura teve pastas com erro — não vou marcar nada como "sumiu do Drive".');
  }
}

// ─── auditoria final: a prova ────────────────────────────────────────────────
console.log('\nconferindo, arquivo por arquivo, contra o banco…');
const dbKeys = await loadDbLessonKeys();

let driveFiles = 0, driveBytes = 0n, missing = 0, missingBytes = 0n, skippedHtml = 0;
const driveKeys = new Set();
const missingByCourse = new Map();
for (const f of readNdjson(path.join(WORK_DIR, 'drive_files.ndjson'))) {
  if (f.mimeType === 'text/html') { skippedHtml++; continue; }
  if (/\.gdrive$/i.test(f.name || '')) { skippedHtml++; continue; } // ponteiro .gdrive, não é mídia
  const key = `${f.rootId}::${f.id}`;
  driveKeys.add(key);
  driveFiles++;
  if (f.size) driveBytes += BigInt(f.size);
  if (!dbKeys.has(key)) {
    missing++;
    if (f.size) missingBytes += BigInt(f.size);
    const e = missingByCourse.get(f.rootName) || { n: 0, sample: [] };
    e.n++; if (e.sample.length < 3) e.sample.push(`${f.parentRelPath}/${f.name}`);
    missingByCourse.set(f.rootName, e);
  }
}
// Numa varredura restrita a alguns cursos, compara só com as aulas desses
// cursos — senão todo o resto da biblioteca apareceria como "sobrando".
const crawledRoots = new Set(crawl.courses.map(c => c.id));
let dbBytes = 0n, stale = 0, dbCount = 0;
for (const [k, b] of dbKeys) {
  if (!crawledRoots.has(k.slice(0, k.indexOf('::')))) continue;
  dbCount++; dbBytes += b;
  if (!driveKeys.has(k)) stale++;
}

console.log('\n══════════════════ AUDITORIA DA BIBLIOTECA ══════════════════');
console.log(`Drive : ${driveFiles} arquivos · ${(Number(driveBytes) / 1e12).toFixed(4)} TB   (+${skippedHtml} .html ignorados de propósito)`);
console.log(`Banco : ${dbCount} arquivos · ${(Number(dbBytes) / 1e12).toFixed(4)} TB`);
console.log(`Faltando no banco : ${missing} arquivo(s) · ${(Number(missingBytes) / 1e9).toFixed(2)} GB`);
console.log(`Sobrando no banco (sumiu do Drive) : ${stale}`);
if (missing) {
  console.log('\ncursos com conteúdo faltando:');
  for (const [name, e] of [...missingByCourse].sort((a, b) => b[1].n - a[1].n).slice(0, 30)) {
    console.log(`  ${String(e.n).padStart(6)}  ${name}`);
    for (const s of e.sample) console.log(`          ↳ ${s}`);
  }
}
const ok = missing === 0 && crawl.hardErrors.length === 0;
console.log(`\n${ok ? '✅ PARIDADE TOTAL: nenhum arquivo do Drive ficou de fora.' : '❌ AINDA FALTA CONTEÚDO — rode de novo em modo sync.'}`);
process.exit(ok ? 0 : 1);
