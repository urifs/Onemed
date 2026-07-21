-- member-auth-request (the passwordless /membros login gate) only checked
-- accesses/buyers before issuing a magic link, so an admin who never took a
-- trial or bought a plan got "Nenhum acesso ativo encontrado" and couldn't
-- reach the member area at all — is_member()'s admin bypass never even came
-- into play because the edge function blocked them before login. Expose an
-- email-based admin check the function can call to let any admin in.
CREATE OR REPLACE FUNCTION public.is_admin_email(_email text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE lower(u.email) = lower(_email) AND ur.role = 'admin'
  )
$$;
