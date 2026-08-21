-- Cartão "Compradores" contava COMPRAS, não pessoas
--
-- `total_count` é count(*) das linhas aprovadas de `buyers`. Renovação,
-- upgrade e compra de telas extras criam uma linha NOVA para o mesmo e-mail
-- (é o que a coluna `purchase_kind` registra), então quem comprou três vezes
-- era contado três vezes. Medido em produção: 663 linhas para 643 pessoas —
-- o painel anunciava 20 compradores que não existem.
--
-- As duas grandezas continuam necessárias e ficam SEPARADAS: `total_count`
-- segue sendo o denominador da lista paginada ("100 de 663" está certo, são
-- linhas), e `total_buyers` é o número de pessoas, que é o que o cartão com
-- ícone de gente promete.
--
-- Corpo vivo conferido com pg_get_functiondef antes deste CREATE OR REPLACE,
-- conforme a regra do projeto: era idêntico ao do repo.
CREATE OR REPLACE FUNCTION public.admin_buyers_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inicio_hoje  timestamptz;
  inicio_ontem timestamptz;
  resultado    jsonb;
BEGIN
  IF NOT ((SELECT has_role(auth.uid(), 'admin'::app_role))
       OR (SELECT has_role(auth.uid(), 'viewer'::app_role))) THEN
    RETURN NULL;
  END IF;

  inicio_hoje  := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  inicio_ontem := inicio_hoje - interval '1 day';

  SELECT jsonb_build_object(
    -- Acumulado de todas as compras aprovadas (o cartão "Total").
    'total_revenue', COALESCE((SELECT sum(amount) FROM buyers WHERE status = 'approved'), 0),
    -- LINHAS de compra: denominador da lista paginada.
    'total_count',   (SELECT count(*) FROM buyers WHERE status = 'approved'),
    -- PESSOAS distintas: o cartão "Compradores".
    'total_buyers',  (SELECT count(DISTINCT lower(email)) FROM buyers WHERE status = 'approved'),
    'today', jsonb_build_object(
      'count',   (SELECT count(*) FROM buyers WHERE created_at >= inicio_hoje),
      'approved',(SELECT count(*) FROM buyers WHERE status = 'approved' AND created_at >= inicio_hoje),
      'revenue', COALESCE((SELECT sum(amount) FROM buyers WHERE status = 'approved' AND created_at >= inicio_hoje), 0)
    ),
    -- Ontem é janela FECHADA [ontem 00h, hoje 00h): incluir hoje faria o
    -- número de comparação crescer junto com o do dia corrente.
    'yesterday', jsonb_build_object(
      'approved',(SELECT count(*) FROM buyers WHERE status = 'approved' AND created_at >= inicio_ontem AND created_at < inicio_hoje),
      'revenue', COALESCE((SELECT sum(amount) FROM buyers WHERE status = 'approved' AND created_at >= inicio_ontem AND created_at < inicio_hoje), 0)
    ),
    'today_by_plan', COALESCE((
      SELECT jsonb_object_agg(plan, n) FROM (
        SELECT plan, count(*) AS n FROM buyers
         WHERE status = 'approved' AND created_at >= inicio_hoje AND plan IS NOT NULL
         GROUP BY plan
      ) p
    ), '{}'::jsonb)
  ) INTO resultado;

  RETURN resultado;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_buyers_overview() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_buyers_overview() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_buyers_overview() TO authenticated;

-- `lower(email)` sem índice funcional faz o count distinct varrer a tabela.
CREATE INDEX IF NOT EXISTS idx_buyers_lower_email_approved
  ON public.buyers (lower(email)) WHERE status = 'approved';
