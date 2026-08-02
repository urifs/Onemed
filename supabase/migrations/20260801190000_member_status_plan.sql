-- my_member_status passa a devolver também o PLANO efetivo da conta, para a
-- plataforma poder liberar/bloquear recursos por plano (o primeiro caso é o
-- download de aulas e arquivos).
--
-- O ponto delicado é o access_type='paid': o mp-webhook grava esse rótulo
-- para qualquer compra, sem dizer QUAL plano foi comprado. Só em produção são
-- 60 linhas ativas assim — e, olhando a compra correspondente em buyers, elas
-- são 29 vitalícios, 16 anuais e 15 mensais. Tratar 'paid' como um plano só
-- daria o recurso errado para 31 clientes. Por isso 'paid' é resolvido pela
-- linha de compra; sem ela (não deveria acontecer), assume vitalício — errar
-- para liberar é o lado certo de errar com quem já pagou.
DROP FUNCTION IF EXISTS public.my_member_status();

CREATE FUNCTION public.my_member_status()
RETURNS TABLE(status text, last_type text, expired_at timestamptz, plan text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid          uuid := auth.uid();
  em           text;
  plano_ativo  text;
BEGIN
  IF uid IS NULL THEN
    RETURN QUERY SELECT 'none'::text, NULL::text, NULL::timestamptz, NULL::text;
    RETURN;
  END IF;

  IF public.has_role(uid, 'admin'::app_role) THEN
    RETURN QUERY SELECT 'admin'::text, NULL::text, NULL::timestamptz, 'admin'::text;
    RETURN;
  END IF;

  SELECT lower(u.email) INTO em FROM auth.users u WHERE u.id = uid;

  -- Maior plano entre tudo que está ativo na conta: linhas de accesses (com
  -- 'paid' resolvido pela compra) e compras liberadas sem linha em accesses.
  SELECT p.plano INTO plano_ativo
  FROM (
    SELECT CASE
             WHEN a.access_type = 'paid' THEN COALESCE((
               SELECT b.plan FROM public.buyers b
               WHERE lower(b.email) = em AND b.access_granted = true
               ORDER BY b.created_at DESC LIMIT 1
             ), 'lifetime')
             ELSE a.access_type
           END AS plano
    FROM public.accesses a
    WHERE lower(a.email) = em
      AND a.status = 'active'
      AND (a.access_type <> 'trial' OR a.expires_at IS NULL OR a.expires_at > now())

    UNION ALL

    SELECT b.plan
    FROM public.buyers b
    WHERE lower(b.email) = em AND b.access_granted = true AND b.plan IS NOT NULL
  ) p
  ORDER BY CASE p.plano
             WHEN 'lifetime_pro'  THEN 6
             WHEN 'lifetime_plus' THEN 5
             WHEN 'lifetime'      THEN 4
             WHEN 'annual'        THEN 3
             WHEN 'monthly'       THEN 2
             WHEN 'trial'         THEN 1
             ELSE 0
           END DESC
  LIMIT 1;

  IF plano_ativo IS NOT NULL AND plano_ativo <> 'trial' THEN
    RETURN QUERY SELECT 'active'::text, NULL::text, NULL::timestamptz, plano_ativo;
    RETURN;
  END IF;

  IF plano_ativo = 'trial' THEN
    RETURN QUERY SELECT 'trial'::text, 'trial'::text, NULL::timestamptz, 'trial'::text;
    RETURN;
  END IF;

  -- Sem nada ativo: expirado se houver histórico, "none" se nunca teve nada.
  RETURN QUERY
  SELECT CASE WHEN a.id IS NULL THEN 'none' ELSE 'expired' END,
         a.access_type, a.expires_at, NULL::text
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
