import { Seo } from '@/seo/Seo';
import { BOOK_COUNT, CATEGORY_SEO, COURSE_COUNT } from '@/seo/siteConfig';
import { breadcrumb, courseList } from '@/seo/structuredData';
import { PublicPageShell } from '@/components/seo/PublicPageShell';
import { CategoryLinkGrid, PillarLinks } from '@/components/seo/InternalLinks';

/** `/cursos` — índice das 17 áreas. É o nó que liga os hubs às folhas. */
export default function CoursesIndexPage() {
  const trail = [
    { name: 'Início', path: '/' },
    { name: 'Cursos', path: '/cursos' },
  ];

  return (
    <>
      <Seo
        title="Cursos de Medicina Online | OneMed"
        description={`Mais de ${COURSE_COUNT} cursos médicos e ${BOOK_COUNT} livros em 17 áreas: residência, revalida, ciclo básico, clínico e internato.`}
        path="/cursos"
        jsonLd={[courseList(CATEGORY_SEO, '/cursos'), breadcrumb(trail)]}
      />

      <PublicPageShell
        h1={`Cursos de Medicina Online: ${COURSE_COUNT}+ Cursos em um Só Acesso`}
        intro={`Todo o acervo organizado em 17 áreas de estudo, do ciclo básico à preparação para residência e Revalida. São mais de ${COURSE_COUNT} cursos completos e mais de ${BOOK_COUNT} livros médicos liberados no mesmo acesso, sem precisar comprar curso por curso.`}
        trail={trail}
      >
        <CategoryLinkGrid
          slugs={CATEGORY_SEO.map(c => c.slug)}
          title="Áreas de estudo"
          description="Escolha a área para ver o que está incluído no acervo."
        />

        <PillarLinks />
      </PublicPageShell>
    </>
  );
}
