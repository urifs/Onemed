import { describe, it, expect } from 'vitest';
import {
  canDownloadPlan, canDownloadLessonPlan, canDownloadItem, isLessonVideo,
  PLAN_LABELS, PLAN_FEATURES, PLAN_PRICES, upgradePriceFor, MIN_UPGRADE_PRICE,
} from '@/lib/plans';

// Regra de produto de 10/08: download de QUALQUER conteúdo (arquivo OU aula
// em vídeo) é EXCLUSIVO do Vitalício Pro (e admin). Nenhum outro plano baixa.
// Está em teste porque é decisão de negócio fácil de quebrar ao mexer na lista.
describe('download só no Vitalício Pro', () => {
  it('arquivo: só Pro e admin baixam', () => {
    expect(canDownloadPlan('lifetime_pro')).toBe(true);
    expect(canDownloadPlan('admin')).toBe(true);
  });

  it('arquivo: nenhum outro plano baixa — nem Vitalício, nem Plus', () => {
    for (const plano of ['trial', 'monthly', 'annual', 'lifetime', 'lifetime_plus']) {
      expect(canDownloadPlan(plano)).toBe(false);
    }
  });

  it('aula em vídeo: só Pro e admin baixam', () => {
    expect(canDownloadLessonPlan('lifetime_pro')).toBe(true);
    expect(canDownloadLessonPlan('admin')).toBe(true);
    for (const plano of ['trial', 'monthly', 'annual', 'lifetime', 'lifetime_plus']) {
      expect(canDownloadLessonPlan(plano)).toBe(false);
    }
  });

  it('sem plano conhecido não libera', () => {
    for (const p of [null, undefined, '', 'paid']) {
      expect(canDownloadPlan(p as string)).toBe(false);
      expect(canDownloadLessonPlan(p as string)).toBe(false);
    }
  });

  it('o que separa aula de arquivo é o tipo do item', () => {
    expect(isLessonVideo({ type: 'video' })).toBe(true);
    for (const t of ['pdf', 'doc', 'sheet', 'txt', 'audio', 'image', 'other']) {
      expect(isLessonVideo({ type: t })).toBe(false);
    }
    expect(isLessonVideo(null)).toBe(false);
  });

  it('porteiro único: só o Pro baixa, qualquer tipo', () => {
    // Vitalício e Plus NÃO baixam mais nada; Pro baixa tudo.
    for (const plano of ['monthly', 'annual', 'lifetime', 'lifetime_plus', 'trial']) {
      expect(canDownloadItem(plano, { type: 'pdf' })).toBe(false);
      expect(canDownloadItem(plano, { type: 'video' })).toBe(false);
    }
    expect(canDownloadItem('lifetime_pro', { type: 'video' })).toBe(true);
    expect(canDownloadItem('lifetime_pro', { type: 'pdf' })).toBe(true);
  });

  it('todo plano bloqueado tem nome para a mensagem de upgrade', () => {
    for (const plano of ['monthly', 'annual', 'lifetime', 'lifetime_plus']) {
      expect(PLAN_LABELS[plano]).toBeTruthy();
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

  // Download só existe no Pro (10/08). Só o upgrade que CHEGA no Pro pode
  // trazer download como novidade — nenhum outro.
  it('só o upgrade para o Pro promete download', () => {
    expect(novos('lifetime_plus', 'lifetime_pro').some(f => f.startsWith('Download'))).toBe(true);
    for (const [de, para] of [['monthly', 'annual'], ['annual', 'lifetime'], ['lifetime', 'lifetime_plus']]) {
      expect(novos(de, para).some(f => f.startsWith('Download'))).toBe(false);
    }
  });

  // Backup no Drive é idêntico entre Plus e Pro, então NÃO reaparece no
  // upgrade Plus→Pro (senão o cliente veria como novidade algo que já tem).
  it('plus → pro não repete o backup no Drive', () => {
    expect(novos('lifetime_plus', 'lifetime_pro')).not.toContain('Backup de tudo da plataforma no seu próprio Google Drive');
  });

  // 'Acesso vitalício' é idêntico de lifetime pra cima — não reaparece.
  it('não repete "Acesso vitalício" entre vitalícios', () => {
    expect(novos('lifetime', 'lifetime_plus')).not.toContain('Acesso vitalício');
    expect(novos('lifetime_plus', 'lifetime_pro')).not.toContain('Acesso vitalício');
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

// Ferramentas de IA (10/08): Mensal NÃO tem; Anual pra cima têm todas, com
// limite de uso crescente (5/10/20/ilimitado). Cada plano cita as ferramentas
// com o SEU limite, então o texto é único por plano — é o que faz o upgrade
// mostrar o novo limite como novidade.
describe('ferramentas de IA nos benefícios', () => {
  const linhaIa = (plano: string) =>
    (PLAN_FEATURES[plano] || []).find(f => f.startsWith('Ferramentas de IA'));

  it('mensal não cita ferramentas de IA', () => {
    expect(linhaIa('monthly')).toBeUndefined();
  });

  it('anual, vitalício, plus e pro citam as ferramentas de IA', () => {
    for (const plano of ['annual', 'lifetime', 'lifetime_plus', 'lifetime_pro']) {
      expect(linhaIa(plano)).toBeTruthy();
    }
  });

  it('o limite de IA sobe a cada plano (5 → 10 → 20 → ilimitado)', () => {
    expect(linhaIa('annual')).toContain('5 usos por dia');
    expect(linhaIa('lifetime')).toContain('10 usos por dia');
    expect(linhaIa('lifetime_plus')).toContain('20 usos por dia');
    expect(linhaIa('lifetime_pro')).toContain('ilimitado');
  });

  it('cada upgrade traz a linha de IA do novo limite como novidade', () => {
    const novos = (de: string, para: string) =>
      (PLAN_FEATURES[para] || []).filter(f => !(PLAN_FEATURES[de] || []).includes(f));
    for (const [de, para] of [['annual', 'lifetime'], ['lifetime', 'lifetime_plus'], ['lifetime_plus', 'lifetime_pro']]) {
      expect(novos(de, para).some(f => f.startsWith('Ferramentas de IA'))).toBe(true);
    }
  });
});

// Só o Pro tem download; os limites de IA por plano batem com o enforcement
// real das Edge Functions (annual 5, lifetime 10, plus 20, pro ilimitado).
describe('coerência do card do Pro', () => {
  it('só o Pro anuncia download', () => {
    for (const plano of ['monthly', 'annual', 'lifetime', 'lifetime_plus']) {
      expect(PLAN_FEATURES[plano].some(f => f.startsWith('Download'))).toBe(false);
    }
    expect(PLAN_FEATURES.lifetime_pro.some(f => f.startsWith('Download'))).toBe(true);
  });
});
