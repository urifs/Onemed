-- ═══════════════════════════════════════════════════════════════════════════
-- Sincronização PROFUNDA e VERIFICÁVEL da biblioteca do Drive
--
-- Motivo: a sincronização antiga varria no máximo 2 níveis de subpasta como
-- módulos (`MAX_MODULE_DEPTH = 2`) e descartava silenciosamente qualquer pasta
-- abaixo do nível 10; pior, quando a listagem de uma pasta falhava no Drive
-- (429/5xx/token), o `catch` engolia o erro, aquela subárvore inteira não era
-- importada e o curso ainda era marcado como "Concluído". Não existia nenhuma
-- forma de saber, depois, que faltou conteúdo.
--
-- A varredura passa a ser uma FILA DURÁVEL no Postgres (`sync_folder_queue`):
-- cada pasta encontrada vira uma linha; a função de sync consome pendências e
-- enfileira as filhas. Isso dá, de graça:
--   • profundidade ilimitada (a fila não tem noção de nível)
--   • proteção contra ciclo de atalho (PK course_id+drive_folder_id)
--   • retomada exata de onde parou, de qualquer dispositivo
--   • prova de cobertura: curso só é "completo" com 0 pendentes e 0 erros
-- ═══════════════════════════════════════════════════════════════════════════

-- ── módulos em profundidade ilimitada ───────────────────────────────────────
-- Toda pasta, em qualquer nível, vira um módulo. `path` guarda o caminho
-- relativo dentro do curso (para exibição e auditoria) e `depth` o nível.
ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS parent_module_id UUID REFERENCES public.course_modules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS depth INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS path TEXT;

CREATE INDEX IF NOT EXISTS idx_course_modules_parent ON public.course_modules(parent_module_id);

-- ── contadores de verificação por curso ─────────────────────────────────────
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS total_size_bytes BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS folder_count INTEGER NOT NULL DEFAULT 0,
  -- 'pending'    → nunca varrido a fundo
  -- 'crawling'   → varredura em andamento
  -- 'complete'   → 0 pastas pendentes e 0 pastas com erro
  -- 'incomplete' → terminou com pastas que o Drive recusou a listar
  ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS sync_error TEXT,
  ADD COLUMN IF NOT EXISTS deep_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_courses_sync_status ON public.courses(sync_status);

-- ── rastro por arquivo ──────────────────────────────────────────────────────
-- `drive_path` = caminho da pasta que contém o arquivo, dentro do curso.
-- `last_seen_at` = última varredura que viu esse arquivo no Drive.
-- `missing_since` = preenchido quando uma varredura COMPLETA e SEM ERROS do
-- curso não encontrou mais o arquivo (some do Drive). Nunca apagamos a linha
-- automaticamente: apagar levaria junto o progresso do aluno (FK CASCADE em
-- lesson_progress) — o admin decide o que fazer vendo o relatório.
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS drive_path TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS missing_since TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_lessons_missing ON public.lessons(missing_since) WHERE missing_since IS NOT NULL;

-- ── fila durável de varredura ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sync_folder_queue (
  course_id       UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  drive_folder_id TEXT NOT NULL,
  module_id       UUID REFERENCES public.course_modules(id) ON DELETE SET NULL,
  path            TEXT NOT NULL DEFAULT '',
  depth           INTEGER NOT NULL DEFAULT 0,
  page_token      TEXT,
  state           TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'done' | 'error'
  attempts        INTEGER NOT NULL DEFAULT 0,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, drive_folder_id)
);
CREATE INDEX IF NOT EXISTS idx_sync_folder_queue_pending
  ON public.sync_folder_queue(course_id) WHERE state = 'pending';
CREATE INDEX IF NOT EXISTS idx_sync_folder_queue_state
  ON public.sync_folder_queue(state);
