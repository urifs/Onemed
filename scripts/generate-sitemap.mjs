#!/usr/bin/env node
/**
 * Gera `dist/sitemap.xml` a partir da mesma lista de rotas que o app e o
 * prerender usam.
 *
 * Gerar no build, e não manter um arquivo à mão, é o que garante que criar
 * uma categoria nova já a coloque no sitemap — sitemap desatualizado aponta
 * para 404 e o Google reduz a confiança no arquivo inteiro.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { PUBLIC_ROUTES, SITE_URL } = await import(path.join(root, 'dist-ssr', 'entry-server.js'));

const lastmod = new Date().toISOString().slice(0, 10);

const urls = PUBLIC_ROUTES.map(route => {
  const loc = route.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${route.path}`;
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${route.changefreq}</changefreq>`,
    `    <priority>${route.priority.toFixed(1)}</priority>`,
    '  </url>',
  ].join('\n');
}).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

fs.writeFileSync(path.join(root, 'dist', 'sitemap.xml'), xml);
console.log(`sitemap: ${PUBLIC_ROUTES.length} URLs em dist/sitemap.xml`);
