import { describe, it, expect } from 'vitest';
import { canDownloadPlan, PLAN_LABELS } from '@/lib/plans';

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
