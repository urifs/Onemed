-- Comunidade global: até agora course_comments só existia como aba dentro de
-- cada curso (CommunityTab). Vira um feed único, com posts que podem ou não
-- estar presos a um curso/aula específica, além de "tópicos" livres
-- (course_id/lesson_id nulos) que qualquer membro pode abrir. parent_id já
-- existia na tabela (não usado ainda) — dá suporte a respostas de graça.
ALTER TABLE public.course_comments
  ALTER COLUMN course_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title text;

CREATE INDEX IF NOT EXISTS idx_course_comments_lesson_id ON public.course_comments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_comments_parent_id ON public.course_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_course_comments_created_at ON public.course_comments(created_at DESC);

-- Feed da comunidade: só os posts de topo (não-respostas), com autor,
-- contexto (curso/aula, quando houver) e contagem de respostas — tudo numa
-- query só em vez do cliente montar isso na mão pra cada item da lista.
CREATE OR REPLACE FUNCTION public.community_feed(_limit integer DEFAULT 30, _offset integer DEFAULT 0)
RETURNS TABLE(
  id uuid, user_id uuid, author_name text, author_email text,
  course_id uuid, course_title text, course_slug text,
  lesson_id uuid, lesson_title text,
  title text, body text, created_at timestamptz,
  reply_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    c.id, c.user_id, p.name, p.email,
    c.course_id, co.title, co.slug,
    c.lesson_id, l.title,
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
