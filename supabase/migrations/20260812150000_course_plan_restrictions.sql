-- Conteúdo restrito por plano + acesso manual (curso vendido por fora).
--
-- Regra: curso sem restrição aparece para todo assinante (é o caso de 99% do
-- acervo). Curso COM `required_plans` só aparece para quem tem um dos planos
-- listados — ou para quem recebeu acesso manual, que é o aluno que comprou
-- aquele curso separadamente e por isso não deve ser barrado pelo plano dele.
--
-- O curso restrito fica INVISÍVEL para quem não tem direito (não é "aparece
-- bloqueado"): some da lista, da busca, da página do curso e do streaming.
--
-- ⚠️ O enforcement é de BANCO, não de interface. Esconder o card no React não
-- protege nada: /membros/curso/<slug>, a busca e o token de streaming são
-- chamadas independentes que um aluno pode fazer direto.

-- ── 1. onde a restrição mora ────────────────────────────────────────────────
-- NULL ou vazio = sem restrição (o padrão de todo o acervo).
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS required_plans text[];

COMMENT ON COLUMN public.courses.required_plans IS
  'Planos que enxergam este curso (monthly/annual/lifetime/lifetime_plus/lifetime_pro). NULL ou vazio = visível para todos os assinantes.';

-- ── 2. acesso manual (comprou o curso por fora do plano) ────────────────────
-- Chave por E-MAIL, não por user_id: é assim que `accesses` e `buyers` já
-- identificam o aluno, e permite liberar o acesso ANTES de a pessoa ter feito
-- o primeiro login (a conta em auth.users só nasce no primeiro acesso).
CREATE TABLE IF NOT EXISTS public.course_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  email text NOT NULL,
  note text,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, email)
);

CREATE INDEX IF NOT EXISTS idx_course_access_grants_email ON public.course_access_grants (lower(email));
CREATE INDEX IF NOT EXISTS idx_course_access_grants_course ON public.course_access_grants (course_id);

ALTER TABLE public.course_access_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gerencia grants de curso" ON public.course_access_grants;
CREATE POLICY "Admin gerencia grants de curso" ON public.course_access_grants
  FOR ALL USING ((SELECT public.has_role(auth.uid(), 'admin'::public.app_role)));

DROP POLICY IF EXISTS "Aluno ve o proprio grant" ON public.course_access_grants;
CREATE POLICY "Aluno ve o proprio grant" ON public.course_access_grants
  FOR SELECT USING (lower(email) = lower(coalesce((SELECT auth.jwt() ->> 'email'), '')));

-- ── 3. o filtro ────────────────────────────────────────────────────────────
-- Devolve os cursos que o CHAMADOR não pode ver. É uma função sem argumentos
-- de propósito: nas policies ela vira `id NOT IN (SELECT blocked_course_ids())`,
-- uma subconsulta não-correlacionada que o Postgres avalia UMA vez por
-- consulta (InitPlan) em vez de por linha — `lessons` tem 200 mil linhas e uma
-- checagem por linha aqui derrubaria a página do curso, que é exatamente o
-- problema que a migration 20260804040000 corrigiu.
--
-- Como cursos restritos são poucos (uma mão cheia), a lista é curta e o
-- `NOT IN` fica barato.
-- O plano sai do e-mail do próprio token, direto de `accesses`, e NÃO de
-- `member_plan_tier`: aquela função resolve por `profiles.email`, e uma conta
-- sem linha em profiles devolveria NULL — o aluno com o plano certo seria
-- barrado do curso que ele pode ver. Aqui também vale `expires_at`: plano
-- vencido não dá acesso a conteúdo restrito.
CREATE OR REPLACE FUNCTION public.blocked_course_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH eu AS (
    SELECT lower(coalesce((auth.jwt() ->> 'email'), '')) AS email
  ),
  meus_planos AS (
    SELECT array_agg(DISTINCT a.access_type) AS planos
    FROM public.accesses a, eu
    WHERE lower(a.email) = eu.email
      AND a.status = 'active'
      AND (a.expires_at IS NULL OR a.expires_at > now())
  )
  SELECT c.id
  FROM public.courses c, meus_planos m, eu
  WHERE c.required_plans IS NOT NULL
    AND array_length(c.required_plans, 1) > 0
    -- quem administra a plataforma vê tudo
    AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
    AND NOT public.has_role(auth.uid(), 'viewer'::public.app_role)
    -- nenhum plano ativo da pessoa está entre os liberados
    AND NOT (c.required_plans && coalesce(m.planos, ARRAY[]::text[]))
    -- e ela não comprou o curso por fora
    AND NOT EXISTS (
      SELECT 1 FROM public.course_access_grants g
      WHERE g.course_id = c.id AND lower(g.email) = eu.email
    )
