-- Visão ADMIN dos bancos de questões — espelho exato do desenho de
-- admin_flashcard_overview/admin_flashcard_decks: as tabelas continuam com RLS
-- de dono, e a leitura administrativa passa por RPCs SECURITY DEFINER com
-- portão explícito de role.

-- Uma linha por aluno que já gerou/respondeu bancos de questões.
CREATE OR REPLACE FUNCTION public.admin_question_banks_overview()
RETURNS TABLE(
  user_id            uuid,
  email              text,
  name               text,
  banks              bigint,
  sessions           bigint,
  questions_answered bigint,
  questions_correct  bigint,
  last_activity      timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH donos AS (
    SELECT b.user_id AS uid FROM public.question_banks b
    UNION
    SELECT s.user_id FROM public.question_sessions s
  )
  SELECT
    donos.uid,
    u.email::text,
    p.name,
    (SELECT count(*) FROM public.question_banks b WHERE b.user_id = donos.uid),
    (SELECT count(*) FROM public.question_sessions s WHERE s.user_id = donos.uid),
    COALESCE((SELECT sum(s.total_questions) FROM public.question_sessions s WHERE s.user_id = donos.uid), 0),
    COALESCE((SELECT sum(s.correct) FROM public.question_sessions s WHERE s.user_id = donos.uid), 0),
    GREATEST(
      (SELECT max(b.created_at) FROM public.question_banks b WHERE b.user_id = donos.uid),
      (SELECT max(s.created_at) FROM public.question_sessions s WHERE s.user_id = donos.uid)
    )
  FROM donos
  JOIN auth.users u ON u.id = donos.uid
  LEFT JOIN public.profiles p ON p.user_id = donos.uid
  ORDER BY 8 DESC NULLS LAST;
END;
$$;

-- Bancos de um aluno (ou de todos, sem filtro), cada um com as próprias
-- estatísticas de prova.
CREATE OR REPLACE FUNCTION public.admin_question_banks(_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  id                 uuid,
  user_id            uuid,
  email              text,
  title              text,
  difficulty         text,
  question_count     integer,
  source             jsonb,
  created_at         timestamptz,
  sessions           bigint,
  questions_answered bigint,
  questions_correct  bigint,
  last_studied       timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    b.id, b.user_id, u.email::text, b.title, b.difficulty,
    jsonb_array_length(b.questions)::integer,
    b.source, b.created_at,
    (SELECT count(*) FROM public.question_sessions s WHERE s.bank_id = b.id),
    COALESCE((SELECT sum(s.total_questions) FROM public.question_sessions s WHERE s.bank_id = b.id), 0),
    COALESCE((SELECT sum(s.correct) FROM public.question_sessions s WHERE s.bank_id = b.id), 0),
    (SELECT max(s.created_at) FROM public.question_sessions s WHERE s.bank_id = b.id)
  FROM public.question_banks b
  JOIN auth.users u ON u.id = b.user_id
  WHERE (_user_id IS NULL OR b.user_id = _user_id)
  ORDER BY b.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_question_banks_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_question_banks(uuid) TO authenticated;
