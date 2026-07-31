-- Pasta de destino dentro da conta de armazenamento.
--
-- Sem isso as cópias cairiam na raiz do Drive da conta, misturadas com o que
-- o dono já tem lá. Com a pasta definida, tudo que a plataforma copia fica
-- num lugar só — e dá para conferir e limpar sem caçar arquivo por arquivo.
ALTER TABLE public.drive_storage_accounts
  ADD COLUMN IF NOT EXISTS folder_id   TEXT,
  ADD COLUMN IF NOT EXISTS folder_name TEXT;
