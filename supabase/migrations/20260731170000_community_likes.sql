-- ═══════════════════════════════════════════════════════════════════════════
-- Curtidas em tópicos e comentários da comunidade
--
-- Regra do produto: a contagem é PÚBLICA (todo membro vê quantas curtidas um
-- tópico ou comentário recebeu) e qualquer membro pode curtir. Quem curtiu o
-- quê é privado: só o próprio usuário sabe o que curtiu, através da flag
-- `liked_by_me` que volta nas RPCs — nunca a lista de pessoas.
--
-- A tabela guarda uma linha por (usuário, comentário), então a PK já garante
-- que ninguém curte duas vezes: não precisa de checagem na aplicação, e um
-- clique duplo no botão não infla o contador.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.community_likes (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES public.course_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);

-- Contar curtidas de um comentário é a consulta quente (roda por linha do
-- feed), então índice por comment_id.
CREATE INDEX IF NOT EXISTS idx_community_likes_comment ON public.community_likes(comment_id);

ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;

-- Leitura liberada para membros: é o que permite contar. Escrita só da própria
-- curtida — ninguém curte em nome de outro.
DROP POLICY IF EXISTS "Membros leem curtidas" ON public.community_likes;
CREATE POLICY "Membros leem curtidas" ON public.community_likes
  FOR SELECT TO authenticated
  USING (public.is_member() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Membros curtem em nome próprio" ON public.community_likes;
CREATE POLICY "Membros curtem em nome próprio" ON public.community_likes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (public.is_member() OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Membros descurtem o que curtiram" ON public.community_likes;
CREATE POLICY "Membros descurtem o que curtiram" ON public.community_likes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── curtir/descurtir num clique ─────────────────────────────────────────────
-- Vai e volta uma vez só e devolve o estado final, para o botão não precisar
-- de uma segunda consulta pra saber o número novo.
CREATE OR REPLACE FUNCTION public.toggle_comment_like(_comment_id UUID)
RETURNS TABLE (like_count BIGINT, liked_by_me BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me      UUID := auth.uid();
  existed BOOLEAN;
BEGIN
  IF me IS NULL OR NOT (public.is_member() OR public.has_role(me, 'admin')) THEN
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
$$;

GRANT EXECUTE ON FUNCTION public.toggle_comment_like(UUID) TO authenticated;

-- ── as três RPCs da comunidade passam a devolver curtidas ───────────────────
-- Precisa DROP antes: o Postgres não permite mudar o tipo de retorno de uma
-- função existente por CREATE OR REPLACE. Tudo roda na mesma transação, então
-- não há janela em que a comunidade fique sem as funções.
DROP FUNCTION IF EXISTS public.community_feed(integer, integer, text, text);
DROP FUNCTION IF EXISTS public.community_replies(uuid);
DROP FUNCTION IF EXISTS public.course_comments_feed(uuid);

CREATE OR REPLACE FUNCTION public.community_feed(
  _limit integer DEFAULT 30, _offset integer DEFAULT 0,
  _filter text DEFAULT 'all', _sort text DEFAULT 'recent')
RETURNS TABLE(
  id uuid, user_id uuid, author_name text, author_email text, is_admin boolean, plan text,
  course_id uuid, course_title text, course_slug text, lesson_id uuid, lesson_title text,
  category text, title text, body text, created_at timestamptz, reply_count bigint,
  pinned boolean, like_count bigint, liked_by_me boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  caller_is_admin boolean := has_role(auth.uid(), 'admin'::app_role);
BEGIN
  IF NOT (is_member() OR caller_is_admin) THEN
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
    -- "Relevante" passa a somar curtidas com respostas: um tópico muito
    -- curtido e sem resposta é tão relevante quanto um muito respondido.
    CASE WHEN _sort = 'relevant' THEN feed.reply_count + feed.like_count END DESC NULLS LAST,
    feed.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.community_replies(_parent_id uuid)
RETURNS TABLE(
  id uuid, parent_id uuid, user_id uuid, author_name text, author_email text,
  is_admin boolean, plan text, body text, created_at timestamptz,
  like_count bigint, liked_by_me boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
  ORDER BY c.created_at ASC;
$function$;

CREATE OR REPLACE FUNCTION public.course_comments_feed(_course_id uuid)
RETURNS TABLE(
  id uuid, user_id uuid, author_name text, author_email text, is_admin boolean, plan text,
  body text, created_at timestamptz, reply_count bigint,
  like_count bigint, liked_by_me boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
  ORDER BY c.created_at DESC;
$function$;
