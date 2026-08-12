import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CATEGORY_BY_SLUG, PILLAR_HUBS, type CategorySeo } from '@/seo/siteConfig';

/**
 * Links internos contextuais.
 *
 * O que faz diferença aqui é a ÂNCORA: o texto do link é o mesmo `h1` da
 * página de destino, não "clique aqui" nem "saiba mais". A âncora é um dos
 * sinais mais fortes de sobre o que a página de destino trata, e âncora
 * genérica joga esse sinal fora.
 *
 * A distribuição também importa: cada categoria aponta para o hub do silo a
 * que pertence e para as categorias irmãs, formando um ciclo fechado em vez
 * de páginas-folha sem saída, que acumulam autoridade e não repassam nada.
 */

export function CategoryLinkGrid({
  slugs, title, description, exclude,
}: {
  slugs: string[];
  title: string;
  description?: string;
  /** Não faz sentido a página linkar para ela mesma. */
  exclude?: string;
}) {
  const items = slugs
    .filter(slug => slug !== exclude)
    .map(slug => CATEGORY_BY_SLUG[slug])
    .filter((c): c is CategorySeo => Boolean(c));

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="links-relacionados" className="py-12 border-t border-border">
      <h2 id="links-relacionados" className="font-secondary text-2xl md:text-3xl font-bold text-foreground mb-2">
        {title}
      </h2>
      {description && <p className="text-muted-foreground mb-8 max-w-2xl">{description}</p>}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 list-none p-0">
        {items.map(category => (
          <li key={category.slug}>
            <Link
              to={`/cursos/${category.slug}`}
              className="group block h-full rounded-xl border border-border bg-card p-5 hover:border-primary/50 hover:bg-secondary transition-colors"
            >
              <h3 className="font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                {category.h1}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-3">{category.intro}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Links para os hubs de pilar. Vai no rodapé de cada categoria: é o caminho
 * de volta da folha para a raiz do silo, que é o que concentra autoridade nas
 * páginas de maior intenção de busca ("residência médica", "revalida").
 */
export function PillarLinks({ exclude }: { exclude?: string }) {
  const hubs = PILLAR_HUBS.filter(h => h.slug !== exclude);
  return (
    <nav aria-label="Áreas de estudo por objetivo" className="py-12 border-t border-border">
      <h2 className="font-secondary text-2xl md:text-3xl font-bold text-foreground mb-6">
        Escolha o seu objetivo de estudo
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 3xl:grid-cols-3 list-none p-0">
        {hubs.map(hub => (
          <li key={hub.slug}>
            <Link
              to={`/${hub.slug}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-4 hover:border-primary/50 hover:bg-secondary transition-colors"
            >
              <span className="font-medium text-foreground">{hub.h1}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Trilha de navegação — o par visual do BreadcrumbList do JSON-LD. */
export function Breadcrumbs({ trail }: { trail: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Você está aqui" className="mb-6">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground list-none p-0">
        {trail.map((step, i) => (
          <li key={step.path} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true">›</span>}
            {i === trail.length - 1 ? (
              <span className="text-foreground" aria-current="page">{step.name}</span>
            ) : (
              <Link to={step.path} className="hover:text-foreground transition-colors">{step.name}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
