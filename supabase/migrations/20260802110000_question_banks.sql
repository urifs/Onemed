-- Bancos de questões gerados por IA — mesmo desenho dos flashcards
-- (flashcard_decks/flashcard_sessions): questões em JSONB, sessão gravada ao
-- finalizar a prova, RLS de dono.
CREATE TABLE public.question_banks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  difficulty  text NOT NULL DEFAULT 'intermediario',
  questions   jsonb NOT NULL,
  source      jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_question_banks_user ON public.question_banks(user_id, created_at DESC);

ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno gerencia os proprios bancos"
ON public.question_banks FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Uma linha por prova FINALIZADA (o aluno respondeu e clicou em corrigir).
-- bank_id SET NULL: apagar o banco não apaga o histórico de desempenho.
CREATE TABLE public.question_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_id          uuid REFERENCES public.question_banks(id) ON DELETE SET NULL,
  bank_title       text NOT NULL,
  total_questions  integer NOT NULL,
  correct          integer NOT NULL,
  duration_seconds integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_question_sessions_user ON public.question_sessions(user_id, created_at DESC);

ALTER TABLE public.question_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno gerencia o proprio historico de provas"
ON public.question_sessions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
