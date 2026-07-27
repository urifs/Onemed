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
