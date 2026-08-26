-- ── Gerenciamento da comunidade: pausa global + restrição por usuário ───────
-- Pedido do dono (26/08): (1) desativar temporariamente a criação de novos
-- posts — ninguém posta nem responde; (2) restringir usuários específicos por
-- um tempo escolhido. O enforcement é NO BANCO (policy de INSERT): esconder o
-- botão no frontend não impede um POST direto na API.

-- 1) Pausa global vive no singleton que a comunidade já usa (link do grupo).
ALTER TABLE public.community_settings
  ADD COLUMN IF NOT EXISTS posting_paused boolean NOT NULL DEFAULT false;

-- 2) Restrições por usuário. UMA linha por usuário (PK): restringir de novo
--    sobrescreve o prazo; remover a linha libera. `restricted_until` NULL =
--    permanente (até um admin remover).
CREATE TABLE IF NOT EXISTS public.community_restrictions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  restricted_until timestamptz,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.community_restrictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia restricoes" ON public.community_restrictions
  FOR ALL
  USING ((SELECT has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK ((SELECT has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Viewer le restricoes" ON public.community_restrictions
  FOR SELECT
  USING ((SELECT has_role(auth.uid(), 'viewer'::app_role)));

-- 3) Estado de postagem do usuário logado. SECURITY DEFINER: lê settings e
--    restrições por fora da RLS (o aluno não tem SELECT em restrições — e a
--    policy de INSERT que usa isto não pode depender de outras policies).
--    Também é o que o frontend chama para mostrar o aviso certo.
CREATE OR REPLACE FUNCTION public.community_posting_status()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Admin nunca é bloqueado: com a comunidade pausada, a equipe ainda
    -- precisa conseguir publicar avisos.
    WHEN has_role(auth.uid(), 'admin'::app_role)
      THEN jsonb_build_object('allowed', true)
    WHEN COALESCE((SELECT posting_paused FROM public.community_settings LIMIT 1), false)
      THEN jsonb_build_object('allowed', false, 'reason', 'paused')
    WHEN EXISTS (
      SELECT 1 FROM public.community_restrictions r
      WHERE r.user_id = auth.uid()
        AND (r.restricted_until IS NULL OR r.restricted_until > now())
    )
      THEN jsonb_build_object(
        'allowed', false, 'reason', 'restricted',
        'until', (SELECT r.restricted_until FROM public.community_restrictions r WHERE r.user_id = auth.uid())
      )
    ELSE jsonb_build_object('allowed', true)
  END;
$$;

CREATE OR REPLACE FUNCTION public.community_can_post()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((public.community_posting_status()->>'allowed')::boolean, false);
$$;

-- Regra do projeto: função SECURITY DEFINER nova exige REVOKE de anon
-- explícito (o ALTER DEFAULT PRIVILEGES concede EXECUTE a anon ao nascer).
REVOKE EXECUTE ON FUNCTION public.community_posting_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.community_posting_status() FROM anon;
GRANT EXECUTE ON FUNCTION public.community_posting_status() TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.community_can_post() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.community_can_post() FROM anon;
GRANT EXECUTE ON FUNCTION public.community_can_post() TO authenticated, service_role;

-- 4) O gate entra na policy de INSERT (posts E respostas passam por aqui).
--    Mesma transação do resto: não existe janela sem policy. As demais
--    condições são EXATAMENTE as que já valiam — nada muda para quem não
--    está pausado/restrito.
DROP POLICY "Members can post comments" ON public.course_comments;
CREATE POLICY "Members can post comments" ON public.course_comments
  FOR INSERT
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    AND (SELECT is_member())
    AND (NOT (SELECT is_trial_member()))
    AND (SELECT public.community_can_post())
  );
