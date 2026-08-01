-- O link direto do Google Drive pro navegador (permissão temporária "qualquer
-- um com o link") foi abandonado: o Drive manda Cross-Origin-Resource-Policy:
-- same-site em toda resposta de download, e o navegador bloqueia o
-- carregamento cross-site independente de CORS — não tem como contornar isso
-- do nosso lado. Substituído por um proxy same-origin na Vercel
-- (api/stream-lesson), que não precisa mais conceder nenhuma permissão pública
-- no Drive.
DROP TABLE IF EXISTS public.direct_link_grants;
