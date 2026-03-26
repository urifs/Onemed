-- Cron job: revogar acessos trial expirados a cada 5 minutos
SELECT cron.schedule(
  'drive-revoke-access',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jrrybiohwqabsdurqudc.supabase.co/functions/v1/drive-revoke-access',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpycnliaW9od3FhYnNkdXJxdWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzg4ODUsImV4cCI6MjA4OTk1NDg4NX0.oF47pCwHgD5M2DBZ37h-T8ISDGuVxUYlzXoeofvpBCs"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Cron job: enviar emails de follow-up diariamente às 10h (horário de Brasília = 13h UTC)
SELECT cron.schedule(
  'send-followup-emails',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jrrybiohwqabsdurqudc.supabase.co/functions/v1/send-followup-emails',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpycnliaW9od3FhYnNkdXJxdWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzg4ODUsImV4cCI6MjA4OTk1NDg4NX0.oF47pCwHgD5M2DBZ37h-T8ISDGuVxUYlzXoeofvpBCs"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
