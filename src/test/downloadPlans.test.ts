import { describe, it, expect } from 'vitest';
import {
  canDownloadPlan, canDownloadLessonPlan, canDownloadItem, isLessonVideo,
  PLAN_LABELS, PLAN_FEATURES, PLAN_PRICES, upgradePriceFor, MIN_UPGRADE_PRICE,
} from '@/lib/plans';

// Regra de produto: teste grátis, Mensal e Anual não baixam. Vitalício e
// acima baixam. Está em teste porque é uma decisão de negócio fácil de
// quebrar sem querer ao mexer na lista de planos.
describe('canDownloadPlan', () => {
  it('bloqueia teste grátis', () => {
    expect(canDownloadPlan('trial')).toBe(false);
  });

  it('bloqueia mensal e anual', () => {
    expect(canDownloadPlan('monthly')).toBe(false);
    expect(canDownloadPlan('annual')).toBe(false);
  });

  it('libera vitalício, plus e pro', () => {
    expect(canDownloadPlan('lifetime')).toBe(true);
    expect(canDownloadPlan('lifetime_plus')).toBe(true);
    expect(canDownloadPlan('lifetime_pro')).toBe(true);
  });

  it('libera admin', () => {
    expect(canDownloadPlan('admin')).toBe(true);
  });

  it('sem plano conhecido não libera', () => {
    expect(canDownloadPlan(null)).toBe(false);
    expect(canDownloadPlan(undefined)).toBe(false);
    expect(canDownloadPlan('')).toBe(false);
    // 'paid' é o rótulo legado do webhook: o banco resolve pelo plano da
    // compra antes de chegar aqui, então ele nunca deve liberar sozinho.
    expect(canDownloadPlan('paid')).toBe(false);
  });

  it('todo plano bloqueado tem nome para a mensagem de upgrade', () => {
    for (const plano of ['monthly', 'annual']) {
      expect(PLAN_LABELS[plano]).toBeTruthy();
    }
  });
});

// Regra de produto de 09/08: baixar AULA em vídeo é exclusivo do Vitalício
// Pro. Arquivo (apostila/PDF/planilha/imagem/áudio) continua do Vitalício pra
// cima. As duas listas são independentes de propósito.
describe('download de aula em vídeo (exclusivo do Pro)', () => {
  it('só o Pro e o admin baixam aula', () => {
    expect(canDownloadLessonPlan('lifetime_pro')).toBe(true);
    expect(canDownloadLessonPlan('admin')).toBe(true);
  });

  it('nenhum outro plano baixa aula — nem o Plus, nem o Vitalício', () => {
    for (const plano of ['trial', 'monthly', 'annual', 'lifetime', 'lifetime_plus']) {
      expect(canDownloadLessonPlan(plano)).toBe(false);
    }
  });

  it('sem plano conhecido não libera aula', () => {
    expect(canDownloadLessonPlan(null)).toBe(false);
    expect(canDownloadLessonPlan(undefined)).toBe(false);
    expect(canDownloadLessonPlan('paid')).toBe(false);
  });

  it('o que separa aula de arquivo é o tipo do item', () => {
    expect(isLessonVideo({ type: 'video' })).toBe(true);
    for (const t of ['pdf', 'doc', 'sheet', 'txt', 'audio', 'image', 'other']) {
      expect(isLessonVideo({ type: t })).toBe(false);
    }
    expect(isLessonVideo(null)).toBe(false);
  });

  it('porteiro único: mesmo plano, resposta diferente por tipo', () => {
    // O caso que motivou a mudança: Vitalício e Plus baixam a apostila,
    // mas não baixam mais o vídeo da aula.
    for (const plano of ['lifetime', 'lifetime_plus']) {
      expect(canDownloadItem(plano, { type: 'pdf' })).toBe(true);
      expect(canDownloadItem(plano, { type: 'video' })).toBe(false);
    }
    // Pro baixa os dois; Mensal/Anual não baixam nenhum.
    expect(canDownloadItem('lifetime_pro', { type: 'video' })).toBe(true);
    expect(canDownloadItem('lifetime_pro', { type: 'pdf' })).toBe(true);
    for (const plano of ['monthly', 'annual', 'trial']) {
      expect(canDownloadItem(plano, { type: 'video' })).toBe(false);
      expect(canDownloadItem(plano, { type: 'pdf' })).toBe(false);
    }
  });
});

