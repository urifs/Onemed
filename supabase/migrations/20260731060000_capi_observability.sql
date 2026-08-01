-- ═══════════════════════════════════════════════════════════════════════════
-- Meta Conversions API: tornar o envio observável e melhorar a correspondência
--
-- Motivo: a auditoria do pixel 797374160058274 encontrou ~11 eventos Purchase
-- para 44 pagamentos aprovados no Mercado Pago em 7 dias, e o Purchase chegava
-- SEM as chaves de email/telefone que o mp-webhook diz enviar (EMQ 6.1, contra
-- 8.7 do Lead). Ou seja: a CAPI não estava entregando. Não deu pra confirmar a
-- causa porque o resultado da chamada só ia para `console.error` e a retenção
-- de log do projeto é de minutos.
--
-- Aqui o envio passa a deixar rastro permanente, e o payload ganha as duas
-- chaves de correspondência que faltavam (IP e user-agent do comprador, que
-- precisam ser capturados no checkout — no webhook o IP é o do Mercado Pago,
-- não o do cliente).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── rastro de cada chamada à CAPI ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.capi_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name   TEXT NOT NULL,
  event_id     TEXT,
  pixel_id     TEXT NOT NULL,
  buyer_id     UUID REFERENCES public.buyers(id) ON DELETE SET NULL,
  email        TEXT,
  value        NUMERIC,
  success      BOOLEAN NOT NULL DEFAULT FALSE,
  http_status  INTEGER,
  -- quantos eventos a Meta confirmou ter recebido (campo events_received)
  events_received INTEGER,
  -- chaves de correspondência enviadas, para auditar EMQ sem guardar PII
  match_keys   TEXT[],
  error        TEXT,
  attempt      INTEGER NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capi_events_created ON public.capi_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capi_events_failed  ON public.capi_events(created_at DESC) WHERE success = FALSE;
CREATE INDEX IF NOT EXISTS idx_capi_events_buyer   ON public.capi_events(buyer_id);

ALTER TABLE public.capi_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read capi_events" ON public.capi_events;
CREATE POLICY "Admins read capi_events" ON public.capi_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ── chaves de correspondência capturadas no checkout ────────────────────────
-- O webhook do Mercado Pago chega de um servidor do MP: o `x-forwarded-for`
-- lá é do MP, não do comprador. Para a CAPI valer, IP e user-agent têm que ser
-- os do navegador que iniciou a compra — capturados no mp-create-payment.
ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS client_ip TEXT,
  ADD COLUMN IF NOT EXISTS client_user_agent TEXT;

-- ── painel: saúde do envio para a Meta ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_capi_health(_days INTEGER DEFAULT 7)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Admin logado no painel OU a própria Edge Function de saúde (service role,
  -- que não tem auth.uid()). Mesmo critério do relatório da biblioteca.
  SELECT CASE WHEN public.can_read_library_audit() THEN jsonb_build_object(
    'periodo_dias', _days,
    -- Compras aprovadas de verdade, com pagamento no Mercado Pago
    'vendas_aprovadas', (
      SELECT count(*) FROM public.buyers
       WHERE status = 'approved' AND payment_id IS NOT NULL
         AND updated_at > now() - (_days || ' days')::interval),
    -- Compras distintas para as quais a CAPI confirmou entrega
    'capi_enviadas_ok', (
      SELECT count(DISTINCT event_id) FROM public.capi_events
       WHERE success AND event_name = 'Purchase'
         AND created_at > now() - (_days || ' days')::interval),
    'capi_falhas', (
      SELECT count(*) FROM public.capi_events
       WHERE NOT success AND created_at > now() - (_days || ' days')::interval),
    'ultimo_erro', (
      SELECT jsonb_build_object('quando', created_at, 'pixel', pixel_id, 'status', http_status, 'erro', error)
        FROM public.capi_events WHERE NOT success ORDER BY created_at DESC LIMIT 1),
    -- Cobertura das chaves de correspondência nas compras do período
    'cobertura', (
      SELECT jsonb_build_object(
        'com_fbp',        count(*) FILTER (WHERE fbp IS NOT NULL),
        'com_fbc',        count(*) FILTER (WHERE fbc IS NOT NULL),
        'com_fbclid',     count(*) FILTER (WHERE fbclid IS NOT NULL),
        'com_ip',         count(*) FILTER (WHERE client_ip IS NOT NULL),
        'com_user_agent', count(*) FILTER (WHERE client_user_agent IS NOT NULL),
        'total',          count(*))
        FROM public.buyers
       WHERE status = 'approved' AND payment_id IS NOT NULL
         AND updated_at > now() - (_days || ' days')::interval)
  ) ELSE NULL END;
$$;

GRANT EXECUTE ON FUNCTION public.get_capi_health(INTEGER) TO authenticated, service_role;
