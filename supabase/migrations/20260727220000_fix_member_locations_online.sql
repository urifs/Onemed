-- get_member_locations_map calculava "online" a partir de auth.sessions.updated_at
-- (janela de 5min) — mas o refresh do token de sessão só bate essa coluna
-- perto da expiração (até ~1h), não a cada atividade real. Resultado: a
-- imensa maioria de quem estava genuinamente online (visto pelo canal de
-- presença em tempo real, usado no card "Quem está online") aparecia como
-- offline no mapa. Simplificado: a função agora só devolve candidatos
-- (localização + trial-ou-assinante + "última vez visto"), sem tentar
-- decidir online/offline sozinha — o frontend decide isso cruzando com o
-- MESMO canal de presença em tempo real do card "Quem está online"
-- (useOnlineMembers), garantindo que os dois números sempre batam.
DROP FUNCTION IF EXISTS public.get_member_locations_map(integer);

CREATE OR REPLACE FUNCTION public.get_member_locations_map()
RETURNS TABLE(
  user_id uuid,
  email text,
  city text,
  region text,
  country text,
  country_code text,
  latitude double precision,
  longitude double precision,
  last_active timestamptz,
  is_trial boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH member_status AS (
    SELECT DISTINCT ON (a.email) a.email, a.access_type
    FROM public.accesses a
    WHERE a.status = 'active'
    ORDER BY a.email,
      CASE a.access_type
        WHEN 'lifetime_pro' THEN 5
        WHEN 'lifetime_plus' THEN 4
        WHEN 'lifetime' THEN 3
        WHEN 'annual' THEN 2
        WHEN 'monthly' THEN 2
        WHEN 'trial' THEN 1
        ELSE 0
      END DESC
  )
  SELECT
    ml.user_id, ml.email, ml.city, ml.region, ml.country, ml.country_code,
    ml.latitude, ml.longitude, ml.updated_at AS last_active,
    (COALESCE(ms.access_type, 'trial') = 'trial') AS is_trial
  FROM public.member_locations ml
  LEFT JOIN member_status ms ON ms.email = ml.email
  WHERE ml.latitude IS NOT NULL AND ml.longitude IS NOT NULL
    AND (
      COALESCE(ms.access_type, 'trial') <> 'trial'
      OR ml.updated_at > now() - interval '24 hours'
    )
  ORDER BY ml.updated_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_locations_map() TO authenticated;
