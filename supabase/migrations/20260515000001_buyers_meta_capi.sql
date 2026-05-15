-- Add Meta CAPI browser/click ID columns to buyers table for server-side attribution
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS fbp TEXT;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS fbc TEXT;
