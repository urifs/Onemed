import type { JsonLd } from './Seo';
import {
  BOOK_COUNT, COURSE_COUNT, SITE_LOGO, SITE_NAME, SITE_URL, canonicalUrl,
  type CategorySeo, type PillarHub,
} from './siteConfig';
import { PLAN_FEATURES, PLAN_LABELS, PLAN_PRICES } from '@/lib/plans';

/**
 * Dados estruturados.
 *
 * Regra que vale para tudo aqui: só declarar o que a página realmente mostra.
 * Marcação que promete o que não está na tela (nota de avaliação inventada,
 * preço diferente do cobrado, curso que não existe) é o caminho mais rápido
 * para uma ação manual de spam estrutural no Search Console — o prejuízo é
 * maior que o ganho do rich snippet.
 */

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function educationalOrganization(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: SITE_LOGO,
    description: `Plataforma brasileira com mais de ${COURSE_COUNT} cursos médicos completos e mais de ${BOOK_COUNT} livros para estudantes de medicina e médicos.`,
    areaServed: { '@type': 'Country', name: 'Brasil' },
    knowsLanguage: 'pt-BR',
  };
}

export function website(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'pt-BR',
    publisher: { '@id': ORGANIZATION_ID },
  };
}

/**
 * `Course` exige provider e uma descrição — sem isso o Google marca como
 * inválido no relatório de aprimoramentos e não gera o rich result.
 *
 * `hasCourseInstance` não é declarado de propósito: exigiria modalidade e
 * carga horária reais por curso, que não temos por categoria. Declarar valor
 * aproximado ali seria marcação enganosa.
 */
export function courseForCategory(category: CategorySeo): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: category.h1,
    description: category.description,
    url: canonicalUrl(`/cursos/${category.slug}`),
    inLanguage: 'pt-BR',
    provider: { '@id': ORGANIZATION_ID },
    educationalLevel: 'Ensino superior — Medicina',
    about: category.topics.map(t => ({ '@type': 'Thing', name: t.heading })),
  };
}

/** Listagem de categorias: ItemList é o formato certo para página de índice. */
export function courseList(categories: CategorySeo[], listPath: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Áreas de estudo do acervo OneMed',
    url: canonicalUrl(listPath),
    numberOfItems: categories.length,
    itemListElement: categories.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.h1,
      url: canonicalUrl(`/cursos/${c.slug}`),
    })),
  };
}

/**
 * Product + Offer dos planos. O preço vem de `PLAN_PRICES`, o mesmo módulo
 * que a tela de checkout usa — se o preço mudar num lugar só, a marcação
 * passa a mentir e o Google penaliza divergência entre preço declarado e
 * preço cobrado.
 */
export function planProduct(planKey: string, path: string): JsonLd {
  const price = PLAN_PRICES[planKey];
  const isLifetime = planKey.startsWith('lifetime');
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `OneMed — ${PLAN_LABELS[planKey]}`,
    description: `${PLAN_LABELS[planKey]} da OneMed: acesso a mais de ${COURSE_COUNT} cursos médicos e mais de ${BOOK_COUNT} livros. ${PLAN_FEATURES[planKey]?.join('. ')}.`,
    brand: { '@type': 'Brand', name: SITE_NAME },
    category: 'Cursos de medicina',
    offers: {
      '@type': 'Offer',
      url: canonicalUrl(path),
      price: price.toFixed(2),
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      // Compra única (vitalício) x assinatura por período.
      category: isLifetime ? 'https://schema.org/SingleFamily' : 'Subscription',
      seller: { '@id': ORGANIZATION_ID },
    },
  };
}

export function faqPage(faq: { question: string; answer: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/**
 * Breadcrumb. Além do rich result, é o que comunica ao Google a hierarquia do
 * silo (home → cursos → categoria) — sem isso as páginas parecem soltas.
 */
export function breadcrumb(trail: { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: step.name,
      item: canonicalUrl(step.path),
    })),
  };
}

export function hubCollection(hub: PillarHub): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: hub.h1,
    description: hub.description,
    url: canonicalUrl(`/${hub.slug}`),
    inLanguage: 'pt-BR',
    isPartOf: { '@id': WEBSITE_ID },
    about: hub.topics.map(t => ({ '@type': 'Thing', name: t.heading })),
  };
}
