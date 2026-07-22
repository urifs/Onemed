-- user_roles só é legível por admin via RLS — CommunityTab (membro comum)
-- precisa saber quais user_ids são admin só pra mostrar o selo "Equipe
-- OneMed", sem expor nada além do id. SECURITY DEFINER pra contornar a
-- restrição de leitura só pra esse propósito específico.
CREATE OR REPLACE FUNCTION public.list_admin_user_ids()
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (is_member() OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'::app_role;
END;
$$;
