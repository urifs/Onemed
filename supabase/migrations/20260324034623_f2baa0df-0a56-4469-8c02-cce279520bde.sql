CREATE TABLE public.email_followups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  type text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (email, type)
);

ALTER TABLE public.email_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email followups"
  ON public.email_followups FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));