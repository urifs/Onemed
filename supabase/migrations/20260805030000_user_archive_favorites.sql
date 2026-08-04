-- Favoritar materiais do Acervo Público — mesmo padrão de user_favorites
-- (cursos) e user_lesson_favorites (aulas/arquivos): tabela própria, RLS de
-- dono, sem RPC. A leitura do item favoritado (título etc.) passa pela RLS de
-- archive_items — item que virou privado some da lista sozinho.
CREATE TABLE public.user_archive_favorites (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id    uuid        NOT NULL REFERENCES public.archive_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (user_id, item_id)
);

ALTER TABLE public.user_archive_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario gerencia os proprios favoritos do acervo"
  ON public.user_archive_favorites
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
