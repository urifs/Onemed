-- ─────────────────────────────────────────────────────────────────────────────
-- Telas simultâneas EXTRAS (compradas além do limite do plano).
--
-- Cada tela extra custa R$ 117,98 e pode ser comprada de 1 a 10 por vez, tanto
-- como upsell no checkout quanto avulsa no perfil do assinante. O limite de
-- telas de uma conta passa a ser: limite_do_plano + telas_extras.
--
--   buyers.extra_screens        → quantas telas ESTA compra incluiu
--   member_screen_addons        → total ACUMULADO de telas extras por e-mail
--   add_screen_addon(email, n)  → soma n ao acumulado (chamada pelo mp-webhook)
--
-- O enforcement do limite continua em member-auth-request (finalizarLogin), que
-- passa a somar member_screen_addons ao limite do plano antes de chamar
-- enforce_session_limit.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS extra_screens integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.member_screen_addons (
  email         text PRIMARY KEY,
  extra_screens integer NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.member_screen_addons ENABLE ROW LEVEL SECURITY;
-- Admin/viewer leem no painel; escrita é exclusiva da service role (webhook).
DROP POLICY IF EXISTS "Admin le telas extras" ON public.member_screen_addons;
CREATE POLICY "Admin le telas extras" ON public.member_screen_addons
  FOR SELECT USING (
    (SELECT public.has_role(auth.uid(), 'admin'::public.app_role))
    OR (SELECT public.has_role(auth.uid(), 'viewer'::public.app_role))
  );

-- Soma n telas ao acumulado do e-mail (acumula: comprar 2 e depois 3 = 5).
-- Devolve o novo total. Chamada pelo mp-webhook (service role) ao aprovar.
CREATE OR REPLACE FUNCTION public.add_screen_addon(_email text, _n integer)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _total integer;
BEGIN
  IF _n IS NULL OR _n <= 0 THEN
    SELECT extra_screens INTO _total FROM public.member_screen_addons WHERE email = lower(_email);
    RETURN coalesce(_total, 0);
  END IF;
  INSERT INTO public.member_screen_addons (email, extra_screens, updated_at)
  VALUES (lower(_email), _n, now())
  ON CONFLICT (email) DO UPDATE
    SET extra_screens = public.member_screen_addons.extra_screens + excluded.extra_screens,
        updated_at = now()
  RETURNING extra_screens INTO _total;
  RETURN _total;
END $$;

REVOKE ALL ON FUNCTION public.add_screen_addon(text, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_screen_addon(text, integer) TO service_role;
