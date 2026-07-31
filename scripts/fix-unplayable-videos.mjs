#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// OneMed · conserta aulas em formato que o navegador não toca
//
// A biblioteca tem vídeo em container/codec que nenhum <video> nativo abre.
// Já resolvemos dois casos antes: `.ts` (MPEG-TS remuxado no navegador pelo
// mpegts.js) e `.wmv` (retranscodificado e servido do Supabase Storage). Este
// script generaliza o segundo caminho e decide arquivo a arquivo o que fazer,
// olhando o codec REAL em vez do nome:
//
//   vídeo h264 + áudio aac  →  REMUX (-c copy): troca só o container, é
//                              instantâneo e não perde nada de qualidade
//   vídeo h264 + outro áudio→  copia o vídeo, recodifica só o áudio
//   qualquer outro codec    →  TRANSCODIFICA para h264/aac
//
// Isso importa: a amostragem mostrou `.mkv` que já é h264/aac (remux resolve)
// convivendo com `.mkv` VP9/Opus, e `.mov` que é HEVC convivendo com `.mov`
// Sorenson SVQ3 dos anos 2000. Decidir pelo nome do arquivo erraria nos dois.
//
// O resultado vai pro bucket `lesson-media` e a aula passa a apontar pra lá
// (`lessons.storage_path`), igual às 58 `.wmv` migradas antes. O arquivo
// original no Drive nunca é tocado.
//
// Uso:
//   SUPABASE_MGMT_TOKEN=... SUPABASE_SECRET_KEY=... SUPABASE_SERVICE_JWT=... \
//     node scripts/fix-unplayable-videos.mjs --ext=mkv,mpg [--limit=10] [--dry]
// ─────────────────────────────────────────────────────────────────────────────
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const exec = promisify(execFile);

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jrrybiohwqabsdurqudc';
const MGMT_TOKEN = req('SUPABASE_MGMT_TOKEN');
const SECRET_KEY = req('SUPABASE_SECRET_KEY');
// O Storage do Supabase valida um JWT de verdade e recusa a chave no formato
// novo (`sb_secret_...`) com "Invalid Compact JWS" — precisa da service_role
// legada. As Edge Functions, ao contrário, esperam a chave nova. Duas chaves
// diferentes para dois serviços do mesmo projeto.
const STORAGE_KEY = process.env.SUPABASE_SERVICE_JWT || SECRET_KEY;
const BUCKET = process.env.BUCKET || 'lesson-media';
const CONCURRENCY = Number(process.env.CONCURRENCY || 2);

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const EXTS = String(args.ext || 'mkv,mpg').split(',').map(s => s.trim().toLowerCase());
const LIMIT = args.limit ? Number(args.limit) : null;
const DRY = !!args.dry;

function req(name) {
  const v = process.env[name];
  if (!v) { console.error(`falta a variável de ambiente ${name}`); process.exit(1); }
  return v;
}

const MGMT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const STORAGE = `https://${PROJECT_REF}.supabase.co/storage/v1`;
const FN = `https://${PROJECT_REF}.supabase.co/functions/v1`;

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
    throw new Error(`SQL ${r.status}: ${body.slice(0, 200)}`);
  }
  throw new Error('SQL falhou após as tentativas');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/'/g, "''");

// Token do Drive: a mesma Edge Function que o resto do projeto usa, então o
// client secret do Google não precisa sair do Supabase.
// Cache curto de propósito. O token do Drive vale 1 hora, mas quem o entrega é
// o `drive_config` compartilhado — quando pegamos, ele já pode estar com 55
// minutos de vida. Cachear por 40 minutos pelo NOSSO relógio fez uma corrida
// longa de .mov perder 46 arquivos seguidos com 403: o ffmpeg recebia um token
// que morria no meio da conversão de um arquivo de 5 GB, e todos os seguintes
// herdavam o mesmo token morto. 5 minutos custa uma chamada barata por arquivo
// e elimina a classe inteira de falha.
let token = null, tokenAt = 0;
async function driveToken(force = false) {
  if (!force && token && Date.now() - tokenAt < 5 * 60 * 1000) return token;
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(`${FN}/drive-access-token`, { method: 'POST', headers: { Authorization: `Bearer ${SECRET_KEY}` } });
      const j = await r.json();
      if (j.accessToken) { token = j.accessToken; tokenAt = Date.now(); return token; }
    } catch { /* tenta de novo */ }
    await sleep(1000 * (a + 1));
  }
  throw new Error('não foi possível obter access token do Drive');
}

