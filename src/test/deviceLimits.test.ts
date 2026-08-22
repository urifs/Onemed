import { describe, it, expect } from 'vitest';
import { PLAN_DEVICE_LIMITS, DEFAULT_DEVICE_LIMIT, PLAN_FEATURES, PLAN_LABELS } from '@/lib/plans';

// O limite de telas é vendido no card do plano ("2 telas simultâneas") e
// aplicado no login pelo member-auth-request. Quando as duas pontas não se
// falam, o cliente compra uma coisa e recebe outra — foi o que aconteceu com o
// Mensal, que anunciava 1 tela e liberava 2 por não constar no mapa de limites.
// Este teste lê o número DO PRÓPRIO TEXTO do benefício e exige que bata.
const telasPrometidas = (plano: string): number | null => {
  const linha = (PLAN_FEATURES[plano] || []).find(f => /tela[s]? simult/i.test(f));
  if (!linha) return null;
  const m = /^(\d+)\s+tela/i.exec(linha.trim());
  return m ? Number(m[1]) : null;
};

const PLANOS = ['monthly', 'annual', 'lifetime', 'lifetime_plus', 'lifetime_pro'];

describe('telas simultâneas: o que se promete é o que se aplica', () => {
  it('todo plano anuncia um número de telas', () => {
    for (const plano of PLANOS) {
      expect(telasPrometidas(plano), `${plano} não anuncia telas`).toBeGreaterThan(0);
    }
  });

  it('o limite aplicado é exatamente o anunciado no card', () => {
    for (const plano of PLANOS) {
      expect(PLAN_DEVICE_LIMITS[plano], `${PLAN_LABELS[plano] || plano}`).toBe(telasPrometidas(plano));
    }
  });

  it('nenhum plano depende do padrão (o mapa cobre todos)', () => {
    // O bug do Mensal nasceu de um plano ausente caindo no DEFAULT em silêncio.
    for (const plano of PLANOS) {
      expect(PLAN_DEVICE_LIMITS[plano], `${plano} fora do mapa`).toBeTypeOf('number');
    }
  });

  it('o padrão só vale para tipo desconhecido (trial, "paid" legado)', () => {
    expect(DEFAULT_DEVICE_LIMIT).toBe(2);
    expect(PLAN_DEVICE_LIMITS['trial']).toBeUndefined();
    expect(PLAN_DEVICE_LIMITS['paid']).toBeUndefined();
  });

  it('o limite cresce com o plano (nunca diminui ao subir de tier)', () => {
    const escada = PLANOS.map(p => PLAN_DEVICE_LIMITS[p]);
    for (let i = 1; i < escada.length; i++) {
      expect(escada[i], `${PLANOS[i]} não pode ter menos telas que ${PLANOS[i - 1]}`)
        .toBeGreaterThanOrEqual(escada[i - 1]);
    }
  });
});

describe('telas extras no perfil', () => {
  // O modal reescreve o benefício de telas quando a conta comprou extras —
  // sem isso, "2 telas simultâneas" aparecia logo acima de "Telas
  // simultâneas 4", contradizendo a si mesmo na mesma tela.
  const comExtras = (plano: string, extras: number) =>
    (PLAN_FEATURES[plano] || []).map(f =>
      extras > 0 && /\d+\s*telas?\s+simult/i.test(f)
        ? f.replace(/\d+\s*telas?\s+simult[âa]neas?/i,
            `${(PLAN_DEVICE_LIMITS[plano] ?? DEFAULT_DEVICE_LIMIT) + extras} telas simultâneas`)
          + ` (${PLAN_DEVICE_LIMITS[plano] ?? DEFAULT_DEVICE_LIMIT} do plano + ${extras} extra${extras > 1 ? 's' : ''})`
        : f);

  it('soma as extras ao benefício de telas e diz de onde vêm', () => {
    const linha = comExtras('lifetime', 2).find(f => /telas? simult/i.test(f));
    // Texto EXATO: com `toContain` um replace quebrado no acento
    // ("4 telas simultâneasâneas") passava despercebido.
    expect(linha).toBe('4 telas simultâneas (2 do plano + 2 extras)');
  });

  it('usa o singular com uma tela extra', () => {
    expect(comExtras('lifetime', 1).find(f => /telas? simult/i.test(f)))
      .toBe('3 telas simultâneas (2 do plano + 1 extra)');
  });

  it('sem extras, o texto do plano fica intocado', () => {
    expect(comExtras('lifetime', 0)).toEqual(PLAN_FEATURES['lifetime']);
  });
});