ALTER TABLE public.sync_folder_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage sync_folder_queue" ON public.sync_folder_queue;
CREATE POLICY "Admins manage sync_folder_queue" ON public.sync_folder_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── recalcula os agregados de um curso a partir das linhas reais ────────────
-- Fonte única de verdade dos contadores: nunca confia no que a função de sync
-- "achou que" importou, sempre soma o que de fato está gravado.
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

  -- Com profundidade ilimitada não dá pra numerar módulos durante a varredura
  -- (a fila não percorre em ordem de árvore). Quando o curso fecha, ordena de
  -- uma vez por `path` — como o caminho do filho começa com o do pai, ordenar
  -- por texto reproduz exatamente a ordem da árvore do Drive.
  IF v_pending = 0 AND v_folders > 0 THEN
    WITH ranked AS (
      SELECT id, (row_number() OVER (ORDER BY path, title))::int - 1 AS rn
        FROM public.course_modules WHERE course_id = _course_id
    )
    UPDATE public.course_modules m SET sort_order = r.rn
      FROM ranked r WHERE m.id = r.id AND m.sort_order IS DISTINCT FROM r.rn;

    -- Aulas: vídeos primeiro dentro de cada módulo, depois por nome — mesma
    -- convenção que a área de membros já usava.
    WITH ranked AS (
      SELECT l.id,
             (row_number() OVER (ORDER BY COALESCE(mo.path, '') , (l.type <> 'video'), l.title))::int - 1 AS rn
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

REVOKE ALL ON FUNCTION public.recalc_course_totals(UUID) FROM PUBLIC, anon, authenticated;

-- Quem pode ver a auditoria: admin logado no painel ou a própria Edge Function
-- (que chama com a service role key e portanto não tem auth.uid()).
CREATE OR REPLACE FUNCTION public.can_read_library_audit()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.role(), '') = 'service_role'
      OR public.has_role(auth.uid(), 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.can_read_library_audit() TO authenticated, service_role;

-- ── relatório de auditoria (a "prova" da sincronização) ─────────────────────
-- Devolve, por curso, quantas pastas foram varridas, quantas ficaram pendentes
-- ou com erro, quantos arquivos entraram e quantos bytes somam. Um curso só é
-- confiável quando pending = 0 e errors = 0.
CREATE OR REPLACE FUNCTION public.get_library_sync_report()
RETURNS TABLE (
  course_id        UUID,
  title            TEXT,
  sync_status      TEXT,
  folders_done     INTEGER,
  folders_pending  INTEGER,
  folders_error    INTEGER,
  lessons          INTEGER,
  lessons_missing  INTEGER,
  total_size_bytes BIGINT,
  deep_synced_at   TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id,
         c.title,
         c.sync_status,
         COALESCE(q.done, 0)::int,
         COALESCE(q.pending, 0)::int,
         COALESCE(q.errors, 0)::int,
         COALESCE(l.total, 0)::int,
         COALESCE(l.missing, 0)::int,
         c.total_size_bytes,
         c.deep_synced_at
    FROM public.courses c
    LEFT JOIN (
      SELECT course_id,
             count(*) FILTER (WHERE state = 'done')    AS done,
             count(*) FILTER (WHERE state = 'pending') AS pending,
             count(*) FILTER (WHERE state = 'error')   AS errors
        FROM public.sync_folder_queue GROUP BY course_id
    ) q ON q.course_id = c.id
    LEFT JOIN (
      SELECT course_id,
             count(*) FILTER (WHERE missing_since IS NULL) AS total,
             count(*) FILTER (WHERE missing_since IS NOT NULL) AS missing
        FROM public.lessons GROUP BY course_id
    ) l ON l.course_id = c.id
   WHERE public.can_read_library_audit()
   ORDER BY (c.sync_status <> 'complete') DESC, c.title;
$$;

GRANT EXECUTE ON FUNCTION public.get_library_sync_report() TO authenticated, service_role;

-- Totais globais da biblioteca — o número que o admin compara com o Drive.
CREATE OR REPLACE FUNCTION public.get_library_totals()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.can_read_library_audit() THEN jsonb_build_object(
    'courses',            (SELECT count(*) FROM public.courses),
    'courses_complete',   (SELECT count(*) FROM public.courses WHERE sync_status = 'complete'),
    'courses_incomplete', (SELECT count(*) FROM public.courses WHERE sync_status = 'incomplete'),
    'courses_crawling',   (SELECT count(*) FROM public.courses WHERE sync_status = 'crawling'),
    'courses_pending',    (SELECT count(*) FROM public.courses WHERE sync_status = 'pending'),
    'modules',            (SELECT count(*) FROM public.course_modules),
    'folders_done',       (SELECT count(*) FROM public.sync_folder_queue WHERE state = 'done'),
    'folders_pending',    (SELECT count(*) FROM public.sync_folder_queue WHERE state = 'pending'),
    'folders_error',      (SELECT count(*) FROM public.sync_folder_queue WHERE state = 'error'),
    'lessons',            (SELECT count(*) FROM public.lessons WHERE missing_since IS NULL),
    'lessons_missing',    (SELECT count(*) FROM public.lessons WHERE missing_since IS NOT NULL),
    'total_size_bytes',   (SELECT COALESCE(sum(size_bytes), 0) FROM public.lessons WHERE missing_since IS NULL)
  ) ELSE NULL END;
$$;

GRANT EXECUTE ON FUNCTION public.get_library_totals() TO authenticated, service_role;
