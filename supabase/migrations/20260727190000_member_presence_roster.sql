-- Base pro quadro de "quem está online" do dashboard admin: um roster dos
-- membros mais recentemente ativos (por sessão de auth), sem filtro de
-- janela de tempo (diferente de get_online_members, que só devolve quem
-- está dentro da janela) — o frontend decide "online agora" cruzando isso
-- com o canal de presença em tempo real (Supabase Realtime Presence),
-- e mostra "online há X" pra quem não está mais no canal.
CREATE OR REPLACE FUNCTION public.get_member_presence_roster(_limit integer DEFAULT 50)
RETURNS TABLE(user_id uuid, email text, last_active timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::text, max(s.updated_at) AS last_active
  FROM auth.sessions s
  JOIN auth.users u ON u.id = s.user_id
  GROUP BY u.id, u.email
  ORDER BY last_active DESC
  LIMIT _limit;
END;
$$;
