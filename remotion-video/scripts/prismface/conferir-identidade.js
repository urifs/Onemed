const { chromium } = require('playwright');
const fs = require('fs');
const BASE = 'https://prismface.com.br';
const STATE = __dirname + '/pf_state.json';
/* o que não pode aparecer: PF_IDENTIDADE="Nome|email@dominio" */
const ALVO = new RegExp(process.env.PF_IDENTIDADE || 'nome-real', 'gi');
const CURSOR_JS = fs.readFileSync(__dirname + '/cursor.js', 'utf8');
const MASCARA_JS = fs.readFileSync(__dirname + '/retake2.js', 'utf8')
  .split('const MASCARA_JS = `')[1].split('`;')[0];
const PLANO = process.env.PF_PLANO || '';
const LEITURA = process.env.PF_LEITURA || '';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium' });
  for (const [nome, url] of [['painel','/painel'], ['leitura',`/leitura/${LEITURA}`],
      ['plano',`/plano/${PLANO}`], ['notificacoes','/notificacoes'], ['jornada','/jornada'],
      ['configuracoes','/configuracoes']]) {
    for (const mascara of [false, true]) {
      const ctx = await browser.newContext({ storageState: STATE, viewport: { width: 430, height: 932 },
        isMobile: true, hasTouch: true, locale: 'pt-BR' });
      await ctx.route('**/*', async r => {
        try { await r.fulfill({ response: await r.fetch() }); } catch { try { await r.abort(); } catch {} }
      });
      if (mascara) await ctx.addInitScript(MASCARA_JS);
      const page = await ctx.newPage();
      await page.goto(BASE + url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5500);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2500);
      const txt = await page.evaluate(() => document.body.innerText);
      const achados = (txt.match(ALVO) || []).length;
      console.log(`${nome.padEnd(14)} mascara=${mascara ? 'sim' : 'nao'}  ocorrencias=${achados}`);
      await ctx.close();
    }
  }
  await browser.close();
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
