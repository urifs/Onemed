// ─────────────────────────────────────────────────────────────────────────────
// OneMed · quadro comparativo de planos para e-mail
//
// Mesmo conteúdo do quadro do checkout (diferença entre os planos), só que em
// HTML de e-mail: tabela empilhada, sem flexbox nem grid, que é o que o Gmail e
// o Outlook renderizam de verdade — 5 colunas lado a lado ficariam ilegíveis no
// celular, onde a maioria abre.
//
// Os preços NUNCA são escritos à mão: vêm de PLAN_PRICES e o desconto é
// calculado com a mesma conta do mp-create-payment (base - base*pct/100,
// arredondado em 2 casas). Assim o valor do e-mail é exatamente o que o
// checkout cobra ao aplicar o cupom.
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_PRICES: Record<string, number> = {
  monthly:       49.00,
  annual:        199.00,
  lifetime:      299.90,
  lifetime_plus: 599.00,
  lifetime_pro:  997.00,
}

export const brl = (valor: number) => `R$ ${valor.toFixed(2).replace('.', ',')}`

export const comDesconto = (plano: string, pct: number) =>
  Math.round((PLAN_PRICES[plano] - (PLAN_PRICES[plano] * pct / 100)) * 100) / 100

// O que cada plano tem A MAIS — é o que faz o leitor subir de plano. Texto
// curto de propósito: e-mail não é página de vendas.
type LinhaPlano = { id: string; nome: string; selo?: string; itens: string[] }

const PLANOS: LinhaPlano[] = [
  { id: 'monthly', nome: 'Mensal', itens: [
    'Acesso por 1 mês', '1 tela',
  ] },
  { id: 'annual', nome: 'Anual', itens: [
    'Acesso por 1 ano', '2 telas', 'Atualizações mensais',
  ] },
  { id: 'lifetime', nome: 'Vitalício', selo: 'MAIS ESCOLHIDO', itens: [
    'Acesso para sempre', '2 telas', 'Atualizações mensais', 'Download um a um',
  ] },
  { id: 'lifetime_plus', nome: 'Vitalício Plus', itens: [
    'Tudo do Vitalício', '4 telas', 'Backup no seu próprio Drive',
    'Download em massa', 'Flashcards e banco de questões por IA',
    'Assistente que lê a aula com você',
  ] },
  { id: 'lifetime_pro', nome: 'Vitalício Pro', itens: [
    'Tudo do Plus', '6 telas', 'Atualizações mensais + semanais',
    'Todas as atualizações sem depender de colaboração',
    'IA de diagnósticos Meduf',
  ] },
]

/**
 * Quadro comparativo pronto para injetar no corpo do e-mail.
 * @param pct percentual do cupom (0 = sem desconto: mostra só o preço de tabela)
 * @param siteUrl base do link de checkout
 * @param cupom código do cupom, já aplicado na URL de cada plano
 */
export function quadroDePlanos(pct: number, siteUrl: string, cupom?: string): string {
  const linhas = PLANOS.map(p => {
    const cheio = PLAN_PRICES[p.id]
    const final = comDesconto(p.id, pct)
    const temDesconto = pct > 0 && final < cheio
    const link = `${siteUrl}/checkout?plan=${p.id}${cupom ? `&coupon=${encodeURIComponent(cupom)}` : ''}`
    const destaque = !!p.selo

    return `
      <tr>
        <td style="padding: 0 0 10px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${destaque ? '#1A1410' : '#161616'}; border: 1px solid ${destaque ? '#DC2626' : '#262626'}; border-radius: 10px;">
            <tr>
              <td style="padding: 16px 18px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align: top;">
                      <p style="color: white; font-size: 16px; font-weight: 700; margin: 0;">
                        ${p.nome}${p.selo ? ` <span style="color: #DC2626; font-size: 10px; font-weight: 700; letter-spacing: 0.5px;">${p.selo}</span>` : ''}
                      </p>
                    </td>
                    <td style="vertical-align: top; text-align: right; white-space: nowrap;">
                      ${temDesconto ? `<span style="color: #64748B; font-size: 12px; text-decoration: line-through; margin-right: 6px;">${brl(cheio)}</span>` : ''}
                      <span style="color: #4ADE80; font-size: 19px; font-weight: 700;">${brl(final)}</span>
                    </td>
                  </tr>
                </table>
                <p style="color: #94A3B8; font-size: 13px; line-height: 1.6; margin: 8px 0 0;">
                  ${p.itens.join(' &nbsp;·&nbsp; ')}
                </p>
                <a href="${link}" style="display: inline-block; margin-top: 12px; color: ${destaque ? '#F87171' : '#94A3B8'}; font-size: 13px; font-weight: 600; text-decoration: none;">
                  Escolher ${p.nome} &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
  }).join('')

  return `
    <h2 style="color: white; font-size: 16px; font-weight: 700; margin: 0 0 4px;">
      Compare os planos
    </h2>
    <p style="color: #64748B; font-size: 13px; margin: 0 0 14px;">
      ${pct > 0 ? `Valores já com o desconto de ${pct}% do seu cupom.` : 'Valores de tabela.'}
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
      ${linhas}
    </table>`
}
