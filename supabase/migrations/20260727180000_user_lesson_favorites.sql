-- Favoritar aulas/arquivos individualmente (além de curso inteiro, que já
-- existe em user_favorites) — mesmo padrão de tabela, só trocando course_id
-- por lesson_id.
CREATE TABLE public.user_lesson_favorites (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (user_id, lesson_id)
);

ALTER TABLE public.user_lesson_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own lesson favorites"
    ON public.user_lesson_favorites
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
