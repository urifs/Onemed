-- Mesma regra de `blocked_course_ids()`, porém respondendo por E-MAIL em vez
-- de pelo usuário logado.
--
-- Existe porque as funções de streaming (`member-lesson-token` e
-- `member-stream-file`) rodam com service role: a RLS não se aplica a elas, e
-- sem esta checagem elas assinariam/serviriam a aula de um curso restrito para
-- quem não pode vê-lo. Ter a regra AQUI, e não repetida em TypeScript, é o que
-- garante que os dois caminhos decidam igual — e que mudar a regra um dia seja
-- mexer em um lugar só.
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

COMMENT ON FUNCTION public.can_access_course_email(uuid, text) IS
  'Este e-mail pode ver este curso? (sem restrição, plano exigido ativo, ou acesso manual). Usada pelas functions de streaming, que rodam com service role e não passam por RLS.';

REVOKE ALL ON FUNCTION public.can_access_course_email(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_course_email(uuid, text) TO service_role;
