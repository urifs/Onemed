import { describe, it, expect } from 'vitest';
import { baseDaComissao, novoVencimento } from '../../supabase/functions/_shared/billing-rules';

// Estas duas contas decidem quanto um afiliado recebe e até quando o acesso de
// um aluno vale. Erro aqui não aparece em tela nenhuma — aparece no extrato de
// alguém, semanas depois. Daí o teste.

describe('base da comissão de afiliado', () => {
  it('venda nova: usa o preço de tabela, mesmo com cupom (o desconto sai da OneMed)', () => {
    expect(baseDaComissao({ precoDeTabela: 499, cobradoPeloPlano: 349.30, tipoDeCompra: 'new' }))
      .toBe(499);
  });

  it('renovação: também usa o preço de tabela', () => {
    expect(baseDaComissao({ precoDeTabela: 299, cobradoPeloPlano: 299, tipoDeCompra: 'renewal' }))
      .toBe(299);
  });

  it('UPGRADE: usa a diferença cobrada, nunca o preço cheio do plano novo', () => {
    // Vitalício (499) → Pro (1497): o comprador paga 998 de diferença.
    // Com o preço cheio, 30% dariam R$ 449 numa venda de R$ 998.
    expect(baseDaComissao({ precoDeTabela: 1497, cobradoPeloPlano: 998, tipoDeCompra: 'upgrade' }))
      .toBe(998);
  });

  it('upgrade sem plan_amount registrado (linha antiga): cai no preço de tabela', () => {
    expect(baseDaComissao({ precoDeTabela: 1497, cobradoPeloPlano: null, tipoDeCompra: 'upgrade' }))
      .toBe(1497);
  });

  it('upgrade cujo valor cobrado passa do preço de tabela nunca infla a base', () => {
    expect(baseDaComissao({ precoDeTabela: 499, cobradoPeloPlano: 900, tipoDeCompra: 'upgrade' }))
      .toBe(499);
  });
});

describe('vencimento do acesso após compra aprovada', () => {
  const AGORA = Date.parse('2026-08-19T12:00:00.000Z');
  const DIA = 24 * 60 * 60 * 1000;

  it('plano vitalício (sem duração) nunca vence', () => {
    expect(novoVencimento({ duracaoEmDias: null, vencimentoAtual: null, agoraMs: AGORA })).toBeNull();
  });

  it('primeira compra: conta a duração a partir de agora', () => {
    const r = novoVencimento({ duracaoEmDias: 365, vencimentoAtual: null, agoraMs: AGORA });
    expect(Date.parse(r!) - AGORA).toBe(365 * DIA);
  });

  it('renovação ANTECIPADA soma os dias que ainda restavam', () => {
    // Anual renovado faltando 40 dias: recebe 365 + 40, não 365.
    const vencimentoAtual = new Date(AGORA + 40 * DIA).toISOString();
    const r = novoVencimento({ duracaoEmDias: 365, vencimentoAtual, agoraMs: AGORA });
    expect(Date.parse(r!) - AGORA).toBe(405 * DIA);
  });

  it('acesso JÁ VENCIDO reinicia do zero, sem crédito retroativo', () => {
    const vencimentoAtual = new Date(AGORA - 90 * DIA).toISOString();
    const r = novoVencimento({ duracaoEmDias: 30, vencimentoAtual, agoraMs: AGORA });
    expect(Date.parse(r!) - AGORA).toBe(30 * DIA);
  });

  it('expires_at inválido não quebra a conta nem gera data absurda', () => {
    const r = novoVencimento({ duracaoEmDias: 30, vencimentoAtual: 'não é data', agoraMs: AGORA });
    expect(Date.parse(r!) - AGORA).toBe(30 * DIA);
  });
});
