/* Gravação das telas da prism.face na versão nova (interativa e resumida). */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'https://prismface.com.br';
const OUT = __dirname + '/pf/takes';
const STATE = __dirname + '/pf_state.json';
const PLANO = process.env.PF_PLANO || '';
const LEITURA = process.env.PF_LEITURA || '';   // leitura feita com o rosto fictício
const ROSTO = fs.readFileSync(__dirname + '/rosto_ficticio.jpg');
const CURSOR_JS = fs.readFileSync(__dirname + '/cursor.js', 'utf8');

/* PF_NOME_REAL: primeiro nome a esconder · PF_NOME_FALSO: o que entra no lugar */
const NOME_REAL = process.env.PF_NOME_REAL || 'NomeReal';
const NOME_FALSO = process.env.PF_NOME_FALSO || 'Marina';
const MASCARA_JS = `
(() => {
  const RE = new RegExp(NOME_REAL, 'g');
  const troca = no => {
    if (no.nodeType === 3) { if (RE.test(no.nodeValue)) no.nodeValue = no.nodeValue.replace(RE, '${NOME_FALSO}'); return; }
    if (no.nodeType !== 1) return;
    if (no.tagName === 'SCRIPT' || no.tagName === 'STYLE') return;
    if (typeof no.value === 'string' && RE.test(no.value)) no.value = no.value.replace(RE, '${NOME_FALSO}');
    for (const f of no.childNodes) troca(f);
  };
  const varrer = () => { if (document.body) troca(document.body); };
  const ligar = () => { varrer(); new MutationObserver(varrer).observe(document.body, {childList:true,subtree:true,characterData:true}); setInterval(varrer, 400); };
  document.body ? ligar() : addEventListener('DOMContentLoaded', ligar);
})();`;

