// Preços e nomes canônicos dos planos, para exibição/rastreamento no
// frontend. O preço de cobrança real é sempre recalculado no servidor
// (supabase/functions/mp-create-payment) — este arquivo não valida nada,
// só evita repetir os mesmos valores em CheckoutPage/PaymentSuccessPage/pixel.
export const PLAN_PRICES: Record<string, number> = {
  monthly: 99.00,
  annual: 299.00,
  lifetime: 499.00,
  lifetime_plus: 798.00,
  lifetime_pro: 1497.00,
};

export const PLAN_LABELS: Record<string, string> = {
  monthly: 'Plano Mensal',
  annual: 'Plano Anual',
  lifetime: 'Plano Vitalício',
  lifetime_plus: 'Plano Vitalício Plus',
  lifetime_pro: 'Plano Vitalício Pro',
};

// Benefícios anunciados por plano (10/08). O modal de upgrade calcula "o que
// você ganha a mais" pela DIFERENÇA de conjunto entre planos vizinhos, então:
// benefício IGUAL entre dois planos precisa de texto IDÊNTICO (ex: 'Acesso
// vitalício', o backup no Drive), e benefício que MUDA de valor (telas, limite
// de IA, atualizações) tem texto próprio — aí aparece como novidade no upgrade.
export const PLAN_FEATURES: Record<string, string[]> = {
  monthly: [
    'Acesso por 1 mês',
    '1 tela simultânea',
    'Acesso a todo o acervo atual da plataforma',
  ],
  annual: [
    'Acesso por 1 ano',
    '2 telas simultâneas',
    'Acesso a todo o acervo atual da plataforma',
    'Ferramentas de IA (flashcards, banco de questões, cronograma e assistente): até 5 usos por dia em cada',
  ],
  lifetime: [
    'Acesso vitalício',
    '2 telas simultâneas',
    'Atualizações anuais dos cursos básicos',
    'Ferramentas de IA (flashcards, banco de questões, cronograma e assistente): até 10 usos por dia em cada',
  ],
  lifetime_plus: [
    'Acesso vitalício',
    '4 telas simultâneas',
    'Atualizações anuais dos cursos intermediários',
    'Backup de tudo da plataforma no seu próprio Google Drive',
    'Ferramentas de IA (flashcards, banco de questões, cronograma e assistente): até 20 usos por dia em cada',
  ],
  lifetime_pro: [
    'Acesso vitalício',
    '6 telas simultâneas',
    'Atualizações mensais de 95% de todo o conteúdo + adição de novos cursos',
    'Backup de tudo da plataforma no seu próprio Google Drive',
    'Download de aulas em vídeo e de arquivos (exclusivo do Pro)',
    'Ferramentas de IA (flashcards, banco de questões, cronograma e assistente): uso ilimitado',
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

// Quem pode baixar. Desde 10/08 (decisão do dono): download de QUALQUER
// conteúdo — arquivo (apostila/PDF/planilha/imagem/áudio) OU aula em vídeo —
// é EXCLUSIVO do Vitalício Pro. Nos demais planos o conteúdo fica só para
// assistir/ler na plataforma; clicar em baixar abre o convite de upgrade.
//
// Continuam DUAS listas por dois motivos: (1) a mensagem do upsell muda por
// tipo, (2) trocar a regra de arquivo sem mexer na de vídeo (ou vice-versa)
// vira uma linha. Hoje as duas apontam para o mesmo conjunto de propósito.
export const PLANS_WITH_DOWNLOAD = new Set(['lifetime_pro', 'admin']);
export const PLANS_WITH_LESSON_DOWNLOAD = new Set(['lifetime_pro', 'admin']);

export function canDownloadPlan(plan?: string | null): boolean {
  return !!plan && PLANS_WITH_DOWNLOAD.has(plan);
}

export function canDownloadLessonPlan(plan?: string | null): boolean {
  return !!plan && PLANS_WITH_LESSON_DOWNLOAD.has(plan);
}

// O que separa aula de arquivo é o tipo do próprio conteúdo — o mesmo corte
// que a página do curso já faz nas abas "Aulas" (vídeo) e "Arquivos" (resto).
export function isLessonVideo(item?: { type?: string | null } | null): boolean {
  return item?.type === 'video';
}

// Porteiro único: recebe o item e o plano, devolve se o download pode sair.
export function canDownloadItem(plan: string | null | undefined, item?: { type?: string | null } | null): boolean {
  return isLessonVideo(item) ? canDownloadLessonPlan(plan) : canDownloadPlan(plan);
}

// Vitalício Plus libera 4 telas simultâneas e Pro libera 6, em vez das 2 padrão.
export const PLAN_DEVICE_LIMITS: Record<string, number> = {
  lifetime_plus: 4,
  lifetime_pro: 6,
};
export const DEFAULT_DEVICE_LIMIT = 2;
