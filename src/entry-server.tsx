import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { ThemeProvider } from 'next-themes';
import { SeoCollectorProvider, buildHead, type HeadCollector } from '@/seo/Seo';
import { PublicRoutes } from '@/seo/PublicRoutes';

// Reexportado para o script de prerender e o gerador de sitemap lerem a lista
// de rotas do MESMO módulo que o app usa — uma segunda cópia da lista seria
// exatamente como o sitemap passaria a apontar para rota que não existe.
export { PUBLIC_ROUTES, SITE_URL } from '@/seo/siteConfig';

/**
 * Entrada usada só no build, pelo script de prerender.
 *
 * Deliberadamente NÃO importa `App.tsx`: o app inteiro arrasta AuthProvider,
 * cliente do Supabase, react-query e componentes que só existem no navegador,
 * e nada disso é necessário para gerar o HTML das páginas de marketing. O
 * prerender monta apenas a árvore pública — menos superfície para quebrar o
 * build e mais rápido.
 */
export function renderPage(url: string): { html: string; head: string } {
  const collector: HeadCollector = { current: null };

  const html = renderToString(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SeoCollectorProvider collector={collector}>
        <StaticRouter location={url}>
          <PublicRoutes />
        </StaticRouter>
      </SeoCollectorProvider>
    </ThemeProvider>,
  );

  return { html, head: collector.current ? renderHead(collector.current) : '' };
}

const escapeAttr = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function renderHead(data: Parameters<typeof buildHead>[0]): string {
  const { title, canonical, metas, jsonLd } = buildHead(data);
  const lines = [
    `<title>${escapeAttr(title)}</title>`,
    `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
    ...metas.map(m => `<meta ${m.attr}="${m.key}" content="${escapeAttr(m.value)}" />`),
    // `</script>` dentro do JSON fecharia a tag no meio do bloco e quebraria o
    // HTML — escapar a barra é a forma padrão de evitar isso.
    ...jsonLd.map(
      block =>
        `<script type="application/ld+json">${JSON.stringify(block).replace(/</g, '\\u003c')}</script>`,
    ),
  ];
  return lines.map(l => `    ${l}`).join('\n');
}
