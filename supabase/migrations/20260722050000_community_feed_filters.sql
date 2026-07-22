-- Filtros/ordenação do feed da comunidade: "Todos" (padrão), "Que participei"
-- (o post é meu OU tem alguma resposta minha) e "Meus tópicos" (só o que eu
-- postei), além de ordenar por mais recentes (padrão) ou mais relevantes
-- (mais respostas primeiro). Usa auth.uid() direto em vez de receber o
-- user_id do cliente — não dá pra falsificar de quem é a sessão.
DROP FUNCTION IF EXISTS public.community_feed(integer, integer);

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
  reply_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF NOT (is_member() OR has_role(me, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT feed.id, feed.user_id, feed.author_name, feed.author_email, feed.is_admin,
         feed.course_id, feed.course_title, feed.course_slug,
         feed.lesson_id, feed.lesson_title,
         feed.category, feed.title, feed.body, feed.created_at, feed.reply_count
  FROM (
    SELECT
      c.id, c.user_id, p.name AS author_name, p.email AS author_email,
      has_role(c.user_id, 'admin'::app_role) AS is_admin,
      c.course_id, co.title AS course_title, co.slug AS course_slug,
      c.lesson_id, l.title AS lesson_title,
      c.category, c.title, c.body, c.created_at,
      (SELECT count(*) FROM public.course_comments r WHERE r.parent_id = c.id) AS reply_count
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
    CASE WHEN _sort = 'relevant' THEN feed.reply_count END DESC NULLS LAST,
    feed.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;
