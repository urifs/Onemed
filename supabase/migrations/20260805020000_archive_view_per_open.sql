-- Visualizações do Acervo Público: cada ABERTURA de arquivo conta uma
-- visualização (pedido do dono), de qualquer cliente, toda vez — sem dedupe
-- por usuário. `archive_views` vira um registro de última visualização por
-- usuário/item (upsert); o contador do item soma sempre. Devolve o total novo
-- pra UI atualizar na hora.
--
-- (O contador estava sempre em ZERO em produção: o cliente descartava o
-- builder do supabase-js com `void` sem await — a requisição nunca saía.)
DROP FUNCTION IF EXISTS public.archive_register_view(uuid);

CREATE FUNCTION public.archive_register_view(_item_id uuid)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE novo integer;
BEGIN
  PERFORM assert_archive_access();
  INSERT INTO archive_views (user_id, item_id) VALUES (auth.uid(), _item_id)
  ON CONFLICT (user_id, item_id) DO UPDATE SET created_at = now();
  UPDATE archive_items SET views = views + 1 WHERE id = _item_id
  RETURNING views INTO novo;
  RETURN novo;
END $$;

GRANT EXECUTE ON FUNCTION public.archive_register_view(uuid) TO authenticated;
