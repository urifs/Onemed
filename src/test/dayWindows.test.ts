import { describe, it, expect } from 'vitest';
import { dayStartISO, todayStartISO, yesterdayStartISO } from '@/lib/utils';

// Os cards de "vendas de um dia" do /admin/buyers dependem de dois pontos:
// a meia-noite ser a de São Paulo (não a do navegador de quem abre o painel)
// e a janela ser FECHADA. Sem o limite de cima, "5 dias atrás" somaria tudo
// que veio depois daquele dia.
describe('dayStartISO', () => {
  it('sempre cai na meia-noite de São Paulo (03:00 UTC)', () => {
    for (const n of [0, 1, 2, 5, 7, 30]) {
      expect(dayStartISO(n)).toMatch(/T03:00:00\.000Z$/);
    }
  });

  it('cada dia a mais volta exatamente 24h', () => {
    for (const n of [1, 2, 5, 7]) {
      const diff = Date.parse(dayStartISO(n - 1)) - Date.parse(dayStartISO(n));
      expect(diff).toBe(24 * 60 * 60 * 1000);
    }
  });

  it('anda para trás no tempo conforme o número cresce', () => {
    const dias = [0, 1, 2, 5, 7].map(n => Date.parse(dayStartISO(n)));
    expect(dias).toEqual([...dias].sort((a, b) => b - a));
  });

  it('mantém todayStartISO e yesterdayStartISO como os dias 0 e 1', () => {
    expect(todayStartISO()).toBe(dayStartISO(0));
    expect(yesterdayStartISO()).toBe(dayStartISO(1));
  });

  it('a janela de um dia fechado não alcança o dia seguinte', () => {
    const inicio = dayStartISO(5);
    const fim = dayStartISO(4);
    const dentro = new Date(Date.parse(inicio) + 12 * 3600 * 1000).toISOString();
    const depois = new Date(Date.parse(fim) + 1000).toISOString();
    expect(dentro >= inicio && dentro < fim).toBe(true);
    expect(depois >= inicio && depois < fim).toBe(false);
  });
});
