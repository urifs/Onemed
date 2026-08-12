-- Papel VISUALIZADOR do painel admin (pedido do dono): enxerga tudo que o
-- admin enxerga, mas só pode EDITAR em dois lugares — Loja (criar/gerir
-- produtos) e Área de Membros (conceder/renovar acesso a e-mails de
-- clientes). Todo o resto é somente leitura, imposto NO BANCO (as telas do
-- painel continuam as mesmas; um clique de edição fora das duas áreas
-- liberadas falha na RLS).
--
-- Obs: o valor 'viewer' do enum app_role é criado em statement separado
-- (ALTER TYPE ... ADD VALUE não pode ser usado na mesma transação):
--   ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';
--
-- As RPCs de leitura do painel (admin_flashcard_*, admin_question_banks*,
-- admin_study_plans_overview, get_store_orders, get_member_locations_map)
-- tiveram o gate trocado de has_role(admin) para admin-OU-viewer via
-- pg_get_functiondef + replace, aplicado direto em produção.

-- Helper: admin OU visualizador (pra usar nas policies de leitura).
CREATE OR REPLACE FUNCTION public.is_panel_staff()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'viewer');
$$;

-- O visualizador enxerga a plataforma de membros como um assinante (cursos,
-- comunidade, acervo) — mesmo bypass que o admin já tinha.
CREATE OR REPLACE FUNCTION public.is_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'viewer')
      OR EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.accesses a WHERE a.email = u.email AND a.status = 'active')
      OR EXISTS (SELECT 1 FROM public.buyers b WHERE b.email = u.email AND b.access_granted = true)
    )
  )
$$;

-- Relatórios da biblioteca e saúde da CAPI (gate compartilhado).
CREATE OR REPLACE FUNCTION public.can_read_library_audit()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(auth.role(), '') = 'service_role'
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'viewer');
$$;

-- ── LEITURA em tudo que o painel mostra ──────────────────────────────────────
CREATE POLICY "Visualizador le acessos"        ON public.accesses        FOR SELECT TO authenticated USING ((SELECT has_role(auth.uid(), 'viewer'::app_role)));
CREATE POLICY "Visualizador le compradores"    ON public.buyers          FOR SELECT TO authenticated USING ((SELECT has_role(auth.uid(), 'viewer'::app_role)));
CREATE POLICY "Visualizador le cupons"         ON public.coupons         FOR SELECT TO authenticated USING ((SELECT has_role(auth.uid(), 'viewer'::app_role)));
CREATE POLICY "Visualizador le visitas"        ON public.visits          FOR SELECT TO authenticated USING ((SELECT has_role(auth.uid(), 'viewer'::app_role)));
CREATE POLICY "Visualizador le afiliados"      ON public.affiliates      FOR SELECT TO authenticated USING ((SELECT has_role(auth.uid(), 'viewer'::app_role)));
CREATE POLICY "Visualizador le vendas af"      ON public.affiliate_sales FOR SELECT TO authenticated USING ((SELECT has_role(auth.uid(), 'viewer'::app_role)));
CREATE POLICY "Visualizador le followups"      ON public.email_followups FOR SELECT TO authenticated USING ((SELECT has_role(auth.uid(), 'viewer'::app_role)));
CREATE POLICY "Visualizador le roles"          ON public.user_roles      FOR SELECT TO authenticated USING ((SELECT has_role(auth.uid(), 'viewer'::app_role)));
CREATE POLICY "Visualizador le pedidos loja"   ON public.store_orders    FOR SELECT TO authenticated USING ((SELECT has_role(auth.uid(), 'viewer'::app_role)));

-- ── EDIÇÃO só nas duas áreas liberadas ───────────────────────────────────────
-- Loja: criar/editar/desativar produtos.
CREATE POLICY "Visualizador gerencia produtos" ON public.store_products  FOR ALL TO authenticated
  USING ((SELECT has_role(auth.uid(), 'viewer'::app_role)))
  WITH CHECK ((SELECT has_role(auth.uid(), 'viewer'::app_role)));

-- Área de Membros: conceder/renovar/revogar acesso (INSERT + UPDATE em
-- accesses). SEM DELETE de propósito — excluir linha continua só do admin.
CREATE POLICY "Visualizador concede acesso"    ON public.accesses        FOR INSERT TO authenticated
  WITH CHECK ((SELECT has_role(auth.uid(), 'viewer'::app_role)));
CREATE POLICY "Visualizador atualiza acesso"   ON public.accesses        FOR UPDATE TO authenticated
  USING ((SELECT has_role(auth.uid(), 'viewer'::app_role)))
  WITH CHECK ((SELECT has_role(auth.uid(), 'viewer'::app_role)));
