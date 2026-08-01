-- Fixar tópicos (admin-only) + edição de comentário pelo próprio autor.
--
-- Editar já funciona sem nenhuma mudança de schema: a policy "Users can
-- update own comments" (USING auth.uid() = user_id) já libera UPDATE de
-- body/title pro autor — só faltava o botão no frontend.
--
-- Fixar é novo: coluna `pinned`, sempre ordenada primeiro no feed da
-- comunidade. Como a policy de update acima não restringe coluna, sem o
-- trigger abaixo o próprio autor conseguiria setar pinned=true na própria
-- linha via update direto — fixar precisa ser exclusivo de admin, então um
-- trigger reverte silenciosamente qualquer tentativa de mudar `pinned` que
-- não venha de um admin (a edição normal de body/title nunca toca essa
-- coluna, então nunca é afetada por isso).

ALTER TABLE public.course_comments ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.prevent_non_admin_pin_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.pinned IS DISTINCT FROM OLD.pinned AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.pinned := OLD.pinned;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_comments_guard_pinned ON public.course_comments;
CREATE TRIGGER course_comments_guard_pinned
BEFORE UPDATE ON public.course_comments
FOR EACH ROW EXECUTE FUNCTION public.prevent_non_admin_pin_change();

-- RPC admin-only pra fixar/desafixar um tópico (parent_id IS NULL) — usada
-- pelo painel /admin/comunidade. SECURITY DEFINER, mesma convenção das
-- demais RPCs da comunidade.
CREATE OR REPLACE FUNCTION public.set_topic_pinned(_topic_id uuid, _pinned boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem fixar tópicos';
  END IF;
  UPDATE public.course_comments SET pinned = _pinned WHERE id = _topic_id AND parent_id IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_topic_pinned(uuid, boolean) TO authenticated;

-- community_feed: acrescenta `pinned` no retorno e ordena fixados primeiro
-- (antes do critério de relevância/recência já existente). Precisa de DROP
-- antes — Postgres não deixa CREATE OR REPLACE mudar a lista de colunas de
-- retorno de uma função existente.
DROP FUNCTION IF EXISTS public.community_feed(integer, integer, text, text);
CREATE FUNCTION public.community_feed(
  _limit integer DEFAULT 30,
  _offset integer DEFAULT 0,
  _filter text DEFAULT 'all',
  _sort text DEFAULT 'recent'
)
RETURNS TABLE(
  id uuid, user_id uuid, author_name text, author_email text, is_admin boolean,
  course_id uuid, course_title text, course_slug text,
  lesson_id uuid, lesson_title text,
  category text,
  title text, body text, created_at timestamptz,
  reply_count bigint, pinned boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  caller_is_admin boolean := has_role(auth.uid(), 'admin'::app_role);
BEGIN
  IF NOT (is_member() OR caller_is_admin) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT feed.id, feed.user_id, feed.author_name, feed.author_email, feed.is_admin,
         feed.course_id, feed.course_title, feed.course_slug,
         feed.lesson_id, feed.lesson_title,
         feed.category, feed.title, feed.body, feed.created_at, feed.reply_count, feed.pinned
  FROM (
    SELECT
      c.id, c.user_id, p.name AS author_name,
      CASE WHEN caller_is_admin THEN p.email ELSE NULL END AS author_email,
      has_role(c.user_id, 'admin'::app_role) AS is_admin,
      c.course_id, co.title AS course_title, co.slug AS course_slug,
      c.lesson_id, l.title AS lesson_title,
      c.category, c.title, c.body, c.created_at,
      (SELECT count(*) FROM public.course_comments r WHERE r.parent_id = c.id) AS reply_count,
      c.pinned
    FROM public.course_comments c
    LEFT JOIN public.profiles p ON p.user_id = c.user_id
    LEFT JOIN public.courses co ON co.id = c.course_id
    LEFT JOIN public.lessons l ON l.id = c.lesson_id
    WHERE c.parent_id IS NULL
      AND (
        _filter = 'all'
        OR (_filter = 'mine' AND c.user_id = me)
        OR (_filter = 'interacted' AND (c.user_id = me OR EXISTS (
              SELECT 1 FROM public.course_comments r WHERE r.parent_id = c.id AND r.user_id = me
            )))
      )
  ) feed
  ORDER BY
    feed.pinned DESC,
    CASE WHEN _sort = 'relevant' THEN feed.reply_count END DESC NULLS LAST,
    feed.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;
