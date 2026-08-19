-- Campanha de e-mail presa em 'running' para sempre
--
-- O disparo processa a lista em lotes: a cada rodada a campanha vai para
-- 'running', manda o lote e volta para 'scheduled' até acabar. Se a função
-- morre no meio de um lote (timeout de 150s, queda do Resend, deploy no meio
-- do caminho), a linha fica em 'running' e NUNCA MAIS é retomada — o seletor
-- do cron só procura 'scheduled'. Na prática: metade dos alunos recebe o
-- e-mail, a outra metade não, e nada na tela diz que parou.
--
-- `updated_at` dá ao seletor como distinguir "está sendo processada agora" de
-- "morreu no meio": running parada há mais de 10 minutos volta para a fila.
ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Toda escrita carimba o horário, sem depender de a função lembrar de fazê-lo.
CREATE OR REPLACE FUNCTION public.touch_email_campaign_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_campaigns_touch_updated_at ON public.email_campaigns;
CREATE TRIGGER email_campaigns_touch_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_email_campaign_updated_at();

-- Campanhas que já estavam presas antes desta migration entram na janela de
-- recuperação na próxima rodada do cron.
UPDATE public.email_campaigns
   SET updated_at = now() - interval '11 minutes'
 WHERE status = 'running';
