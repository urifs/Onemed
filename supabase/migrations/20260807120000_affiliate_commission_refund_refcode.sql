-- ═══════════════════════════════════════════════════════════════════════════
-- Programa de afiliados — 3 decisões do dono (2026-08-07):
--   1. Comissão SÓ sobre o plano (não sobre os upsells).
--   2. Reembolso/chargeback reverte a comissão automaticamente.
--   3. Link de indicação passa a usar um ID IMUTÁVEL (ref_code), não o cupom
--      (que o afiliado pode trocar, quebrando a atribuição de links antigos).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Base da comissão = valor do PLANO (após desconto, antes dos upsells).
--    O mp-create-payment passa a gravar isto; o mp-webhook calcula a comissão
--    sobre ele em vez do transaction_amount (que inclui os complementos).
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS plan_amount numeric;

-- 2) Reversão: 'reversed' é só mais um valor do status text já existente
--    (pending | paid | reversed). Nenhuma mudança de schema — documentado aqui.
--    Índice pra resolver a reversão pelo external_reference é a constraint
--    UNIQUE que já existe em affiliate_sales.external_reference.

-- 3) ref_code imutável. Gerado uma vez no cadastro e nunca alterado (o
--    coupon_code continua mutável, só o desconto depende dele). Backfill dos
--    afiliados atuais com o cupom que já divulgam, pra os links em circulação
--    (?ref=CUPOM) continuarem atribuindo mesmo depois de trocarem o cupom.
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS ref_code text;

UPDATE public.affiliates
   SET ref_code = coupon_code
 WHERE ref_code IS NULL AND coupon_code IS NOT NULL;

-- Quem não tem cupom ainda recebe um ref_code estável e único agora.
UPDATE public.affiliates
   SET ref_code = 'AF' || upper(substr(replace(id::text, '-', ''), 1, 8))
 WHERE ref_code IS NULL;

-- Único, mas parcial: linhas antigas sem ref_code (não deve haver depois do
-- backfill) não travam a constraint.
CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_ref_code
  ON public.affiliates (ref_code) WHERE ref_code IS NOT NULL;
