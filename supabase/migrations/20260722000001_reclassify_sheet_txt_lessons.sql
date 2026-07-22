-- lessons.type nunca discriminava planilha/txt do resto — tudo que não era
-- vídeo/pdf/doc/áudio/imagem caía em 'other' (só link "abrir em nova aba",
-- sem visualização nativa). Corrige pros arquivos já sincronizados; ver
-- member-sync-library (lessonType()) pra classificação de novos arquivos.
UPDATE public.lessons
SET type = 'sheet'
WHERE type = 'other'
  AND (
    mime_type ILIKE '%spreadsheet%'
    OR mime_type = 'application/vnd.ms-excel'
  );

UPDATE public.lessons
SET type = 'txt'
WHERE type = 'other'
  AND mime_type = 'text/plain';
