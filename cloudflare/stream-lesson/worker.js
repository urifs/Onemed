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
    'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, Content-Type, X-Embed-Ok',
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

// ── A franquia de download é um SALDO que encolhe, não um liga/desliga ──────
// Medido no Drive, no MESMO arquivo e nos MESMOS segundos (aula de 57MB do
// Banco de questões ESTRATÉGIAMED):
//
//     bytes=0-1023       206      bytes=0-16777215   403
//     bytes=0-1048575    206      bytes=0-25165823   403
//     bytes=0-8388607    206      bytes=0-           403
//
// ...e, depois de baixar ~13MB dele, o teto tinha CAÍDO: 8MB passou a dar 403
// e só 2MB ainda respondia. Noventa segundos depois continuava igual, então
// não é limite por janela curta que se recupera sozinho: é saldo diário por
// arquivo que vai sendo consumido.
//
// A consequência prática é a que derrubou a plataforma: o Drive recusa um
// pedido MAIOR do que o saldo que resta, mesmo havendo saldo. Com uma janela
// fixa de 24MB, toda aula com saldo parcial virava 429 ("limite de acessos de
// hoje") mesmo ainda tendo bytes pra entregar — e o aluno, ao abrir a MESMA
// aula direto no Drive, assistia normalmente (o player de lá pede em pedaços
// pequenos e usa o caminho de pré-visualização, que não tem essa franquia).
//
// Daí as duas defesas abaixo, que trabalham juntas:
//
//  1. ESCADA DE JANELAS: se o Drive recusar por franquia, o pedido é refeito
//     com metade da janela, até 1,5MB. Aula com saldo parcial volta a tocar
//     em vez de falhar de cara; só quando NEM o menor pedaço passa é que a
//     aula está de fato sem saldo — aí sim a mensagem de limite diário.
//     Cada 403 custa ~300 bytes, não consome franquia.
//
//  2. CACHE POR TRECHO: cada janela é baixada da origem UMA vez por
//     datacenter (alunos do Brasil caem quase todos no mesmo) e revalidada só
//     depois do TTL — cem alunos assistindo custam ~1 download na franquia em
//     vez de cem. É o que impede o saldo de acabar em primeiro lugar.
//
// Todas as janelas são divisores de 24MB e ficam ALINHADAS à grade da própria
// janela. Isso é o que mantém o cache útil quando a escada desce: um limite
// de 24MB também é limite de 12/6/3/1,5MB, então trechos gravados com uma
// janela continuam batendo com os pedidos das outras.
const CHUNK = 24 * 1024 * 1024;
const ESCADA_JANELAS = [CHUNK, CHUNK / 2, CHUNK / 4, CHUNK / 8, CHUNK / 16];
const CACHE_TTL_SECONDS = 3 * 24 * 3600;
const CACHE_MAX_BYTES = 32 * 1024 * 1024;
// Quanto tempo a janela/conta que funcionou fica lembrada por arquivo. Sem
// isso, um arquivo difícil pagaria as recusas da escada inteira a CADA trecho.
const DICA_TTL_SECONDS = 30 * 60;

// ── DUAS contas de leitura, nesta ordem ────────────────────────────────────
// O `downloadQuotaExceeded` do Google diz "a cota deste ARQUIVO", mas medimos
// que ele acompanha a conta que PEDE, não o arquivo: no mesmo arquivo e no
// mesmo instante, a conta de conteúdo tomava 403 acima de 1KB enquanto a conta
// de armazenamento recebia 206 até 24MB. A conta de conteúdo está com o
// download restringido pelo Google (ela também está 2,8GB acima do limite de
// armazenamento dela), e é ela que servia TODAS as aulas — daí a pane geral.
//
// A saída não depende do Google liberar nada: a conta de conteúdo tem
// `canShare: true` nas pastas dos cursos, então ela mesma concede leitura à
// conta de armazenamento (saudável, plano de 5TB) e o worker passa a ler por
// lá. A conta de conteúdo continua como reserva: pasta que ainda não foi
// compartilhada responde 404 pra conta nova e cai de volta nela sozinha.
const CONTAS = [
  { nome: 'storage', fn: 'drive-storage-token' },
  { nome: 'conteudo', fn: 'drive-access-token' },
];

function cacheKeyFor(fileId, driveRange, exportMime) {
  const r = encodeURIComponent(driveRange || (exportMime ? `export:${exportMime}` : 'full'));
  return new Request(`https://stream-cache.onemed.internal/${fileId}?r=${r}`, { method: 'GET' });
}

function dicaKeyFor(fileId) {
  return new Request(`https://stream-cache.onemed.internal/${fileId}?janela=1`, { method: 'GET' });
}

