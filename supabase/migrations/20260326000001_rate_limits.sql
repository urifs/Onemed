-- Tabela para rate limiting nas Edge Functions
CREATE TABLE IF NOT EXISTS public.rate_limits (
  identifier text NOT NULL,
  action      text NOT NULL,
  attempts    integer DEFAULT 1 NOT NULL,
  window_start timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (identifier, action)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Apenas service role acessa — sem políticas públicas
