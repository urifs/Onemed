#!/usr/bin/env node
/**
 * Converte aulas travadas pela cota do Google Drive, passando por uma CÓPIA
 * numa conta de armazenamento nossa.
 *
 * O PROBLEMA: o Drive limita quantos bytes de um MESMO arquivo podem sair por
 * dia, e o limite vale para arquivo que a conta não possui. As aulas grandes
 * (0,4 a 5,3 GB) esgotam essa franquia num único download — então baixar para
 * converter é exatamente o que impede de baixar de novo. É um laço fechado.
 *
 * A SAÍDA: `files.copy` faz o Google copiar o arquivo internamente, e o dono
 * da cópia passa a ser a nossa conta. Dono não tem cota de download no próprio
 * arquivo — depois da cópia, aquele conteúdo nunca mais depende de franquia.
 *
 * O QUE FOI MEDIDO (31/07, contra a API real, não suposição):
 *   - arquivo de 321 KB do mesmo dono         → copy OK, viramos donos
 *   - arquivo de 110 MB sem cota estourada    → copy OK, viramos donos
 *   - arquivo de 409 MB COM cota estourada    → copy recusado
 *
 * Ou seja: o `copy` obedece à MESMA cota (o Drive só reporta como
 * `userRateLimitExceeded` em vez de `downloadQuotaExceeded`). Copiar não fura
 * o limite; ele resolve de forma permanente o arquivo que conseguir passar.
 * Por isso este script é feito para rodar VÁRIAS VEZES: a cada rodada leva as
 * que estiverem com janela livre, e as demais ficam para a próxima.
 *
 * Uso:
 *   SUPABASE_MGMT_TOKEN=... SUPABASE_SECRET_KEY=... SUPABASE_SERVICE_JWT=... \
 *     node scripts/copy-then-convert.mjs --ext=mov [--limit=5] [--dry]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const REF = 'jrrybiohwqabsdurqudc';
const MGMT = process.env.SUPABASE_MGMT_TOKEN;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const STORAGE_KEY = process.env.SUPABASE_SERVICE_JWT;
const STORAGE = `https://${REF}.supabase.co/storage/v1`;
const BUCKET = 'lesson-media';

const args = process.argv.slice(2);
const EXTS = (args.find(a => a.startsWith('--ext='))?.slice(6) || 'mov').split(',');
const LIMIT = Number(args.find(a => a.startsWith('--limit='))?.slice(8) || 0);
const DRY = args.includes('--dry');
const KEEP_COPY = !args.includes('--delete-copy');

if (!MGMT || !SECRET || !STORAGE_KEY) {
  console.error('faltam SUPABASE_MGMT_TOKEN, SUPABASE_SECRET_KEY e SUPABASE_SERVICE_JWT');
  process.exit(1);
}

const esc = s => String(s).replace(/'/g, "''");

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MGMT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`sql ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

/** Token da conta de CONTEÚDO — a única que enxerga os arquivos originais. */
async function contentToken() {
  const r = await fetch(`https://${REF}.supabase.co/functions/v1/drive-access-token`, {
    method: 'POST', headers: { Authorization: `Bearer ${SECRET}` },
  });
  const d = await r.json();
  if (!d.accessToken) throw new Error('sem token da conta de conteúdo');
  return d.accessToken;
}

/** Token da conta de ARMAZENAMENTO — a que vai virar dona das cópias. */
async function storageAccount() {
  const r = await fetch(`https://${REF}.supabase.co/functions/v1/drive-storage-token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const d = await r.json();
  if (!d.accessToken) throw new Error(d.error || 'nenhuma conta de armazenamento conectada');
  return d;
}

const QUOTA_REASONS = ['downloadQuotaExceeded', 'userRateLimitExceeded', 'rateLimitExceeded'];
class QuotaError extends Error {}

/**
 * Dá acesso de leitura da origem para a conta de armazenamento.
 *
 * Sem isso o `copy` nem começa: a conta de armazenamento não enxerga os
 * arquivos, que são compartilhados só com a conta de conteúdo. É idempotente
 * — repetir numa segunda rodada não duplica nem falha.
 */
async function shareWithStorage(fileId, contentAt, email) {
  const r = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?sendNotificationEmail=false`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${contentAt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'user', emailAddress: email }),
    },
  );
  if (r.ok) return;
  const t = await r.text();
  // Já compartilhado antes é sucesso, não erro.
  if (/already|duplicate/i.test(t)) return;
  throw new Error(`compartilhar: ${r.status} ${t.slice(0, 160)}`);
}

