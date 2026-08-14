-- ─────────────────────────────────────────────────────────────────────────────
-- OneMed · Segurança Fase 1 (auditoria 2026-08-14)
-- Fecha 2 críticos + endurece RLS/rate-limit. Correções de banco:
--   CRIT-2  DROP da policy pública de INSERT em accesses (auto-concessão de acesso)
--   MÉD-9   is_member() passa a checar expiração de trials
--   MÉD-11  fecha SELECT anônimo de coupons; validação por código via RPC
--   BAIXO-1 REVOKE EXECUTE de admin_schema_snapshot() de anon/authenticated
--   ALTO-5/MÉD-7/8  RPCs de rate-limit ATÔMICAS (usadas pelas Edge Functions)
--   BAIXO-10 prune_rate_limits() (limpeza; o dono agenda no pg_cron se quiser)
-- Idempotente e não-destrutiva de dados. Nenhum fluxo legítimo depende do que
-- é removido (trial é criado por create-trial-access via service role, que
-- ignora RLS; cupom é validado de verdade no servidor em mp-create-payment).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── CRIT-2 · Auto-concessão de acesso permanente ────────────────────────────
-- A policy dava INSERT em accesses ao papel anon (a chave pública está no
-- bundle do site), permitindo inserir uma linha status='active' e ganhar
-- acesso vitalício grátis a toda a biblioteca. O trial legítimo NÃO usa esta
-- policy — create-trial-access insere via service_role, que ignora RLS.
DROP POLICY IF EXISTS "Public can insert trial access" ON public.accesses;

-- ── MÉD-9 · is_member() ignorava expiração ──────────────────────────────────
-- Recria mantendo o bypass de admin/viewer e a checagem de buyers, mas exige
-- que um TRIAL só valha enquanto não vencer (as demais linhas — pago/vitalício
-- — seguem valendo com expires_at nulo = permanente; a expiração de assinatura
-- paga é tratada por job de revogação, Fase 2).
CREATE OR REPLACE FUNCTION public.is_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'viewer')
      OR EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.accesses a
        WHERE a.email = u.email
          AND a.status = 'active'
          AND (a.access_type <> 'trial' OR (a.expires_at IS NOT NULL AND a.expires_at > now()))
      )
      OR EXISTS (SELECT 1 FROM public.buyers b WHERE b.email = u.email AND b.access_granted = true)
    )
  )
$$;

-- ── MÉD-11 · Todo cupom ativo era anon-legível (enumeração de descontos) ─────
-- Remove o SELECT público da tabela e substitui por uma RPC que só devolve o
-- cupom cujo CÓDIGO é informado — fecha a enumeração da lista inteira (inclui
-- cupons de afiliado) sem quebrar o checkout, que valida um código por vez.
DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;

CREATE OR REPLACE FUNCTION public.validate_coupon(_code text)
RETURNS TABLE(
  code text,
  discount_percent integer,
  allowed_plans text,
  expires_at timestamptz,
  max_uses integer,
  times_used integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.code, c.discount_percent, c.allowed_plans, c.expires_at, c.max_uses, c.times_used
  FROM public.coupons c
  WHERE c.active = true AND upper(c.code) = upper(_code)
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.validate_coupon(text) FROM public;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text) TO anon, authenticated, service_role;

-- ── BAIXO-1 · admin_schema_snapshot() era chamável por qualquer anon ─────────
-- É SECURITY DEFINER e expõe o mapa de tabelas/colunas do banco. O
-- admin-database-backup a chama via service_role (que não é afetado pelo
-- REVOKE), então tirar o EXECUTE de anon/authenticated fecha a recon sem
-- quebrar o backup.
REVOKE ALL ON FUNCTION public.admin_schema_snapshot() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_schema_snapshot() TO service_role;

