-- Exclusão de comentário falhava com "infinite recursion detected in policy
-- for relation course_comments" (42P17): a policy de DELETE consultava a
-- PRÓPRIA course_comments (o EXISTS que checa se o comentário tem respostas),
-- e avaliar essa subquery reaplica a RLS da mesma tabela — recursão. Todo
-- DELETE direto na tabela falhava desde 22/07; na prática só o painel admin
-- faz esse DELETE (o aluno não tem exclusão na UI), então o sintoma era o
-- admin não conseguir excluir postagem na aba Comunidade.
--
-- A checagem vai para uma função SECURITY DEFINER: ela lê a tabela POR FORA
-- da RLS, então a policy deixa de se referenciar. A regra em si não muda:
-- dono só exclui comentário sem respostas; admin exclui qualquer um.
CREATE OR REPLACE FUNCTION public.comment_has_replies(_comment_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.course_comments WHERE parent_id = _comment_id);
$$;

-- Regra do projeto: função SECURITY DEFINER nova exige REVOKE de anon
-- explícito — o ALTER DEFAULT PRIVILEGES do projeto concede EXECUTE a anon no
-- instante em que a função nasce, e revogar de PUBLIC não alcança isso.
REVOKE EXECUTE ON FUNCTION public.comment_has_replies(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.comment_has_replies(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.comment_has_replies(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can delete own comments without replies; admins any" ON public.course_comments;
CREATE POLICY "Users can delete own comments without replies; admins any"
ON public.course_comments
FOR DELETE
USING (
  ((SELECT auth.uid()) = user_id AND NOT public.comment_has_replies(id))
  OR (SELECT has_role(auth.uid(), 'admin'::app_role))
);
