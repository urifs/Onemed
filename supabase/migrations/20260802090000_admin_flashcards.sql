-- Visão ADMIN dos flashcards: quem está usando, o que foi gerado e o
-- desempenho de cada aluno.
--
-- As tabelas continuam com RLS de dono (o aluno só enxerga o que é dele, e
-- select direto de admin segue bloqueado) — a leitura administrativa passa
-- por estas RPCs SECURITY DEFINER com portão explícito de role, o mesmo
-- desenho de get_store_orders/get_member_locations_map.

-- Uma linha por aluno que já gerou/estudou flashcards, com os agregados.
CREATE OR REPLACE FUNCTION public.admin_flashcard_overview()
RETURNS TABLE(
  user_id        uuid,
  email          text,
  name           text,
  decks          bigint,
  sessions       bigint,
  cards_answered bigint,
  cards_correct  bigint,
  last_activity  timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH donos AS (
    SELECT d.user_id AS uid FROM public.flashcard_decks d
    UNION
    SELECT s.user_id FROM public.flashcard_sessions s
  )
  SELECT
    donos.uid,
    u.email::text,
    p.name,
    (SELECT count(*) FROM public.flashcard_decks d WHERE d.user_id = donos.uid),
    (SELECT count(*) FROM public.flashcard_sessions s WHERE s.user_id = donos.uid),
    COALESCE((SELECT sum(s.total_cards) FROM public.flashcard_sessions s WHERE s.user_id = donos.uid), 0),
    COALESCE((SELECT sum(s.correct_first_try) FROM public.flashcard_sessions s WHERE s.user_id = donos.uid), 0),
    GREATEST(
      (SELECT max(d.created_at) FROM public.flashcard_decks d WHERE d.user_id = donos.uid),
      (SELECT max(s.created_at) FROM public.flashcard_sessions s WHERE s.user_id = donos.uid)
    )
  FROM donos
  JOIN auth.users u ON u.id = donos.uid
  LEFT JOIN public.profiles p ON p.user_id = donos.uid
  ORDER BY 8 DESC NULLS LAST;
END;
$$;

-- Baralhos de um aluno (ou de todos, sem filtro), cada um com as próprias
-- estatísticas de estudo.
CREATE OR REPLACE FUNCTION public.admin_flashcard_decks(_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  id             uuid,
  user_id        uuid,
  email          text,
  title          text,
  difficulty     text,
  card_count     integer,
  is_mcq         boolean,
  source         jsonb,
  created_at     timestamptz,
  sessions       bigint,
  cards_answered bigint,
  cards_correct  bigint,
  last_studied   timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    d.id, d.user_id, u.email::text, d.title, d.difficulty,
    jsonb_array_length(d.cards)::integer,
    (d.cards -> 0) ? 'options',
    d.source, d.created_at,
    (SELECT count(*) FROM public.flashcard_sessions s WHERE s.deck_id = d.id),
    COALESCE((SELECT sum(s.total_cards) FROM public.flashcard_sessions s WHERE s.deck_id = d.id), 0),
    COALESCE((SELECT sum(s.correct_first_try) FROM public.flashcard_sessions s WHERE s.deck_id = d.id), 0),
    (SELECT max(s.created_at) FROM public.flashcard_sessions s WHERE s.deck_id = d.id)
  FROM public.flashcard_decks d
  JOIN auth.users u ON u.id = d.user_id
  WHERE (_user_id IS NULL OR d.user_id = _user_id)
  ORDER BY d.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_flashcard_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_flashcard_decks(uuid) TO authenticated;
