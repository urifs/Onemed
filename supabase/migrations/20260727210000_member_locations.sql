-- Localização aproximada (por IP) de cada membro, atualizada a cada login
-- bem-sucedido em member-auth-request/create-trial-access — base pro mapa
-- de usuários do dashboard admin.
CREATE TABLE public.member_locations (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  ip text,
  city text,
  region text,
  country text,
  country_code text,
  latitude double precision,
  longitude double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.member_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view member locations"
ON public.member_locations FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- get_member_locations_map: pontos pro mapa do dashboard admin.
--   "Online" (qualquer tipo de acesso, inclusive trial) = teve atividade de
--   sessão dentro da janela _online_minutes.
--   "Offline" só entra quando a conta tem plano pago ativo (nunca trial) —
--   trial que saiu do ar simplesmente some do mapa.
CREATE OR REPLACE FUNCTION public.get_member_locations_map(_online_minutes integer DEFAULT 5)
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
  is_online boolean,
  is_trial boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH sessions AS (
    SELECT s.user_id AS uid, max(s.updated_at) AS last_active
    FROM auth.sessions s
    GROUP BY s.user_id
  ),
  member_status AS (
    -- Maior tier entre as linhas ativas de accesses, por email — mesma
    -- lógica de resolução usada em member-account-info/member-auth-request,
    -- pra nunca decidir trial-vs-pagante com base "na primeira linha que a
    -- query retornar".
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
    ml.latitude, ml.longitude, sess.last_active,
    COALESCE(sess.last_active > now() - make_interval(mins => _online_minutes), false) AS is_online,
    (COALESCE(ms.access_type, 'trial') = 'trial') AS is_trial
  FROM public.member_locations ml
  LEFT JOIN sessions sess ON sess.uid = ml.user_id
  LEFT JOIN member_status ms ON ms.email = ml.email
  WHERE ml.latitude IS NOT NULL AND ml.longitude IS NOT NULL
    AND (
      COALESCE(sess.last_active > now() - make_interval(mins => _online_minutes), false)
      OR COALESCE(ms.access_type, 'trial') <> 'trial'
    )
  ORDER BY sess.last_active DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_locations_map(integer) TO authenticated;
