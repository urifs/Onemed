-- Baralhos de flashcards gerados por IA a partir de aulas/arquivos do acervo.
--
-- As cartas ficam em JSONB (front/back), não numa tabela por carta: um baralho
-- é gerado e salvo inteiro de uma vez, nunca editado carta a carta — e a
-- leitura é sempre do baralho completo pro visualizador.
CREATE TABLE public.flashcard_decks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  difficulty  text NOT NULL DEFAULT 'intermediario',
  cards       jsonb NOT NULL,
  -- De onde o baralho saiu (ids e títulos das aulas) — permite mostrar a
  -- origem na lista mesmo se a aula for renomeada ou removida depois.
  source      jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_flashcard_decks_user ON public.flashcard_decks(user_id, created_at DESC);

ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;

-- Material de estudo pessoal: só o dono lê e escreve — nem admin.
CREATE POLICY "Aluno gerencia os proprios baralhos"
ON public.flashcard_decks FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
