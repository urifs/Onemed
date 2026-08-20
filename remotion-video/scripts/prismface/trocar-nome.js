/* troca o nome da conta (ida e volta) para não expor identidade real no vídeo */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = 'https://prismface.com.br';
const STATE = __dirname + '/pf_state.json';
const NOVO = process.argv[2];

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 430, height: 932 },
    isMobile: true, hasTouch: true, locale: 'pt-BR' });
  await ctx.route('**/*', async r => {
    try { await r.fulfill({ response: await r.fetch() }); } catch { try { await r.abort(); } catch {} }
  });
  const page = await ctx.newPage();
  await page.goto(BASE + '/configuracoes', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const campo = page.locator('#nome');
  const antes = await campo.inputValue();
  console.log('nome atual:', JSON.stringify(antes));
  if (NOVO) {
    await campo.fill(NOVO);
    await page.locator('button:has-text("Guardar mudanças")').first().click();
    await page.waitForTimeout(3500);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    console.log('nome agora:', JSON.stringify(await campo.inputValue()));
  }
  await browser.close();
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
