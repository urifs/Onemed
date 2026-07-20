-- Não há presença em tempo real (websocket) na plataforma, então "online
-- agora" é aproximado por sessões de auth.sessions com atividade recente —
-- toda vez que o token é renovado automaticamente (ou em um novo login),
-- updated_at é tocado. Uma janela de alguns minutos sem renovação é um
-- proxy razoável de "com a aba aberta agora".
CREATE OR REPLACE FUNCTION public.get_online_members(_minutes integer DEFAULT 10)
RETURNS TABLE(email text, last_active timestamptz, session_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT u.email::text, max(s.updated_at) AS last_active, count(*) AS session_count
  FROM auth.sessions s
  JOIN auth.users u ON u.id = s.user_id
  WHERE s.updated_at > now() - (_minutes || ' minutes')::interval
  GROUP BY u.email
  ORDER BY last_active DESC;
END;
$$;
