-- Conta em teste grátis não participa da comunidade nem recebe o link do
-- grupo do WhatsApp — os dois são benefício de assinante.
--
-- O bloqueio precisa existir NO BANCO, não só na tela: os feeds da comunidade
-- são SECURITY DEFINER (ignoram RLS de propósito, pra poder juntar profiles e
-- has_role), então esconder o componente no React deixaria a mesma informação
-- a uma chamada de RPC de distância. A tela cuida da experiência (fundo
-- embaçado + convite pra assinar); isto aqui cuida do acesso.

-- Quem é "trial" pra efeito de bloqueio. A definição é DELIBERADAMENTE
-- conservadora: bloqueia só quem tem acesso trial ativo e nenhum sinal de
-- pagamento. Não dá pra decidir por "maior tier ativo" como as outras
-- funções fazem, porque o mp-webhook grava access_type='paid', que não está
-- naquela escala de tiers — um comprador com um trial antigo na conta cairia
-- como trial e perderia a comunidade que pagou. Errar pra liberar é o lado
-- certo de errar aqui.
CREATE OR REPLACE FUNCTION public.is_trial_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    NOT public.has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM auth.users u
      JOIN public.accesses a ON lower(a.email) = lower(u.email)
      WHERE u.id = auth.uid() AND a.status = 'active' AND a.access_type = 'trial'
    )
    AND NOT EXISTS (
      SELECT 1 FROM auth.users u
      JOIN public.accesses a ON lower(a.email) = lower(u.email)
      WHERE u.id = auth.uid() AND a.status = 'active' AND a.access_type <> 'trial'
    )
    AND NOT EXISTS (
      SELECT 1 FROM auth.users u
      JOIN public.buyers b ON lower(b.email) = lower(u.email)
      WHERE u.id = auth.uid() AND b.access_granted = true
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_trial_member() TO authenticated;

-- ── Link do grupo no WhatsApp ────────────────────────────────────────────
-- Era legível por qualquer autenticado; passa a excluir o trial.
DROP POLICY IF EXISTS "Membros autenticados podem ler community_settings" ON public.community_settings;
CREATE POLICY "Membros autenticados podem ler community_settings"
  ON public.community_settings FOR SELECT TO authenticated
  USING (NOT public.is_trial_member());

-- ── Comentários e curtidas ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Members can view comments" ON public.course_comments;
CREATE POLICY "Members can view comments"
  ON public.course_comments FOR SELECT
  USING ((public.is_member() OR public.has_role(auth.uid(), 'admin'::app_role))
         AND NOT public.is_trial_member());

DROP POLICY IF EXISTS "Members can post comments" ON public.course_comments;
CREATE POLICY "Members can post comments"
  ON public.course_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_member() AND NOT public.is_trial_member());

DROP POLICY IF EXISTS "Membros leem curtidas" ON public.community_likes;
CREATE POLICY "Membros leem curtidas" ON public.community_likes FOR SELECT
  USING ((public.is_member() OR public.has_role(auth.uid(), 'admin'::app_role))
         AND NOT public.is_trial_member());

DROP POLICY IF EXISTS "Membros curtem em nome próprio" ON public.community_likes;
CREATE POLICY "Membros curtem em nome próprio" ON public.community_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id
              AND (public.is_member() OR public.has_role(auth.uid(), 'admin'::app_role))
              AND NOT public.is_trial_member());

-- ── Feeds (SECURITY DEFINER: RLS não vale aqui, o gate é explícito) ──────
-- Corpos idênticos aos que estão em produção; a única mudança é o
-- `NOT is_trial_member()` junto do teste de acesso que já existia.
CREATE OR REPLACE FUNCTION public.community_feed(
  _limit integer DEFAULT 30, _offset integer DEFAULT 0,
  _filter text DEFAULT 'all'::text, _sort text DEFAULT 'recent'::text)
