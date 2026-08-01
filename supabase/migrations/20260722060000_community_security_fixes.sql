-- Corrige dois achados da revisão de segurança da Comunidade:
--
-- 1) CRÍTICO: community_feed/community_replies devolviam o e-mail de QUALQUER
--    autor pra qualquer chamador autenticado (inclusive quem só está no teste
--    grátis de 10min, já que is_member() cobre trial ativo) — e a policy de
--    profiles liberava a linha inteira (nome+email) de qualquer membro pra
--    qualquer outro membro. Na prática, qualquer pessoa que preenchesse o
--    formulário de trial conseguia coletar o e-mail de todo mundo que já
--    comentou ou respondeu na comunidade.
--    Fix: e-mail só volta nas RPCs quando quem CHAMA é admin; e a policy de
--    profiles que liberava leitura ampla pra "membro vê membro" é removida —
--    a exibição de nome no feed passa a vir só pelas RPCs SECURITY DEFINER
--    (que já fazem esse join internamente, sem depender de RLS de profiles).
--
-- 2) MÉDIO: autor de um tópico podia apagar o próprio tópico a qualquer
--    momento, e por causa do ON DELETE CASCADE em parent_id isso levava
--    junto as respostas de outras pessoas, sem o admin saber.
--    Fix: autor só pode apagar o próprio comentário enquanto ele não tiver
--    NENHUMA resposta ainda (de ninguém). Depois que alguém responde, só
--    admin apaga — o que é justamente o modelo de moderação centralizada
--    pedido.

-- ── 1a) profiles: remove a policy que liberava membro ver profile de
-- qualquer outro membro (nome+email). Only self ("Users can view their own
-- profile") e admin ("Admins can view all profiles") continuam podendo ler
-- direto pela tabela.
DROP POLICY IF EXISTS "Members can view profiles for community" ON public.profiles;

-- ── 1b) community_feed: e-mail só pra quem chama sendo admin.
CREATE OR REPLACE FUNCTION public.community_feed(
  _limit integer DEFAULT 30,
  _offset integer DEFAULT 0,
  _filter text DEFAULT 'all',
  _sort text DEFAULT 'recent'
)
RETURNS TABLE(
  id uuid, user_id uuid, author_name text, author_email text, is_admin boolean,
  course_id uuid, course_title text, course_slug text,
  lesson_id uuid, lesson_title text,
  category text,
  title text, body text, created_at timestamptz,
  reply_count bigint
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
  SELECT feed.id, feed.user_id, feed.author_name, feed.author_email, feed.is_admin,
         feed.course_id, feed.course_title, feed.course_slug,
         feed.lesson_id, feed.lesson_title,
         feed.category, feed.title, feed.body, feed.created_at, feed.reply_count
  FROM (
    SELECT
      c.id, c.user_id, p.name AS author_name,
      CASE WHEN caller_is_admin THEN p.email ELSE NULL END AS author_email,
      has_role(c.user_id, 'admin'::app_role) AS is_admin,
      c.course_id, co.title AS course_title, co.slug AS course_slug,
      c.lesson_id, l.title AS lesson_title,
      c.category, c.title, c.body, c.created_at,
      (SELECT count(*) FROM public.course_comments r WHERE r.parent_id = c.id) AS reply_count
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
    CASE WHEN _sort = 'relevant' THEN feed.reply_count END DESC NULLS LAST,
    feed.created_at DESC
  LIMIT _limit OFFSET _offset;
END;
$$;

-- ── 1c) community_replies: mesmo tratamento.
CREATE OR REPLACE FUNCTION public.community_replies(_parent_id uuid)
RETURNS TABLE(id uuid, user_id uuid, author_name text, author_email text, is_admin boolean, body text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.user_id, p.name,
         CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN p.email ELSE NULL END,
         has_role(c.user_id, 'admin'::app_role), c.body, c.created_at
  FROM public.course_comments c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE c.parent_id = _parent_id
    AND (is_member() OR has_role(auth.uid(), 'admin'::app_role))
  ORDER BY c.created_at ASC;
$$;

-- ── 1d) nova RPC pro CommunityTab (comentários por curso) — substitui a
-- query direta que fazia `.select('..., profiles(name, email))')`, que
-- dependia da policy ampla removida acima.
CREATE OR REPLACE FUNCTION public.course_comments_feed(_course_id uuid)
RETURNS TABLE(id uuid, user_id uuid, author_name text, author_email text, is_admin boolean, body text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.user_id, p.name,
         CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN p.email ELSE NULL END,
         has_role(c.user_id, 'admin'::app_role), c.body, c.created_at
  FROM public.course_comments c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE c.course_id = _course_id
    AND (is_member() OR has_role(auth.uid(), 'admin'::app_role))
  ORDER BY c.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.course_comments_feed(uuid) TO anon, authenticated;

-- ── 2) delete: autor só apaga o próprio comentário se ainda não tiver
-- resposta nenhuma; depois disso, só admin.
DROP POLICY IF EXISTS "Users and admins can delete comments" ON public.course_comments;

CREATE POLICY "Users can delete own comments without replies; admins any"
ON public.course_comments
FOR DELETE
USING (
  (auth.uid() = user_id AND NOT EXISTS (
    SELECT 1 FROM public.course_comments r WHERE r.parent_id = course_comments.id
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);
