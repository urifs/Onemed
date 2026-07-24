-- Create sync_jobs table to track background sync progress
CREATE TABLE IF NOT EXISTS public.sync_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'running',
    cancel_requested BOOLEAN DEFAULT false,
    progress JSONB DEFAULT '{}'::jsonb,
    logs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users (or admins)
-- Assuming admin has role 'admin' or just authenticated user can see
CREATE POLICY "Admins can manage sync_jobs"
ON public.sync_jobs
FOR ALL
TO authenticated
USING (
  is_admin(auth.uid()) OR has_role(auth.uid(), 'admin')
)
WITH CHECK (
  is_admin(auth.uid()) OR has_role(auth.uid(), 'admin')
);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_jobs;
