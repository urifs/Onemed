// Referência de afiliado no navegador do indicado.
//
// O link de divulgação leva pra LANDING (?ref=CUPOM), não pro checkout: o
// indicado conhece o produto, pode fazer o teste grátis e voltar dias depois.
// O código fica guardado aqui por 30 dias e faz duas coisas no checkout:
//   1. aplica o cupom de 10% do afiliado sozinho (se nenhum outro foi passado);
//   2. viaja em buyers.affiliate_ref — mesmo que o comprador troque ou remova
//      o cupom, a venda continua atribuída ao afiliado que indicou.
// Último link clicado vence (padrão de mercado em afiliação).
const KEY = 'om_affiliate_ref';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function captureAffiliateRefFromUrl(): void {
  try {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (!ref) return;
    const clean = ref.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    if (clean.length < 4) return;
    localStorage.setItem(KEY, JSON.stringify({ code: clean, at: Date.now() }));
  } catch { /* storage indisponível: sem referência, checkout segue normal */ }
}

export function getAffiliateRef(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { code, at } = JSON.parse(raw);
    if (!code || typeof at !== 'number' || Date.now() - at > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return code as string;
  } catch {
    return null;
  }
}
