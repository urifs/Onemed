-- ─────────────────────────────────────────────────────────────────────────────
-- Acervo Público: assinantes (nunca trial) compartilham arquivos de estudo
-- entre si. Upload vai pro Google Drive conectado da plataforma (pasta própria
-- do acervo, fora da biblioteca de cursos — a sincronização de cursos varre a
-- pasta da biblioteca e transformaria qualquer subpasta nova em "curso").
--
-- Um item = um card no feed (arquivo único ou pasta inteira); os arquivos de
-- verdade moram em archive_files (upload de pasta = vários arquivos com path).
-- Likes e comentários são do acervo, separados da comunidade de propósito.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.archive_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL,
  title       text        NOT NULL,
  description text,
  category    text        NOT NULL DEFAULT 'Outros cursos',
  kind        text        NOT NULL DEFAULT 'file', -- file | folder
  is_public   boolean     NOT NULL DEFAULT true,
  views       integer     NOT NULL DEFAULT 0,
  -- pasta do item dentro do acervo no Drive (criada no primeiro upload)
  drive_folder_id text,
  status      text        NOT NULL DEFAULT 'pending', -- pending | ready
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.archive_files (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       uuid        NOT NULL REFERENCES public.archive_items(id) ON DELETE CASCADE,
  drive_file_id text        NOT NULL,
  name          text        NOT NULL,
  path          text,       -- caminho relativo dentro da pasta enviada
  mime_type     text,
  size_bytes    bigint,
  status        text        NOT NULL DEFAULT 'pending', -- pending | ready
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.archive_likes (
  user_id    uuid        NOT NULL,
  item_id    uuid        NOT NULL REFERENCES public.archive_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.archive_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    uuid        NOT NULL REFERENCES public.archive_items(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL,
  body       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_archive_items_feed ON public.archive_items (status, is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_archive_files_item ON public.archive_files (item_id);
CREATE INDEX IF NOT EXISTS idx_archive_comments_item ON public.archive_comments (item_id, created_at);

-- Pasta-raiz do acervo no Drive conectado (criada pela função de upload).
ALTER TABLE public.drive_config ADD COLUMN IF NOT EXISTS acervo_folder_id text;

ALTER TABLE public.archive_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_files    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_comments ENABLE ROW LEVEL SECURITY;

-- Assinante pagante (nunca trial) OU admin. Checagens SEMPRE em (SELECT ...) —
-- fora disso o Postgres reexecuta a função por linha (lição da RLS de lessons).
CREATE POLICY "Assinantes leem itens publicos ou proprios"
  ON public.archive_items FOR SELECT TO authenticated
  USING (
    (((SELECT is_member()) AND NOT (SELECT is_trial_member())) OR (SELECT has_role(auth.uid(), 'admin'::app_role)))
    AND (is_public OR user_id = (SELECT auth.uid()) OR (SELECT has_role(auth.uid(), 'admin'::app_role)))
  );

CREATE POLICY "Assinante edita os proprios itens"
  ON public.archive_items FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- INSERT/DELETE de itens e arquivos só via Edge Functions (service role):
-- criar exige criar a pasta no Drive; apagar exige apagar lá também.
CREATE POLICY "Admin gerencia itens"
  ON public.archive_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Assinantes leem arquivos de itens visiveis"
  ON public.archive_files FOR SELECT TO authenticated
  USING (item_id IN (SELECT id FROM public.archive_items));

CREATE POLICY "Assinantes leem likes"
  ON public.archive_likes FOR SELECT TO authenticated
  USING (((SELECT is_member()) AND NOT (SELECT is_trial_member())) OR (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Assinantes leem comentarios"
  ON public.archive_comments FOR SELECT TO authenticated
  USING (((SELECT is_member()) AND NOT (SELECT is_trial_member())) OR (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Assinante comenta"
  ON public.archive_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (((SELECT is_member()) AND NOT (SELECT is_trial_member())) OR (SELECT has_role(auth.uid(), 'admin'::app_role)))
  );

CREATE POLICY "Autor ou admin apaga comentario"
  ON public.archive_comments FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE TRIGGER update_archive_items_updated_at
  BEFORE UPDATE ON public.archive_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── RPCs (SECURITY DEFINER: gate explícito, RLS não se aplica) ──────────────

CREATE OR REPLACE FUNCTION public.assert_archive_access() RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT ((is_member() AND NOT is_trial_member()) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Apenas assinantes têm acesso ao acervo público';
  END IF;
END $$;

-- Feed: recentes | acessados | curtidos, com filtro por categoria, busca e
-- item específico (_item_id — usado pela tela de detalhe).
CREATE OR REPLACE FUNCTION public.archive_feed(
  _sort text DEFAULT 'recent', _category text DEFAULT NULL,
  _search text DEFAULT NULL, _limit int DEFAULT 30, _offset int DEFAULT 0,
  _item_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid, user_id uuid, uploader_name text, title text, description text,
  category text, kind text, is_public boolean, views integer, created_at timestamptz,
  like_count bigint, liked_by_me boolean, comment_count bigint,
  file_count bigint, total_size bigint, first_mime text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM assert_archive_access();
  RETURN QUERY
  SELECT
    i.id, i.user_id, COALESCE(p.name, 'Assinante OneMed'), i.title, i.description,
    i.category, i.kind, i.is_public, i.views, i.created_at,
    (SELECT count(*) FROM archive_likes l WHERE l.item_id = i.id),
    EXISTS (SELECT 1 FROM archive_likes l WHERE l.item_id = i.id AND l.user_id = auth.uid()),
    (SELECT count(*) FROM archive_comments c WHERE c.item_id = i.id),
    (SELECT count(*) FROM archive_files f WHERE f.item_id = i.id AND f.status = 'ready'),
    (SELECT COALESCE(sum(f.size_bytes), 0)::bigint FROM archive_files f WHERE f.item_id = i.id AND f.status = 'ready'),
    (SELECT f.mime_type FROM archive_files f WHERE f.item_id = i.id AND f.status = 'ready' ORDER BY f.created_at LIMIT 1)
  FROM archive_items i
  LEFT JOIN profiles p ON p.user_id = i.user_id
  WHERE i.status = 'ready'
    AND (i.is_public OR i.user_id = auth.uid())
    AND (_item_id IS NULL OR i.id = _item_id)
    AND (_category IS NULL OR i.category = _category)
    AND (_search IS NULL OR i.title ILIKE '%' || _search || '%' OR i.description ILIKE '%' || _search || '%')
  ORDER BY
    CASE WHEN _sort = 'views' THEN i.views END DESC NULLS LAST,
    CASE WHEN _sort = 'likes' THEN (SELECT count(*) FROM archive_likes l WHERE l.item_id = i.id) END DESC NULLS LAST,
    i.created_at DESC
  LIMIT _limit OFFSET _offset;
END $$;

-- Aba "meus uploads": tudo do próprio usuário, público e privado, até pendente.
CREATE OR REPLACE FUNCTION public.archive_my_items()
RETURNS TABLE(
  id uuid, title text, description text, category text, kind text,
  is_public boolean, views integer, status text, created_at timestamptz,
  like_count bigint, comment_count bigint, file_count bigint, total_size bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM assert_archive_access();
  RETURN QUERY
  SELECT i.id, i.title, i.description, i.category, i.kind, i.is_public, i.views, i.status, i.created_at,
    (SELECT count(*) FROM archive_likes l WHERE l.item_id = i.id),
    (SELECT count(*) FROM archive_comments c WHERE c.item_id = i.id),
    (SELECT count(*) FROM archive_files f WHERE f.item_id = i.id),
    (SELECT COALESCE(sum(f.size_bytes), 0)::bigint FROM archive_files f WHERE f.item_id = i.id)
  FROM archive_items i
  WHERE i.user_id = auth.uid()
  ORDER BY i.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.toggle_archive_like(_item_id uuid)
RETURNS TABLE(like_count bigint, liked boolean)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE _liked boolean;
BEGIN
  PERFORM assert_archive_access();
  DELETE FROM archive_likes WHERE item_id = _item_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    INSERT INTO archive_likes (user_id, item_id) VALUES (auth.uid(), _item_id);
    _liked := true;
  ELSE
    _liked := false;
  END IF;
  RETURN QUERY SELECT (SELECT count(*) FROM archive_likes WHERE item_id = _item_id), _liked;
END $$;

-- Contador de acessos ("mais acessados"): incrementa ao abrir o item.
CREATE OR REPLACE FUNCTION public.archive_register_view(_item_id uuid)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM assert_archive_access();
  UPDATE archive_items SET views = views + 1 WHERE id = _item_id;
END $$;

CREATE OR REPLACE FUNCTION public.archive_comments_feed(_item_id uuid)
RETURNS TABLE(id uuid, user_id uuid, author_name text, is_admin boolean, body text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM assert_archive_access();
  RETURN QUERY
  SELECT c.id, c.user_id, COALESCE(p.name, 'Assinante OneMed'),
         has_role(c.user_id, 'admin'::app_role), c.body, c.created_at
  FROM archive_comments c
  LEFT JOIN profiles p ON p.user_id = c.user_id
  WHERE c.item_id = _item_id
  ORDER BY c.created_at;
END $$;

-- O acervo grava na CONTA DE ARMAZENAMENTO (drive_storage_accounts), não na
-- conta de conteúdo (que está sem espaço). Pasta-raiz do acervo por conta, e
-- cada item lembra em qual conta mora (pra apagar/verificar com o token certo).
ALTER TABLE public.drive_storage_accounts ADD COLUMN IF NOT EXISTS acervo_folder_id text;
ALTER TABLE public.archive_items ADD COLUMN IF NOT EXISTS storage_account_id uuid;

-- Views sem inflação: cada usuário conta 1 acesso por item (recarregar a
-- página não empurra o item pro topo de "mais acessados").
CREATE TABLE IF NOT EXISTS public.archive_views (
  user_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.archive_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);
ALTER TABLE public.archive_views ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.archive_register_view(_item_id uuid)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM assert_archive_access();
  INSERT INTO archive_views (user_id, item_id) VALUES (auth.uid(), _item_id)
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    UPDATE archive_items SET views = views + 1 WHERE id = _item_id;
  END IF;
END $$;