async function novoCtx(browser, { logado = true } = {}) {
  const ctx = await browser.newContext({
    ...(logado ? { storageState: STATE } : {}),
    viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    permissions: ['camera'], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
    recordVideo: { dir: OUT, size: { width: 860, height: 1864 } },
  });
  await ctx.route('**/*', async r => {
    const req = r.request();
    if (/\/storage\/v1\/object\/(sign|public)\/scans\//.test(req.url())) {
      try { return await r.fulfill({ status: 200, contentType: 'image/jpeg', body: ROSTO }); } catch {}
    }
    try {
      await r.fulfill({ response: await r.fetch({
        method: req.method(), headers: req.headers(),
        postData: req.postData() ?? undefined, timeout: 300000,
      }) });
    } catch { try { await r.abort(); } catch {} }
  });
  await ctx.addInitScript(CURSOR_JS);
  await ctx.addInitScript(MASCARA_JS);
  /* arrastar não pode pintar seleção azul por cima da tela */
  await ctx.addInitScript(`
    (() => {
      const por = () => {
        const st = document.createElement('style');
        st.textContent = '*{-webkit-user-select:none!important;user-select:none!important;-webkit-tap-highlight-color:transparent!important}';
        document.head.appendChild(st);
      };
      document.head ? por() : addEventListener('DOMContentLoaded', por);
    })();`);
  return ctx;
}
async function salvar(ctx, page, nome) {
  const v = page.video(); await page.close(); await ctx.close();
  fs.renameSync(await v.path(), `${OUT}/${nome}.webm`);
  console.log('take:', nome);
}
async function rolar(page, px, ms = 2400) {
  await page.evaluate(([px, ms]) => new Promise(res => {
    const ini = window.scrollY, t0 = performance.now();
    const passo = () => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      const e = p < .5 ? 2*p*p : 1-Math.pow(-2*p+2,2)/2;
      window.scrollTo(0, ini + px * e);
      p < 1 ? requestAnimationFrame(passo) : res();
    };
    requestAnimationFrame(passo);
  }), [px, ms]);
}
/** leva o elemento ao terço superior da tela, com rolagem suave */
async function ate(page, loc, margem = 220) {
  const y = await loc.evaluate(el => el.getBoundingClientRect().top + window.scrollY).catch(() => null);
  if (y == null) return false;
  const alvo = Math.max(0, y - margem);
  await page.evaluate(([alvo, ms]) => new Promise(res => {
    const ini = window.scrollY, t0 = performance.now(), d = alvo - ini;
    const passo = () => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      const e = p < .5 ? 2*p*p : 1-Math.pow(-2*p+2,2)/2;
      window.scrollTo(0, ini + d * e);
      p < 1 ? requestAnimationFrame(passo) : res();
    };
    requestAnimationFrame(passo);
  }), [alvo, 1800]);
  await page.waitForTimeout(500);
  return true;
}
/** move o ponteiro até o alvo antes de clicar — o cursor aparece no vídeo */
async function tocar(page, loc, espera = 1500) {
  const c = await loc.boundingBox();
  if (!c) return false;
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2, { steps: 22 });
  await page.waitForTimeout(420);
  await loc.click({ force: true }).catch(() => {});
  await page.waitForTimeout(espera);
  return true;
}
async function fecharFolha(page, espera = 900) {
  const x = page.locator('[aria-label="Fechar"]').first();
  if (await x.count()) await tocar(page, x, espera);
  else { await page.keyboard.press('Escape'); await page.waitForTimeout(espera); }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium' });
  const alvo = process.argv[2] || 'todos';
  const roda = n => alvo === 'todos' || alvo === n;

  /* landing pública */
  if (roda('t_landing')) {
    const ctx = await novoCtx(browser, { logado: false }); const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3200);
    await rolar(page, 520, 2600); await page.waitForTimeout(1400);
    await rolar(page, 560, 2600); await page.waitForTimeout(1400);
    await rolar(page, 520, 2400); await page.waitForTimeout(1800);
    await salvar(ctx, page, 't_landing');
  }

  /* como funciona: quatro cartões desenhados */
  if (roda('t_metodo')) {
    const ctx = await novoCtx(browser, { logado: false }); const page = await ctx.newPage();
    await page.goto(BASE + '/como-funciona', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    for (const px of [430, 420, 430, 430, 420]) { await rolar(page, px, 2500); await page.waitForTimeout(1500); }
    await salvar(ctx, page, 't_metodo');
  }

  /* painel */
  if (roda('t_painel')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(BASE + '/painel', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4500);
    await rolar(page, 240, 2000); await page.waitForTimeout(2600);
    await salvar(ctx, page, 't_painel');
  }

  /* preparação: cinco rostinhos no arco */
  if (roda('t_prep')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(BASE + '/capturar', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await rolar(page, 300, 2400); await page.waitForTimeout(2000);
    await rolar(page, 260, 2200); await page.waitForTimeout(2400);
    await salvar(ctx, page, 't_prep');
  }

  /* leitura: abre com a foto e os pontos, toca num ponto */
  if (roda('t_leitura')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(`${BASE}/leitura/${LEITURA}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5500);
    const pontos = page.locator('button[aria-label*="ochecha"], button[aria-label*="esta"], [data-ponto], button[aria-label*="ariz"]');
    const n = await pontos.count();
    console.log('pontos no rosto:', n);
    if (n) { await tocar(page, pontos.nth(Math.min(1, n - 1)), 2600); await fecharFolha(page, 1200); }
    await page.waitForTimeout(1200);
    await salvar(ctx, page, 't_leitura');
  }

  /* mapa em três dimensões, sob demanda */
  if (roda('t_mapa3d')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(`${BASE}/leitura/${LEITURA}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5500);
    const b = page.locator('button:has-text("Ver o mapa em três dimensões")').first();
    if (await b.count()) await tocar(page, b, 3800);
    /* gira com o dedo */
    const cx = 215, cy = 430;
    await page.mouse.move(cx, cy, { steps: 10 });
    await page.mouse.down();
    for (const dx of [-70, -40, 30, 90, 60, -30]) {
      await page.mouse.move(cx + dx, cy + (dx % 40) / 3, { steps: 14 });
      await page.waitForTimeout(260);
    }
    await page.mouse.up();
    await page.waitForTimeout(2200);
    await salvar(ctx, page, 't_mapa3d');
  }

  /* achados: linha a linha, e a folha de detalhe */
  if (roda('t_achados')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(`${BASE}/leitura/${LEITURA}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5500);
    const titulo = page.locator('text=O que encontramos').first();
    await ate(page, titulo, 200);
    await page.waitForTimeout(2400);
    const linha = page.locator('button:has-text("Poros dilatados")').first();
    if (await linha.count()) { await tocar(page, linha, 3000); await rolar(page, 0, 100); await fecharFolha(page, 1200); }
    await page.waitForTimeout(1600);
    await salvar(ctx, page, 't_achados');
  }

  /* ritual: abas manhã/noite e a folha do passo */
  if (roda('t_ritual')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(`${BASE}/leitura/${LEITURA}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5500);
    const titulo = page.locator('text=Seu ritual').first();
    await ate(page, titulo, 170);
    await page.waitForTimeout(2200);
    const noite = page.locator('[role=tab]:has-text("Noite")').first();
    if (await noite.count()) await tocar(page, noite, 2400);
    const manha = page.locator('[role=tab]:has-text("Manhã")').first();
    if (await manha.count()) await tocar(page, manha, 2000);
    const passo = page.locator('button:has-text("Niacinamida")').first();
    if (await passo.count()) { await tocar(page, passo, 3200); await fecharFolha(page, 1200); }
    await page.waitForTimeout(1500);
    await salvar(ctx, page, 't_ritual');
  }

  /* evolução: cartões de semana que se percorrem com o dedo */
  if (roda('t_evolucao')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(`${BASE}/leitura/${LEITURA}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5500);
    const titulo = page.locator('text=Sua evolução').first();
    await ate(page, titulo, 200);
    await page.waitForTimeout(2200);
    const trilha = page.locator('.snap-x').first();
    if (await trilha.count()) {
      const c = await trilha.boundingBox();
      if (c) {
        const y = c.y + c.height / 2;
        for (const [de, ate2] of [[360, 120], [360, 120]]) {
          await page.mouse.move(de, y, { steps: 8 });
          await page.mouse.down();
          await page.mouse.move(ate2, y, { steps: 22 });
          await page.mouse.up();
          await page.waitForTimeout(1500);
        }
      }
    }
    await rolar(page, 320, 2200); await page.waitForTimeout(2600);
    await salvar(ctx, page, 't_evolucao');
  }

  /* cronograma */
  if (roda('t_plano')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(`${BASE}/plano/${PLANO}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4500);
    for (const px of [400, 420, 400, 420]) { await rolar(page, px, 2500); await page.waitForTimeout(1400); }
    await salvar(ctx, page, 't_plano');
  }

  /* notificações */
  if (roda('t_notif')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(BASE + '/notificacoes', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3600);
    await rolar(page, 420, 2400); await page.waitForTimeout(2200);
    await salvar(ctx, page, 't_notif');
  }

  /* jornada: números, gráficos e o antes e agora */
  if (roda('t_jornada')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(BASE + '/jornada', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    await rolar(page, 420, 2500); await page.waitForTimeout(1800);
    await rolar(page, 420, 2500); await page.waitForTimeout(1800);
    const comp = page.locator('text=Antes e agora').first();
    if (await comp.count()) { await ate(page, comp, 150); await page.waitForTimeout(2400); }
    /* desliza o comparador */
    const y = 700;
    await page.mouse.move(215, y, { steps: 10 });
    await page.mouse.down();
    for (const x of [120, 300, 180, 260]) { await page.mouse.move(x, y, { steps: 18 }); await page.waitForTimeout(320); }
    await page.mouse.up();
    await page.waitForTimeout(2200);
    await salvar(ctx, page, 't_jornada');
  }

  /* privacidade */
  if (roda('t_config')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(BASE + '/configuracoes', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await rolar(page, 360, 2400); await page.waitForTimeout(1500);
    await rolar(page, 400, 2400); await page.waitForTimeout(1500);
    await rolar(page, 320, 2200); await page.waitForTimeout(2600);
    await salvar(ctx, page, 't_config');
  }

  await browser.close();
  console.log('TAKES_NOVO_DONE');
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
