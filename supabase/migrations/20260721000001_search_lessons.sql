-- Busca de conteúdo (aulas/arquivos) pra todo o acervo a partir da página
-- principal de membros — 81 mil linhas em lessons é demais pra trazer pro
-- cliente e filtrar em JS, então a busca roda no banco. unaccent deixa a
-- busca tolerante a acento (mesmo critério de matchesSearch() no frontend:
-- cada palavra digitada só precisa aparecer em qualquer lugar do título,
-- em qualquer ordem).
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.search_lessons(_query text, _limit integer DEFAULT 60)
RETURNS TABLE(
  lesson_id uuid, lesson_title text, lesson_type text,
  course_id uuid, course_title text, course_slug text, course_category text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (is_member() OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT l.id, l.title, l.type, c.id, c.title, c.slug, c.category
  FROM lessons l
  JOIN courses c ON c.id = l.course_id
  WHERE c.active = true
    AND (
      SELECT bool_and(unaccent(lower(l.title)) LIKE '%' || unaccent(lower(w)) || '%')
      FROM unnest(string_to_array(trim(_query), ' ')) AS w
      WHERE w <> ''
    )
  ORDER BY l.title
  LIMIT _limit;
END;
$$;
