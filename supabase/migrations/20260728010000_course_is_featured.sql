-- Permite destacar um curso específico no carrossel giratório de destaque
-- de /membros, independente do lesson_count dele — o carrossel hoje só
-- pega os "flagship" (maiores por lesson_count) da categoria Extensivo &
-- Intensivo · Residência, o que deixa cursos novos/menores de fora mesmo
-- quando o admin quer promovê-los ativamente.
ALTER TABLE public.courses ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
