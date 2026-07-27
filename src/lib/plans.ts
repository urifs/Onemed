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
    'Acesso por 30 dias',
    '+530 cursos completos',
    '+9.000 livros médicos',
    'Ideal pra provas e residência',
    'Suporte 24/7',
  ],
  annual: [
    'Acesso por 12 meses',
    '+530 cursos completos',
    '+9.000 livros médicos',
    'Atualizações mensais',
    'Suporte 24/7',
  ],
  lifetime: [
    'Acesso para sempre',
    '+530 cursos completos',
    '+9.000 livros médicos',
    'Todas as atualizações futuras',
    'Suporte 24/7 vitalício',
  ],
  lifetime_plus: [
    'Tudo do Plano Vitalício',
    'Backup privado de tudo no seu Google Drive',
    'Download liberado de todo o conteúdo',
    '4 telas simultâneas',
  ],
  lifetime_pro: [
    'Tudo do Plano Vitalício Plus',
    'IA de diagnósticos Meduf',
    'Backup exclusivo de tudo no seu Google Drive',
    'Download de aulas e arquivos em massa, direto na plataforma',
    '6 telas simultâneas',
  ],
};

// Vitalício Plus libera 4 telas simultâneas e Pro libera 6, em vez das 2 padrão.
export const PLAN_DEVICE_LIMITS: Record<string, number> = {
  lifetime_plus: 4,
  lifetime_pro: 6,
};
export const DEFAULT_DEVICE_LIMIT = 2;
