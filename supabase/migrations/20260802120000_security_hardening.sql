-- ─────────────────────────────────────────────────────────────────────────────
-- Hardening de segurança (auditoria 2026-08-02).
-- Cada mudança foi escolhida para NÃO quebrar nenhum fluxo legítimo:
--   • trial é criado por create-trial-access (service role, ignora RLS);
--   • inserts de admin em accesses passam pela policy "Admins can manage";
--   • buyers continua com INSERT público (checkout/upgrade dependem dele) —
--     a troca de plano foi fechada no mp-create-payment, não aqui;
--   • cupom no checkout passa a usar a RPC validate_coupon (SELECT público sai).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── C2: fecha o bypass de paywall via INSERT anônimo em accesses ──────────────
-- A policy permitia a QUALQUER cliente (anon key é pública) inserir uma linha
-- 'trial'/'active' com o e-mail e o expires_at que quisesse — acesso vitalício
-- grátis. Ninguém legítimo usa este INSERT client-side: o trial vem da Edge
-- Function create-trial-access (service role, que ignora RLS).
DROP POLICY IF EXISTS "Public can insert trial access" ON public.accesses;

-- ── C2 (defesa em profundidade): is_member() passa a checar expires_at do trial ─
-- Todos os gates só olhavam status='active', nunca expires_at. Aqui a checagem
-- é aplicada SOMENTE a linhas de trial — planos pagos (access_type <> 'trial')
-- seguem exatamente como antes, para não cortar nenhum assinante por engano.
-- (A expiração de planos pagos vencidos — achado A7 — é uma decisão com impacto
--  em cliente pagante e foi deixada FORA desta migration de propósito.)
CREATE OR REPLACE FUNCTION public.is_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.accesses a
        WHERE a.email = u.email AND a.status = 'active'
          AND (a.access_type <> 'trial' OR a.expires_at IS NULL OR a.expires_at > now())
      )
      OR EXISTS (SELECT 1 FROM public.buyers b WHERE b.email = u.email AND b.access_granted = true)
    )
  )
$$;

-- ── M11 / B4: cupons deixam de ser listáveis publicamente ────────────────────
-- "Public can view active coupons" permitia a qualquer anon fazer
-- SELECT * FROM coupons e colher todos os códigos/descontos ativos (inclusive
-- os de follow-up). O checkout passa a validar por código exato via RPC abaixo,
-- que devolve APENAS o cupom informado (sem permitir listagem). O painel admin
-- continua lendo tudo pela policy "Admins can manage coupons".
DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;

CREATE OR REPLACE FUNCTION public.validate_coupon(_code text)
RETURNS SETOF public.coupons
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT *
  FROM public.coupons
  WHERE upper(code) = upper(trim(_code))
    AND active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR times_used IS NULL OR times_used < max_uses)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text) TO anon, authenticated;

-- ── B5: member_plan_tier deixa de ser chamável diretamente por anon ──────────
-- A função é usada internamente pelos feeds da comunidade (SECURITY DEFINER,
-- executam como o dono e continuam podendo chamá-la). Nenhuma tela chama esta
-- RPC diretamente, então revogar anon/authenticated não quebra nada e impede a
-- enumeração do plano de um usuário arbitrário por user_id.
REVOKE EXECUTE ON FUNCTION public.member_plan_tier(uuid) FROM anon, authenticated;

-- ── B6: admin_schema_snapshot só executável pelo service_role ────────────────
-- Sem input de usuário e sem checagem interna de role; o EXECUTE default do
-- Postgres é PUBLIC, então anon podia mapear o schema inteiro. Só a Edge
-- Function admin-database-backup (service role, já com gate de admin) a chama.
REVOKE ALL ON FUNCTION public.admin_schema_snapshot() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_schema_snapshot() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_schema_snapshot() TO service_role;

-- ── B11: trava profiles.email para o dono (só o serviço grava) ───────────────
-- A policy de UPDATE não tinha WITH CHECK — um membro podia trocar o próprio
-- profiles.email e forjar o badge de plano na comunidade / falsear o autor no
-- painel de moderação. RLS WITH CHECK não enxerga o valor antigo, então usamos
-- um trigger BEFORE UPDATE que preserva o e-mail (o nome continua editável).
CREATE OR REPLACE FUNCTION public.lock_profile_email()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.email := OLD.email;  -- e-mail é imutável pelo dono; só handle_new_user grava
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_profile_email ON public.profiles;
CREATE TRIGGER trg_lock_profile_email
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.lock_profile_email();
