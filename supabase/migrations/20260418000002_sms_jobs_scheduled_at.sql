ALTER TABLE public.sms_jobs ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_sms_jobs_scheduled
  ON public.sms_jobs (scheduled_at, status)
  WHERE status = 'scheduled';