// O modal de upgrade lista "o que você ganha a mais" como diferença de
// conjunto entre os textos de PLAN_FEATURES — por isso os textos repetidos
// entre planos vizinhos precisam ser IDÊNTICOS, senão um benefício que a
// pessoa já tem reaparece como novidade.
describe('diferença de benefícios no upgrade', () => {
  const novos = (de: string, para: string) =>
    (PLAN_FEATURES[para] || []).filter(f => !(PLAN_FEATURES[de] || []).includes(f));

  it('anual → vitalício ganha o download unitário', () => {
    expect(novos('annual', 'lifetime')).toContain('Download de arquivos, um a um');
  });

  it('vitalício → plus ganha só o download em massa, não o unitário', () => {
    const d = novos('lifetime', 'lifetime_plus');
    expect(d).toContain('Download em massa, cursos e pastas inteiras');
    expect(d).not.toContain('Download de arquivos, um a um');
  });

  // Mudou em 09/08: baixar aula em vídeo virou exclusividade do Pro, então
  // agora ESPERA-SE uma novidade de download aqui — mas só essa. Repetir os
  // downloads de arquivo continuaria sendo bug (a pessoa já os tem no Plus).
  it('plus → pro ganha só o download das aulas em vídeo', () => {
    expect(novos('lifetime_plus', 'lifetime_pro').filter(f => f.startsWith('Download')))
      .toEqual(['Download das aulas em vídeo — exclusivo do Pro']);
  });

  it('mensal → anual não promete download', () => {
    expect(novos('monthly', 'annual').filter(f => f.startsWith('Download'))).toEqual([]);
  });
});

// O upgrade cobra a diferença de TABELA entre os planos. O bug que isso
// corrige: descontar o valor efetivamente pago fazia quem comprou com cupom
// pagar MAIS caro pra subir de plano do que quem pagou o preço cheio.
describe('upgradePriceFor', () => {
  it('cobra a diferença entre os preços de tabela', () => {
    expect(upgradePriceFor('lifetime_plus', 'lifetime_pro')).toBe(699);
    expect(upgradePriceFor('lifetime', 'lifetime_plus')).toBe(299);
    expect(upgradePriceFor('annual', 'lifetime')).toBe(200);
    expect(upgradePriceFor('monthly', 'annual')).toBe(200);
  });

  it('não depende de quanto a pessoa pagou (cupom não muda o degrau)', () => {
    // Antes: Plus comprado com 50% off (R$ 299,50) → upgrade pro Pro saía
    // R$ 697,50. Agora é o mesmo valor pra qualquer Plus.
    const comCupom = upgradePriceFor('lifetime_plus', 'lifetime_pro');
    const semCupom = upgradePriceFor('lifetime_plus', 'lifetime_pro');
    expect(comCupom).toBe(semCupom);
    expect(comCupom).toBeLessThan(PLAN_PRICES.lifetime_pro - 299.50);
  });

  it('sem plano atual conhecido, cobra o preço cheio do alvo', () => {
    expect(upgradePriceFor(null, 'lifetime_pro')).toBe(PLAN_PRICES.lifetime_pro);
    expect(upgradePriceFor('desconhecido', 'lifetime')).toBe(PLAN_PRICES.lifetime);
  });

  it('nunca devolve valor menor que o mínimo cobrável', () => {
    expect(upgradePriceFor('lifetime_pro', 'lifetime_pro')).toBe(MIN_UPGRADE_PRICE);
  });
});

// Ferramentas de IA anunciadas SO no Plus e no Pro (Mensal/Anual/Vitalicio
// não citam — serão bloqueados futuramente sem quebrar promessa de venda).
describe('geradores de IA nos benefícios', () => {
  const GERADORES = [
    'Gerador de flashcards a partir de qualquer conteúdo da plataforma',
    'Gerador de banco de questões a partir de qualquer conteúdo da plataforma',
  ];

  it('plus e pro anunciam os dois geradores, com texto idêntico', () => {
    for (const g of GERADORES) {
      expect(PLAN_FEATURES.lifetime_plus).toContain(g);
      expect(PLAN_FEATURES.lifetime_pro).toContain(g);
    }
  });

  it('plus e pro anunciam o assistente de IA, com texto idêntico; os demais não', () => {
    const ASSISTENTE = 'Assistente de IA que lê em tempo real a aula ou arquivo que você está estudando e tira qualquer dúvida';
    expect(PLAN_FEATURES.lifetime_plus).toContain(ASSISTENTE);
    expect(PLAN_FEATURES.lifetime_pro).toContain(ASSISTENTE);
    for (const plano of ['monthly', 'annual', 'lifetime']) {
      expect(PLAN_FEATURES[plano].filter(f => f.startsWith('Assistente'))).toEqual([]);
    }
  });

  it('mensal, anual e vitalício não citam os geradores', () => {
    for (const plano of ['monthly', 'annual', 'lifetime']) {
      expect(PLAN_FEATURES[plano].filter(f => f.startsWith('Gerador'))).toEqual([]);
    }
  });

  it('vitalício → plus ganha os geradores como novidade; plus → pro não repete', () => {
    const novos = (de: string, para: string) =>
      (PLAN_FEATURES[para] || []).filter(f => !(PLAN_FEATURES[de] || []).includes(f));
    for (const g of GERADORES) expect(novos('lifetime', 'lifetime_plus')).toContain(g);
    expect(novos('lifetime_plus', 'lifetime_pro').filter(f => f.startsWith('Gerador'))).toEqual([]);
  });
});
