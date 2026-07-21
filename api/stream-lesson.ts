// Proxy de streaming: busca os bytes da aula direto do Google Drive usando o
// token OAuth do admin (via drive-access-token) e devolve pro navegador do
// aluno. Existe porque o Drive manda `Cross-Origin-Resource-Policy: same-site`
// em toda resposta de download — o navegador bloqueia isso se o <video>/<img>/
// PDF tentar buscar direto do Drive, não importa o que o CORS diga (ver
// member-lesson-token). Rodando na Vercel (não na Supabase) porque o objetivo
// original disso tudo foi zerar o egress cobrado pela Supabase; aqui a resposta
// é same-origin com a própria onemedcursos.com.br, então o navegador nunca
// aplica CORP/CORS.
export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const LESSON_STREAM_SECRET = process.env.LESSON_STREAM_SECRET!;

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const fileId = url.searchParams.get('id');
  const exp = url.searchParams.get('exp');
  const sig = url.searchParams.get('sig');
  if (!fileId || !exp || !sig) return new Response('Requisição inválida', { status: 400 });

  const expiresAt = parseInt(exp, 10);
  if (!Number.isFinite(expiresAt) || Date.now() / 1000 > expiresAt) {
    return new Response('Link expirado', { status: 403 });
  }

  const expected = await hmacHex(LESSON_STREAM_SECRET, `${fileId}.${exp}`);
  if (!timingSafeEqual(expected, sig)) return new Response('Assinatura inválida', { status: 403 });

  const tokenRes = await fetch(`${SUPABASE_URL}/functions/v1/drive-access-token`, {
    headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!tokenRes.ok) return new Response('Drive indisponível', { status: 502 });
  const { accessToken } = (await tokenRes.json()) as { accessToken: string };

  const range = req.headers.get('range');
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
}
