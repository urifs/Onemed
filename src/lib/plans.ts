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
  ],
  lifetime_plus: [
    'Acesso vitalício',
    '4 telas simultâneas',
    'Atualizações mensais',
    'Backup de tudo da plataforma no seu próprio Google Drive',
    'Downloads liberados',
  ],
  lifetime_pro: [
    'Acesso vitalício',
    '6 telas simultâneas',
    'Atualizações mensais + semanais',
    'Backup de tudo da plataforma no seu próprio Google Drive',
    'Downloads liberados em massa',
    'Acesso a todas as atualizações sem precisar de nenhuma colaboração',
    'Acesso à IA de diagnósticos Meduf (meduf.com.br)',
  ],
};

// Quem pode baixar aula/arquivo. Teste grátis, Mensal e Anual não baixam —
// clicar no download abre o convite pra assinar (trial) ou pra fazer upgrade
// (Mensal/Anual). É a única lista que decide isso na plataforma inteira.
//
// Atenção ao mudar: PLAN_FEATURES anuncia "Downloads liberados" só no Plus e
// no Pro; o Vitalício simples está liberado aqui por decisão de produto, não
// por descuido. Se um dia ele também for bloqueado, é tirar daqui e
// acrescentar a linha no PLAN_FEATURES do Plus.
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