-- ── ALTO-5 / MÉD-7 / MÉD-8 · Rate-limit ATÔMICO ─────────────────────────────
-- O padrão antigo era SELECT→compara→UPDATE (read-then-write), furável por
-- corrida (N requisições concorrentes liam o mesmo attempts e todas passavam).
-- Estas RPCs fazem incremento-e-checa em UM statement (INSERT ... ON CONFLICT
-- ... RETURNING), atômico. Só service_role executa (as Edge Functions).

-- Incrementa e diz se ainda está dentro do limite. Conta a tentativa que
-- REPROVA também (cap em _limit+1 pra não crescer sem fim).
CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  _identifier text, _action text, _limit integer, _window_seconds integer
) RETURNS TABLE(allowed boolean, attempts integer, window_start timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _now timestamptz := now();
  _cutoff timestamptz := now() - make_interval(secs => _window_seconds);
  _att integer;
  _ws timestamptz;
BEGIN
  INSERT INTO public.rate_limits AS rl (identifier, action, attempts, window_start)
  VALUES (_identifier, _action, 1, _now)
  ON CONFLICT (identifier, action) DO UPDATE
    SET attempts = CASE WHEN rl.window_start < _cutoff THEN 1
                        ELSE LEAST(rl.attempts + 1, _limit + 1) END,
        window_start = CASE WHEN rl.window_start < _cutoff THEN _now
                            ELSE rl.window_start END
  RETURNING rl.attempts, rl.window_start INTO _att, _ws;
  allowed := _att <= _limit;
  attempts := _att;
  window_start := _ws;
  RETURN NEXT;
END;
$$;

-- Só incrementa (sem teto) e devolve o total — usado para contar FALHAS de
-- login por conta-alvo (lockout de brute-force).
CREATE OR REPLACE FUNCTION public.rate_limit_bump(
  _identifier text, _action text, _window_seconds integer
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _now timestamptz := now();
  _cutoff timestamptz := now() - make_interval(secs => _window_seconds);
  _att integer;
BEGIN
  INSERT INTO public.rate_limits AS rl (identifier, action, attempts, window_start)
  VALUES (_identifier, _action, 1, _now)
  ON CONFLICT (identifier, action) DO UPDATE
    SET attempts = CASE WHEN rl.window_start < _cutoff THEN 1 ELSE rl.attempts + 1 END,
        window_start = CASE WHEN rl.window_start < _cutoff THEN _now ELSE rl.window_start END
  RETURNING rl.attempts INTO _att;
  RETURN _att;
END;
$$;

-- Lê o contador atual dentro da janela (0 se não existe/expirou) — usado como
-- pré-checagem de lockout antes de tentar a senha.
CREATE OR REPLACE FUNCTION public.rate_limit_count(
  _identifier text, _action text, _window_seconds integer
) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT attempts FROM public.rate_limits
    WHERE identifier = _identifier AND action = _action
      AND window_start >= now() - make_interval(secs => _window_seconds)
  ), 0);
$$;

-- Zera um contador (ex.: login bem-sucedido limpa as falhas da conta).
CREATE OR REPLACE FUNCTION public.rate_limit_reset(_identifier text, _action text)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.rate_limits WHERE identifier = _identifier AND action = _action;
$$;

-- ── BAIXO-10 · Limpeza da tabela rate_limits (cresce sem TTL) ────────────────
-- O dono pode agendar no pg_cron: SELECT public.prune_rate_limits(604800);
CREATE OR REPLACE FUNCTION public.prune_rate_limits(_older_than_seconds integer DEFAULT 604800)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < now() - make_interval(secs => _older_than_seconds);
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(text,text,integer,integer)   FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.rate_limit_bump(text,text,integer)          FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.rate_limit_count(text,text,integer)         FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.rate_limit_reset(text,text)                 FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.prune_rate_limits(integer)                  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text,text,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.rate_limit_bump(text,text,integer)        TO service_role;
GRANT EXECUTE ON FUNCTION public.rate_limit_count(text,text,integer)       TO service_role;
GRANT EXECUTE ON FUNCTION public.rate_limit_reset(text,text)               TO service_role;
GRANT EXECUTE ON FUNCTION public.prune_rate_limits(integer)                TO service_role;
