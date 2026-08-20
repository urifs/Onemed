/* Captura com rosto fictício até o fim e gera uma leitura real com esse rosto. */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = 'https://prismface.com.br';
const OUT = __dirname + '/pf/takes';
const STATE = __dirname + '/pf_state.json';
const CURSOR_JS = fs.readFileSync(__dirname + '/cursor.js', 'utf8');

async function novoCtx(browser) {
  const ctx = await browser.newContext({
    storageState: STATE, viewport: { width: 430, height: 932 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true, permissions: ['camera'],
    locale: 'pt-BR', timezoneId: 'America/Sao_Paulo',
    recordVideo: { dir: OUT, size: { width: 860, height: 1864 } },
  });
  await ctx.route('**/*', async r => {
    try { await r.fulfill({ response: await r.fetch() }); } catch { try { await r.abort(); } catch {} }
  });
  await ctx.addInitScript(CURSOR_JS);
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

(async () => {
  const browser = await chromium.launch({
    headless: true, executablePath: '/opt/pw-browsers/chromium',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
           '--use-file-for-fake-video-capture=/tmp/cam.y4m',
           '--autoplay-policy=no-user-gesture-required'],
  });
  const ctx = await novoCtx(browser);
  const page = await ctx.newPage();
  await page.goto(BASE + '/capturar', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const abrir = page.locator('button:has-text("abrir câmera"), a:has-text("abrir câmera")').first();
  if (await abrir.count()) await abrir.click();
  await page.waitForTimeout(3500);
  for (const rot of ['Começar', 'Iniciar', 'Estou pronta', 'Continuar']) {
    const b = page.locator(`button:has-text("${rot}")`).first();
    if (await b.count() && await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); break; }
  }
  const t0 = Date.now(); let ultimo = '';
  while (Date.now() - t0 < 190000) {
    await page.waitForTimeout(3000);
    const txt = await page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 200)).catch(() => '');
    if (txt !== ultimo) { console.log('[' + Math.round((Date.now()-t0)/1000) + 's]', txt.slice(0, 140)); ultimo = txt; }
    const seguir = page.locator('button:has-text("Seguir com as fotos"), a:has-text("Seguir com as fotos")').first();
    if (await seguir.count() && await seguir.isVisible().catch(() => false)) {
      console.log('>> clicando em "Seguir com as fotos que já temos"');
      await page.waitForTimeout(1500);
      await seguir.click();
      break;
    }
    if (/\/leitura\//.test(page.url())) break;
  }
  /* espera a leitura ficar pronta */
  const t1 = Date.now(); ultimo = '';
  while (Date.now() - t1 < 300000) {
    await page.waitForTimeout(4000);
    const txt = await page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 200)).catch(() => '');
    if (txt !== ultimo) { console.log('[leitura ' + Math.round((Date.now()-t1)/1000) + 's]', page.url().replace(BASE,''), '::', txt.slice(0, 130)); ultimo = txt; }
    if (/\/leitura\//.test(page.url()) && /Testa|região|Sua leitura|encontrado/i.test(txt)) break;
  }
  const url = page.url();
  console.log('LEITURA_URL', url);
  fs.writeFileSync(__dirname + '/leitura_url.txt', url);
  await salvar(ctx, page, 't_captura');
  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
