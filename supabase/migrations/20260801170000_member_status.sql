-- Situação de acesso de quem está logado na área de membros.
--
-- Existia um vão: o teste grátis expira, mas a SESSÃO do navegador continua
-- válida até o refresh do token. O aluno ficava dentro da plataforma vendo
-- uma casca vazia — zero cursos (a RLS já não liberava nada), plano "—",
-- acesso "—" — sem nenhuma explicação nem caminho para comprar. Esta função
-- é o que permite a tela dizer "seu teste expirou" e oferecer o plano.
--
-- Devolve também o tipo do último acesso e quando ele venceu, pra tela
-- diferenciar "seu teste grátis expirou" de "sua assinatura expirou".
CREATE OR REPLACE FUNCTION public.my_member_status()
RETURNS TABLE(status text, last_type text, expired_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  em  text;
BEGIN
  IF uid IS NULL THEN
    RETURN QUERY SELECT 'none'::text, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  IF public.has_role(uid, 'admin'::app_role) THEN
    RETURN QUERY SELECT 'admin'::text, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT lower(u.email) INTO em FROM auth.users u WHERE u.id = uid;

  -- Assinante: qualquer acesso ativo que não seja trial, ou compra liberada.
  -- Não se olha expires_at aqui de propósito — quem revoga plano pago é o
  -- fluxo de cobrança, e derrubar um pagante por uma data mal preenchida
  -- seria muito pior do que deixar um dia a mais.
  IF EXISTS (
       SELECT 1 FROM public.accesses a
       WHERE lower(a.email) = em AND a.status = 'active' AND a.access_type <> 'trial'
     ) OR EXISTS (
       SELECT 1 FROM public.buyers b
       WHERE lower(b.email) = em AND b.access_granted = true
     ) THEN
    RETURN QUERY SELECT 'active'::text, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  -- Trial ainda de pé. A checagem de expires_at é indispensável: a rotina que
  -- marca trial vencido roda a cada 5 minutos, então existe uma janela em que
  -- a linha ainda está 'active' com a hora já vencida.
  IF EXISTS (
       SELECT 1 FROM public.accesses a
       WHERE lower(a.email) = em AND a.status = 'active' AND a.access_type = 'trial'
         AND (a.expires_at IS NULL OR a.expires_at > now())
     ) THEN
    RETURN QUERY SELECT 'trial'::text, 'trial'::text, NULL::timestamptz;
    RETURN;
  END IF;

  -- Sem nada ativo: expirado se houver histórico, "none" se nunca teve nada.
  RETURN QUERY
  SELECT CASE WHEN a.id IS NULL THEN 'none' ELSE 'expired' END,
         a.access_type, a.expires_at
  FROM (
    SELECT a2.id, a2.access_type, a2.expires_at
    FROM public.accesses a2
    WHERE lower(a2.email) = em
    ORDER BY a2.expires_at DESC NULLS LAST, a2.created_at DESC
    LIMIT 1
  ) a
  RIGHT JOIN (SELECT 1) dummy ON true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.my_member_status() TO authenticated;
