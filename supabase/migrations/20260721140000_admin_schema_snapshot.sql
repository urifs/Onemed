-- Lista tabelas + colunas do schema public — usado pela função de backup
-- completo do banco (admin-database-backup). Só é chamada pela Edge
-- Function com a service role key, depois que ela mesma já confirmou que
-- quem pediu o backup é admin (checando o JWT de quem chamou); por isso não
-- precisa de checagem de role aqui dentro — auth.uid() vem nulo em chamadas
-- via service role, então gatear nele quebraria a própria função.
CREATE OR REPLACE FUNCTION public.admin_schema_snapshot()
RETURNS TABLE(table_name text, columns jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    ) AS columns
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
$$;
