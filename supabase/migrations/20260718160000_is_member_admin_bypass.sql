-- Admins have no accesses/buyers row (they never took a trial or bought a
-- plan), so is_member() returned false for them. courses/lessons SELECT
-- policies separately OR'd in has_role(admin), but lesson_progress and
-- course_comments did not — an admin could browse the whole catalog (via
-- that separate OR) yet get "Sem acesso ativo" from member-lesson-token
-- and silently fail to save progress or comment. Bake the admin check into
-- is_member() itself so every policy built on it inherits the bypass.
CREATE OR REPLACE FUNCTION public.is_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.accesses a WHERE a.email = u.email AND a.status = 'active')
      OR EXISTS (SELECT 1 FROM public.buyers b WHERE b.email = u.email AND b.access_granted = true)
    )
  )
$$;
