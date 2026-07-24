-- Adiciona uma estimativa de linhas por tabela ao admin_schema_snapshot(),
-- usada pelo admin-database-backup pra ordenar a exportação das menores
-- tabelas pras maiores — assim, se a função estourar o tempo de execução
-- no meio do caminho, o que se perde é só o fim das tabelas grandes
-- (lessons, course_modules, visits), não tabelas pequenas e críticas
-- (buyers, accesses, coupons, user_roles) que ficariam por último em
-- ordem alfabética.
DROP FUNCTION IF EXISTS public.admin_schema_snapshot();

CREATE FUNCTION public.admin_schema_snapshot()
RETURNS TABLE(table_name text, columns jsonb, estimated_rows bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    t.tablename::text,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'column_name', c.column_name,
        'data_type', c.data_type,
        'is_nullable', c.is_nullable,
        'column_default', c.column_default
      ) ORDER BY c.ordinal_position)
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = t.tablename
    ) AS columns,
    COALESCE(s.n_live_tup, 0) AS estimated_rows
  FROM pg_tables t
  LEFT JOIN pg_stat_user_tables s ON s.relname = t.tablename AND s.schemaname = t.schemaname
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
$function$;
