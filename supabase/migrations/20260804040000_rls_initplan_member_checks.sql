-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: is_member()/has_role()/is_trial_member() avaliadas 1× por consulta,
-- não 1× por linha.
--
-- O Postgres só transforma a chamada em InitPlan (executa uma vez e reaproveita
-- o resultado) quando ela aparece como sub-select. Escrita "crua" na policy,
-- ela roda de novo PARA CADA LINHA candidata: no curso de questões comentadas
-- (12.234 aulas), cada página de 1.000 aulas custava ~1,5s e 99 mil buffers só
-- de re-executar is_member() — o app pagina o curso inteiro, estourava o
-- timeout de 30s do frontend e o curso aparecia VAZIO para o aluno ("O curso
-- está sendo sincronizado"), com 500s sob concorrência.
--
-- Mesma decisão de acesso, mesmo resultado — só o custo muda.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER POLICY "Members can view lessons" ON public.lessons
  USING ((SELECT is_member()) OR (SELECT has_role(auth.uid(), 'admin'::app_role)));

ALTER POLICY "Members can view modules" ON public.course_modules
  USING ((SELECT is_member()) OR (SELECT has_role(auth.uid(), 'admin'::app_role)));

ALTER POLICY "Members can view active courses" ON public.courses
  USING (active AND ((SELECT is_member()) OR (SELECT has_role(auth.uid(), 'admin'::app_role))));

ALTER POLICY "Members can view comments" ON public.course_comments
  USING (((SELECT is_member()) OR (SELECT has_role(auth.uid(), 'admin'::app_role)))
         AND (NOT (SELECT is_trial_member())));

ALTER POLICY "Membros leem curtidas" ON public.community_likes
  USING (((SELECT is_member()) OR (SELECT has_role(auth.uid(), 'admin'::app_role)))
         AND (NOT (SELECT is_trial_member())));
