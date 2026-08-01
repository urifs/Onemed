-- ═══════════════════════════════════════════════════════════════════════════
-- Anotações do aluno sobre os PDFs, dentro da plataforma
--
-- Motivo: as apostilas das editoras (Estratégia MED, Casalmed e outras) vêm do
-- Drive criptografadas em AES-256 com senha de proprietário e o bit 6 de
-- permissão desligado (P=2580) — ou seja, o próprio arquivo proíbe anotação, e
-- qualquer leitor de PDF de terceiro respeita isso. O aluno não conseguia
-- grifar o material de estudo.
--
-- A saída é o aluno anotar AQUI: os traços são dados dele, guardados à parte,
-- desenhados por cima na hora de exibir. O PDF original nunca é alterado.
--
-- Os pontos são gravados em coordenadas normalizadas (0..1 sobre a largura e a
-- altura da página), não em pixels: assim a anotação cai no mesmo lugar do
-- texto em qualquer tela, zoom ou densidade de pixels.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.lesson_annotations (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id  UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  -- [{ page, tool: 'pen'|'highlight', color, width, points: [[x,y], ...] }]
  strokes    JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_annotations_user ON public.lesson_annotations(user_id, updated_at DESC);

ALTER TABLE public.lesson_annotations ENABLE ROW LEVEL SECURITY;

-- Anotação é material de estudo pessoal: cada aluno só enxerga e altera a sua.
-- Nem admin lê — não há motivo de negócio para isso e seria conteúdo íntimo de
-- estudo.
DROP POLICY IF EXISTS "Alunos gerenciam as próprias anotações" ON public.lesson_annotations;
CREATE POLICY "Alunos gerenciam as próprias anotações" ON public.lesson_annotations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Lista de aulas que o aluno anotou, para a aba "Minhas anotações".
CREATE OR REPLACE FUNCTION public.my_annotated_lessons()
RETURNS TABLE (
  lesson_id     UUID,
  lesson_title  TEXT,
  course_title  TEXT,
  course_slug   TEXT,
  stroke_count  INTEGER,
  updated_at    TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.title, c.title, c.slug,
         jsonb_array_length(a.strokes)::int,
         a.updated_at
    FROM public.lesson_annotations a
    JOIN public.lessons l ON l.id = a.lesson_id
    JOIN public.courses c ON c.id = l.course_id
   WHERE a.user_id = auth.uid()
     AND jsonb_array_length(a.strokes) > 0
   ORDER BY a.updated_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.my_annotated_lessons() TO authenticated;
