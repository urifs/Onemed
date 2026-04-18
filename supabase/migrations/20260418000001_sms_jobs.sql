-- sms_jobs: tracks background SMS dispatch jobs
CREATE TABLE IF NOT EXISTS public.sms_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'running', 'completed', 'failed', 'cancelled')),
  audience text,
  message text NOT NULL,
  delay_ms integer NOT NULL DEFAULT 1000,
  recipient_phones jsonb NOT NULL DEFAULT '[]',
  processed_index integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  sent integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.sms_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on sms_jobs"
  ON public.sms_jobs FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_sms_jobs_status_created
  ON public.sms_jobs (status, created_at)
  WHERE status IN ('scheduled', 'running');

-- FULL identity so UPDATE filters work in Realtime
ALTER TABLE public.sms_jobs REPLICA IDENTITY FULL;

-- sms_sends: individual send results (created outside migrations, so use CREATE TABLE IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.sms_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  email text,
  status text NOT NULL DEFAULT 'sent',
  audience text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sms_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access on sms_sends" ON public.sms_sends;
CREATE POLICY "Admin full access on sms_sends"
  ON public.sms_sends FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

ALTER TABLE public.sms_sends ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.sms_jobs(id);
ALTER TABLE public.sms_sends ADD COLUMN IF NOT EXISTS error_message text;

CREATE INDEX IF NOT EXISTS idx_sms_sends_job_id ON public.sms_sends (job_id);

-- Enable Realtime on both tables
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_jobs;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_sends;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- pg_cron: process SMS jobs every minute
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('run-sms-job');
  EXCEPTION WHEN others THEN NULL;
  END;

  PERFORM cron.schedule(
    'run-sms-job',
    '* * * * *',
    $$
    SELECT net.http_post(
      url := 'https://jrrybiohwqabsdurqudc.supabase.co/functions/v1/run-sms-job',
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
END $$;
