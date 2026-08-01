-- Responder respostas (thread aninhado, não só tópico → resposta de 1 nível).
-- course_comments já suporta isso via parent_id auto-referenciado — só
-- faltava as RPCs devolverem a árvore inteira (recursivo) em vez de só os
-- filhos diretos, e o parent_id de cada linha (pro frontend montar o
-- aninhamento visual).

-- community_replies: devolve TODA a subárvore de respostas de um tópico
-- (respostas + respostas de respostas, em qualquer profundidade), cada
-- linha com seu parent_id — o frontend monta a árvore a partir disso.
DROP FUNCTION IF EXISTS public.community_replies(uuid);
CREATE FUNCTION public.community_replies(_parent_id uuid)
RETURNS TABLE(id uuid, parent_id uuid, user_id uuid, author_name text, author_email text, is_admin boolean, body text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH RECURSIVE thread AS (
    SELECT c.id FROM public.course_comments c WHERE c.parent_id = _parent_id
    UNION ALL
    SELECT c.id FROM public.course_comments c JOIN thread t ON c.parent_id = t.id
  )
  SELECT c.id, c.parent_id, c.user_id, p.name,
         CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN p.email ELSE NULL END,
         has_role(c.user_id, 'admin'::app_role), c.body, c.created_at
  FROM public.course_comments c
  JOIN thread t ON t.id = c.id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE (is_member() OR has_role(auth.uid(), 'admin'::app_role))
  ORDER BY c.created_at ASC;
$$;

-- community_feed: reply_count agora conta a subárvore inteira, não só os
-- filhos diretos do tópico (senão uma resposta-de-resposta não contava).
CREATE OR REPLACE FUNCTION public.community_feed(
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
      (WITH RECURSIVE thread AS (
         SELECT r.id FROM public.course_comments r WHERE r.parent_id = c.id
         UNION ALL
         SELECT r.id FROM public.course_comments r JOIN thread t ON r.parent_id = t.id
       ) SELECT count(*) FROM thread) AS reply_count,
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

-- course_comments_feed: ganha reply_count (contagem recursiva) pra
-- CommunityTab poder mostrar "Responder / ver N respostas" igual ao feed
-- geral — antes os comentários por curso não tinham nenhuma resposta.
DROP FUNCTION IF EXISTS public.course_comments_feed(uuid);
CREATE FUNCTION public.course_comments_feed(_course_id uuid)
RETURNS TABLE(id uuid, user_id uuid, author_name text, author_email text, is_admin boolean, body text, created_at timestamptz, reply_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.user_id, p.name,
         CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN p.email ELSE NULL END,
         has_role(c.user_id, 'admin'::app_role), c.body, c.created_at,
         (WITH RECURSIVE thread AS (
            SELECT r.id FROM public.course_comments r WHERE r.parent_id = c.id
            UNION ALL
            SELECT r.id FROM public.course_comments r JOIN thread t ON r.parent_id = t.id
          ) SELECT count(*) FROM thread) AS reply_count
  FROM public.course_comments c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE c.course_id = _course_id
    AND (is_member() OR has_role(auth.uid(), 'admin'::app_role))
  ORDER BY c.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.course_comments_feed(uuid) TO anon, authenticated;
