-- Ordenação NATURAL (numérica) de módulos e aulas.
--
-- Antes a ordem saía de um ORDER BY de texto puro, então "SEMANA 10" caía
-- entre "SEMANA 1" e "SEMANA 2" (reportado pelo dono no MEDCURSO 2026). Vale
-- pra qualquer curso com pasta/arquivo numerado: "Aula 2" × "Aula 10",
-- "Bloco 3" × "Bloco 12", "Módulo 9" × "Módulo 11".
--
-- `natural_key` quebra o texto em pedaços de dígitos e não-dígitos e zera à
-- esquerda os números (12 casas), de modo que a comparação de TEXTO passe a
-- respeitar o valor numérico. Ex:
--   'SEMANA 2'  → 'semana 000000000002'
--   'SEMANA 10' → 'semana 000000000010'   (agora ordena depois da 2)
CREATE OR REPLACE FUNCTION public.natural_key(_txt text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = public
AS $$
  SELECT COALESCE(
    string_agg(
      CASE WHEN chunk ~ '^\d+$' THEN lpad(chunk, 12, '0') ELSE lower(chunk) END,
      '' ORDER BY ord
    ), '')
  FROM regexp_matches(COALESCE(_txt, ''), '\d+|\D+', 'g') WITH ORDINALITY AS t(m, ord),
       LATERAL unnest(m) AS chunk;
$$;

-- recalc_course_totals: mesma lógica de antes, só trocando os ORDER BY de
-- texto por natural_key. O caminho do filho continua começando com o do pai,
-- então a árvore do Drive segue sendo reproduzida — agora com os números na
-- ordem certa.
CREATE OR REPLACE FUNCTION public.recalc_course_totals(_course_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lessons   INTEGER;
  v_materials INTEGER;
  v_bytes     BIGINT;
  v_duration  BIGINT;
  v_folders   INTEGER;
  v_pending   INTEGER;
  v_errors    INTEGER;
BEGIN
  SELECT count(*)::int,
         count(*) FILTER (WHERE type <> 'video')::int,
         COALESCE(sum(size_bytes), 0),
         COALESCE(sum(duration_seconds), 0)
    INTO v_lessons, v_materials, v_bytes, v_duration
    FROM public.lessons
   WHERE course_id = _course_id AND missing_since IS NULL;

  SELECT count(*) FILTER (WHERE state = 'done')::int,
         count(*) FILTER (WHERE state = 'pending')::int,
         count(*) FILTER (WHERE state = 'error')::int
    INTO v_folders, v_pending, v_errors
    FROM public.sync_folder_queue
   WHERE course_id = _course_id;

  IF v_pending = 0 AND v_folders > 0 THEN
    WITH ranked AS (
      SELECT id, (row_number() OVER (
               -- `id` no fim: desempate estável pra pastas de nome idêntico
               -- no mesmo curso (existem 18 casos), senão a ordem oscila a
               -- cada recálculo.
               ORDER BY public.natural_key(path), public.natural_key(title), id
             ))::int - 1 AS rn
        FROM public.course_modules WHERE course_id = _course_id
    )
    UPDATE public.course_modules m SET sort_order = r.rn
      FROM ranked r WHERE m.id = r.id AND m.sort_order IS DISTINCT FROM r.rn;

    -- Aulas: vídeos primeiro dentro de cada módulo, depois por nome natural.
    WITH ranked AS (
      SELECT l.id,
             (row_number() OVER (
                ORDER BY public.natural_key(COALESCE(mo.path, '')),
                         (l.type <> 'video'),
                         public.natural_key(l.title), l.id
              ))::int - 1 AS rn
        FROM public.lessons l
        LEFT JOIN public.course_modules mo ON mo.id = l.module_id
       WHERE l.course_id = _course_id
    )
    UPDATE public.lessons l SET sort_order = r.rn
      FROM ranked r WHERE l.id = r.id AND l.sort_order IS DISTINCT FROM r.rn;
  END IF;

  UPDATE public.courses SET
    lesson_count           = v_lessons,
    material_count         = v_materials,
    total_size_bytes       = v_bytes,
    -- total_duration_seconds é INTEGER: satura em vez de estourar
    total_duration_seconds = LEAST(v_duration, 2147483647)::int,
    folder_count           = v_folders,
    sync_status            = CASE
                               WHEN v_folders = 0 AND v_pending = 0 AND v_errors = 0 THEN sync_status
                               WHEN v_pending > 0 THEN 'crawling'
                               WHEN v_errors > 0 THEN 'incomplete'
                               ELSE 'complete'
                             END,
    sync_error             = CASE WHEN v_errors > 0
                               THEN v_errors || ' pasta(s) que o Google Drive recusou a listar'
                               ELSE NULL END,
    deep_synced_at         = CASE WHEN v_pending = 0 AND v_errors = 0 AND v_folders > 0
                               THEN now() ELSE deep_synced_at END,
    updated_at             = now()
  WHERE id = _course_id;
END;
$$;
