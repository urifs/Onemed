/* Regrava as telas logadas com a identidade mascarada na exibição:
   perfil renomeado + substituição do primeiro nome nos textos já gerados. */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'https://prismface.com.br';
const OUT = __dirname + '/pf/takes';
const STATE = __dirname + '/pf_state.json';
const PLANO = process.env.PF_PLANO || '';
const LEITURA = process.env.PF_LEITURA || '';
const CURSOR_JS = fs.readFileSync(__dirname + '/cursor.js', 'utf8');
const ROSTO = fs.readFileSync(__dirname + '/rosto_ficticio.jpg');

/* troca o nome real por um fictício em todo texto renderizado */
/* PF_NOME_REAL: primeiro nome a esconder · PF_NOME_FALSO: o que entra no lugar */
const NOME_REAL = process.env.PF_NOME_REAL || 'NomeReal';
const NOME_FALSO = process.env.PF_NOME_FALSO || 'Marina';
const MASCARA_JS = `
(() => {
  const RE = new RegExp('${NOME_REAL}', 'g');
  const troca = no => {
    if (no.nodeType === 3) {
      if (RE.test(no.nodeValue)) no.nodeValue = no.nodeValue.replace(RE, '${NOME_FALSO}');
      return;
    }
    if (no.nodeType !== 1) return;
    const tag = no.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE') return;
    if (no.value && typeof no.value === 'string' && RE.test(no.value)) no.value = no.value.replace(RE, '${NOME_FALSO}');
    for (const f of no.childNodes) troca(f);
  };
  const varrer = () => { if (document.body) troca(document.body); };
  const ligar = () => {
    varrer();
    new MutationObserver(varrer).observe(document.body, { childList: true, subtree: true, characterData: true });
    setInterval(varrer, 400);
  };
  document.body ? ligar() : addEventListener('DOMContentLoaded', ligar);
})();`;

async function novoCtx(browser) {
  const ctx = await browser.newContext({
    storageState: STATE, viewport: { width: 430, height: 932 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true, permissions: ['camera'],
    locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
    recordVideo: { dir: OUT, size: { width: 860, height: 1864 } },
  });
  await ctx.route('**/*', async r => {
    /* as fotos do rosto são trocadas por um rosto fictício, só na exibição */
    if (/\/storage\/v1\/object\/(sign|public)\/scans\//.test(r.request().url())) {
      try { return await r.fulfill({ status: 200, contentType: 'image/jpeg', body: ROSTO }); } catch {}
    }
    try { await r.fulfill({ response: await r.fetch() }); } catch { try { await r.abort(); } catch {} }
  });
  await ctx.addInitScript(CURSOR_JS);
  await ctx.addInitScript(MASCARA_JS);
  return ctx;
}
async function salvar(ctx, page, nome) {
  const v = page.video(); await page.close(); await ctx.close();
  fs.renameSync(await v.path(), `${OUT}/${nome}.webm`);
  console.log('take:', nome);
}
async function rolar(page, px, ms = 2500) {
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

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium' });
  const alvo = process.argv[2] || 'todos';
  const roda = n => alvo === 'todos' || alvo === n;

  if (roda('t_painel')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(BASE + '/painel', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4200);
    await rolar(page, 300, 2200); await page.waitForTimeout(1600);
    await rolar(page, 260, 2000); await page.waitForTimeout(2200);
    await salvar(ctx, page, 't_painel');
  }
  if (roda('t_leitura')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(`${BASE}/leitura/${LEITURA}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await rolar(page, 900, 2600); await page.waitForTimeout(1200);
    for (let i = 0; i < 7; i++) { await rolar(page, 780, 2600); await page.waitForTimeout(1100); }
    await salvar(ctx, page, 't_leitura');
  }
  if (roda('t_ritualdet')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(`${BASE}/leitura/${LEITURA}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.evaluate(() => {
      const alvo = [...document.querySelectorAll('h2,h3')].find(e => /Ritual da manh/i.test(e.textContent || ''));
      if (alvo) window.scrollTo(0, alvo.getBoundingClientRect().top + window.scrollY - 90);
    });
    await page.waitForTimeout(2200);
    for (let i = 0; i < 9; i++) { await rolar(page, 620, 2500); await page.waitForTimeout(700); }
    await page.waitForTimeout(1500);
    await salvar(ctx, page, 't_ritualdet');
  }
  if (roda('t_plano')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(`${BASE}/plano/${PLANO}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    for (let i = 0; i < 8; i++) { await rolar(page, 760, 2600); await page.waitForTimeout(1100); }
    await salvar(ctx, page, 't_plano');
  }
  if (roda('t_ritual')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(`${BASE}/plano/${PLANO}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const btn = page.locator('a[href*="/ritual/"]').first();
    if (await btn.count()) { await btn.scrollIntoViewIfNeeded(); await page.waitForTimeout(900); await btn.click(); }
    await page.waitForTimeout(4500);
    for (let i = 0; i < 3; i++) {
      const prox = page.locator('button:has-text("Feito"), button:has-text("Próximo"), button:has-text("Concluir")').first();
      if (await prox.count() && await prox.isVisible().catch(() => false)) await prox.click().catch(() => {});
      await page.waitForTimeout(3200);
      await rolar(page, 420, 1800);
    }
    await page.waitForTimeout(2000);
    await salvar(ctx, page, 't_ritual');
  }
  if (roda('t_notif')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(BASE + '/notificacoes', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3200);
    await rolar(page, 600, 2400); await page.waitForTimeout(1600);
    await salvar(ctx, page, 't_notif');
  }
  if (roda('t_jornada2')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(BASE + '/jornada', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    await rolar(page, 420, 2600); await page.waitForTimeout(2200);
    await rolar(page, 360, 2600); await page.waitForTimeout(2200);
    await rolar(page, 420, 2600); await page.waitForTimeout(2600);
    await rolar(page, 380, 2400); await page.waitForTimeout(3000);
    await salvar(ctx, page, 't_jornada2');
  }
  if (roda('t_config')) {
    const ctx = await novoCtx(browser); const page = await ctx.newPage();
    await page.goto(BASE + '/configuracoes', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await rolar(page, 340, 2400); await page.waitForTimeout(1500);
    await rolar(page, 380, 2400); await page.waitForTimeout(1500);
    await rolar(page, 300, 2200); await page.waitForTimeout(2500);
    await salvar(ctx, page, 't_config');
  }
  await browser.close();
  console.log('RETAKE2_DONE');
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
