-- Sino de notificações visível também no TESTE GRÁTIS
--
-- A lista "Cursos em processo de atualização" mostra o que está entrando na
-- plataforma. Escondê-la de quem está no teste é o contrário do que o teste
-- serve: quem está decidindo assinar é justamente quem precisa ver que o
-- acervo é atualizado.
--
-- O aviso do painel (announcement_settings.message) CONTINUA fora do trial —
-- é recado operacional para quem já é assinante. Como o título do sino mora
-- na mesma tabela do aviso, a leitura dele passa por uma RPC que devolve só
-- esse campo, em vez de abrir a tabela inteira.

-- 1. Itens do sino: trial passa a ler.
DROP POLICY IF EXISTS "Membros leem notificacoes" ON public.notification_items;
CREATE POLICY "Membros leem notificacoes"
  ON public.notification_items FOR SELECT TO authenticated
  USING ((SELECT is_member()) OR (SELECT has_role(auth.uid(), 'admin'::app_role)));

-- 2. Título da seção, sem abrir o resto de announcement_settings.
--    SECURITY DEFINER passa por cima da RLS da tabela, então o gate é
--    explícito aqui: só quem está autenticado e é membro (trial incluído) ou
--    admin. Devolve só o texto do título — nunca a mensagem do aviso.
CREATE OR REPLACE FUNCTION public.notifications_heading()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (SELECT is_member()) OR (SELECT has_role(auth.uid(), 'admin'::app_role))
      THEN (SELECT notifications_heading FROM public.announcement_settings LIMIT 1)
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.notifications_heading() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notifications_heading() TO authenticated;

-- O GRANT padrão do projeto (ALTER DEFAULT PRIVILEGES) dá EXECUTE a `anon`
-- assim que a função nasce, e o REVOKE de PUBLIC acima não o alcança. Sem
-- isso, um visitante deslogado consegue CHAMAR a função — o corpo devolve
-- NULL para ele, então não havia vazamento, mas a porta não precisa existir.
REVOKE EXECUTE ON FUNCTION public.notifications_heading() FROM anon;
