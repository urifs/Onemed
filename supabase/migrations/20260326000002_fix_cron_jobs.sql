-- Remover cron jobs com token JWT hardcoded
SELECT cron.unschedule('drive-revoke-access');
SELECT cron.unschedule('send-followup-emails');

-- Recriar cron jobs usando CRON_SECRET via vault (sem token hardcoded)
-- Pré-requisito: adicionar o secret 'CRON_SECRET' no Supabase Vault
--   Dashboard → Settings → Vault → New Secret → name: CRON_SECRET
--   E também adicionar em: Dashboard → Edge Functions → Secrets → CRON_SECRET

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
