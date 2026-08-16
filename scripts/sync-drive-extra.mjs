#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Sincroniza uma pasta AVULSA do Drive para a plataforma — cada pasta de topo
// é um curso. Diferente do `deep-library-sync.mjs`, este script é ADITIVO:
// só cria o que falta e NUNCA marca aula como sumida. É o que se quer quando o
// dono sobe conteúdo novo numa pasta que não é a raiz oficial da biblioteca
// (`drive_config.folder_id`) — rodar a varredura completa ali marcaria tudo que
// vive fora dela como `missing_since`.
//
// Lê pela conta de ARMAZENAMENTO (`drive-storage-token`), que é a dona dessas
// pastas — e é também a primeira conta que o Worker de streaming tenta, então o
// que entrar por aqui toca sem depender da conta de conteúdo.
//
//   node scripts/sync-drive-extra.mjs <folderId>            # só relatório
//   node scripts/sync-drive-extra.mjs <folderId> --aplicar  # grava
//
// Variáveis: SUPABASE_MGMT_TOKEN, SUPABASE_SECRET_KEY
// Opcional:  MAPA_CURSOS='<folderId>=<courseId>,...' força o destino de uma
//            pasta (quando o curso na plataforma nasceu de outra pasta).
// ─────────────────────────────────────────────────────────────────────────────
import process from 'node:process';

const ROOT = process.argv[2];
const APLICAR = process.argv.includes('--aplicar');
// --curso-unico: a pasta passada É o curso (suas subpastas são módulos), em vez
// de cada subpasta de topo virar um curso. Use quando o link é o curso em si.
const CURSO_UNICO = process.argv.includes('--curso-unico');
if (!ROOT) { console.error('uso: node scripts/sync-drive-extra.mjs <folderId> [--aplicar] [--curso-unico]'); process.exit(1); }

const REF = process.env.SUPABASE_PROJECT_REF || 'jrrybiohwqabsdurqudc';
const MGMT_TOKEN = process.env.SUPABASE_MGMT_TOKEN;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
if (!MGMT_TOKEN || !SECRET_KEY) { console.error('faltam SUPABASE_MGMT_TOKEN / SUPABASE_SECRET_KEY'); process.exit(1); }

const FN = `https://${REF}.supabase.co/functions/v1`;
const MGMT = `https://api.supabase.com/v1/projects/${REF}/database/query`;
const FOLDER = 'application/vnd.google-apps.folder';
const SHORTCUT = 'application/vnd.google-apps.shortcut';
// Ponteiro deixado por ferramenta de backup quando ela NÃO conseguiu copiar o
// vídeo: 168 bytes de texto com nome de .mp4. Importar isso vira aula quebrada.
const EXT_PONTEIRO = /\.gdrive$/i;
// Stub falso de 55.855 bytes (um SVG com nome de vídeo) já visto no MED 2026.
const TAMANHO_STUB = 55855;
// Download que nunca terminou (.crdownload do Chrome, .part do Firefox,
// .download do Safari, .temp…). Mesma regra da member-sync-library.
const RE_PARCIAL = /\.(crdownload|crswap|part|partial|filepart|opdownload|aria2|!ut|download|temp|tmp)$/i;
const EXT_FLUXO = /\.(ts|mp3|mpeg|mpg|mp2|aac|m4a|flac|wav|mkv)$/i;
const MIME_FLUXO = /^(video\/mp2t|audio\/(mpeg|mp3|aac|flac|wav|x-wav))$/i;
const EXT_ASSET_WEB = /\.(js|css|json|map|woff2?|ttf|eot|svg|htm|html)$/i;

