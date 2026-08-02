-- Cursos que o aluno tirou de "Continuar assistindo".
--
-- Guarda a HORA em que escondeu, não um simples "escondido = true": a regra
-- pedida é que o curso volte a aparecer se ele assistir de novo. Com o
-- carimbo, a comparação é direta — a linha some enquanto
-- lesson_progress.last_watched_at <= hidden_at, e reaparece sozinha no
-- instante em que uma aula daquele curso for assistida (o progresso grava um
-- last_watched_at novo, mais recente que o hidden_at).
--
-- Nada é apagado de lesson_progress: esconder dos recentes não pode zerar o
-- progresso nem o histórico de aulas concluídas do aluno.
CREATE TABLE public.hidden_recent_courses (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  hidden_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

CREATE INDEX idx_hidden_recent_courses_user ON public.hidden_recent_courses(user_id);

ALTER TABLE public.hidden_recent_courses ENABLE ROW LEVEL SECURITY;

-- É uma preferência de exibição do próprio aluno: só ele lê e só ele escreve.
CREATE POLICY "Users manage their own hidden recents"
ON public.hidden_recent_courses FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
