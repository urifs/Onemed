-- ─────────────────────────────────────────────────────────────────────────────
-- OneMed · Segurança Fase 2 — Trilha de auditoria (MÉD-2)
-- Não existia NENHUM rastro imutável de ações privilegiadas, então invasão,
-- brute-force e vazamento eram indetectáveis e sem forense. Esta tabela é
-- APPEND-ONLY (sem policy de UPDATE/DELETE — nem admin apaga pela app) e é
-- escrita só via service role (Edge Functions) pela RPC log_security_event.
-- Aditiva: não altera nenhum fluxo existente.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at    timestamptz NOT NULL DEFAULT now(),
  event         text NOT NULL,               -- ex.: 'admin_account_create', 'drive_reconnect'
  actor_user_id uuid,                         -- quem fez (quando há sessão)
  actor_email   text,
  target        text,                         -- alvo da ação (e-mail/id afetado)
  ip            text,
  detail        jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Só admin/viewer LEEM. Sem policy de INSERT/UPDATE/DELETE de propósito:
-- anon/authenticated não escrevem nem apagam; a escrita é via service role
-- (que ignora RLS) pela RPC abaixo — mantendo a trilha append-only na app.
DROP POLICY IF EXISTS "audit admin le" ON public.security_audit_log;
CREATE POLICY "audit admin le" ON public.security_audit_log FOR SELECT
  USING ((SELECT public.has_role(auth.uid(), 'admin')) OR (SELECT public.has_role(auth.uid(), 'viewer')));

CREATE INDEX IF NOT EXISTS idx_security_audit_created ON public.security_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_event   ON public.security_audit_log (event, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_security_event(
  _event text,
  _actor_user_id uuid,
  _actor_email text,
  _target text,
  _ip text,
  _detail jsonb
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.security_audit_log (event, actor_user_id, actor_email, target, ip, detail)
  VALUES (_event, _actor_user_id, _actor_email, _target, _ip, COALESCE(_detail, '{}'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.log_security_event(text,uuid,text,text,text,jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(text,uuid,text,text,text,jsonb) TO service_role;
