-- Busca geral da plataforma dentro do Acervo Público: além dos ITENS (título/
-- descrição, já coberto pelo archive_feed), procura os ARQUIVOS de cada item
-- pelo nome e pelo caminho da pasta — quem busca "ATLS" acha o PDF dentro de
-- um item chamado "Livros de Med". Mesmo gate dos demais RPCs do acervo
-- (assinante-nunca-trial ou admin) e mesma visibilidade (público ou próprio).
CREATE OR REPLACE FUNCTION public.archive_search_files(_query text, _limit int DEFAULT 20)
RETURNS TABLE(
  file_id       uuid,
  file_name     text,
  path          text,
  mime_type     text,
  size_bytes    bigint,
  item_id       uuid,
  item_title    text,
  uploader_name text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM assert_archive_access();
  IF COALESCE(trim(_query), '') = '' THEN RETURN; END IF;
  RETURN QUERY
  SELECT
    f.id, f.name, f.path, f.mime_type, f.size_bytes,
    i.id, i.title, COALESCE(p.name, 'Assinante OneMed')
  FROM archive_files f
  JOIN archive_items i ON i.id = f.item_id
  LEFT JOIN profiles p ON p.user_id = i.user_id
  WHERE f.status = 'ready' AND i.status = 'ready'
    AND (i.is_public OR i.user_id = (SELECT auth.uid()))
    AND (f.name ILIKE '%' || _query || '%' OR f.path ILIKE '%' || _query || '%')
  ORDER BY f.name
  LIMIT LEAST(GREATEST(COALESCE(_limit, 20), 1), 50);
END $$;

GRANT EXECUTE ON FUNCTION public.archive_search_files(text, int) TO authenticated;
