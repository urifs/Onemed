-- Gestão das contas com acesso ao painel admin (/admin/contas).
-- Lista SÓ para admin de verdade (visualizador não gerencia contas): junta
-- user_roles (admin/viewer) com auth.users pra mostrar email e último login.
CREATE OR REPLACE FUNCTION public.admin_panel_accounts()
RETURNS TABLE(
  user_id uuid,
  email text,
  role text,
  account_created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;
  RETURN QUERY
  SELECT r.user_id, u.email::text, r.role::text, u.created_at, u.last_sign_in_at
  FROM public.user_roles r
  JOIN auth.users u ON u.id = r.user_id
  WHERE r.role IN ('admin'::app_role, 'viewer'::app_role)
  ORDER BY r.role, u.email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_panel_accounts() TO authenticated;
