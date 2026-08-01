-- Relatório de vendas da loja para o painel admin: cada pedido com quem
-- comprou, não só o e-mail.
--
-- É uma RPC (SECURITY DEFINER) porque juntar nome, WhatsApp e plano do
-- comprador exige ler profiles/accesses/buyers de OUTRAS pessoas — coisa que
-- a RLS dessas tabelas corretamente não libera pro navegador. Aqui o portão é
-- explícito: sem role admin, não passa.
--
-- Nada disso mistura loja com assinatura: as vendas da loja vivem só em
-- store_orders, e a tela de Compradores continua lendo apenas buyers.
CREATE OR REPLACE FUNCTION public.get_store_orders(_product_id uuid DEFAULT NULL)
RETURNS TABLE(
  id                 uuid,
  product_id         uuid,
  product_name       text,
  email              text,
  buyer_name         text,
  whatsapp           text,
  buyer_plan         text,
  price_paid         numeric,
  status             text,
  payment_id         text,
  external_reference text,
  created_at         timestamptz,
  paid_at            timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    o.id, o.product_id, o.product_name, o.email,
    -- Nome: o do perfil da conta; se não houver, o que ficou na compra do
    -- plano (buyers.name), que é onde o nome é digitado no checkout.
    COALESCE(
      (SELECT p.name FROM public.profiles p WHERE lower(p.email) = lower(o.email) AND p.name IS NOT NULL LIMIT 1),
      (SELECT b.name FROM public.buyers b WHERE lower(b.email) = lower(o.email) AND b.name IS NOT NULL
        ORDER BY b.created_at DESC LIMIT 1)
    ) AS buyer_name,
    COALESCE(
      (SELECT b.whatsapp FROM public.buyers b WHERE lower(b.email) = lower(o.email) AND b.whatsapp IS NOT NULL
        ORDER BY b.created_at DESC LIMIT 1),
      (SELECT a.whatsapp FROM public.accesses a WHERE lower(a.email) = lower(o.email) AND a.whatsapp IS NOT NULL
        ORDER BY a.created_at DESC LIMIT 1)
    ) AS whatsapp,
    -- Plano do comprador na plataforma, resolvendo o access_type='paid'
    -- legado pela compra correspondente (senão mensal e anual antigos
    -- apareceriam como se não tivessem plano nenhum).
    (
      SELECT pl.plano FROM (
        SELECT CASE
                 WHEN a.access_type = 'paid' THEN COALESCE((
                   SELECT b2.plan FROM public.buyers b2
                   WHERE lower(b2.email) = lower(o.email) AND b2.access_granted = true
                   ORDER BY b2.created_at DESC LIMIT 1
                 ), 'lifetime')
                 ELSE a.access_type
               END AS plano
        FROM public.accesses a
        WHERE lower(a.email) = lower(o.email) AND a.status = 'active'
      ) pl
      ORDER BY CASE pl.plano
                 WHEN 'lifetime_pro'  THEN 6
                 WHEN 'lifetime_plus' THEN 5
                 WHEN 'lifetime'      THEN 4
                 WHEN 'annual'        THEN 3
                 WHEN 'monthly'       THEN 2
                 WHEN 'trial'         THEN 1
                 ELSE 0
               END DESC
      LIMIT 1
    ) AS buyer_plan,
    o.price_paid, o.status, o.payment_id, o.external_reference, o.created_at, o.paid_at
  FROM public.store_orders o
  WHERE (_product_id IS NULL OR o.product_id = _product_id)
  ORDER BY COALESCE(o.paid_at, o.created_at) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_orders(uuid) TO authenticated;
