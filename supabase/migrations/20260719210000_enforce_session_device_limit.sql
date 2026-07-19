-- Cada email só pode ter sessões ativas em no máximo 2 dispositivos ao mesmo
-- tempo na área de membros. Toda vez que um novo login é emitido
-- (member-auth-request ou create-trial-access), o edge function chama esta
-- função logo depois — ela mantém apenas as N sessões mais recentes do
-- usuário e apaga o resto de auth.sessions. Como auth.refresh_tokens
-- referencia a sessão pelo session_id, apagar a sessão invalida o refresh
-- token daquele dispositivo: no próximo refresh automático (ou reload) o
-- GoTrue recusa e o app do dispositivo mais antigo é deslogado.
CREATE OR REPLACE FUNCTION public.enforce_session_limit(_user_id uuid, _max_sessions integer DEFAULT 2)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.sessions
  WHERE user_id = _user_id
    AND id NOT IN (
      SELECT id FROM auth.sessions
      WHERE user_id = _user_id
      ORDER BY created_at DESC
      LIMIT _max_sessions
    );
END;
$$;
