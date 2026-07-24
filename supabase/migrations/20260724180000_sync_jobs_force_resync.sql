-- O checkbox "Reimportar tudo" só existe como estado local do React — se a
-- página recarrega (ex: job travou e virou "interrompido"), o valor volta
-- pro padrão (desmarcado) e "Retomar" silenciosamente troca de reimportação
-- completa pra sincronização incremental, sem o admin perceber. Persiste
-- essa escolha no próprio job pra "Retomar" sempre continuar no modo que
-- o job foi de fato iniciado.
ALTER TABLE public.sync_jobs ADD COLUMN IF NOT EXISTS force_resync boolean NOT NULL DEFAULT false;
