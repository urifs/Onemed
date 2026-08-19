-- Sincronização AUTOMÁTICA e diária da biblioteca
--
-- Até aqui a biblioteca só era varrida quando alguém abria /admin/drive e
-- clicava em "Sincronizar biblioteca" — e o laço da varredura vivia na ABA do
-- navegador. Curso novo no Drive só aparecia na plataforma (e, por tabela, na
-- landing, que lê o mesmo catálogo) quando alguém lembrava de fazer isso.
--
-- Agora quem conduz é o cron. O estado NÃO pode viver no cursor HTTP (foi
-- exatamente esse erro que a fila durável de 31/07 corrigiu): cada invocação
-- da Edge Function tem orçamento de ~40s, então uma varredura completa são
-- várias invocações e a posição precisa sobreviver entre elas.
--
-- Esta tabela é essa posição. Uma linha só (a PK booleana com CHECK garante
-- isso no banco, não na confiança de quem escreve).
CREATE TABLE IF NOT EXISTS public.library_sync_state (
  id             boolean PRIMARY KEY DEFAULT true CHECK (id),
  -- 'idle' = nada rodando · 'running' = varredura em andamento
  status         text NOT NULL DEFAULT 'idle',
  -- Cursor do member-sync-library ({stage:'discover'|'crawl', topPageToken}).
  cursor         jsonb,
  started_at     timestamptz,
  finished_at    timestamptz,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  last_error     text,
  -- Acumulados DA RODADA em curso (zerados a cada início).
  slices         integer NOT NULL DEFAULT 0,
  courses_created  integer NOT NULL DEFAULT 0,
  courses_resynced integer NOT NULL DEFAULT 0,
  lessons_imported integer NOT NULL DEFAULT 0,
  folders_crawled  integer NOT NULL DEFAULT 0,
  -- Resultado da ÚLTIMA rodada concluída, preservado enquanto a próxima roda.
  last_result    jsonb
);

INSERT INTO public.library_sync_state (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.library_sync_state ENABLE ROW LEVEL SECURITY;

-- Leitura para quem opera o painel; escrita SÓ pela Edge Function (service
-- role, que ignora RLS). Sem política de escrita, ninguém mais grava.
DROP POLICY IF EXISTS "Painel le o estado da sincronizacao" ON public.library_sync_state;
CREATE POLICY "Painel le o estado da sincronizacao"
  ON public.library_sync_state FOR SELECT TO authenticated
  USING ((SELECT has_role(auth.uid(), 'admin'::app_role))
      OR (SELECT has_role(auth.uid(), 'viewer'::app_role)));

-- Resumo para o card do painel: o estado da varredura + o tamanho atual do
-- catálogo, numa ida só ao banco.
CREATE OR REPLACE FUNCTION public.library_sync_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (SELECT has_role(auth.uid(), 'admin'::app_role))
      OR (SELECT has_role(auth.uid(), 'viewer'::app_role))
    THEN jsonb_build_object(
      'state', (SELECT to_jsonb(s) FROM public.library_sync_state s WHERE s.id),
      'courses_active', (SELECT count(*) FROM public.courses WHERE active),
      'courses_total',  (SELECT count(*) FROM public.courses),
      'queue_pending',  (SELECT count(*) FROM public.sync_folder_queue WHERE state = 'pending'),
      'queue_error',    (SELECT count(*) FROM public.sync_folder_queue WHERE state = 'error')
    )
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.library_sync_status() FROM PUBLIC;
-- O ALTER DEFAULT PRIVILEGES do projeto concede EXECUTE a anon assim que a
-- função nasce, e o REVOKE de PUBLIC não alcança isso.
REVOKE EXECUTE ON FUNCTION public.library_sync_status() FROM anon;
GRANT EXECUTE ON FUNCTION public.library_sync_status() TO authenticated;

-- ── Cron ─────────────────────────────────────────────────────────────────────
-- A cada 2 minutos. A esmagadora maioria dos disparos é um no-op de UM SELECT:
-- a própria função decide se é hora de começar a rodada do dia. Frequência alta
-- é o que faz a rodada (várias fatias de 40s) FECHAR em ~20 min em vez de se
-- arrastar pelo dia — e é o que recupera sozinho uma rodada interrompida.
SELECT cron.unschedule('library-auto-sync')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'library-auto-sync');

SELECT cron.schedule(
  'library-auto-sync',
  '*/2 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://jrrybiohwqabsdurqudc.supabase.co/functions/v1/member-sync-library',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1), '')
    )::jsonb,
    body := '{"auto":true}'::jsonb
  );
  $cron$
);
