// Preços e nomes canônicos dos planos, para exibição/rastreamento no
// frontend. O preço de cobrança real é sempre recalculado no servidor
// (supabase/functions/mp-create-payment) — este arquivo não valida nada,
// só evita repetir os mesmos valores em CheckoutPage/PaymentSuccessPage/pixel.
export const PLAN_PRICES: Record<string, number> = {
  monthly: 99.00,
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
    'Gerador de cronograma de estudos e mapa mental personalizados para o seu interesse de estudo',
    'Assistente de IA que lê em tempo real a aula ou arquivo que você está estudando e tira qualquer dúvida',
  ],
  lifetime_pro: [
    'Acesso vitalício',
    '6 telas simultâneas',
    'Atualizações mensais + semanais',
    'Backup de tudo da plataforma no seu próprio Google Drive',
    'Download de arquivos, um a um',
    'Download em massa, cursos e pastas inteiras',
    'Download das aulas em vídeo — exclusivo do Pro',
    'Gerador de flashcards a partir de qualquer conteúdo da plataforma',
    'Gerador de banco de questões a partir de qualquer conteúdo da plataforma',
    'Gerador de cronograma de estudos e mapa mental personalizados para o seu interesse de estudo',
    'Assistente de IA que lê em tempo real a aula ou arquivo que você está estudando e tira qualquer dúvida',
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

// Quem pode baixar. São DUAS listas, porque aula e arquivo têm regras
// diferentes — é o único lugar da plataforma que decide isso.
//
// ARQUIVO (apostila, PDF, planilha, imagem, áudio — tudo que não é vídeo):
// do Vitalício pra cima, um por vez. Teste grátis, Mensal e Anual não baixam;
// clicar abre o convite pra assinar (trial) ou pra fazer upgrade.
export const PLANS_WITH_DOWNLOAD = new Set(['lifetime', 'lifetime_plus', 'lifetime_pro', 'admin']);

// AULA (vídeo): bloqueada em TODOS os planos, menos o Vitalício Pro. O acervo
// de vídeo é o ativo da plataforma; assistir na plataforma é o que todo plano
// compra, baixar o arquivo do vídeo é exclusividade do topo.
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
