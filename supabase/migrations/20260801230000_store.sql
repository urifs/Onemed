-- Loja de recursos adicionais: produtos avulsos vendidos dentro da área de
-- membros, com o mesmo checkout do Mercado Pago das assinaturas.

CREATE TABLE public.store_products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  -- Preço em reais, com centavos. É a ÚNICA fonte do valor cobrado: a função
  -- store-create-payment lê daqui e ignora qualquer valor vindo do cliente,
  -- mesma regra dos planos.
  price       numeric(10,2) NOT NULL CHECK (price > 0),
  -- Texto curto de vitrine (ex.: "PDF · 120 páginas"), opcional.
  tagline     text,
  active      boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_products_active ON public.store_products(active, sort_order);

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

-- Vitrine: qualquer pessoa logada vê os produtos ATIVOS (inclusive teste
-- grátis — vender pra quem está avaliando é justamente o ponto).
CREATE POLICY "Logados veem produtos ativos"
  ON public.store_products FOR SELECT TO authenticated
  USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin gerencia produtos"
  ON public.store_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_store_products_updated_at
  BEFORE UPDATE ON public.store_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Pedidos ───────────────────────────────────────────────────────────────
-- Espelha o papel da tabela buyers no fluxo dos planos: a linha nasce
-- 'pending' quando o aluno clica em comprar e o mp-webhook a fecha como
-- 'approved' quando o pagamento confirma.
--
-- O preço fica GRAVADO no pedido (price_paid) em vez de sair por join com o
-- produto: mudar o preço de um produto amanhã não pode reescrever o valor de
-- uma venda de ontem.
CREATE TABLE public.store_orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         uuid REFERENCES public.store_products(id) ON DELETE SET NULL,
  product_name       text NOT NULL,
  user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email              text NOT NULL,
  price_paid         numeric(10,2) NOT NULL,
  status             text NOT NULL DEFAULT 'pending',
  external_reference text NOT NULL UNIQUE,
  payment_id         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  paid_at            timestamptz
);

CREATE INDEX idx_store_orders_email ON public.store_orders(lower(email));
CREATE INDEX idx_store_orders_status ON public.store_orders(status, created_at DESC);

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

-- O aluno lê os próprios pedidos (pra loja marcar o que ele já comprou).
-- Escrita é só da função de pagamento, que usa a service role e ignora RLS —
-- ninguém cria nem aprova pedido pelo navegador.
CREATE POLICY "Aluno le os proprios pedidos"
  ON public.store_orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
