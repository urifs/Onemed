-- Loja é para assinante: teste grátis não vê os produtos nem consegue comprar.
--
-- Como no link do grupo e nos avisos, o corte é na RLS — assim nem o nome e o
-- preço dos recursos chegam ao navegador de quem está em teste, e não sobra um
-- segundo lugar pra esquecer de bloquear. A recusa da COMPRA em si mora na
-- Edge Function store-create-payment, que roda com service role e por isso
-- passa por cima da RLS de propósito.
DROP POLICY IF EXISTS "Logados veem produtos ativos" ON public.store_products;
CREATE POLICY "Logados veem produtos ativos"
  ON public.store_products FOR SELECT TO authenticated
  USING (
    (active = true AND NOT public.is_trial_member())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