// Formato de fluxo aguenta corte (toca até onde vai); container com índice no
// fim (MP4/PDF/EPUB/ZIP) fica ilegível inteiro sem o último pedaço.
function analisarParcial(nome, mime, size) {
  const marca = String(nome ?? '').match(RE_PARCIAL);
  if (!marca) return { pular: false, titulo: nome };
  const base = String(nome).slice(0, -marca[0].length).replace(/\(\d+\)$/, '');
  if (!/\.[a-z0-9]{1,5}$/i.test(base)) return { pular: false, titulo: nome };
  if (Number(size) === 0) return { pular: true, titulo: base };
  if (EXT_ASSET_WEB.test(base)) return { pular: true, titulo: base };
  if (!EXT_FLUXO.test(base) && !MIME_FLUXO.test(mime || '')) return { pular: true, titulo: base };
  return { pular: false, titulo: base };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const MAPA = new Map(
  (process.env.MAPA_CURSOS || '').split(',').map(s => s.trim()).filter(Boolean)
    .map(par => par.split('=').map(x => x.trim())),
);

async function sql(query) {
  for (let a = 0; a < 6; a++) {
    try {
      const r = await fetch(MGMT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${MGMT_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const txt = await r.text();
      // A API de management devolve 502 em HTML de vez em quando — tentar de
      // novo é o certo; estourar aqui abortaria uma importação pela metade.
      if (!r.ok) { await sleep(1200 * (a + 1)); continue; }
      return JSON.parse(txt);
    } catch { await sleep(1200 * (a + 1)); }
  }
  throw new Error('SQL falhou depois de 6 tentativas');
}

const escapar = v => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

// ─── Drive, pela conta de armazenamento ──────────────────────────────────────
let token = null, tokenAt = 0;
async function getToken(force = false) {
  if (!force && token && Date.now() - tokenAt < 40 * 60 * 1000) return token;
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(`${FN}/drive-storage-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${SECRET_KEY}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      const j = await r.json();
      if (j.accessToken) { token = j.accessToken; tokenAt = Date.now(); return token; }
    } catch { /* tenta de novo */ }
    await sleep(1000 * (a + 1));
  }
  throw new Error('não foi possível obter token da conta de armazenamento');
}

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

  let ultimo = 'erro desconhecido';
  for (let a = 0; a < 8; a++) {
    const t = await getToken();
    let res;
    try {
      res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { headers: { Authorization: `Bearer ${t}` } });
    } catch (e) { ultimo = `rede: ${e.message}`; await sleep(Math.min(500 * 2 ** a, 20000)); continue; }
    if (res.ok) return res.json();
    const body = await res.text().catch(() => '');
    ultimo = `HTTP ${res.status}: ${body.slice(0, 160)}`;
    if (res.status === 401) { await getToken(true); continue; }
    const passageiro = res.status === 429 || res.status >= 500 || (res.status === 403 && /rateLimit|userRateLimit|quota/i.test(body));
    if (!passageiro) break;
    await sleep(Math.min(700 * 2 ** a, 30000));
  }
  throw new Error(ultimo);
}

function resolverAtalho(f) {
  if (f.mimeType === SHORTCUT) {
    if (!f.shortcutDetails?.targetId || !f.shortcutDetails?.targetMimeType) return null;
    return { ...f, id: f.shortcutDetails.targetId, mimeType: f.shortcutDetails.targetMimeType };
  }
  return f;
}

// ─── mesmas convenções da member-sync-library ────────────────────────────────
const RE_EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F3FB}-\u{1F3FF}\u{200B}\u{200D}\u{20E3}]/gu;
function semEmoji(nome) {
  return String(nome ?? '').replace(RE_EMOJI, '').replace(/\s{2,}/g, ' ')
    .replace(/\s+([–\-—·:])\s*$/g, '').replace(/^\s*[–\-—·]\s+/, '').trim();
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

function slugify(t) {
  return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function categoryOf(nome) {
  const n = nome.toLowerCase();
  if (/simulado|quest[õo]es|banco de quest/.test(n)) return 'Banco de Questões & Simulados';
  if (/resumo|mapa mental|flashcard|card/.test(n)) return 'Resumos, Cards & Mapas Mentais';
  if (/apostila|livro|biblioteca/.test(n)) return 'Livros & Apostilas';
  if (/r\+|residencia|residência|revalida|enare|enamed/.test(n)) return 'Residência & Provas';
  return 'Outros cursos';
}

// ─── varredura recursiva de um curso ─────────────────────────────────────────
async function varrer(raizId) {
  const pastas = [];   // { id, nome, paiId, caminho }
  const arquivos = []; // { id, nome, mimeType, size, dur, pastaId, caminho }
  const vistos = new Set();
  const erros = [];
  let ignorados = 0;

  const fila = [{ id: raizId, caminho: '' , paiId: null }];
  while (fila.length) {
    const atual = fila.shift();
    if (vistos.has(atual.id)) continue;
    vistos.add(atual.id);

    let itens = [];
    try {
      let pt;
      do {
        const p = await driveList(atual.id, pt);
        itens.push(...(p.files || []));
        pt = p.nextPageToken;
      } while (pt);
    } catch (e) {
      // Erro de listagem NUNCA pode ser engolido: uma subárvore inteira ficaria
      // de fora e o curso seria reportado como completo.
      erros.push({ pasta: atual.id, caminho: atual.caminho, erro: e.message });
      continue;
    }

    for (const cru of itens) {
      const f = resolverAtalho(cru);
      if (!f) continue;
      const nome = semEmoji(f.name);
      if (f.mimeType === FOLDER) {
        const caminho = atual.caminho ? `${atual.caminho}/${nome}` : nome;
        pastas.push({ id: f.id, nome, paiId: atual.id === raizId ? null : atual.id, caminho });
        fila.push({ id: f.id, caminho, paiId: atual.id });
        continue;
      }
      if (EXT_PONTEIRO.test(f.name) || Number(f.size) === TAMANHO_STUB) { ignorados++; continue; }
      const parcial = analisarParcial(nome, f.mimeType, f.size);
      if (parcial.pular) { ignorados++; continue; }
      arquivos.push({
        id: f.id, nome: parcial.titulo, mimeType: f.mimeType || '',
        size: f.size ? Number(f.size) : null,
        dur: f.videoMediaMetadata?.durationMillis ? Math.round(Number(f.videoMediaMetadata.durationMillis) / 1000) : null,
        pastaId: atual.id === raizId ? null : atual.id,
        caminho: atual.caminho ? `${atual.caminho}/${parcial.titulo}` : parcial.titulo,
      });
    }
  }
  return { pastas, arquivos, erros, ignorados };
}

// ─── principal ───────────────────────────────────────────────────────────────
const topo = [];
if (CURSO_UNICO) {
  // A pasta passada é o próprio curso. Busca o nome dela e trata como o único
  // "curso de topo".
  const t = await getToken();
  const meta = await fetch(`https://www.googleapis.com/drive/v3/files/${ROOT}?fields=id,name&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json());
  if (!meta?.id) { console.error('não achei a pasta do curso'); process.exit(1); }
  topo.push({ id: meta.id, name: meta.name, mimeType: FOLDER });
  console.log(`Curso único: "${meta.name}"\n`);
} else {
  let pt;
  do {
    const p = await driveList(ROOT, pt);
    topo.push(...(p.files || []).map(resolverAtalho).filter(f => f && f.mimeType === FOLDER));
    pt = p.nextPageToken;
  } while (pt);
  console.log(`Pasta raiz: ${topo.length} curso(s)\n`);
}

const cursosDb = await sql(`select id, title, slug, drive_folder_id from courses;`);
const porPasta = new Map(cursosDb.filter(c => c.drive_folder_id).map(c => [c.drive_folder_id, c]));
const porTitulo = new Map(cursosDb.map(c => [slugify(c.title), c]));
const slugsUsados = new Set(cursosDb.map(c => c.slug));

let totalNovas = 0, totalJa = 0, totalErros = 0;
const resumo = [];

for (const pasta of topo) {
  const nome = semEmoji(pasta.name);
  const destinoForcado = MAPA.get(pasta.id);
  const curso = destinoForcado
    ? cursosDb.find(c => c.id === destinoForcado)
    : (porPasta.get(pasta.id) || porTitulo.get(slugify(nome)));

  process.stderr.write(`  varrendo "${nome}"...\n`);
  const { pastas, arquivos, erros, ignorados } = await varrer(pasta.id);
  totalErros += erros.length;

  let jaTem = new Set();
  if (curso) {
    const linhas = await sql(`select drive_file_id from lessons where course_id = '${curso.id}' and drive_file_id is not null;`);
    jaTem = new Set(linhas.map(l => l.drive_file_id));
  }
  const novos = arquivos.filter(a => !jaTem.has(a.id));
  totalNovas += novos.length;
  totalJa += arquivos.length - novos.length;

  const bytes = novos.reduce((s, a) => s + (a.size || 0), 0);
  resumo.push({ pasta, nome, curso, pastas, arquivos, novos, erros, ignorados, bytes });

  console.log(`${curso ? '↻' : '＋'} ${nome}`);
  console.log(`   destino: ${curso ? `${curso.title} (${curso.slug})` : 'CURSO NOVO'}`);
  console.log(`   drive: ${pastas.length} subpastas · ${arquivos.length} arquivos`
    + `   → novos: ${novos.length} (${(bytes / 1e9).toFixed(2)} GB) · já na plataforma: ${arquivos.length - novos.length}`
    + (ignorados ? ` · ignorados (ponteiro/stub): ${ignorados}` : '')
    + (erros.length ? `   ⚠ ${erros.length} pasta(s) com erro` : ''));
}

console.log(`\nTOTAL: ${totalNovas} arquivos novos · ${totalJa} já existiam · ${totalErros} erro(s) de listagem`);

if (!APLICAR) { console.log('\n(simulação — rode com --aplicar para gravar)'); process.exit(totalErros ? 2 : 0); }
if (totalErros) { console.error('\nABORTADO: houve pasta que o Drive recusou listar. Importar assim gravaria um curso pela metade.'); process.exit(2); }

// ─── gravação ────────────────────────────────────────────────────────────────
for (const r of resumo) {
  // Mesmo sem aula nova, segue em frente: os módulos e a fila de pastas
  // precisam refletir a varredura (é o que faz o recalc renumerar). Só o
  // curso que ainda não existe é criado, e só quando há o que colocar nele.
  if (!r.novos.length && !r.curso) { console.log(`= ${r.nome}: pasta vazia, curso não criado`); continue; }

  let cursoId = r.curso?.id;
  if (!cursoId) {
    let slug = slugify(r.nome);
    // Mesma desambiguação da member-sync-library: slug repetido não pode
    // DESCARTAR o curso (foi assim que 24 cursos sumiram em 2026-07-31).
    if (slugsUsados.has(slug)) slug = `${slug}-${r.pasta.id.slice(-6).toLowerCase()}`;
    slugsUsados.add(slug);
    const [novo] = await sql(`
      insert into courses (drive_folder_id, title, slug, category, active, sync_status)
      values (${escapar(r.pasta.id)}, ${escapar(r.nome)}, ${escapar(slug)}, ${escapar(categoryOf(r.nome))}, true, 'complete')
      returning id;`);
    cursoId = novo.id;
    console.log(`＋ curso criado: ${r.nome} (${slug})`);
  }

  // Módulos: reaproveita os que já existem pelo drive_folder_id; cria o resto.
  const existentes = await sql(`select id, drive_folder_id from course_modules where course_id = '${cursoId}' and drive_folder_id is not null;`);
  const modPorPasta = new Map(existentes.map(m => [m.drive_folder_id, m.id]));

  // Ordena por profundidade do caminho para o pai já existir quando o filho for
  // criado — sem isso, parent_module_id ficaria nulo em subpasta profunda.
  const emOrdem = [...r.pastas].sort((a, b) => a.caminho.split('/').length - b.caminho.split('/').length || a.caminho.localeCompare(b.caminho));
  for (const p of emOrdem) {
    if (modPorPasta.has(p.id)) continue;
    const paiId = p.paiId ? (modPorPasta.get(p.paiId) || null) : null;
    const depth = p.caminho.split('/').length - 1;
    const [m] = await sql(`
      insert into course_modules (course_id, drive_folder_id, title, parent_module_id, depth, path, sort_order)
      values (${escapar(cursoId)}, ${escapar(p.id)}, ${escapar(p.nome)}, ${paiId ? escapar(paiId) : 'null'}, ${depth}, ${escapar(p.caminho)}, 0)
      returning id;`);
    modPorPasta.set(p.id, m.id);
  }

  // Aulas novas, em lotes.
  const LOTE = 200;
  for (let i = 0; i < r.novos.length; i += LOTE) {
    const fatia = r.novos.slice(i, i + LOTE);
    const valores = fatia.map(a => `(
      ${escapar(cursoId)},
      ${a.pastaId && modPorPasta.get(a.pastaId) ? escapar(modPorPasta.get(a.pastaId)) : 'null'},
      ${escapar(a.id)}, ${escapar(a.nome)}, ${escapar(lessonType(a.mimeType, a.nome))},
      ${escapar(a.mimeType)}, ${a.dur ?? 'null'}, ${a.size ?? 'null'}, 0,
      ${escapar(a.caminho)}, now())`).join(',');
    await sql(`
      insert into lessons (course_id, module_id, drive_file_id, title, type, mime_type, duration_seconds, size_bytes, sort_order, drive_path, last_seen_at)
      values ${valores}
      on conflict do nothing;`);
    process.stderr.write(`    ${r.nome}: ${Math.min(i + LOTE, r.novos.length)}/${r.novos.length}\n`);
  }

  // Registra as pastas varridas na fila, como `done`. Não é enfeite: o
  // `recalc_course_totals` só RENUMERA módulos e aulas quando o curso tem
  // pasta na fila e nenhuma pendente (`v_folders > 0`). Sem isso um curso
  // novo fica com todas as aulas em sort_order = 0, ou seja, sem ordem
  // nenhuma na tela — foi o que aconteceu na primeira importação do MEDCELL.
  // E é a fila que sustenta a prova de cobertura da tela de conferência.
  const pastasFila = [{ id: r.pasta.id, caminho: '', paiId: null }, ...r.pastas];
  for (let i = 0; i < pastasFila.length; i += 200) {
    const valores = pastasFila.slice(i, i + 200).map(p => `(
      ${escapar(cursoId)}, ${escapar(p.id)},
      ${p.paiId && modPorPasta.get(p.paiId) ? escapar(modPorPasta.get(p.paiId)) : (modPorPasta.get(p.id) ? escapar(modPorPasta.get(p.id)) : 'null')},
      ${escapar(p.caminho || '')}, ${p.caminho ? p.caminho.split('/').length - 1 : 0}, 'done', now())`).join(',');
    await sql(`
      insert into sync_folder_queue (course_id, drive_folder_id, module_id, path, depth, state, updated_at)
      values ${valores}
      on conflict (course_id, drive_folder_id) do update set state = 'done', error = null, updated_at = now();`);
  }

  await sql(`select public.recalc_course_totals('${cursoId}'::uuid);`);
  console.log(`✔ ${r.nome}: ${r.novos.length} aula(s) importada(s)`);
}

console.log('\nconcluído.');
