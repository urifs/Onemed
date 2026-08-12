-- Limite de telas simultâneas: contar TELA ATIVA, não linha de sessão.
--
-- O que estava errado (medido em produção antes desta migration):
--
--   1. Sessão nunca expirava. `auth.sessions` só perde linha quando alguém
--      apaga, e o projeto está com sessions_inactivity_timeout = 0. Resultado:
--      1.101 sessões (35% do total) criadas por logins que o aluno abriu e
--      fechou sem nunca renovar o token — telas que não existem mais, mas
--      ocupavam vaga PARA SEMPRE. Com isso, metade da base (990 de 2.020
--      contas) aparecia usando 2+ telas sem estar usando.
--
--   2. `ORDER BY created_at DESC` derrubava a tela ERRADA. Quem some no login
--      novo era a sessão mais ANTIGA POR CRIAÇÃO — mesmo sendo a que o aluno
--      usa todo dia — enquanto uma sessão criada ontem e abandonada
--      sobrevivia. 289 contas estavam exatamente nessa inversão.
--
-- A correção usa o único sinal de vida que o navegador dá: o refresh do
-- token (a cada ~1h de uso). `refreshed_at` é `timestamp` naive gravado em
-- UTC pelo GoTrue, então precisa de `AT TIME ZONE 'UTC'` para comparar com
-- `now()`; `greatest(...)` com created_at garante que uma sessão recém-criada
-- (que ainda não renovou nada) conte como ativa.
--
-- JANELA: 7 dias sem nenhum sinal de vida = aquela tela não está mais aberta.
-- É deliberadamente generosa (quem usa o notebook uma vez por semana mantém a
-- vaga) e ainda assim barra o compartilhamento real, que precisa de vários
-- dispositivos ativos na MESMA semana. Como o login do aluno é só o e-mail,
-- sem senha, voltar depois de 7 dias parados custa um clique.
CREATE OR REPLACE FUNCTION public.enforce_session_limit(_user_id uuid, _max_sessions integer DEFAULT 2)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _janela_inatividade constant interval := interval '7 days';
BEGIN
  -- 1) Telas sem sinal de vida na janela não são "telas ativas": saem da
  --    contagem e da tabela, liberando a vaga para o dispositivo real.
  DELETE FROM auth.sessions
  WHERE user_id = _user_id
    AND greatest(
          coalesce(refreshed_at AT TIME ZONE 'UTC', created_at),
          coalesce(updated_at, created_at),
          created_at
        ) < now() - _janela_inatividade;

  -- 2) Entre as que continuam ativas, mantém as N de atividade MAIS RECENTE.
  --    Ordenar por atividade (e não por criação) é o que preserva o aparelho
  --    que o aluno realmente usa e derruba primeiro o que ele abandonou.
  DELETE FROM auth.sessions
  WHERE user_id = _user_id
    AND id NOT IN (
      SELECT id FROM auth.sessions
      WHERE user_id = _user_id
      ORDER BY greatest(
                 coalesce(refreshed_at AT TIME ZONE 'UTC', created_at),
                 coalesce(updated_at, created_at),
                 created_at
               ) DESC
      LIMIT _max_sessions
    );
END;
$$;

COMMENT ON FUNCTION public.enforce_session_limit(uuid, integer) IS
  'Mantém no máximo _max_sessions TELAS ATIVAS por conta: descarta sessões sem sinal de vida há mais de 7 dias e, entre as ativas, preserva as de atividade mais recente.';