async function copyToStorage(fileId, storageAt, folderId, name) {
  const body = { name };
  if (folderId) body.parents = [folderId];
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/copy?fields=id,size`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${storageAt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (d.error) {
    const reason = d.error.errors?.[0]?.reason || '';
    if (QUOTA_REASONS.includes(reason)) {
      throw new QuotaError('cota diária deste arquivo ainda esgotada no Google');
    }
    throw new Error(`copy: ${d.error.message}`);
  }
  return d.id;
}

/** Baixa a CÓPIA. Somos donos dela, então aqui não há cota. */
async function download(fileId, at, dest) {
  const { stdout } = await exec('curl', [
    '-sSL', '--retry', '3', '--retry-delay', '2',
    '-H', `Authorization: Bearer ${at}`,
    '-w', '%{http_code}',
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    '-o', dest,
  ], { maxBuffer: 1 << 22, timeout: 3 * 3600 * 1000 });
  const code = Number(String(stdout).trim().slice(-3));
  if (code !== 200 && code !== 206) {
    let body = '';
    try { body = fs.readFileSync(dest, 'utf8').slice(0, 300); } catch { /* sem corpo */ }
    throw new Error(`download da cópia HTTP ${code}: ${body.replace(/\s+/g, ' ')}`);
  }
  const size = fs.statSync(dest).size;
  if (size < 1024) throw new Error('download vazio');
  return size;
}

async function probe(localPath) {
  const { stdout } = await exec('ffprobe', [
    '-v', 'error', '-show_entries', 'stream=codec_type,codec_name', '-of', 'json', localPath,
  ], { maxBuffer: 1 << 24, timeout: 240000 });
  const streams = JSON.parse(stdout).streams || [];
  return {
    video: streams.find(s => s.codec_type === 'video')?.codec_name ?? null,
    audio: streams.find(s => s.codec_type === 'audio')?.codec_name ?? null,
  };
}

/** Mesma regra do fix-unplayable-videos: a operação mais barata que entrega MP4 tocável. */
function planFor({ video, audio }) {
  const nativeVideo = video === 'h264';
  const nativeAudio = audio === 'aac' || audio === null;
  if (nativeVideo && nativeAudio) return { kind: 'remux', args: ['-c', 'copy'] };
  if (nativeVideo) return { kind: 'audio', args: ['-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k'] };
  return {
    kind: 'transcode',
    args: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k'],
  };
}

async function convert(srcPath, plan, outPath) {
  await exec('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', srcPath, ...plan.args,
    '-movflags', '+faststart', outPath,
  ], { maxBuffer: 1 << 24, timeout: 4 * 3600 * 1000 });
}

async function upload(localPath, storagePath) {
  const body = fs.readFileSync(localPath);
  for (let a = 0; a < 4; a++) {
    const r = await fetch(`${STORAGE}/object/${BUCKET}/${storagePath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STORAGE_KEY}`,
        'Content-Type': 'video/mp4',
        'x-upsert': 'true',
      },
      body,
    });
    if (r.ok) return;
    const t = await r.text();
    if (r.status >= 500 || r.status === 429) { await sleep(2000 * (a + 1)); continue; }
    throw new Error(`upload ${r.status}: ${t.slice(0, 200)}`);
  }
  throw new Error('upload falhou após as tentativas');
}

// ─── principal ───────────────────────────────────────────────────────────────
const account = await storageAccount();
const [folderRow] = await sql(
  `select folder_id, folder_name from drive_storage_accounts where email = '${esc(account.email)}'`,
);
const folderId = folderRow?.folder_id || null;

console.log(`conta de armazenamento: ${account.email}`);
console.log(`espaço livre: ${(account.freeBytes / 1e9).toFixed(0)} GB`);
console.log(`pasta de destino: ${folderRow?.folder_name || '(raiz)'}\n`);

const rows = await sql(`
  select id, title, drive_file_id, size_bytes
    from lessons
   where missing_since is null and type = 'video' and storage_path is null
     and (${EXTS.map(e => `lower(title) like '%.${e}'`).join(' or ')})
   order by size_bytes asc
   ${LIMIT ? `limit ${LIMIT}` : ''}`);

const totalGb = rows.reduce((s, r) => s + Number(r.size_bytes || 0), 0) / 1e9;
console.log(`${rows.length} aula(s) pendente(s), ${totalGb.toFixed(1)} GB no total`);
if (account.freeBytes < totalGb * 1e9) {
  console.log(`⚠ espaço livre menor que o total — vai das menores para as maiores até acabar`);
}
if (DRY) { console.log('modo simulação — nada será feito.'); process.exit(0); }

const contentAt = await contentToken();
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onemed-copy-'));
let ok = 0, quota = 0, falhas = 0;
const erros = [];

for (const row of rows) {
  const label = row.title.slice(0, 44);
  const src = path.join(tmpDir, `${row.id}.src`);
  const out = path.join(tmpDir, `${row.id}.mp4`);
  let copyId = null;
  try {
    await shareWithStorage(row.drive_file_id, contentAt, account.email);
    copyId = await copyToStorage(row.drive_file_id, account.accessToken, folderId, row.title);

    await download(copyId, account.accessToken, src);
    const codecs = await probe(src);
    const plan = planFor(codecs);
    await convert(src, plan, out);

    const bytes = fs.statSync(out).size;
    if (bytes < 1024) throw new Error('saída vazia');

    await upload(out, `${row.id}.mp4`);
    await sql(`update lessons
                  set storage_path = '${row.id}.mp4', mime_type = 'video/mp4', size_bytes = ${bytes}
                where id = '${esc(row.id)}'`);

    ok++;
    console.log(`  ✓ [${plan.kind}] ${codecs.video}/${codecs.audio} · ${(bytes / 1e6).toFixed(0)}MB · ${label}`);
  } catch (err) {
    if (err instanceof QuotaError) {
      quota++;
      console.log(`  ⏳ ${label} → ${err.message}`);
    } else {
      falhas++;
      const msg = String(err.stderr || err.message).slice(0, 170).replace(/\s+/g, ' ');
      erros.push(`${label}: ${msg}`);
      console.log(`  ✗ ${label} → ${msg}`);
    }
  } finally {
    for (const f of [src, out]) { try { fs.unlinkSync(f); } catch { /* já não existe */ } }
  }
}

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`\nconvertidas: ${ok} · ainda em cota: ${quota} · falhas: ${falhas}`);
if (erros.length) {
  console.log('\nerros:');
  for (const e of erros.slice(0, 20)) console.log('  ' + e);
}
if (quota) {
  console.log(`\n${quota} aula(s) seguem com a cota do dia esgotada no Google. A cópia obedece ao`);
  console.log('mesmo limite do download, então não adianta insistir agora — rodar de novo mais');
  console.log('tarde leva as que tiverem janela livre. Cada uma que passa fica resolvida para');
  console.log('sempre: a cópia é nossa e não tem mais cota.');
}
if (KEEP_COPY && ok) {
  console.log('\nAs cópias ficam guardadas no Drive da conta de armazenamento de propósito:');
  console.log('são a única via de acesso a esse conteúdo enquanto o original estiver em cota.');
  console.log('Use --delete-copy se preferir apagá-las depois da conversão.');
}
