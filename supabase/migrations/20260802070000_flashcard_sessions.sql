-- Histórico de sessões de estudo dos flashcards — uma linha por sessão
-- CONCLUÍDA (fila zerada). É a matéria-prima das estatísticas da aba
-- Flashcards: média geral, evolução, desempenho por baralho.
--
-- deck_id é SET NULL (não CASCADE): apagar um baralho não pode apagar o
-- histórico de estudo — o título fica desnormalizado aqui pra sessão antiga
-- continuar legível mesmo sem o baralho.
CREATE TABLE public.flashcard_sessions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id            uuid REFERENCES public.flashcard_decks(id) ON DELETE SET NULL,
  deck_title         text NOT NULL,
  total_cards        integer NOT NULL,
  correct_first_try  integer NOT NULL,
  -- Total de respostas dadas na sessão (com as repetições de quem errou) —
  -- mede o esforço, não só o resultado.
  reviews            integer NOT NULL DEFAULT 0,
  duration_seconds   integer,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_flashcard_sessions_user ON public.flashcard_sessions(user_id, created_at DESC);

ALTER TABLE public.flashcard_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno gerencia o proprio historico"
ON public.flashcard_sessions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