RETURNS TABLE(id uuid, user_id uuid, author_name text, author_email text, is_admin boolean, plan text,
              course_id uuid, course_title text, course_slug text, lesson_id uuid, lesson_title text,
              category text, title text, body text, created_at timestamptz, reply_count bigint,
              pinned boolean, like_count bigint, liked_by_me boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  me uuid := auth.uid();
  caller_is_admin boolean := has_role(auth.uid(), 'admin'::app_role);
BEGIN
  IF NOT (is_member() OR caller_is_admin) OR public.is_trial_member() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT feed.id, feed.user_id, feed.author_name, feed.author_email, feed.is_admin, feed.plan,
         feed.course_id, feed.course_title, feed.course_slug,
         feed.lesson_id, feed.lesson_title,
         feed.category, feed.title, feed.body, feed.created_at, feed.reply_count, feed.pinned,
         feed.like_count, feed.liked_by_me
  FROM (
    SELECT
      c.id, c.user_id, p.name AS author_name,
      CASE WHEN caller_is_admin THEN p.email ELSE NULL END AS author_email,
      has_role(c.user_id, 'admin'::app_role) AS is_admin,
      public.member_plan_tier(c.user_id) AS plan,
      c.course_id, co.title AS course_title, co.slug AS course_slug,
      c.lesson_id, l.title AS lesson_title,
      c.category, c.title, c.body, c.created_at,
      (WITH RECURSIVE thread AS (
         SELECT r.id FROM public.course_comments r WHERE r.parent_id = c.id
         UNION ALL
         SELECT r.id FROM public.course_comments r JOIN thread t ON r.parent_id = t.id
       ) SELECT count(*) FROM thread) AS reply_count,
      c.pinned,
      (SELECT count(*) FROM public.community_likes lk WHERE lk.comment_id = c.id) AS like_count,
      EXISTS (SELECT 1 FROM public.community_likes lk WHERE lk.comment_id = c.id AND lk.user_id = me) AS liked_by_me
    FROM public.course_comments c
    LEFT JOIN public.profiles p ON p.user_id = c.user_id
    LEFT JOIN public.courses co ON co.id = c.course_id
    LEFT JOIN public.lessons l ON l.id = c.lesson_id
    WHERE c.parent_id IS NULL
      AND (
        _filter = 'all'
        OR (_filter = 'mine' AND c.user_id = me)
        OR (_filter = 'interacted' AND (c.user_id = me OR EXISTS (
              SELECT 1 FROM public.course_comments r WHERE r.parent_id = c.id AND r.user_id = me
            )))
      )
  ) feed
  ORDER BY
    feed.pinned DESC,
    CASE WHEN _sort = 'relevant' THEN feed.reply_count + feed.like_count END DESC NULLS LAST,
    feed.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.community_replies(_parent_id uuid)
RETURNS TABLE(id uuid, parent_id uuid, user_id uuid, author_name text, author_email text,
              is_admin boolean, plan text, body text, created_at timestamptz,
              like_count bigint, liked_by_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  WITH RECURSIVE thread AS (
    SELECT c.id FROM public.course_comments c WHERE c.parent_id = _parent_id
    UNION ALL
    SELECT c.id FROM public.course_comments c JOIN thread t ON c.parent_id = t.id
  )
  SELECT c.id, c.parent_id, c.user_id, p.name,
         CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN p.email ELSE NULL END,
         has_role(c.user_id, 'admin'::app_role), public.member_plan_tier(c.user_id), c.body, c.created_at,
         (SELECT count(*) FROM public.community_likes lk WHERE lk.comment_id = c.id),
         EXISTS (SELECT 1 FROM public.community_likes lk WHERE lk.comment_id = c.id AND lk.user_id = auth.uid())
  FROM public.course_comments c
  JOIN thread t ON t.id = c.id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE (is_member() OR has_role(auth.uid(), 'admin'::app_role))
    AND NOT public.is_trial_member()
  ORDER BY c.created_at ASC;
$function$;

CREATE OR REPLACE FUNCTION public.course_comments_feed(_course_id uuid)
RETURNS TABLE(id uuid, user_id uuid, author_name text, author_email text, is_admin boolean, plan text,
              body text, created_at timestamptz, reply_count bigint, like_count bigint, liked_by_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  SELECT c.id, c.user_id, p.name,
         CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN p.email ELSE NULL END,
         has_role(c.user_id, 'admin'::app_role), public.member_plan_tier(c.user_id), c.body, c.created_at,
         (WITH RECURSIVE thread AS (
            SELECT r.id FROM public.course_comments r WHERE r.parent_id = c.id
            UNION ALL
            SELECT r.id FROM public.course_comments r JOIN thread t ON r.parent_id = t.id
          ) SELECT count(*) FROM thread) AS reply_count,
         (SELECT count(*) FROM public.community_likes lk WHERE lk.comment_id = c.id),
         EXISTS (SELECT 1 FROM public.community_likes lk WHERE lk.comment_id = c.id AND lk.user_id = auth.uid())
  FROM public.course_comments c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE c.course_id = _course_id
    AND (is_member() OR has_role(auth.uid(), 'admin'::app_role))
    AND NOT public.is_trial_member()
  ORDER BY c.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_comment_like(_comment_id uuid)
RETURNS TABLE(like_count bigint, liked_by_me boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  me      UUID := auth.uid();
  existed BOOLEAN;
BEGIN
  IF me IS NULL OR NOT (public.is_member() OR public.has_role(me, 'admin'))
     OR public.is_trial_member() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.course_comments WHERE id = _comment_id) THEN
    RAISE EXCEPTION 'Comentário não encontrado';
  END IF;

  DELETE FROM public.community_likes
   WHERE user_id = me AND comment_id = _comment_id;
  existed := FOUND;

  IF NOT existed THEN
    INSERT INTO public.community_likes (user_id, comment_id)
    VALUES (me, _comment_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY
    SELECT count(*), NOT existed
      FROM public.community_likes
     WHERE comment_id = _comment_id;
END;
$function$;
