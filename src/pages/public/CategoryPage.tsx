import { Navigate, useParams } from 'react-router-dom';
import { Seo } from '@/seo/Seo';
import { CATEGORY_BY_SLUG, PILLAR_HUBS } from '@/seo/siteConfig';
import { breadcrumb, courseForCategory } from '@/seo/structuredData';
import { PublicPageShell, TopicSections } from '@/components/seo/PublicPageShell';
import { CategoryLinkGrid, PillarLinks } from '@/components/seo/InternalLinks';

/**
 * Página de categoria — `/cursos/[categoria]`, a folha do silo.
 *
 * Slug desconhecido redireciona para `/cursos` com `replace`: sem isso a
 * rota responderia 200 com página vazia, que é o "soft 404" que o Google
 * penaliza — pior do que um 404 de verdade, porque ele indexa e depois
 * desconfia do site inteiro.
 */
export default function CategoryPage() {
  const { categoria } = useParams<{ categoria: string }>();
  const category = categoria ? CATEGORY_BY_SLUG[categoria] : undefined;

  if (!category) return <Navigate to="/cursos" replace />;

  // Categorias irmãs = as do hub a que esta categoria pertence. Linkar por
  // proximidade temática vale mais que linkar as 17 de uma vez: concentra
  // relevância em vez de espalhar.
  const parentHub = PILLAR_HUBS.find(h => h.categorySlugs.includes(category.slug));
  const siblings = parentHub
    ? parentHub.categorySlugs
    : Object.keys(CATEGORY_BY_SLUG).slice(0, 6);

  const trail = [
    { name: 'Início', path: '/' },
    { name: 'Cursos', path: '/cursos' },
    { name: category.name, path: `/cursos/${category.slug}` },
  ];

  return (
    <>
      <Seo
        title={category.title}
        description={category.description}
        path={`/cursos/${category.slug}`}
        jsonLd={[courseForCategory(category), breadcrumb(trail)]}
      />

      <PublicPageShell h1={category.h1} intro={category.intro} trail={trail}>
        <TopicSections heading={`O que você encontra em ${category.name}`} topics={category.topics} />

        <CategoryLinkGrid
          slugs={siblings}
          exclude={category.slug}
          title="Áreas relacionadas"
          description="O acesso é único e libera o acervo inteiro — estas áreas costumam ser estudadas junto com esta."
        />

        <PillarLinks />
      </PublicPageShell>
    </>
  );
}
