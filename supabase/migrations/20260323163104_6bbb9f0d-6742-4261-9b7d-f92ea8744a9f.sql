
-- Fix overly permissive INSERT policies
-- visits: anyone can insert a visit (intentional for analytics)
-- accesses: restrict trial inserts - only status=active and type=trial
DROP POLICY IF EXISTS "Public can insert trial access" ON public.accesses;
CREATE POLICY "Public can insert trial access" ON public.accesses
  FOR INSERT WITH CHECK (access_type = 'trial' AND status = 'active');

-- buyers: restrict to only non-admin fields (no access_granted manipulation)
DROP POLICY IF EXISTS "Public can insert buyers" ON public.buyers;
CREATE POLICY "Public can insert buyers" ON public.buyers
  FOR INSERT WITH CHECK (access_granted = FALSE AND email_sent = FALSE);
