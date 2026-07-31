import { createContext, useContext, useEffect } from 'react';
import { canonicalUrl, DEFAULT_OG_IMAGE, SITE_NAME } from './siteConfig';

/**
 * Head por rota, funcionando nos dois modos de renderização.
 *
 * No PRERENDER (Node, `renderToString`) não existe `document`: o componente
 * empurra o que precisa para um coletor no contexto, e o script de build
 * escreve isso no <head> do HTML gerado. É esse caminho que faz o crawler do
 * WhatsApp/Facebook enxergar título e imagem — eles não executam JavaScript,
 * então tag injetada só no cliente simplesmente não existe para eles.
 *
 * No NAVEGADOR, a navegação é client-side e não recarrega o documento, então
 * as tags são reaplicadas a cada troca de rota. Tudo que é gerenciado aqui
 * leva `data-seo`, e a limpeza remove só o que tem essa marca — as tags fixas
 * do index.html (verificação de domínio do Facebook, charset, viewport)
 * nunca são tocadas.
 */

export interface JsonLd {
  '@context': string;
  '@type': string;
  [key: string]: unknown;
}

export interface HeadData {
  title: string;
  description: string;
  path: string;
  image?: string;
  /** 'website' para hubs e listagens, 'article' para conteúdo editorial. */
  ogType?: string;
  noindex?: boolean;
  jsonLd?: JsonLd[];
}

/** Coletor usado só no prerender; no navegador fica nulo. */
export type HeadCollector = { current: HeadData | null };
const SeoCollectorContext = createContext<HeadCollector | null>(null);

export function SeoCollectorProvider({
  collector, children,
}: { collector: HeadCollector; children: React.ReactNode }) {
  return <SeoCollectorContext.Provider value={collector}>{children}</SeoCollectorContext.Provider>;
}

/**
 * Limites do Google. Cortar no servidor em vez de "confiar que o texto cabe"
 * evita o título aparecer truncado com reticências no resultado de busca.
 * O corte é na palavra, nunca no meio dela.
 */
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 160;

export function clampText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:–-]+$/, '');
}

export function buildHead(data: HeadData) {
  const title = clampText(data.title, TITLE_MAX);
  const description = clampText(data.description, DESCRIPTION_MAX);
  const canonical = canonicalUrl(data.path);
  const image = data.image || DEFAULT_OG_IMAGE;

  const metas: { attr: 'name' | 'property'; key: string; value: string }[] = [
    { attr: 'name', key: 'description', value: description },
    {
      attr: 'name',
      key: 'robots',
      value: data.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    },
    { attr: 'property', key: 'og:type', value: data.ogType || 'website' },
    { attr: 'property', key: 'og:site_name', value: SITE_NAME },
    { attr: 'property', key: 'og:locale', value: 'pt_BR' },
    { attr: 'property', key: 'og:title', value: title },
    { attr: 'property', key: 'og:description', value: description },
    { attr: 'property', key: 'og:url', value: canonical },
    { attr: 'property', key: 'og:image', value: image },
    { attr: 'name', key: 'twitter:card', value: 'summary_large_image' },
    { attr: 'name', key: 'twitter:title', value: title },
    { attr: 'name', key: 'twitter:description', value: description },
    { attr: 'name', key: 'twitter:image', value: image },
  ];

  return { title, description, canonical, image, metas, jsonLd: data.jsonLd || [] };
}

/** Aplica no DOM. Só roda no navegador. */
function applyHead(data: HeadData) {
  const { title, canonical, metas, jsonLd } = buildHead(data);

  document.title = title;
  // Remove só o que este componente criou antes; as tags fixas do index.html
  // não têm data-seo e sobrevivem.
  document.head.querySelectorAll('[data-seo]').forEach(el => el.remove());

  // O JSON-LD precisa de uma limpeza mais ampla, por dois motivos que se
  // somam: (1) os blocos que vieram do prerender não têm `data-seo`, então
  // escapariam da linha acima e virariam duplicata assim que o React
  // montasse; (2) numa troca de rota client-side, o schema da página
  // anterior continuaria no documento — a página de categoria acabaria
  // declarando também o FAQPage do hub de onde o usuário veio, descrevendo
  // conteúdo que não está na tela.
  document.head
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach(el => el.remove());

  const add = (el: HTMLElement) => { el.setAttribute('data-seo', ''); document.head.appendChild(el); };

  for (const m of metas) {
    // As tags equivalentes que vieram estáticas do index.html teriam o mesmo
    // name/property e virariam duplicata — o Google escolhe uma e ignora a
    // outra de forma imprevisível. Tira a antiga antes de pôr a nova.
    document.head.querySelectorAll(`meta[${m.attr}="${m.key}"]`).forEach(el => el.remove());
    const meta = document.createElement('meta');
    meta.setAttribute(m.attr, m.key);
    meta.setAttribute('content', m.value);
    add(meta);
  }

  document.head.querySelectorAll('link[rel="canonical"]').forEach(el => el.remove());
  const link = document.createElement('link');
  link.setAttribute('rel', 'canonical');
  link.setAttribute('href', canonical);
  add(link);

  for (const block of jsonLd) {
    const script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(block);
    add(script);
  }
}

export function Seo(data: HeadData) {
  const collector = useContext(SeoCollectorContext);

  // No prerender não há efeito nem document: grava direto no coletor durante
  // a renderização, que é a única fase que existe ali.
  if (collector) collector.current = data;

  const serialized = JSON.stringify(data);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    applyHead(JSON.parse(serialized) as HeadData);
  }, [serialized]);

  return null;
}
