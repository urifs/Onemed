import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { LandingHeader, LandingFooter } from '@/components/landing';
import { Breadcrumbs } from './InternalLinks';

/**
 * Casco das páginas públicas de SEO.
 *
 * A estrutura é rígida de propósito: <header> (do LandingHeader) → <main>
 * com UM <h1> → <article> com o conteúdo → <footer>. Um único h1 por página,
 * carregando a keyword de maior intenção, e os h2/h3 abaixo cobrindo a cauda
 * longa — é a hierarquia que o Google usa para entender do que a página trata
 * e é onde a maioria das SPAs erra, repetindo h1 em cada seção.
 */
export function PublicPageShell({
  h1, intro, trail, cta = true, children,
}: {
  h1: string;
  intro: string;
  trail: { name: string; path: string }[];
  cta?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      <main className="shell-page px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-8">
        <Breadcrumbs trail={trail} />

        <article>
          <header>
            <h1 className="font-secondary text-3xl md:text-5xl font-bold text-foreground mb-5 max-w-4xl">
              {h1}
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">{intro}</p>
          </header>

          {cta && (
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-3 rounded-lg hover:bg-primary-hover transition-colors"
              >
                <Clock className="w-4 h-4" aria-hidden="true" />
                Testar grátis por 10 minutos
              </Link>
              <Link
                to="/planos"
                className="inline-flex items-center gap-2 border border-border text-foreground font-semibold px-6 py-3 rounded-lg hover:bg-secondary transition-colors"
              >
                Ver planos e preços
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          )}

          {children}
        </article>
      </main>

      <LandingFooter />
    </div>
  );
}

/** Bloco de <h2> + parágrafo. É onde mora a cauda longa. */
export function TopicSections({
  heading, topics,
}: {
  heading: string;
  topics: { heading: string; body: string }[];
}) {
  return (
    <section aria-labelledby="topicos" className="py-12 mt-4 border-t border-border">
      <h2 id="topicos" className="font-secondary text-2xl md:text-3xl font-bold text-foreground mb-8">
        {heading}
      </h2>
      <div className="grid gap-8 md:grid-cols-3">
        {topics.map(topic => (
          <section key={topic.heading}>
            <h3 className="font-semibold text-lg text-foreground mb-2">{topic.heading}</h3>
            <p className="text-muted-foreground leading-relaxed">{topic.body}</p>
          </section>
        ))}
      </div>
    </section>
  );
}

/**
 * Perguntas frequentes. O HTML precisa mostrar pergunta E resposta em texto
 * — o Google só valida o FAQPage se o conteúdo marcado estiver visível na
 * página. Por isso é <dl> aberto, e não accordion que esconde a resposta.
 */
export function FaqSections({ faq }: { faq: { question: string; answer: string }[] }) {
  if (faq.length === 0) return null;
  return (
    <section aria-labelledby="faq" className="py-12 border-t border-border">
      <h2 id="faq" className="font-secondary text-2xl md:text-3xl font-bold text-foreground mb-8">
        Perguntas frequentes
      </h2>
      <dl className="space-y-6 max-w-3xl">
        {faq.map(item => (
          <div key={item.question}>
            <dt className="font-semibold text-foreground mb-1.5">{item.question}</dt>
            <dd className="text-muted-foreground leading-relaxed m-0">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
