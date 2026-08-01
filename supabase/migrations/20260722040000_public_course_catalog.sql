-- Catálogo público (sem exigir login) pra landing page mostrar categorias e
-- cursos de dentro delas — courses só é legível por membro/admin via RLS.
-- Só expõe título/categoria/capa, nada sensível (sem drive_folder_id).
CREATE OR REPLACE FUNCTION public.public_course_catalog()
RETURNS TABLE(id uuid, title text, category text, cover_image_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.title, c.category, c.cover_image_url
  FROM public.courses c
  WHERE c.active = true
  ORDER BY c.category, c.title;
$$;
