-- Vigília da credencial do Google
--
-- Em 19/08/2026 a autorização das duas contas do Google foi revogada e a
-- plataforma ficou sem NENHUM vídeo. Ninguém soube até um cliente reclamar:
-- não existia nada olhando a credencial, e o `drive-access-token` respondia
-- 200 com um token que o Google já tinha invalidado (ele só comparava a
-- validade com o relógio).
--
-- Esta tabela guarda o resultado da sonda horária, que testa o token CONTRA O
-- GOOGLE. `last_ok_at` é o que responde a pergunta que importa no meio de um
-- incidente: "desde quando está fora?".
CREATE TABLE IF NOT EXISTS public.drive_health (
  account    text PRIMARY KEY,
  label      text,
  healthy    boolean NOT NULL DEFAULT false,
  email      text,
  error      text,
  checked_at timestamptz,
  last_ok_at timestamptz
);

ALTER TABLE public.drive_health ENABLE ROW LEVEL SECURITY;

-- Leitura para quem opera o painel; escrita só pela Edge Function (service
-- role, que ignora RLS).
DROP POLICY IF EXISTS "Painel le a saude do Drive" ON public.drive_health;
CREATE POLICY "Painel le a saude do Drive"
  ON public.drive_health FOR SELECT TO authenticated
  USING ((SELECT has_role(auth.uid(), 'admin'::app_role))
      OR (SELECT has_role(auth.uid(), 'viewer'::app_role)));

CREATE OR REPLACE FUNCTION public.drive_health_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (SELECT has_role(auth.uid(), 'admin'::app_role))
      OR (SELECT has_role(auth.uid(), 'viewer'::app_role))
    THEN COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.account) FROM public.drive_health d), '[]'::jsonb)
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.drive_health_status() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.drive_health_status() FROM anon;
GRANT EXECUTE ON FUNCTION public.drive_health_status() TO authenticated;

-- De hora em hora. É uma chamada `about?fields=user` por conta — não lê
-- arquivo e não consome a franquia de download de nada.
SELECT cron.unschedule('drive-health-check')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'drive-health-check');

SELECT cron.schedule(
  'drive-health-check',
  '7 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://jrrybiohwqabsdurqudc.supabase.co/functions/v1/drive-health-check',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1), '')
    )::jsonb,
    body := '{}'::jsonb
  );
  $cron$
);
