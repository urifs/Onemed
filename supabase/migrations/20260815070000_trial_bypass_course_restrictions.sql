-- ─────────────────────────────────────────────────────────────────────────────
-- Trial IGNORA a restrição de curso por plano — vê TODO o acervo.
--
-- A restrição por plano (courses.required_plans, migration 20260812150000)
-- escondia o curso restrito de quem não tem o plano exigido — e isso incluía o
-- TRIAL, porque access_type='trial' nunca está entre os planos pagos exigidos.
--
-- Regra nova (decisão do dono): o teste grátis é justamente para mostrar o
-- acervo INTEIRO e atrair a compra, então um trial ATIVO passa a ver todos os
-- cursos, restritos ou não. Assinante pagante segue barrado normalmente pelo
-- plano; só o trial é a exceção.
--
-- Dois pontos de enforcement, os dois com o mesmo bypass:
--   blocked_course_ids()        → lista, busca e página do curso (RLS)
--   can_access_course_email()   → streaming (member-lesson-token/stream-file)
--
-- "Trial ativo" = linha em accesses com access_type='trial', status='active' e
-- expires_at ainda no futuro. Trial VENCIDO não ganha o bypass (some do acervo
-- restrito como qualquer não-assinante).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.blocked_course_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH eu AS (
    SELECT lower(coalesce((auth.jwt() ->> 'email'), '')) AS email
  ),
  meus AS (
    SELECT array_agg(DISTINCT a.access_type) AS planos,
           bool_or(a.access_type = 'trial') AS sou_trial
    FROM public.accesses a, eu
    WHERE lower(a.email) = eu.email
      AND a.status = 'active'
      AND (a.expires_at IS NULL OR a.expires_at > now())
  )
  SELECT c.id
  FROM public.courses c, meus m, eu
  WHERE c.required_plans IS NOT NULL
    AND array_length(c.required_plans, 1) > 0
    AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
    AND NOT public.has_role(auth.uid(), 'viewer'::public.app_role)
    -- TRIAL vê TUDO: um teste grátis ativo não tem nenhum curso escondido.
    AND NOT coalesce(m.sou_trial, false)
    AND NOT (c.required_plans && coalesce(m.planos, ARRAY[]::text[]))
    AND NOT EXISTS (
      SELECT 1 FROM public.course_access_grants g
      WHERE g.course_id = c.id AND lower(g.email) = eu.email
    )
$$;

CREATE OR REPLACE FUNCTION public.can_access_course_email(_course_id uuid, _email text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH curso AS (
    SELECT required_plans FROM public.courses WHERE id = _course_id
  )
  SELECT
    -- curso sem restrição: liberado para qualquer assinante
    NOT EXISTS (SELECT 1 FROM curso WHERE required_plans IS NOT NULL AND array_length(required_plans, 1) > 0)
    -- TRIAL vê TUDO: um teste grátis ativo ignora a restrição por plano
    OR EXISTS (
      SELECT 1 FROM public.accesses a
      WHERE lower(a.email) = lower(coalesce(_email, ''))
        AND a.status = 'active'
        AND (a.expires_at IS NULL OR a.expires_at > now())
        AND a.access_type = 'trial'
    )
    -- ou o e-mail tem um plano ATIVO entre os exigidos
    OR EXISTS (
      SELECT 1 FROM public.accesses a, curso c
      WHERE lower(a.email) = lower(coalesce(_email, ''))
        AND a.status = 'active'
        AND (a.expires_at IS NULL OR a.expires_at > now())
        AND a.access_type = ANY (c.required_plans)
    )
    -- ou comprou o curso por fora (acesso manual)
    OR EXISTS (
      SELECT 1 FROM public.course_access_grants g
      WHERE g.course_id = _course_id
        AND lower(g.email) = lower(coalesce(_email, ''))
    )
$$;
