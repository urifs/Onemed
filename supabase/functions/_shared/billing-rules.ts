// ─────────────────────────────────────────────────────────────────────────────
// OneMed · regras de cobrança que mexem em dinheiro real
//
// Ficam aqui, isoladas e SEM nenhuma dependência de Deno/Supabase, por um
// motivo: são as contas que decidem quanto um afiliado recebe e até quando o
// acesso de um aluno vale. Erro nelas não aparece em tela nenhuma — aparece no
// extrato de alguém. Como módulo puro, dá para cobrir por teste
// (src/test/billingRules.test.ts) sem subir função nem banco.
//
// Quem usa: supabase/functions/mp-webhook.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base de cálculo da comissão de afiliado.
 *
 * A regra do dono (07/08) é comissão sobre o PLANO, não sobre o total pago —
 * upsells e telas extras ficam de fora. Por isso a base normal é o preço de
 * TABELA do plano, e não o que entrou no caixa: um cupom de desconto sai do
 * bolso da OneMed, não do afiliado.
 *
 * O UPGRADE é a exceção que faltava. Nele o comprador paga só a DIFERENÇA
 * entre os planos, mas o preço de tabela é o do plano novo inteiro — a
 * comissão saía sobre um valor que ninguém pagou (30% de R$ 1.497 numa venda
 * de R$ 699 de diferença é 64% do que entrou). Num upgrade, a base nunca pode
 * passar do que foi efetivamente cobrado pelo plano.
 */
export function baseDaComissao(params: {
  precoDeTabela: number;
  /** buyers.plan_amount: valor do plano cobrado nesta transação, sem upsells. */
  cobradoPeloPlano: number | null;
  /** buyers.purchase_kind: 'new' | 'upgrade' | 'renewal' | 'screens'. */
  tipoDeCompra?: string | null;
}): number {
  const { precoDeTabela, cobradoPeloPlano, tipoDeCompra } = params;
  if (tipoDeCompra === 'upgrade' && cobradoPeloPlano != null) {
    return Math.min(precoDeTabela, cobradoPeloPlano);
  }
  return precoDeTabela;
}

/**
 * Novo vencimento do acesso depois de uma compra aprovada.
 *
 * Renovar ANTES de vencer soma ao que ainda resta, em vez de reiniciar a
 * contagem de hoje: quem renovava o Anual faltando 40 dias pagava por 12 meses
 * e recebia 12 meses menos os 40 dias que já tinha. Acesso já vencido (ou
 * inexistente) reinicia do zero, e plano sem duração (vitalício) nunca vence.
 *
 * `agoraMs` e `vencimentoAtual` entram como parâmetro para o teste conseguir
 * fixar o tempo.
 */
export function novoVencimento(params: {
  /** Duração do plano em dias; null/0 = vitalício (nunca vence). */
  duracaoEmDias: number | null | undefined;
  /** expires_at do acesso ativo, se houver. */
  vencimentoAtual: string | null | undefined;
  agoraMs: number;
}): string | null {
  const { duracaoEmDias, vencimentoAtual, agoraMs } = params;
  if (!duracaoEmDias) return null;

  const venc = vencimentoAtual ? new Date(vencimentoAtual).getTime() : 0;
  const restante = Number.isFinite(venc) && venc > agoraMs ? venc - agoraMs : 0;

  return new Date(agoraMs + restante + duracaoEmDias * 24 * 60 * 60 * 1000).toISOString();
}