/**
 * Baixa o arquivo do Drive para disco antes de converter.
 *
 * Ler direto por HTTP no ffmpeg parecia mais elegante (não gasta disco), mas
 * baixar primeiro deixa o erro do Google legível: com o ffmpeg no meio, tudo
 * o que sobra é "Server returned 403", sem o corpo da resposta que diz o
 * motivo — foi o que me fez perseguir a causa errada por duas rodadas.
 *
 * Aqui o corpo é sempre lido. O 403 dos `.mov` era `downloadQuotaExceeded`:
 * COTA DE DOWNLOAD DO PRÓPRIO ARQUIVO no Drive, não autenticação. Vale por
 * arquivo (o resto do acervo continua baixando normalmente) e o Google
 * reseta sozinho em ~24h. Não há o que consertar no código: é esperar e
 * rodar de novo, e o script é idempotente justamente pra isso.
 */
class QuotaError extends Error {}

async function download(url, at, dest) {
  // `-w %{http_code}` em vez de `--fail`: precisamos do corpo do erro, e
  // `--fail` descarta exatamente ele.
  const { stdout } = await exec('curl', [
    '-sSL', '--retry', '3', '--retry-delay', '2',
    '-H', `Authorization: Bearer ${at}`,
    '-w', '%{http_code}',
    url, '-o', dest,
  ], { maxBuffer: 1 << 22, timeout: 2 * 3600 * 1000 });

  const code = Number(String(stdout).trim().slice(-3));
  if (code !== 200 && code !== 206) {
    // Em erro o Drive escreve o JSON no arquivo de saída.
    let body = '';
    try { body = fs.readFileSync(dest, 'utf8').slice(0, 400); } catch { /* sem corpo */ }
    if (body.includes('downloadQuotaExceeded')) {
      throw new QuotaError('cota de download DESTE arquivo esgotada no Google Drive — reseta sozinha em ~24h');
    }
    throw new Error(`download HTTP ${code}: ${body.replace(/\s+/g, ' ').slice(0, 160)}`);
  }

  const size = fs.statSync(dest).size;
  if (size < 1024) throw new Error('download vazio');
  return size;
}

/** Codecs reais do arquivo já baixado. */
async function probe(localPath) {
  const { stdout } = await exec('ffprobe', [
    '-v', 'error',
    '-show_entries', 'stream=codec_type,codec_name', '-of', 'json', localPath,
  ], { maxBuffer: 1 << 24, timeout: 240000 });
  const streams = JSON.parse(stdout).streams || [];
  return {
    video: streams.find(s => s.codec_type === 'video')?.codec_name ?? null,
    audio: streams.find(s => s.codec_type === 'audio')?.codec_name ?? null,
  };
}

/** Decide a operação mais barata que ainda entrega um MP4 tocável. */
function planFor({ video, audio }) {
  const NATIVE_VIDEO = video === 'h264';
  const NATIVE_AUDIO = audio === 'aac' || audio === null;

  if (NATIVE_VIDEO && NATIVE_AUDIO) {
    return { kind: 'remux', args: ['-c', 'copy'] };
  }
  if (NATIVE_VIDEO) {
    return { kind: 'audio', args: ['-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k'] };
  }
  return {
    kind: 'transcode',
    // veryfast + crf 24: o acervo é aula gravada (slides e câmera), onde a
    // diferença visual para presets lentos não aparece e o tempo de máquina
    // triplicaria.
    args: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k'],
  };
}

