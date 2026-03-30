-- Tabela de campanhas de email agendadas
CREATE TABLE IF NOT EXISTS email_campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('followup', 'custom')),
  template_data jsonb NOT NULL DEFAULT '{}',
  recipient_type text NOT NULL CHECK (recipient_type IN ('trials', 'buyers', 'both')),
  recipient_emails jsonb NOT NULL DEFAULT '[]',
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'running', 'completed', 'failed', 'cancelled')),
  processed_index int NOT NULL DEFAULT 0,
  total_count int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- RLS
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on email_campaigns"
  ON email_campaigns FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Índice para o cron buscar campanhas pendentes rapidamente
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status_scheduled
  ON email_campaigns (status, scheduled_at)
  WHERE status IN ('scheduled', 'running');

-- Cron job: roda a cada minuto para processar campanhas agendadas
SELECT cron.schedule(
  'run-email-campaign',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jrrybiohwqabsdurqudc.supabase.co/functions/v1/run-email-campaign',
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
