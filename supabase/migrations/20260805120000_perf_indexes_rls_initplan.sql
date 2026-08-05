-- ═══════════════════════════════════════════════════════════════════════════
-- Auditoria de desempenho 2026-08-05 — índices ausentes + RLS por linha
--
-- Duas famílias de problema, ambas medidas na auditoria:
--
-- 1) FUNÇÕES DE CHECAGEM REAVALIADAS POR LINHA. A migration 20260804040000
--    corrigiu as políticas de SELECT com o padrão `(SELECT is_member())`
--    (InitPlan: 1× por consulta), mas as políticas-irmãs de admin (`FOR ALL
--    USING (has_role(...))`) ficaram cruas — e política permissiva entra em
--    OR no predicado de TODA leitura da tabela. Em lessons (211k linhas),
--    o has_role cru continuava rodando linha a linha. Regra permanente do
--    projeto: função de checagem SEMPRE dentro de (SELECT ...).
--
-- 2) is_trial_member()/my_member_status() comparam lower(email) com
--    lower(email), mas os índices existentes são na coluna crua — cada
--    chamada fazia 3 varreduras sequenciais (accesses ×2, buyers ×1), e
--    essas funções rodam em praticamente toda página da área de membros.
--    Índices funcionais resolvem sem mexer nas funções.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Índices funcionais para os joins por lower(email) ────────────────────
CREATE INDEX IF NOT EXISTS idx_accesses_lower_email_status
  ON public.accesses (lower(email), status);
CREATE INDEX IF NOT EXISTS idx_buyers_lower_email_granted
  ON public.buyers (lower(email), access_granted);
CREATE INDEX IF NOT EXISTS idx_buyers_lower_email_status
  ON public.buyers (lower(email), status);
CREATE INDEX IF NOT EXISTS idx_profiles_lower_email
  ON public.profiles (lower(email));

-- ── 2. Índices dos caminhos quentes ─────────────────────────────────────────

-- CourseDetailPage pagina o curso inteiro com
--   .eq(course_id).order(sort_order).order(id).range(...)
-- Só com idx_lessons_course(course_id), o Postgres buscava as 30k linhas do
-- curso e ordenava TUDO de novo a cada página pedida. Com o composto, cada
-- página é uma leitura ordenada direta do índice.
CREATE INDEX IF NOT EXISTS idx_lessons_course_sort
  ON public.lessons (course_id, sort_order, id);
-- Gerador de flashcards busca por módulo ordenado.
CREATE INDEX IF NOT EXISTS idx_lessons_module_sort
  ON public.lessons (module_id, sort_order);

-- Dashboard do aluno: .eq(user_id).order(last_watched_at desc).limit(60).
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_recent
  ON public.lesson_progress (user_id, last_watched_at DESC);
-- FKs com ON DELETE CASCADE sem índice na coluna: cada DELETE em lessons
-- fazia varredura sequencial de lesson_progress/lesson_annotations por linha
-- apagada (a sync apaga/reclassifica aulas de verdade).
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson
  ON public.lesson_progress (lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_annotations_lesson
  ON public.lesson_annotations (lesson_id);

-- archive_feed conta curtidas/visualizações POR ITEM em cada linha do feed;
-- as PKs são (user_id, item_id), inúteis pra esse acesso.
CREATE INDEX IF NOT EXISTS idx_archive_likes_item
  ON public.archive_likes (item_id);
CREATE INDEX IF NOT EXISTS idx_archive_views_item
  ON public.archive_views (item_id);
CREATE INDEX IF NOT EXISTS idx_user_archive_favorites_item
  ON public.user_archive_favorites (item_id);

-- Consultas admin/cron por status+tipo sem email na frente
-- (MembersPage, TrialUsersPage, drive-revoke-access, send-followup-emails,
-- get_member_locations_map).
CREATE INDEX IF NOT EXISTS idx_accesses_status_type
  ON public.accesses (status, access_type);
CREATE INDEX IF NOT EXISTS idx_accesses_type_status_expires
  ON public.accesses (access_type, status, expires_at);

-- community_feed: WHERE parent_id IS NULL ORDER BY pinned DESC, created_at
-- DESC — nenhum índice existente casava com esse predicado.
CREATE INDEX IF NOT EXISTS idx_course_comments_topics
  ON public.course_comments (pinned DESC, created_at DESC)
  WHERE parent_id IS NULL;

-- RPCs de admin correlacionam sessões por deck/banco.
CREATE INDEX IF NOT EXISTS idx_flashcard_sessions_deck
  ON public.flashcard_sessions (deck_id);
CREATE INDEX IF NOT EXISTS idx_question_sessions_bank
  ON public.question_sessions (bank_id);

-- visits não tinha índice nenhum além da PK; o dashboard conta por dia.
CREATE INDEX IF NOT EXISTS idx_visits_created_at
  ON public.visits (created_at);
-- Permite uma limpeza futura barata de rate_limits (tabela cresce sem TTL).
CREATE INDEX IF NOT EXISTS idx_rate_limits_window
  ON public.rate_limits (window_start);

-- ── 3. Políticas admin FOR ALL: has_role dentro de (SELECT ...) ─────────────
-- ALTER POLICY preserva o comando (FOR ALL/SELECT/…) e as roles; só o
-- predicado muda — semanticamente idêntico, avaliado 1× por consulta.

-- As cinco da 20260718120000 (a metade que a 20260804040000 não cobriu):
ALTER POLICY "Admins manage courses" ON public.courses
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Admins manage modules" ON public.course_modules
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Admins manage lessons" ON public.lessons
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Admins view all progress" ON public.lesson_progress
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Users manage own progress" ON public.lesson_progress
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id AND (SELECT public.is_member()));