$$;

COMMENT ON FUNCTION public.blocked_course_ids() IS
  'Cursos que o usuário atual NÃO pode ver (restritos a planos que ele não tem e sem acesso manual). Usada nas policies como NOT IN (SELECT ...) para ser avaliada uma vez por consulta.';

GRANT EXECUTE ON FUNCTION public.blocked_course_ids() TO authenticated, anon;

-- ── 4. policies: o curso restrito some de verdade ──────────────────────────
DROP POLICY IF EXISTS "Members can view active courses" ON public.courses;
CREATE POLICY "Members can view active courses" ON public.courses
  FOR SELECT USING (
    active
    AND ((SELECT public.is_member()) OR (SELECT public.has_role(auth.uid(), 'admin'::public.app_role)))
    AND id NOT IN (SELECT public.blocked_course_ids())
  );

DROP POLICY IF EXISTS "Members can view lessons" ON public.lessons;
CREATE POLICY "Members can view lessons" ON public.lessons
  FOR SELECT USING (
    ((SELECT public.is_member()) OR (SELECT public.has_role(auth.uid(), 'admin'::public.app_role)))
    AND course_id NOT IN (SELECT public.blocked_course_ids())
  );

DROP POLICY IF EXISTS "Members can view modules" ON public.course_modules;
CREATE POLICY "Members can view modules" ON public.course_modules
  FOR SELECT USING (
    ((SELECT public.is_member()) OR (SELECT public.has_role(auth.uid(), 'admin'::public.app_role)))
    AND course_id NOT IN (SELECT public.blocked_course_ids())
  );

