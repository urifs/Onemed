-- Rótulo do plano do autor + anel colorido ao redor do avatar na comunidade
-- (pedido pra diferenciar visualmente assinantes de planos maiores). Resolve
-- o mesmo "maior tier entre todas as linhas ativas" já usado em
-- member-account-info/get_member_locations_map, só que por user_id em vez
-- de email direto (course_comments só tem user_id; profiles.email faz a
-- ponte até accesses.email).
CREATE OR REPLACE FUNCTION public.member_plan_tier(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.access_type
  FROM public.accesses a
  JOIN public.profiles p ON p.email = a.email
  WHERE p.user_id = _user_id AND a.status = 'active'
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

-- community_replies: acrescenta `plan` no retorno.
DROP FUNCTION IF EXISTS public.community_replies(uuid);
CREATE FUNCTION public.community_replies(_parent_id uuid)
RETURNS TABLE(id uuid, parent_id uuid, user_id uuid, author_name text, author_email text, is_admin boolean, plan text, body text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH RECURSIVE thread AS (
    SELECT c.id FROM public.course_comments c WHERE c.parent_id = _parent_id
    UNION ALL
    SELECT c.id FROM public.course_comments c JOIN thread t ON c.parent_id = t.id
  )
  SELECT c.id, c.parent_id, c.user_id, p.name,
         CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN p.email ELSE NULL END,
         has_role(c.user_id, 'admin'::app_role), public.member_plan_tier(c.user_id), c.body, c.created_at
  FROM public.course_comments c
  JOIN thread t ON t.id = c.id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE (is_member() OR has_role(auth.uid(), 'admin'::app_role))
  ORDER BY c.created_at ASC;
$$;

-- community_feed: acrescenta `plan` no retorno.
DROP FUNCTION IF EXISTS public.community_feed(integer, integer, text, text);
CREATE FUNCTION public.community_feed(
  _limit integer DEFAULT 30,
  _offset integer DEFAULT 0,
  _filter text DEFAULT 'all',
  _sort text DEFAULT 'recent'
)
RETURNS TABLE(
  id uuid, user_id uuid, author_name text, author_email text, is_admin boolean, plan text,
  course_id uuid, course_title text, course_slug text,
  lesson_id uuid, lesson_title text,
  category text,
  title text, body text, created_at timestamptz,
  reply_count bigint, pinned boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
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
         feed.category, feed.title, feed.body, feed.created_at, feed.reply_count, feed.pinned
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
      c.pinned
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
    CASE WHEN _sort = 'relevant' THEN feed.reply_count END DESC NULLS LAST,
    feed.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;

-- course_comments_feed: acrescenta `plan` no retorno.
DROP FUNCTION IF EXISTS public.course_comments_feed(uuid);
CREATE FUNCTION public.course_comments_feed(_course_id uuid)
RETURNS TABLE(id uuid, user_id uuid, author_name text, author_email text, is_admin boolean, plan text, body text, created_at timestamptz, reply_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.user_id, p.name,
         CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN p.email ELSE NULL END,
         has_role(c.user_id, 'admin'::app_role), public.member_plan_tier(c.user_id), c.body, c.created_at,
         (WITH RECURSIVE thread AS (
            SELECT r.id FROM public.course_comments r WHERE r.parent_id = c.id
            UNION ALL
            SELECT r.id FROM public.course_comments r JOIN thread t ON r.parent_id = t.id
          ) SELECT count(*) FROM thread) AS reply_count
  FROM public.course_comments c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE c.course_id = _course_id
    AND (is_member() OR has_role(auth.uid(), 'admin'::app_role))
  ORDER BY c.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.member_plan_tier(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.course_comments_feed(uuid) TO anon, authenticated;
