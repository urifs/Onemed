// Proxy de streaming: busca os bytes da aula direto do Google Drive usando o
// token OAuth do admin (via drive-access-token) e devolve pro navegador do
// aluno. Existe porque o Drive manda `Cross-Origin-Resource-Policy: same-site`
// em toda resposta de download — o navegador bloqueia isso se o <video>/<img>/
// PDF tentar buscar direto do Drive, não importa o que o CORS diga (ver
// member-lesson-token). Rodando na Cloudflare (não na Vercel/Supabase) porque
// a Cloudflare não cobra por tráfego de saída em Workers — o objetivo disso
// tudo é zerar o custo de egress, e aqui não existe cobrança por banda.
//
// Cabeçalhos CORS são obrigatórios aqui: <video src>/<img src> usam modo
// no-cors (não checam CORS), mas o PdfViewer carrega o PDF via fetch() do
// pdf.js, que É modo cors de verdade — sem Access-Control-Allow-Origin o
// navegador bloqueia a leitura da resposta (mesmo com HTTP 200) e o PDF fica
// carregando pra sempre. Range também não é "simple header", então navegador
// manda um preflight OPTIONS antes de pedir bytes com Range.
//
// Código-fonte deste Worker: cloudflare/stream-lesson/worker.js — o deploy é
// feito direto via API da Cloudflare (Workers Scripts), não tem CI automático
// ligado a esse repositório; qualquer alteração aqui precisa ser reenviada
// manualmente (ver histórico do projeto pra token/conta usados no deploy).
const ALLOWED_ORIGINS = ['https://onemedcursos.com.br', 'http://localhost:5173', 'http://localhost:3000'];

function corsHeaders(request) {
  const origin = request.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range',
    'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

// Google Docs/Sheets/Slides nativos não têm bytes "crus" pra baixar —
// alt=media falha pra esses (são só metadados no Drive, o conteúdo real vive
// nos servidores do Google Docs). Precisam do endpoint /export, que converte
// pra um formato concreto na hora. Exporta pro formato Office equivalente em
// vez de PDF pra poder reaproveitar o mesmo visualizador (Office Online) que
// já é usado pros arquivos .docx/.xlsx enviados de verdade.
const GOOGLE_NATIVE_PREFIX = 'application/vnd.google-apps.';
const EXPORT_MIME_MAP = {
  'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);
    const fileId = url.searchParams.get('id');
    const exp = url.searchParams.get('exp');
    const sig = url.searchParams.get('sig');
    const mimeType = url.searchParams.get('mime') || '';
    if (!fileId || !exp || !sig) return new Response('Requisição inválida', { status: 400, headers: cors });

    const expiresAt = parseInt(exp, 10);
    if (!Number.isFinite(expiresAt) || Date.now() / 1000 > expiresAt) {
      return new Response('Link expirado', { status: 403, headers: cors });
    }

    const expected = await hmacHex(env.LESSON_STREAM_SECRET, `${fileId}.${exp}.${mimeType}`);
    if (!timingSafeEqual(expected, sig)) return new Response('Assinatura inválida', { status: 403, headers: cors });

    const tokenRes = await fetch(`${env.SUPABASE_URL}/functions/v1/drive-access-token`, {
      headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (!tokenRes.ok) return new Response('Drive indisponível', { status: 502, headers: cors });
    const { accessToken } = await tokenRes.json();

    let driveRes;
    if (mimeType.startsWith(GOOGLE_NATIVE_PREFIX)) {
      const exportMime = EXPORT_MIME_MAP[mimeType];
      if (!exportMime) return new Response('Tipo de arquivo do Google não suportado', { status: 415, headers: cors });
      driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
    } else {
      const range = request.headers.get('range');
      driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(range ? { Range: range } : {}),
        },
      });
    }

    if (!driveRes.ok && driveRes.status !== 206) {
      // O Drive limita quantos bytes de UM MESMO arquivo podem ser baixados
      // por dia. Quando estoura, responde 403 `downloadQuotaExceeded` — e o
      // aluno via só "não foi possível carregar", que parece defeito da
      // plataforma e vira chamado no suporte. É por arquivo e reseta sozinho,
      // então a informação útil é "essa aula volta em algumas horas".
      const body = await driveRes.text().catch(() => '');
      if (driveRes.status === 403 && body.includes('downloadQuotaExceeded')) {
        return new Response(
          'Esta aula atingiu o limite diário de acessos do Google Drive. '
          + 'Ela volta a abrir automaticamente em algumas horas — as outras aulas seguem normais.',
          { status: 429, headers: cors },
        );
      }
      return new Response('Não foi possível carregar o arquivo', { status: 502, headers: cors });
    }

    const headers = new Headers(cors);
    for (const h of ['content-type', 'content-length', 'content-range']) {
      const v = driveRes.headers.get(h);
      if (v) headers.set(h, v);
    }
    headers.set('accept-ranges', 'bytes');
    headers.set('cache-control', 'private, max-age=0, no-store');

    // `dl=<nome>` faz o navegador SALVAR em vez de tocar, com o nome exato que
    // aparece na plataforma. É o único jeito de garantir o nome quando o
    // arquivo vem de outra origem: o atributo `download` do <a> é ignorado
    // nesse caso. Assim o vídeo é escrito direto no disco, sem a aba ter que
    // segurar o arquivo inteiro na memória.
    //
    // O nome não vai assinado junto — trocá-lo só muda como o arquivo é salvo
    // no computador de quem já tem o link, não dá acesso a nada. Mas ele entra
    // num cabeçalho, então CR/LF precisam sumir antes (senão dá pra injetar
    // cabeçalho), e o `filename*` RFC 5987 é o que preserva os acentos dos
    // títulos em português.
    const dl = url.searchParams.get('dl');
    if (dl) {
      const clean = dl.replace(/[\r\n"\\]/g, '').slice(0, 200) || 'arquivo';
      const ascii = clean.replace(/[^\x20-\x7E]/g, '_');
      headers.set(
        'content-disposition',
        `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean)}`,
      );
    }

    return new Response(driveRes.body, { status: driveRes.status, headers });
  },
};
