-- Backup exclusivo no Google Drive do aluno (planos Vitalício Plus/Pro):
-- pasta separada da usada pro streaming das aulas, compartilhada por
-- drive-share-folder com folderType: 'backup'.
ALTER TABLE public.drive_config
  ADD COLUMN IF NOT EXISTS backup_folder_id TEXT,
  ADD COLUMN IF NOT EXISTS backup_folder_name TEXT;

ALTER TABLE public.accesses
  ADD COLUMN IF NOT EXISTS drive_backup_permission_id TEXT;
