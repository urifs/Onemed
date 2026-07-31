import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CATEGORY_SEO, CATEGORY_SLUGS, PILLAR_HUBS, PUBLIC_ROUTES,
  canonicalUrl, isNoIndexPath,
} from '@/seo/siteConfig';
import { DESCRIPTION_MAX, TITLE_MAX, buildHead, clampText } from '@/seo/Seo';
import { faqPage, planProduct } from '@/seo/structuredData';
import { PLAN_PRICES } from '@/lib/plans';

describe('limites de title e description', () => {
  // Passar de 60/160 faz o Google truncar com reticências no resultado de
  // busca, cortando justamente a chamada de conversão do fim da frase.
  it.each(CATEGORY_SEO)('categoria "$slug" cabe nos limites', category => {
    expect(category.title.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(category.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it.each(PILLAR_HUBS)('hub "$slug" cabe nos limites', hub => {
    expect(hub.title.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(hub.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it('corta na palavra, nunca no meio dela', () => {
    const cut = clampText('Cursos de Cardiologia e Eletrocardiograma para Residência Médica', 30);
    expect(cut.length).toBeLessThanOrEqual(30);
    expect(cut.endsWith(' ')).toBe(false);
    // se cortasse por caractere, sobraria uma palavra picada no fim
    expect('Cursos de Cardiologia e Eletrocardiograma para Residência Médica').toContain(cut);
  });
});

describe('URLs canônicas', () => {
  it('a raiz mantém a barra e o resto não tem barra no fim', () => {
    expect(canonicalUrl('/')).toBe('https://onemedcursos.com.br/');
    expect(canonicalUrl('/cursos/pediatria')).toBe('https://onemedcursos.com.br/cursos/pediatria');
    // duas URLs para a mesma página é exatamente o duplicate content que a
    // canonical existe para evitar
    expect(canonicalUrl('/cursos/pediatria/')).toBe(canonicalUrl('/cursos/pediatria'));
  });
});

describe('rotas públicas', () => {
  it('não repete rota (rota repetida vira URL duplicada no sitemap)', () => {
    const paths = PUBLIC_ROUTES.map(r => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('nenhuma rota indexável cai numa área privada', () => {
    for (const route of PUBLIC_ROUTES) {
      expect(isNoIndexPath(route.path), `${route.path} não pode ser indexável`).toBe(false);
    }
  });

  it('área do aluno, painel e funil ficam fora do índice', () => {
    for (const p of ['/membros', '/membros/curso/x', '/admin', '/admin/buyers', '/checkout', '/payment/success', '/login']) {
      expect(isNoIndexPath(p), `${p} deveria ser noindex`).toBe(true);
    }
  });

  it('toda categoria tem rota e todo slug é único', () => {
    const slugs = CATEGORY_SEO.map(c => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(slugs)).toEqual(new Set(Object.values(CATEGORY_SLUGS)));
    for (const slug of slugs) {
      expect(PUBLIC_ROUTES.some(r => r.path === `/cursos/${slug}`)).toBe(true);
    }
  });

  it('todo hub aponta só para categorias que existem', () => {
    const known = new Set(Object.values(CATEGORY_SLUGS));
    for (const hub of PILLAR_HUBS) {
      for (const slug of hub.categorySlugs) {
        expect(known.has(slug), `hub ${hub.slug} aponta para categoria inexistente: ${slug}`).toBe(true);
      }
    }
  });
});

/**
 * O app (App.tsx) e o prerender (PublicRoutes.tsx) mantêm duas listas de
 * rotas. Se divergirem, o sintoma é silencioso e caro: uma página nova existe
 * no site, funciona ao navegar por dentro, e nunca é prerenderizada — ou seja,
 * chega ao Google como casca vazia. Esta trava compara as duas.
 */
describe('App e prerender não podem divergir', () => {
  const read = (f: string) => fs.readFileSync(path.resolve(process.cwd(), f), 'utf8');
  const staticPaths = (src: string) =>
    new Set([...src.matchAll(/<Route path="(\/[^"]*)"/g)].map(m => m[1]));

  it('toda rota pública do App também está no prerender', () => {
    const appPaths = staticPaths(read('src/App.tsx'));
    const publicPaths = staticPaths(read('src/seo/PublicRoutes.tsx'));

    const missing = [...appPaths].filter(
      p => !isNoIndexPath(p) && p !== '/admin/login' && p !== '/admin/register' && !publicPaths.has(p),
    );
    expect(missing, `rotas públicas fora do prerender: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('dados estruturados', () => {
  it('o preço do Product é o mesmo módulo que o checkout cobra', () => {
    const jsonLd = planProduct('lifetime', '/planos') as unknown as {
      offers: { price: string; priceCurrency: string };
    };
    // Divergência entre preço marcado e preço cobrado é motivo de ação manual
    // por marcação enganosa no Search Console.
    expect(jsonLd.offers.price).toBe(PLAN_PRICES.lifetime.toFixed(2));
    expect(jsonLd.offers.priceCurrency).toBe('BRL');
  });

  it('o FAQPage leva pergunta e resposta de verdade', () => {
    const hub = PILLAR_HUBS[0];
    const jsonLd = faqPage(hub.faq) as unknown as {
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(jsonLd.mainEntity).toHaveLength(hub.faq.length);
    expect(jsonLd.mainEntity[0].name).toBe(hub.faq[0].question);
    expect(jsonLd.mainEntity[0].acceptedAnswer.text).toBe(hub.faq[0].answer);
  });

  it('página noindex declara noindex de verdade no head', () => {
    const head = buildHead({ title: 'x', description: 'y', path: '/membros', noindex: true });
    expect(head.metas.find(m => m.key === 'robots')?.value).toContain('noindex');
  });

  it('página pública é indexável', () => {
    const head = buildHead({ title: 'x', description: 'y', path: '/revalida' });
    expect(head.metas.find(m => m.key === 'robots')?.value).toContain('index');
    expect(head.metas.find(m => m.key === 'robots')?.value).not.toContain('noindex');
  });
});
