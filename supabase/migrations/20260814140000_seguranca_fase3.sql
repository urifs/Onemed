-- ─────────────────────────────────────────────────────────────────────────────
-- OneMed · Segurança Fase 3 — hardening de baixo risco (auditoria 2026-08-14)
--   BAIXO-17  member_plan_tier resolve pelo e-mail AUTORITATIVO (auth.users),
--             não por profiles.email (editável pelo usuário) — fim do spoof de
--             badge/anel de plano na comunidade.
--   BAIXO-8   funções de RETENÇÃO/eliminação de dados pessoais (LGPD) — só
--             service role, NÃO agendadas automaticamente (o dono decide o
--             prazo e roda/agenda no pg_cron). Aditivas: não alteram fluxo.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── BAIXO-17 · Spoof de plano na comunidade ─────────────────────────────────
-- profiles.email é editável pelo próprio usuário (RLS só amarra user_id), então
-- alguém setava o e-mail do perfil para o de um assinante Pro e ganhava o anel
-- dourado. Resolver pelo auth.users.email (não-editável) fecha isso. Para
-- usuários legítimos o resultado é IDÊNTICO (auth.email == accesses.email).
CREATE OR REPLACE FUNCTION public.member_plan_tier(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.access_type
  FROM public.accesses a
  JOIN auth.users u ON lower(u.email) = lower(a.email)
  WHERE u.id = _user_id AND a.status = 'active'
  ORDER BY
    CASE a.access_type
      WHEN 'lifetime_pro' THEN 6
      WHEN 'lifetime_plus' THEN 5
      WHEN 'lifetime' THEN 4
      WHEN 'annual' THEN 3
      WHEN 'monthly' THEN 2
      WHEN 'trial' THEN 1
      ELSE 0
    END DESC
  LIMIT 1;
$$;

-- ── BAIXO-8 · Retenção de dados pessoais (LGPD) ─────────────────────────────
-- Nada expirava member_locations (IP + geolocalização por login) nem visits.
-- Estas funções permitem expurgar dados antigos. NÃO são chamadas em lugar
-- nenhum — o dono agenda quando definir a política (ex.: no pg_cron):
--   SELECT public.prune_member_locations(180);  -- localizações > 180 dias
--   SELECT public.prune_visits(365);             -- visitas > 365 dias

CREATE OR REPLACE FUNCTION public.prune_member_locations(_older_than_days integer DEFAULT 180)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  DELETE FROM public.member_locations
  WHERE updated_at < now() - make_interval(days => _older_than_days);
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

CREATE OR REPLACE FUNCTION public.prune_visits(_older_than_days integer DEFAULT 365)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  DELETE FROM public.visits
  WHERE created_at < now() - make_interval(days => _older_than_days);
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

-- Direito de eliminação do titular (LGPD): remove os dados PESSOAIS não-
-- financeiros de um e-mail (localização, marca de senha, contato/IP no acesso).
-- NÃO apaga o registro financeiro em buyers (base legal de guarda fiscal) —
-- decisão conservadora; o dono pode ampliar. Devolve um resumo do que saiu.
CREATE OR REPLACE FUNCTION public.erase_member_personal_data(_email text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _loc integer; _cred integer; _acc integer;
  _e text := lower(trim(_email));
BEGIN
  DELETE FROM public.member_locations WHERE lower(email) = _e;
  GET DIAGNOSTICS _loc = ROW_COUNT;

  DELETE FROM public.member_credentials WHERE lower(email) = _e;
  GET DIAGNOSTICS _cred = ROW_COUNT;

  UPDATE public.accesses SET whatsapp = NULL WHERE lower(email) = _e AND whatsapp IS NOT NULL;
  GET DIAGNOSTICS _acc = ROW_COUNT;

  RETURN jsonb_build_object('email', _e, 'member_locations', _loc, 'member_credentials', _cred, 'accesses_whatsapp_cleared', _acc);
END;
$$;

REVOKE ALL ON FUNCTION public.prune_member_locations(integer)      FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.prune_visits(integer)                FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.erase_member_personal_data(text)     FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_member_locations(integer)   TO service_role;
GRANT EXECUTE ON FUNCTION public.prune_visits(integer)             TO service_role;
GRANT EXECUTE ON FUNCTION public.erase_member_personal_data(text)  TO service_role;
