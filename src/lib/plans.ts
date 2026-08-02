// Preços e nomes canônicos dos planos, para exibição/rastreamento no
// frontend. O preço de cobrança real é sempre recalculado no servidor
// (supabase/functions/mp-create-payment) — este arquivo não valida nada,
// só evita repetir os mesmos valores em CheckoutPage/PaymentSuccessPage/pixel.
export const PLAN_PRICES: Record<string, number> = {
  monthly: 49.00,
  annual: 199.00,
  lifetime: 299.90,
  lifetime_plus: 599.00,
  lifetime_pro: 997.00,
};

export const PLAN_LABELS: Record<string, string> = {
  monthly: 'Plano Mensal',
  annual: 'Plano Anual',
  lifetime: 'Plano Vitalício',
  lifetime_plus: 'Plano Vitalício Plus',
  lifetime_pro: 'Plano Vitalício Pro',
};

export const PLAN_FEATURES: Record<string, string[]> = {
  monthly: [
    'Acesso por 1 mês',
    '1 tela simultânea',
  ],
  annual: [
    'Acesso por 1 ano',
    '2 telas simultâneas',
    'Atualizações mensais',
  ],
  lifetime: [
    'Acesso vitalício',
    '2 telas simultâneas',
    'Atualizações mensais',
    'Download de arquivos, um a um',
  ],
  lifetime_plus: [
    'Acesso vitalício',
    '4 telas simultâneas',
    'Atualizações mensais',
    'Backup de tudo da plataforma no seu próprio Google Drive',
    'Download de arquivos, um a um',
    'Download em massa, cursos e pastas inteiras',
    'Gerador de flashcards a partir de qualquer conteúdo da plataforma',
    'Gerador de banco de questões a partir de qualquer conteúdo da plataforma',
  ],
  lifetime_pro: [
    'Acesso vitalício',
    '6 telas simultâneas',
    'Atualizações mensais + semanais',
    'Backup de tudo da plataforma no seu próprio Google Drive',
    'Download de arquivos, um a um',
    'Download em massa, cursos e pastas inteiras',
    'Gerador de flashcards a partir de qualquer conteúdo da plataforma',
    'Gerador de banco de questões a partir de qualquer conteúdo da plataforma',
    'Acesso a todas as atualizações sem precisar de nenhuma colaboração',
    'Acesso à IA de diagnósticos Meduf (meduf.com.br)',
  ],
};

// Preço do upgrade: SEMPRE a diferença entre os preços de TABELA dos dois
// planos — nunca "preço do plano novo menos o que a pessoa pagou".
//
// O cálculo antigo punia quem comprou com cupom: um Plus adquirido com 50% de
// desconto (R$ 299,50) fazia o upgrade pro Pro custar R$ 697,50, mais caro do
// que a diferença real de R$ 398,00, e dois clientes no MESMO plano viam
// preços diferentes pro MESMO upgrade. Com a diferença de tabela, o degrau
// entre dois planos é fixo pra todo mundo.
export const MIN_UPGRADE_PRICE = 1.00;

export function upgradePriceFor(currentPlan: string | null | undefined, targetPlan: string): number {
  const alvo = PLAN_PRICES[targetPlan];
  if (!alvo) return 0;
  const atual = (currentPlan && PLAN_PRICES[currentPlan]) || 0;
  return Math.max(Math.round((alvo - atual) * 100) / 100, MIN_UPGRADE_PRICE);
}

// Quem pode baixar aula/arquivo. Teste grátis, Mensal e Anual não baixam —
// clicar no download abre o convite pra assinar (trial) ou pra fazer upgrade
// (Mensal/Anual). É a única lista que decide isso na plataforma inteira.
//
// Do Vitalício pra cima o download é liberado, um arquivo por vez — é o que
// PLAN_FEATURES anuncia. Baixar em massa (curso/pasta inteira) é benefício de
// Plus e Pro, e não passa por esta lista: hoje sai pelo backup no Drive
// próprio, que só esses dois planos têm.
export const PLANS_WITH_DOWNLOAD = new Set(['lifetime', 'lifetime_plus', 'lifetime_pro', 'admin']);

export function canDownloadPlan(plan?: string | null): boolean {
  return !!plan && PLANS_WITH_DOWNLOAD.has(plan);
}

// Vitalício Plus libera 4 telas simultâneas e Pro libera 6, em vez das 2 padrão.
export const PLAN_DEVICE_LIMITS: Record<string, number> = {
  lifetime_plus: 4,
  lifetime_pro: 6,
};
export const DEFAULT_DEVICE_LIMIT = 2;
