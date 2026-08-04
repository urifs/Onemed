-- ─────────────────────────────────────────────────────────────────────────────
-- Gerador de cronograma de estudos (IA).
--
-- O aluno descreve o objetivo (ex: "passar na residência de Clínica Médica em
-- 6 meses, estudo 3h/dia") e a IA monta um cronograma DETALHADO: semanas com
-- temas e tarefas, marcos, dicas e um MAPA MENTAL (árvore de temas). Fica
-- salvo para acompanhar; cada tarefa tem id e vira item de checklist.
--
-- `plan` (jsonb) guarda toda a estrutura gerada; `completed_tasks` (jsonb, array
-- de ids) guarda o progresso do checklist — atualizável só pelo dono.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.study_plans (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL,
  title           text        NOT NULL,
  objective       text        NOT NULL,
  weekly_hours    integer,
  duration_weeks  integer,
  exam_date       date,
  plan            jsonb       NOT NULL,
  completed_tasks jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_plans_user ON public.study_plans (user_id, created_at DESC);

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

-- Dono lê/edita/apaga o próprio cronograma; admin lê todos (painel).
CREATE POLICY "Dono le os proprios cronogramas"
  ON public.study_plans FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT has_role(auth.uid(), 'admin'::app_role)));

-- INSERT só via Edge Function (service role) — a geração passa pela IA.
CREATE POLICY "Dono atualiza o proprio cronograma"
  ON public.study_plans FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Dono apaga o proprio cronograma"
  ON public.study_plans FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admin gerencia cronogramas"
  ON public.study_plans FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Dono só pode mexer no progresso do checklist e no título direto no banco —
-- a estrutura do plano (plan/objective) é imutável pela edição do cliente.
REVOKE UPDATE ON public.study_plans FROM authenticated;
GRANT UPDATE (completed_tasks, title, updated_at) ON public.study_plans TO authenticated;

CREATE TRIGGER update_study_plans_updated_at
  BEFORE UPDATE ON public.study_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Painel admin: visão geral de todos os cronogramas com nome/e-mail do aluno e
-- progresso (tarefas concluídas / total). Só admin.
CREATE OR REPLACE FUNCTION public.admin_study_plans_overview()
RETURNS TABLE(
  id uuid, user_id uuid, student_name text, student_email text,
  title text, objective text, weekly_hours integer, duration_weeks integer,
  total_tasks int, done_tasks int, created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;
  RETURN QUERY
  SELECT sp.id, sp.user_id, p.name, p.email,
    sp.title, sp.objective, sp.weekly_hours, sp.duration_weeks,
    COALESCE((SELECT count(*)::int FROM jsonb_array_elements(sp.plan->'weeks') w,
              jsonb_array_elements(w->'tasks') t), 0) AS total_tasks,
    COALESCE(jsonb_array_length(sp.completed_tasks), 0) AS done_tasks,
    sp.created_at, sp.updated_at
  FROM study_plans sp
  LEFT JOIN profiles p ON p.user_id = sp.user_id
  ORDER BY sp.created_at DESC;
END $$;
