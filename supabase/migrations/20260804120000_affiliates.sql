-- ─────────────────────────────────────────────────────────────────────────────
-- Programa de afiliados.
--
-- Cadastro próprio (email+senha via Supabase Auth, fora do fluxo de assinante),
-- cupom exclusivo de 10% por afiliado (linha normal em `coupons`, validada pelo
-- checkout existente sem mudança), e atribuição de venda pelo cupom usado:
-- `buyers.coupon_code` guarda o código aplicado e o mp-webhook, ao aprovar,
-- grava a comissão em `affiliate_sales`.
--
-- Comissões por plano: monthly 15% · annual/lifetime 20% · plus 25% · pro 30%.
-- Pagamento é manual (PIX): admin vê o pendente por afiliado e marca "quitado".
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.affiliates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL UNIQUE,
  name        text        NOT NULL,
  email       text        NOT NULL UNIQUE,
  coupon_code text        UNIQUE,
  pix_key     text,
  pix_name    text,
  pix_bank    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_sales (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id       uuid        NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  buyer_email        text        NOT NULL,
  buyer_name         text,
  plan               text        NOT NULL,
  amount             numeric     NOT NULL,
  commission_percent integer     NOT NULL,
  commission_amount  numeric     NOT NULL,
  payment_id         text,
  -- Uma venda aprovada = uma comissão: o external_reference do comprador é
  -- único, então reprocessar o webhook não duplica a linha.
  external_reference text        UNIQUE,
  status             text        NOT NULL DEFAULT 'pending', -- pending | paid
  created_at         timestamptz NOT NULL DEFAULT now(),
  paid_at            timestamptz
);

CREATE INDEX IF NOT EXISTS idx_affiliate_sales_affiliate ON public.affiliate_sales (affiliate_id, created_at DESC);

-- Código do cupom aplicado na compra — é o elo comprador → afiliado.
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS coupon_code text;

ALTER TABLE public.affiliates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;

-- Afiliado lê e edita a própria linha; a edição direta só alcança os campos
-- de PIX (grant por coluna abaixo) — cupom muda apenas pela Edge Function
-- affiliate-coupon (service role), que valida colisão e formato.
CREATE POLICY "Afiliado le a propria conta"
  ON public.affiliates FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Afiliado edita a propria conta"
  ON public.affiliates FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Admin gerencia afiliados"
  ON public.affiliates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

REVOKE UPDATE ON public.affiliates FROM authenticated;
GRANT UPDATE (pix_key, pix_name, pix_bank) ON public.affiliates TO authenticated;

CREATE POLICY "Afiliado le as proprias vendas"
  ON public.affiliate_sales FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = (SELECT auth.uid()))
         OR (SELECT has_role(auth.uid(), 'admin'::app_role)));

-- Escrita de vendas: só service role (webhook). Admin marca quitado.
CREATE POLICY "Admin gerencia vendas de afiliados"
  ON public.affiliate_sales FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_affiliates_updated_at
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Referência do afiliado que indicou o comprador (link ?ref= na landing),
-- gravada pelo CheckoutPage no insert. Atribuição independente do cupom: o
-- webhook usa coupon_code e, na falta dele, affiliate_ref.
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS affiliate_ref text;
