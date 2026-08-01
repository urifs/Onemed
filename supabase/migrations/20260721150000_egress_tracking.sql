-- Rastreamento de egress por dia — a API de gerenciamento da Supabase não
-- expõe os números de "Auth/PostgREST/Functions Egress" que aparecem no
-- dashboard deles (isso vem de um endpoint interno do Studio, não do
-- Management API público). Os dados já confirmaram que Functions Egress é
-- praticamente 100% do consumo real (a única camada que baixa bytes de
-- arquivo de verdade) — este log rastreia isso diretamente nas Edge
-- Functions que efetivamente transmitem bytes grandes (member-stream-file,
-- admin-database-backup), uma linha por dia por origem (upsert, não uma
-- linha por request, pra não crescer sem limite).
CREATE TABLE IF NOT EXISTS public.egress_daily (
  day date NOT NULL,
  source text NOT NULL,
  bytes bigint NOT NULL DEFAULT 0,
  requests integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, source)
);

ALTER TABLE public.egress_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver egress_daily"
  ON public.egress_daily FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Chamada pelas próprias Edge Functions via service role (bypassa RLS) toda
-- vez que servem uma resposta com bytes reais — soma no total do dia.
CREATE OR REPLACE FUNCTION public.record_egress(_source text, _bytes bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.egress_daily (day, source, bytes, requests)
  VALUES (CURRENT_DATE, _source, GREATEST(_bytes, 0), 1)
  ON CONFLICT (day, source)
  DO UPDATE SET bytes = egress_daily.bytes + GREATEST(_bytes, 0), requests = egress_daily.requests + 1;
END;
$$;