// Fim do trecho para uma janela: sempre a borda da grade daquela janela, para
// que alunos diferentes peçam exatamente os mesmos intervalos (e o cache seja
// compartilhado). `fimPedido` limita quando o navegador pediu um trecho
// fechado menor que a janela — nesse caso nada é esticado.
function faixaPara(inicio, fimPedido, janela) {
  const fimGrade = Math.floor(inicio / janela) * janela + janela - 1;
  const fim = fimPedido == null ? fimGrade : Math.min(fimPedido, fimGrade);
  return `bytes=${inicio}-${fim}`;
}

export default {
  async fetch(request, env, ctx) {
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

    // O direito de BAIXAR vem na assinatura, não no parâmetro. Antes, `dl` era
    // só um nome de arquivo na URL: qualquer aluno com um link de streaming
    // (todo mundo que assiste tem um) acrescentava `&dl=aula.mp4` e salvava o
    // vídeo, independente do plano. Agora o `member-lesson-token` só assina o
    // sufixo `.dl` para quem tem direito, e é isso que libera o
    // Content-Disposition lá embaixo.
    //
    // A URL SEM `dlok` continua sendo verificada com a mensagem antiga — é o
    // que mantém válidos os links de 2h emitidos antes deste deploy.
    const pediuDownload = url.searchParams.get('dlok') === '1';
    const mensagem = `${fileId}.${exp}.${mimeType}${pediuDownload ? '.dl' : ''}`;
    const expected = await hmacHex(env.LESSON_STREAM_SECRET, mensagem);
    if (!timingSafeEqual(expected, sig)) return new Response('Assinatura inválida', { status: 403, headers: cors });

    const ehExport = mimeType.startsWith(GOOGLE_NATIVE_PREFIX);
    const exportMime = ehExport ? EXPORT_MIME_MAP[mimeType] : null;
    if (ehExport && !exportMime) return new Response('Tipo de arquivo do Google não suportado', { status: 415, headers: cors });

    // O navegador pede `bytes=0-` (do início até o fim) e o Drive recusa o
    // pedido ABERTO — ele avalia o pedido pelo arquivo inteiro. Com um teto
    // explícito a mesma aula responde normalmente; responder 206 com um trecho
    // menor que o pedido é HTTP normal, o navegador lê o Content-Range e pede
    // a continuação sozinho.
    const range = ehExport ? null : request.headers.get('range');
    const casaFaixa = range && /^bytes=(\d+)-(\d*)$/.exec(range);
    const inicio = casaFaixa ? Number(casaFaixa[1]) : null;
    const fimPedido = casaFaixa && casaFaixa[2] !== '' ? Number(casaFaixa[2]) : null;

    const cache = caches.default;
    const ehGet = request.method === 'GET';

    // A janela e a conta que funcionaram por último neste arquivo vêm primeiro.
    let janelaInicial = CHUNK;
    let contasOrdenadas = CONTAS;
    {
      const dica = await cache.match(dicaKeyFor(fileId)).catch(() => null);
      if (dica) {
        const [j, c] = (await dica.text().catch(() => '')).split('|');
        if (casaFaixa && ESCADA_JANELAS.includes(Number(j))) janelaInicial = Number(j);
        const preferida = CONTAS.find(x => x.nome === c);
        if (preferida) contasOrdenadas = [preferida, ...CONTAS.filter(x => x !== preferida)];
      }
    }

    // Sem cabeçalho Range (ou export), existe um único pedido possível: o
    // arquivo inteiro. Com Range, a escada desce da janela lembrada pra baixo.
    const faixas = casaFaixa
      ? ESCADA_JANELAS.filter(j => j <= janelaInicial).map(j => ({ janela: j, faixa: faixaPara(inicio, fimPedido, j) }))
      : [{ janela: null, faixa: ehExport ? null : range }];

    const responderDoCache = (hit) => {
      const headers = new Headers(cors);
      for (const h of ['content-type', 'content-length']) {
        const v = hit.headers.get(h);
        if (v) headers.set(h, v);
      }
      const origRange = hit.headers.get('x-orig-content-range');
      if (origRange) headers.set('content-range', origRange);
      headers.set('accept-ranges', 'bytes');
      headers.set('cache-control', 'private, max-age=0, no-store');
      headers.set('x-cache', 'HIT');
      aplicaDownload(headers);
      const origStatus = Number(hit.headers.get('x-orig-status')) || 200;
      return new Response(hit.body, { status: origStatus, headers });
    };

    // `dl=<nome>` faz o navegador SALVAR em vez de tocar, com o nome exato que
    // aparece na plataforma. É o único jeito de garantir o nome quando o
    // arquivo vem de outra origem: o atributo `download` do <a> é ignorado
    // nesse caso. O nome não vai assinado junto — trocá-lo só muda como o
    // arquivo é salvo no computador de quem já tem o link —, mas ele entra num
    // cabeçalho, então CR/LF precisam sumir antes (senão dá pra injetar
    // cabeçalho), e o `filename*` RFC 5987 é o que preserva os acentos.
    //
    // `pediuDownload` é o que separa quem tem direito: só quando a assinatura
    // cobre o sufixo `.dl` o nome vira anexo.
    function aplicaDownload(headers) {
      const dl = pediuDownload ? url.searchParams.get('dl') : null;
      if (!dl) return;
      const clean = dl.replace(/[\r\n"\\]/g, '').slice(0, 200) || 'arquivo';
      const ascii = clean.replace(/[^\x20-\x7E]/g, '_');
      headers.set(
        'content-disposition',
        `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean)}`,
      );
    }

    const tokens = new Map();
    const buscarToken = async (conta, force) => {
      try {
        const tokenRes = await fetch(`${env.SUPABASE_URL}/functions/v1/${conta.fn}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
          body: force ? '{"force":true}' : '{}',
        });
        // Sem esta checagem, um corpo 200 malformado dava accessToken=undefined
        // e o worker mandava "Bearer undefined" pro Drive → 401 → aluno via erro
        // genérico depois de uma ida à toa ao Google.
        if (tokenRes.ok) return (await tokenRes.json()).accessToken || null;
      } catch { /* conta indisponível: a próxima da lista assume */ }
      return null;
    };
    const pegarToken = async (conta) => {
      if (tokens.has(conta.nome)) return tokens.get(conta.nome);
      const t = await buscarToken(conta, false);
      tokens.set(conta.nome, t);
      return t;
    };
    // Um access_token pode estar DENTRO do prazo e mesmo assim ser recusado: é
    // o que o Google faz quando a autorização da conta é revogada. Em 19/08 isso
    // deixou a plataforma inteira sem vídeo enquanto a função de token seguia
    // devolvendo 200 com o token morto. Agora o 401 dispara uma renovação
    // forçada e uma segunda tentativa — uma vez por conta, por requisição.
    const renovados = new Set();
    const renovarToken = async (conta) => {
      if (renovados.has(conta.nome)) return null;
      renovados.add(conta.nome);
      const t = await buscarToken(conta, true);
      tokens.set(conta.nome, t);
      return t;
    };

    let driveRes = null;
    let faixaServida = null;
    let janelaServida = null;
    let contaServida = null;
    let semSaldo = false;
    let semAcesso = false;

    busca:
    for (const tentativa of faixas) {
      // ── cache primeiro: trecho já visto não volta ao Drive ─────────────
      // (a assinatura já foi conferida — o cache não afrouxa a autenticação;
      // ele só evita gastar a franquia do arquivo com bytes repetidos. A chave
      // não inclui a conta: os bytes são os mesmos, venham de onde vierem)
      const cacheKey = cacheKeyFor(fileId, tentativa.faixa, exportMime);
      if (ehGet) {
        const hit = await cache.match(cacheKey).catch(() => null);
        if (hit) return responderDoCache(hit);
      }

      for (const conta of contasOrdenadas) {
        const token = await pegarToken(conta);
        if (!token) continue;

        const res = ehExport
          ? await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`,
            { headers: { Authorization: `Bearer ${token}` } },
          )
          : await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: {
              Authorization: `Bearer ${token}`,
              ...(tentativa.faixa ? { Range: tentativa.faixa } : {}),
            },
          });

        let resposta = res;

        // 401 = o Google recusou ESTE token (revogado, ou trocado por outra
        // reconexão). Renova à força e tenta uma vez; se ainda falhar, segue
        // para a próxima conta.
        if (resposta.status === 401) {
          const novo = await renovarToken(conta);
          if (novo) {
            resposta = ehExport
              ? await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`,
                { headers: { Authorization: `Bearer ${novo}` } },
              )
              : await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: {
                  Authorization: `Bearer ${novo}`,
                  ...(tentativa.faixa ? { Range: tentativa.faixa } : {}),
                },
              });
          }
        }

        if (resposta.ok || resposta.status === 206) {
          driveRes = resposta;
          faixaServida = tentativa.faixa;
          janelaServida = tentativa.janela;
          contaServida = conta.nome;
          break busca;
        }

        // 404 = esta conta não enxerga o arquivo (pasta ainda não
        // compartilhada com ela). Não é problema do arquivo: a próxima conta
        // da lista tenta.
        if (resposta.status === 404) { semAcesso = true; continue; }

        // 403 `downloadQuotaExceeded`: o Google recusa um pedido MAIOR do que
        // o que resta para esta conta. Pedir menos ainda pode passar — é o que
        // a escada tenta depois de esgotar as contas.
        const body = await resposta.text().catch(() => '');
        if (resposta.status === 403 && body.includes('downloadQuotaExceeded')) { semSaldo = true; continue; }

        // Qualquer outro erro (403 de permissão, 5xx do Google, token
        // recusado) é DESTA conta — abortar aqui deixava a aula fora do ar
        // mesmo com a outra conta conseguindo servi-la. Segue para a próxima
        // tentativa; se nenhuma servir, o tratamento abaixo responde.
        console.log('Falha ao ler pela conta', conta.nome, '-', resposta.status, body.slice(0, 120));
        continue;
      }
    }

    if (!driveRes) {
      if (!semSaldo) {
        return new Response(
          semAcesso ? 'Arquivo indisponível' : 'Não foi possível carregar o arquivo',
          { status: 502, headers: cors },
        );
      }
      // Nem o menor pedaço passou: a aula está sem saldo de verdade hoje.
      //
      // O player tem um plano B — embutir o player público do armazenamento —
      // mas ele SÓ funciona quando o arquivo é compartilhado por link
      // ("qualquer pessoa com o link"). Vários cursos vêm de contas que
      // compartilham só com a nossa conta de leitura: para esses, o embed
      // mostrava "Você precisa ter acesso" pro aluno (pior: com botão de pedir
      // acesso de EDITOR ao dono do arquivo). A sonda abaixo é anônima,
      // exatamente como o iframe do aluno: 200 = o embed abre; qualquer outra
      // coisa (401/302 de login) = não oferecer.
      //
      // A mensagem NÃO cita o Google Drive: para o aluno a OneMed é a
      // plataforma inteira, e onde o arquivo está guardado por trás é detalhe
      // de infraestrutura nosso.
      let embedOk = '0';
      try {
        const probe = await fetch(`https://drive.google.com/file/d/${fileId}/preview`, { redirect: 'manual' });
        if (probe.status === 200) embedOk = '1';
      } catch { /* na dúvida, não oferece o embed */ }
      const quotaHeaders = new Headers(cors);
      quotaHeaders.set('X-Embed-Ok', embedOk);
      return new Response(
        'Esta aula atingiu o limite de acessos de hoje. '
        + 'Ela volta a abrir automaticamente em algumas horas — as demais aulas seguem normais.',
        { status: 429, headers: quotaHeaders },
      );
    }

    // Guarda a janela e a conta que funcionaram, para os próximos trechos
    // deste arquivo não pagarem as recusas da escada de novo.
    if (ehGet && contaServida) {
      ctx.waitUntil(cache.put(
        dicaKeyFor(fileId),
        new Response(`${janelaServida || ''}|${contaServida}`, {
          headers: { 'content-type': 'text/plain', 'cache-control': `public, max-age=${DICA_TTL_SECONDS}` },
        }),
      ).catch(() => {}));
    }

    // ── grava o trecho no cache do datacenter enquanto serve o aluno ─────
    // tee(): o mesmo fluxo de bytes vai pro navegador E pro cache, sem
    // segurar o arquivo em memória. Só trechos com tamanho conhecido e
    // dentro do teto; a Cache API não aceita 206, então o status/content-range
    // originais viajam em cabeçalhos x-orig-*.
    let bodyParaCliente = driveRes.body;
    const tamanho = Number(driveRes.headers.get('content-length') || 0);
    if (ehGet && driveRes.body && tamanho > 0 && tamanho <= CACHE_MAX_BYTES
        && (driveRes.status === 200 || driveRes.status === 206)) {
      const [cliente, paraCache] = driveRes.body.tee();
      bodyParaCliente = cliente;
      const cacheHeaders = new Headers();
      const ct = driveRes.headers.get('content-type');
      if (ct) cacheHeaders.set('content-type', ct);
      cacheHeaders.set('content-length', String(tamanho));
      cacheHeaders.set('x-orig-status', String(driveRes.status));
      const cr = driveRes.headers.get('content-range');
      if (cr) cacheHeaders.set('x-orig-content-range', cr);
      cacheHeaders.set('cache-control', `public, max-age=${CACHE_TTL_SECONDS}`);
      ctx.waitUntil(
        cache.put(
          cacheKeyFor(fileId, faixaServida, exportMime),
          new Response(paraCache, { status: 200, headers: cacheHeaders }),
        ).catch(() => {}),
      );
    }

    const headers = new Headers(cors);
    for (const h of ['content-type', 'content-length', 'content-range']) {
      const v = driveRes.headers.get(h);
      if (v) headers.set(h, v);
    }
    headers.set('accept-ranges', 'bytes');
    headers.set('cache-control', 'private, max-age=0, no-store');
    headers.set('x-cache', 'MISS');
    aplicaDownload(headers);

    return new Response(bodyParaCliente, { status: driveRes.status, headers });
  },
};