async function convert(srcPath, plan, outPath) {
  await exec('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-i', srcPath,
    ...plan.args,
    // faststart põe o índice no começo: sem isso o navegador precisa baixar o
    // arquivo inteiro antes de começar a tocar.
    '-movflags', '+faststart',
    outPath,
  ], { maxBuffer: 1 << 24, timeout: 3 * 3600 * 1000 });
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

// ─── main ────────────────────────────────────────────────────────────────────
const extFilter = EXTS.map(e => `'\\.${e}$'`).join('|');
const rows = await sql(`
  select id, title, drive_file_id, size_bytes
    from lessons
   where missing_since is null and type = 'video' and storage_path is null
     and (${EXTS.map(e => `lower(title) like '%.${e}'`).join(' or ')})
   order by size_bytes asc
   ${LIMIT ? `limit ${LIMIT}` : ''}`);

console.log(`${rows.length} aula(s) para converter (${EXTS.join(', ')})`);
if (DRY) {
  console.log('modo simulação — nada será convertido.');
  process.exit(0);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onemed-vid-'));
let ok = 0, failed = 0, quotaHit = 0, done = 0;
const stats = { remux: 0, audio: 0, transcode: 0 };
const errors = [];

async function worker() {
  for (;;) {
    const row = rows.shift();
    if (!row) return;
    const url = `https://www.googleapis.com/drive/v3/files/${row.drive_file_id}?alt=media`;
    const src = path.join(tmpDir, `${row.id}.src`);
    const out = path.join(tmpDir, `${row.id}.mp4`);
    const label = row.title.slice(0, 48);
    try {
      const at = await driveToken();
      await download(url, at, src);
      const codecs = await probe(src);
      const plan = planFor(codecs);
      await convert(src, plan, out);

      const bytes = fs.statSync(out).size;
      if (bytes < 1024) throw new Error('saída vazia');

      await upload(out, `${row.id}.mp4`);
      await sql(`update lessons
                    set storage_path = '${row.id}.mp4',
                        mime_type = 'video/mp4',
                        size_bytes = ${bytes}
                  where id = '${esc(row.id)}'`);

      stats[plan.kind]++;
      ok++;
      console.log(`  ✓ [${plan.kind}] ${codecs.video}/${codecs.audio} · ${(bytes / 1e6).toFixed(0)}MB · ${label}`);
    } catch (err) {
      const msg = String(err.stderr || err.message).slice(0, 160).replace(/\s+/g, ' ');
      if (err instanceof QuotaError) {
        // Não é falha nossa e não adianta tentar de novo agora: separado na
        // contagem pra não poluir o número de erros de verdade.
        quotaHit++;
        console.log(`  ⏳ ${label} → ${msg}`);
      } else {
        failed++;
        errors.push(`${label}: ${msg}`);
        console.log(`  ✗ ${label} → ${msg}`);
      }
    } finally {
      // Apaga sempre: o disco desta máquina é pequeno perto do acervo.
      // O acervo é maior que o disco desta máquina: apaga origem e saída
      // sempre, mesmo em falha.
      for (const f of [src, out]) { try { fs.unlinkSync(f); } catch { /* já não existe */ } }
      done++;
      if (done % 10 === 0) console.log(`     … ${done} processadas (${ok} ok, ${failed} falhas, ${quotaHit} em cota)`);
    }
  }
}

const t0 = Date.now();
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`\nconcluído em ${((Date.now() - t0) / 60000).toFixed(1)} min`);
console.log(`ok: ${ok} · falhas: ${failed} · bloqueadas por cota do Drive: ${quotaHit}`);
console.log(`por operação → remux: ${stats.remux} · só áudio: ${stats.audio} · transcodificado: ${stats.transcode}`);
if (errors.length) {
  console.log('\nerros:');
  for (const e of errors.slice(0, 20)) console.log('  ' + e);
}
if (quotaHit) {
  console.log(`\n${quotaHit} aula(s) ficaram de fora só porque o Google esgotou a cota de`);
  console.log('download daqueles arquivos. Nada a corrigir aqui: rodar o mesmo comando');
  console.log('depois de ~24h retoma exatamente essas (o filtro é storage_path IS NULL).');
}
process.exit(failed > 0 && ok === 0 ? 1 : 0);
