#!/usr/bin/env node
/**
 * Gera HTML estático por rota pública, depois do build normal do Vite.
 *
 * POR QUE ISSO EXISTE: numa SPA de Vite todas as rotas servem o mesmo
 * `index.html`, com o mesmo <title> e sem conteúdo — o HTML só ganha corpo
 * depois que o JavaScript roda. Isso quebra SEO de duas formas distintas:
 *
 *  1. Os crawlers de rede social (WhatsApp, Facebook, LinkedIn, Twitter) NÃO
 *     executam JavaScript. Para eles, meta tag injetada no cliente não existe
 *     — todo link compartilhado mostraria o mesmo título e a mesma imagem,
 *     seja qual for a página.
 *  2. O Googlebot executa JS, mas numa segunda passada e sem prazo garantido.
 *     Página que já chega pronta é indexada na primeira passada.
 *
 * O HTML gerado aqui é a página real (headings, textos e links dentro do
 * <div id="root">), não um esqueleto. Quando o JS carrega, o React assume a
 * partir do mesmo HTML.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

// `renderPage` e a lista de rotas saem do mesmo módulo, para não existir uma
// segunda cópia da lista que possa divergir do app.
const { renderPage, PUBLIC_ROUTES: ROUTES } = await import(
  path.join(root, 'dist-ssr', 'entry-server.js')
);

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

let written = 0;
const failures = [];

for (const route of ROUTES) {
  try {
    const { html, head } = renderPage(route.path);
    if (!head) throw new Error('a rota não declarou <Seo> — head vazio');

    const page = template
      // Remove o <title> e a description estáticos do template: se ficarem,
      // a página passa a ter dois de cada e o Google escolhe um deles de
      // forma imprevisível.
      .replace(/\n?\s*<title>[\s\S]*?<\/title>/, '')
      .replace(/\n?\s*<meta name="description"[^>]*>/, '')
      .replace(/\n?\s*<meta property="og:[^"]*"[^>]*>/g, '')
      .replace(/\n?\s*<meta name="twitter:[^"]*"[^>]*>/g, '')
      .replace('</head>', `${head}\n  </head>`)
      .replace('<div id="root"></div>', `<div id="root">${html}</div>`);

    const outDir = route.path === '/' ? dist : path.join(dist, route.path);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), page);
    written++;
  } catch (err) {
    failures.push(`${route.path}: ${err.message}`);
  }
}

console.log(`prerender: ${written}/${ROUTES.length} rotas geradas`);
if (failures.length) {
  console.error('\nfalharam:');
  for (const f of failures) console.error('  ' + f);
  // Falhar o build é intencional: uma rota que não prerenderizou vira uma
  // página sem SEO nenhum em produção, e isso passaria despercebido.
  process.exit(1);
}
