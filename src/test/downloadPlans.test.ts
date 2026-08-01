import { describe, it, expect } from 'vitest';
import { canDownloadPlan, PLAN_LABELS, PLAN_FEATURES } from '@/lib/plans';

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

  it('plus → pro não repete nenhum benefício de download', () => {
    expect(novos('lifetime_plus', 'lifetime_pro').filter(f => f.startsWith('Download'))).toEqual([]);
  });

  it('mensal → anual não promete download', () => {
    expect(novos('monthly', 'annual').filter(f => f.startsWith('Download'))).toEqual([]);
  });
});
