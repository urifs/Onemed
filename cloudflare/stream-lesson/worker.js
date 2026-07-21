// Proxy de streaming: busca os bytes da aula direto do Google Drive usando o
// token OAuth do admin (via drive-access-token) e devolve pro navegador do
// aluno. Existe porque o Drive manda `Cross-Origin-Resource-Policy: same-site`
// em toda resposta de download — o navegador bloqueia isso se o <video>/<img>/
// PDF tentar buscar direto do Drive, não importa o que o CORS diga (ver
// member-lesson-token). Rodando na Cloudflare (não na Vercel/Supabase) porque
// a Cloudflare não cobra por tráfego de saída em Workers — o objetivo disso
// tudo é zerar o custo de egress, e aqui não existe cobrança por banda.
//
// Código-fonte deste Worker: cloudflare/stream-lesson/worker.js — o deploy é
// feito direto via API da Cloudflare (Workers Scripts), não tem CI automático
// ligado a esse repositório; qualquer alteração aqui precisa ser reenviada
// manualmente (ver histórico do projeto pra token/conta usados no deploy).
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const fileId = url.searchParams.get('id');
    const exp = url.searchParams.get('exp');
    const sig = url.searchParams.get('sig');
    if (!fileId || !exp || !sig) return new Response('Requisição inválida', { status: 400 });

    const expiresAt = parseInt(exp, 10);
    if (!Number.isFinite(expiresAt) || Date.now() / 1000 > expiresAt) {
      return new Response('Link expirado', { status: 403 });
    }

    const expected = await hmacHex(env.LESSON_STREAM_SECRET, `${fileId}.${exp}`);
    if (!timingSafeEqual(expected, sig)) return new Response('Assinatura inválida', { status: 403 });

    const tokenRes = await fetch(`${env.SUPABASE_URL}/functions/v1/drive-access-token`, {
      headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (!tokenRes.ok) return new Response('Drive indisponível', { status: 502 });
    const { accessToken } = await tokenRes.json();

    const range = request.headers.get('range');
    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(range ? { Range: range } : {}),
      },
    });

    if (!driveRes.ok && driveRes.status !== 206) {
      return new Response('Não foi possível carregar o arquivo', { status: 502 });
    }

    const headers = new Headers();
    for (const h of ['content-type', 'content-length', 'content-range']) {
      const v = driveRes.headers.get(h);
      if (v) headers.set(h, v);
    }
    headers.set('accept-ranges', 'bytes');
    headers.set('cache-control', 'private, max-age=0, no-store');

    return new Response(driveRes.body, { status: driveRes.status, headers });
  },
};
