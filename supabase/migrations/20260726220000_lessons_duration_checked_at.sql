-- Algumas aulas ficam com duration_seconds nulo pra sempre: o Google Drive só
-- preenche videoMediaMetadata.durationMillis depois de processar o vídeo
-- internamente, o que pode não ter terminado no momento exato da sincronização
-- (member-sync-library). Sem essa coluna, uma função de backfill que varre
-- "duration_seconds is null" reprocessaria pra sempre os arquivos em que o
-- Drive simplesmente nunca tem essa metadata — precisa de um jeito de marcar
-- "já tentei, mesmo sem sucesso" pra não girar em loop infinito.
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS duration_checked_at timestamptz;
