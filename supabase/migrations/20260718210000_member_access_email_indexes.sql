-- is_member() runs on every courses/lesson_progress/course_comments SELECT
-- and does two sequential scans by email (accesses: 2200+ rows and growing
-- with every trial signup; buyers: 750+) because neither table had an index
-- on email. Add them so the RLS check stays cheap as both tables grow.
CREATE INDEX IF NOT EXISTS idx_accesses_email_status ON public.accesses (email, status);
CREATE INDEX IF NOT EXISTS idx_buyers_email_access_granted ON public.buyers (email, access_granted);
