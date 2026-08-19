import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { formatBRL } from '@/lib/utils';
import { Seo } from '@/seo/Seo';
import { BOOK_COUNT, COURSE_COUNT } from '@/seo/siteConfig';
import { breadcrumb, faqPage, planProduct } from '@/seo/structuredData';
import { FaqSections, PublicPageShell } from '@/components/seo/PublicPageShell';
import { PillarLinks } from '@/components/seo/InternalLinks';
import { PLAN_FEATURES, PLAN_LABELS, PLAN_PRICES } from '@/lib/plans';

const PLAN_ORDER = ['monthly', 'annual', 'lifetime', 'lifetime_plus', 'lifetime_pro'];

const PLAN_PERIOD: Record<string, string> = {
  monthly: 'por mês',
  annual: 'por ano',
  lifetime: 'pagamento único',
  lifetime_plus: 'pagamento único',
  lifetime_pro: 'pagamento único',
};

const FAQ = [
  {
    question: 'Qual a diferença entre o plano Vitalício e o Vitalício Pro?',
    answer:
      'O Vitalício dá acesso permanente ao acervo em 2 telas simultâneas, com atualizações anuais dos cursos básicos e download de arquivos e apostilas (PDF, Anki e mais). O Vitalício Pro amplia para 6 telas, inclui atualizações mensais de quase todo o conteúdo, backup de tudo no seu próprio Google Drive, download também das aulas em vídeo, ferramentas de IA sem limite e acesso à IA de diagnósticos Meduf.',
  },
  {
    question: 'O pagamento é único ou é assinatura?',
    answer:
      'Depende do plano. O Mensal e o Anual são cobrados por período. Os planos Vitalício, Vitalício Plus e Vitalício Pro são pagamento único, sem renovação.',
  },
  {
    question: 'Posso testar antes de comprar?',
    answer:
      'Sim. O teste gratuito de 10 minutos libera a plataforma completa, sem cartão de crédito, para você conferir o acervo antes de decidir.',
  },
  {
    question: 'Quais formas de pagamento são aceitas?',
    answer:
      'O pagamento é processado pelo Mercado Pago, com cartão de crédito, Pix e boleto. O acesso é liberado automaticamente após a aprovação.',
  },
  {
    question: 'Posso mudar de plano depois?',
    answer:
      'Sim. É possível fazer upgrade a qualquer momento, pagando apenas a diferença entre o valor já investido e o plano novo.',
  },
];

/**
 * `/planos` — página indexável de planos e preços.
 *
 * Existe separada do `/checkout` de propósito: o checkout é funil, não deve
 * ser indexado (enche a busca de página de compra sem conteúdo), mas
 * "quanto custa" é uma das buscas de maior intenção que existem. Esta página
 * responde a isso e manda o tráfego para o checkout.
 */
export default function PlansPage() {
  const trail = [
    { name: 'Início', path: '/' },
    { name: 'Planos e preços', path: '/planos' },
  ];

  return (
    <>
      <Seo
        title="Planos e Preços | OneMed"
        description={`Escolha entre os planos Mensal, Anual, Vitalício, Vitalício Plus e Vitalício Pro. Acesso a ${COURSE_COUNT}+ cursos médicos e ${BOOK_COUNT}+ livros.`}
        path="/planos"
        jsonLd={[
          ...PLAN_ORDER.map(key => planProduct(key, '/planos')),
          faqPage(FAQ),
          breadcrumb(trail),
        ]}
      />

      <PublicPageShell
        h1="Planos e Preços da OneMed"
        intro={`Um único acesso libera o acervo inteiro: mais de ${COURSE_COUNT} cursos médicos completos e mais de ${BOOK_COUNT} livros. Escolha entre pagamento por período ou acesso vitalício com pagamento único.`}
        trail={trail}
        cta={false}
      >
        <section aria-labelledby="planos" className="py-12 mt-4 border-t border-border">
          <h2 id="planos" className="font-secondary text-2xl md:text-3xl font-bold text-foreground mb-8">
            Compare os planos disponíveis
          </h2>

          {/* Flex centralizado em vez de grid: são 5 planos, e num grid de 3
              colunas a última linha ficava com dois cards à esquerda e um vão
              vazio à direita. */}
          <ul className="flex flex-wrap justify-center gap-5 list-none p-0">
            {PLAN_ORDER.map(key => (
              <li key={key} className="w-full md:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.834rem)] rounded-xl border border-border bg-card p-6 flex flex-col">
                <h3 className="font-secondary text-xl font-bold text-foreground">{PLAN_LABELS[key]}</h3>
                <p className="mt-2 mb-1">
                  <strong className="text-3xl font-bold text-foreground">
                    {formatBRL(PLAN_PRICES[key])}
                  </strong>
                  <span className="text-sm text-muted-foreground ml-2">{PLAN_PERIOD[key]}</span>
                </p>
                <ul className="mt-4 mb-6 space-y-2 list-none p-0 flex-1">
                  {PLAN_FEATURES[key]?.map(feature => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/checkout"
                  className="inline-flex items-center justify-center bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-lg hover:bg-primary-hover transition-colors"
                >
                  Assinar {PLAN_LABELS[key]}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <FaqSections faq={FAQ} />
        <PillarLinks />
      </PublicPageShell>
    </>
  );
}
