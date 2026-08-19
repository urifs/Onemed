-- Resumo da página de Compradores calculado NO BANCO
--
-- A página puxava TODOS os compradores aprovados (656 linhas, `select *`, com
-- fbp/fbc/user-agent junto) só para somar receita e contar vendas do dia no
-- navegador. Some o custo de trafegar isso a cada visita e o de renderizar a
-- tabela inteira de uma vez.
--
-- Com esta função a lista pode ser paginada de 100 em 100 sem perder nenhum
-- número: os totais não dependem mais do que está carregado na tela.
--
-- Janela do dia em SÃO PAULO, não em UTC: às 21h de Brasília já é o dia
-- seguinte em UTC, e "receita de hoje" zeraria três horas antes da meia-noite.
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
    'total_count',   (SELECT count(*) FROM buyers WHERE status = 'approved'),
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

-- A lista pagina por created_at desc; sem índice, cada "carregar mais" é um
-- sort da tabela inteira. O id no fim é o desempate estável — sem ele, duas
-- compras no mesmo instante podem aparecer repetidas (ou sumir) entre páginas.
CREATE INDEX IF NOT EXISTS idx_buyers_status_created
  ON public.buyers (status, created_at DESC, id);