-- ── 5. a busca também precisa filtrar ──────────────────────────────────────
-- `search_lessons` é SECURITY DEFINER: ela IGNORA as policies acima, então sem
-- este filtro o aluno acharia as aulas do curso restrito pela busca do topo.
-- Reescrita por inteiro (e não por remendo no texto da função) porque é o
-- único jeito de deixar revisável o que a busca passa a fazer.
CREATE OR REPLACE FUNCTION public.search_lessons(_query text, _limit integer DEFAULT 60)
RETURNS TABLE(lesson_id uuid, lesson_title text, lesson_type text, course_id uuid,
              course_title text, course_slug text, course_category text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (is_member() OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT l.id, l.title, l.type, c.id, c.title, c.slug, c.category
  FROM lessons l
  JOIN courses c ON c.id = l.course_id
  WHERE c.active = true
    AND l.course_id NOT IN (SELECT public.blocked_course_ids())
    AND (
      SELECT bool_and(unaccent(lower(l.title)) LIKE '%' || unaccent(lower(w)) || '%')
      FROM unnest(string_to_array(trim(_query), ' ')) AS w
      WHERE w <> ''
    )
  ORDER BY l.title
  LIMIT _limit;
END;
$function$;

-- ── 6. painel admin ────────────────────────────────────────────────────────
-- Quadro dos cursos com restrição: quais planos, quantos alunos alcançam pelo
-- plano, quantos receberam acesso manual e o total de pessoas que enxergam.
CREATE OR REPLACE FUNCTION public.admin_restricted_courses()
RETURNS TABLE (
  course_id uuid,
  title text,
  slug text,
  category text,
  lesson_count integer,
  active boolean,
  required_plans text[],
  membros_por_plano bigint,
  acessos_manuais bigint,
  total_com_acesso bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'viewer'::public.app_role)) THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;

  RETURN QUERY
  WITH restritos AS (
    SELECT c.* FROM public.courses c
    WHERE c.required_plans IS NOT NULL AND array_length(c.required_plans, 1) > 0
  ),
  -- assinantes ativos por plano (uma linha por e-mail, o maior tier vale)
  por_plano AS (
    SELECT r.id AS cid, count(DISTINCT lower(a.email)) AS n
    FROM restritos r
    LEFT JOIN public.accesses a
      ON a.status = 'active'
     AND (a.expires_at IS NULL OR a.expires_at > now())
     AND a.access_type = ANY (r.required_plans)
    GROUP BY r.id
  ),
  manuais AS (
    SELECT r.id AS cid, count(DISTINCT lower(g.email)) AS n
    FROM restritos r
    LEFT JOIN public.course_access_grants g ON g.course_id = r.id
    GROUP BY r.id
  )
  SELECT r.id, r.title, r.slug, r.category, r.lesson_count, r.active, r.required_plans,
         coalesce(p.n, 0), coalesce(m.n, 0), coalesce(p.n, 0) + coalesce(m.n, 0)
  FROM restritos r
  LEFT JOIN por_plano p ON p.cid = r.id
  LEFT JOIN manuais m ON m.cid = r.id
  ORDER BY r.title;
END
$$;

GRANT EXECUTE ON FUNCTION public.admin_restricted_courses() TO authenticated;

-- Busca de aluno para conceder acesso manual: e-mail, plano atual e se já tem
-- acesso ao curso em questão.
CREATE OR REPLACE FUNCTION public.admin_search_members(_query text, _course_id uuid DEFAULT NULL)
RETURNS TABLE (
  email text,
  plano text,
  status text,
  expires_at timestamptz,
  ja_tem_grant boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _q text := '%' || lower(trim(coalesce(_query, ''))) || '%';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;
  IF length(trim(coalesce(_query, ''))) < 2 THEN RETURN; END IF;

  RETURN QUERY
  WITH tier AS (
    SELECT lower(a.email) AS email,
           max(CASE a.access_type
                 WHEN 'lifetime_pro' THEN 6 WHEN 'lifetime_plus' THEN 5
                 WHEN 'lifetime' THEN 4 WHEN 'annual' THEN 3
                 WHEN 'monthly' THEN 2 WHEN 'trial' THEN 1 ELSE 0 END) AS rank,
           max(a.expires_at) AS exp,
           bool_or(a.status = 'active' AND (a.expires_at IS NULL OR a.expires_at > now())) AS ativo
    FROM public.accesses a
    WHERE lower(a.email) LIKE _q
    GROUP BY lower(a.email)
  )
  SELECT t.email,
         CASE t.rank WHEN 6 THEN 'lifetime_pro' WHEN 5 THEN 'lifetime_plus'
                     WHEN 4 THEN 'lifetime' WHEN 3 THEN 'annual'
                     WHEN 2 THEN 'monthly' WHEN 1 THEN 'trial' ELSE 'outro' END,
         CASE WHEN t.ativo THEN 'ativo' ELSE 'inativo' END,
         t.exp,
         EXISTS (SELECT 1 FROM public.course_access_grants g
                 WHERE g.course_id = _course_id AND lower(g.email) = t.email)
  FROM tier t
  ORDER BY t.ativo DESC, t.rank DESC, t.email
  LIMIT 25;
END
$$;

GRANT EXECUTE ON FUNCTION public.admin_search_members(text, uuid) TO authenticated;
