-- Admin não tem limite de dispositivos simultâneos.
--
-- O limite de telas é uma regra de PLANO (2 no padrão, 4 no Vitalício Plus,
-- 6 no Pro) e nunca deveria ter valido para quem administra a plataforma: o
-- dono entra pelo celular para conferir uma aula, pelo notebook para mexer no
-- painel e por um terceiro aparelho para testar algo — e era derrubado do mais
-- antigo a cada login novo.
--
-- O bypass fica DENTRO da função, não nos edge functions, porque ela é o único
-- ponto por onde a exclusão de sessão passa: assim vale para member-auth-request,
-- create-trial-access e qualquer chamada futura, sem depender de cada chamador
-- lembrar da exceção.
CREATE OR REPLACE FUNCTION public.enforce_session_limit(_user_id uuid, _max_sessions integer DEFAULT 2)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Admin usa quantos aparelhos quiser: sai antes de apagar qualquer sessão.
  IF public.has_role(_user_id, 'admin'::public.app_role) THEN
    RETURN;
  END IF;

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
