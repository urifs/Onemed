-- Tópicos podem ser marcados com uma categoria (mesmas usadas na área de
-- membros) independente de estarem presos a um curso específico — dá pra
-- marcar só a categoria ("dúvida geral de Cardiologia") ou categoria+curso.
ALTER TABLE public.course_comments ADD COLUMN IF NOT EXISTS category text;

DROP FUNCTION IF EXISTS public.community_feed(integer, integer);

CREATE FUNCTION public.community_feed(_limit integer DEFAULT 30, _offset integer DEFAULT 0)
RETURNS TABLE(
  id uuid, user_id uuid, author_name text, author_email text, is_admin boolean,
  course_id uuid, course_title text, course_slug text,
  lesson_id uuid, lesson_title text,
  category text,
  title text, body text, created_at timestamptz,
  reply_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    c.id, c.user_id, p.name, p.email, has_role(c.user_id, 'admin'::app_role),
    c.course_id, co.title, co.slug,
    c.lesson_id, l.title,
    c.category,
    c.title, c.body, c.created_at,
    (SELECT count(*) FROM public.course_comments r WHERE r.parent_id = c.id)
  FROM public.course_comments c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  LEFT JOIN public.courses co ON co.id = c.course_id
  LEFT JOIN public.lessons l ON l.id = c.lesson_id
  WHERE c.parent_id IS NULL
    AND (is_member() OR has_role(auth.uid(), 'admin'::app_role))
  ORDER BY c.created_at DESC
  LIMIT _limit OFFSET _offset;
$$;