-- Criadas depois da 20260804040000 com o has_role cru de novo:
ALTER POLICY "Admin gerencia itens" ON public.archive_items
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Admin gerencia cronogramas" ON public.study_plans
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Admin gerencia afiliados" ON public.affiliates
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Admin gerencia vendas de afiliados" ON public.affiliate_sales
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Admin gerencia notificacoes" ON public.notification_items
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));

-- Tabelas grandes/quentes do schema original (20260323163043):
ALTER POLICY "Admins can manage accesses" ON public.accesses
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Admins can manage buyers" ON public.buyers
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Admins can view visits" ON public.visits
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Admins can manage coupons" ON public.coupons
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Admins can view all profiles" ON public.profiles
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Admins can insert profiles" ON public.profiles
  WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Admins can manage email followups" ON public.email_followups
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));

-- Filas/telemetria que crescem sem teto:
ALTER POLICY "Admins manage sync_folder_queue" ON public.sync_folder_queue
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Admins read capi_events" ON public.capi_events
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Admin full access on sms_sends" ON public.sms_sends
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Admin acesso total whatsapp_messages" ON public.whatsapp_messages
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));

-- ── 4. Políticas de dono com auth.uid() cru nas tabelas quentes ─────────────
ALTER POLICY "Users can view their own profile" ON public.profiles
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can update their own profile" ON public.profiles
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can manage their own favorites" ON public.user_favorites
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can manage their own lesson favorites" ON public.user_lesson_favorites
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can update own comments" ON public.course_comments
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can delete own comments without replies; admins any" ON public.course_comments
  USING (
    ((SELECT auth.uid()) = user_id AND NOT EXISTS (
      SELECT 1 FROM public.course_comments r WHERE r.parent_id = course_comments.id
    ))
    OR (SELECT public.has_role(auth.uid(), 'admin'::app_role))
  );
ALTER POLICY "Members can post comments" ON public.course_comments
  WITH CHECK ((SELECT auth.uid()) = user_id
    AND (SELECT public.is_member())
    AND NOT (SELECT public.is_trial_member()));
ALTER POLICY "Membros curtem em nome próprio" ON public.community_likes
  WITH CHECK ((SELECT auth.uid()) = user_id
    AND ((SELECT public.is_member()) OR (SELECT public.has_role(auth.uid(), 'admin'::app_role)))
    AND NOT (SELECT public.is_trial_member()));
ALTER POLICY "Membros descurtem o que curtiram" ON public.community_likes
  USING ((SELECT auth.uid()) = user_id);

-- ── 5. Incremento atômico do uso de cupom ───────────────────────────────────
-- O mp-create-payment fazia SELECT times_used e depois UPDATE times_used+1 em
-- duas idas: dois checkouts simultâneos liam o mesmo valor e gravavam o mesmo
-- resultado — max_uses podia ser ultrapassado. Uma UPDATE única no banco não
-- tem essa janela.
CREATE OR REPLACE FUNCTION public.increment_coupon_use(_coupon_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.coupons SET times_used = COALESCE(times_used, 0) + 1 WHERE id = _coupon_id;
$$;
REVOKE ALL ON FUNCTION public.increment_coupon_use(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coupon_use(uuid) TO service_role;
