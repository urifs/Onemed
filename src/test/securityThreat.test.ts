import { describe, it, expect } from 'vitest';
import { computeThreat, SecurityOverview } from '@/lib/security';

function base(alertas: SecurityOverview['alertas']): SecurityOverview {
  return {
    gerado_em: '', janela_horas: 24,
    metricas: {} as SecurityOverview['metricas'],
    alertas, ips_suspeitos: [], localizacoes: [], signups_recentes: [],
    compras_recentes: [], rate_limits: [], papeis: [], serie: [],
  };
}

describe('computeThreat', () => {
  it('sem alertas = seguro (0)', () => {
    expect(computeThreat(base([]))).toEqual({ score: 0, nivel: 'ok' });
  });

  it('assinatura de ataque crava no mínimo alto (>=70)', () => {
    const r = computeThreat(base([
      { severidade: 'alta', tipo: 'venda_fake', titulo: '', detalhe: '', valor: 1 },
    ]));
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.nivel).toBe('critico');
  });

  it('médias acumulam mas não estouram sem assinatura', () => {
    const r = computeThreat(base([
      { severidade: 'media', tipo: 'ip_multi_conta', titulo: '', detalhe: '', valor: 3 },
      { severidade: 'media', tipo: 'rate_limit', titulo: '', detalhe: '', valor: 5 },
    ]));
    expect(r.score).toBe(16);
    expect(r.nivel).toBe('medio');
  });

  it('score satura em 100', () => {
    const muitos = Array.from({ length: 10 }, () => ({
      severidade: 'alta' as const, tipo: 'ip_multi_conta', titulo: '', detalhe: '', valor: 9,
    }));
    expect(computeThreat(base(muitos)).score).toBe(100);
  });

  it('undefined não quebra', () => {
    expect(computeThreat(undefined)).toEqual({ score: 0, nivel: 'ok' });
  });
});
