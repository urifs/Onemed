import { Navigate, useParams } from 'react-router-dom';
import { Seo } from '@/seo/Seo';
import { HUB_BY_SLUG } from '@/seo/siteConfig';
import { breadcrumb, faqPage, hubCollection } from '@/seo/structuredData';
import { FaqSections, PublicPageShell, TopicSections } from '@/components/seo/PublicPageShell';
import { CategoryLinkGrid, PillarLinks } from '@/components/seo/InternalLinks';

/**
 * Hub de pilar — a raiz de cada silo (`/residencia-medica`, `/revalida`,
 * `/ciclo-basico`, `/ciclo-clinico-internato`).
 *
 * É a página que disputa a keyword de maior volume e recebe o link de volta
 * de todas as categorias do silo.
 */
export default function PillarHubPage({ slug: fixedSlug }: { slug?: string }) {
  const params = useParams<{ hub: string }>();
  const slug = fixedSlug || params.hub;
  const hub = slug ? HUB_BY_SLUG[slug] : undefined;

  if (!hub) return <Navigate to="/cursos" replace />;

  const trail = [
    { name: 'Início', path: '/' },
    { name: hub.h1.split(':')[0], path: `/${hub.slug}` },
  ];

  return (
    <>
      <Seo
        title={hub.title}
        description={hub.description}
        path={`/${hub.slug}`}
        jsonLd={[hubCollection(hub), faqPage(hub.faq), breadcrumb(trail)]}
      />

      <PublicPageShell h1={hub.h1} intro={hub.intro} trail={trail}>
        <TopicSections heading="Como o acervo cobre esse objetivo" topics={hub.topics} />

        <CategoryLinkGrid
          slugs={hub.categorySlugs}
          title="Áreas que compõem esta preparação"
          description="Cada área abaixo tem cursos completos incluídos no mesmo acesso."
        />

        <FaqSections faq={hub.faq} />

        <PillarLinks exclude={hub.slug} />
      </PublicPageShell>
    </>
  );
}
