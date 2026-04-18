-- Corrige nome do secret usado pelos cron jobs.
--
-- Problema: os jobs no DB estavam consultando `WHERE name = 'cron_secret'`
-- (minúsculo, valor antigo do vault), enquanto as Edge Functions validam
-- contra `Deno.env.get('CRON_SECRET')` (maiúsculo, valor novo). Resultado:
-- todas as chamadas de cron retornavam 401 Unauthorized, o que impedia a
-- revogação automática dos trials expirados no Google Drive.
--
-- Este arquivo re-agenda os jobs sempre referenciando `name = 'CRON_SECRET'`.

SELECT cron.unschedule('drive-revoke-access');
SELECT cron.unschedule('send-followup-emails');

SELECT cron.schedule(
  'drive-revoke-access',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jrrybiohwqabsdurqudc.supabase.co/functions/v1/drive-revoke-access',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1),
        ''
      )
    )::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'send-followup-emails',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jrrybiohwqabsdurqudc.supabase.co/functions/v1/send-followup-emails',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1),
        ''
      )
    )::jsonb,
    body := '{}'::jsonb
  );
  $$
);
