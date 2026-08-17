-- ─────────────────────────────────────────────────────────────────────────────
-- Backup completo: incluir auth.users no export do painel.
--
-- O admin-database-backup exporta o schema public inteiro (dinamicamente, via
-- admin_schema_snapshot), mas as CONTAS moram em auth.users — todas as tabelas
-- de aluno (profiles, playlists, lesson_progress, flashcard_decks, user_roles…)
-- referenciam user_id de lá. Um restore sem auth.users deixa esses dados
-- órfãos e perde logins e senhas. Esta RPC entrega as linhas de auth.users
-- paginadas para o backup, como jsonb.
--
-- Segurança: EXECUTE só para service_role (a Edge Function já exige admin no
-- JWT antes de chamar). Os tokens VOLÁTEIS de fluxos pendentes (confirmação,
-- recuperação, troca de e-mail/telefone) são removidos — não servem para
-- restore e são segredos de curta duração.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_backup_auth_users(_offset integer, _limit integer)
RETURNS SETOF jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(u.*)
           - 'confirmation_token'
           - 'recovery_token'
           - 'email_change_token_new'
           - 'email_change_token_current'
           - 'phone_change_token'
           - 'reauthentication_token'
  FROM auth.users u
  ORDER BY u.created_at, u.id
  OFFSET greatest(_offset, 0)
  LIMIT least(greatest(_limit, 1), 1000);
$$;

REVOKE ALL ON FUNCTION public.admin_backup_auth_users(integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_backup_auth_users(integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_backup_auth_users_count()
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) FROM auth.users;
$$;

REVOKE ALL ON FUNCTION public.admin_backup_auth_users_count() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_backup_auth_users_count() TO service_role;
