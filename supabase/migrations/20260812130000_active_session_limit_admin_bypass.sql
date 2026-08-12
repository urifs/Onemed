-- Junta as duas correções que se atropelaram: contagem por TELA ATIVA
-- (20260812010000) + admin sem limite de telas (20260812120000).
--
-- O que aconteceu: a migration do admin foi escrita a partir da versão antiga
-- da função e aplicada depois, com CREATE OR REPLACE — o corpo inteiro foi
-- substituído e a janela de inatividade de 7 dias, mais a ordenação por
-- atividade, sumiram do banco sem aviso (CREATE OR REPLACE não acusa que
-- estava sobrescrevendo lógica mais nova). Esta migration restaura a lógica
-- de tela ativa e mantém o bypass de admin.
--
-- Regra final:
--   • admin não tem teto de telas (sai antes de qualquer DELETE);
--   • sessão sem sinal de vida há mais de 7 dias não é tela aberta: sai da
--     contagem e da tabela;
--   • entre as ativas, ficam as N de atividade MAIS RECENTE — o que preserva o
--     aparelho em uso e derruba o abandonado.
CREATE OR REPLACE FUNCTION public.enforce_session_limit(_user_id uuid, _max_sessions integer DEFAULT 2)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _janela_inatividade constant interval := interval '7 days';
BEGIN
  -- Admin usa quantos aparelhos quiser: sai antes de apagar qualquer sessão.
  IF public.has_role(_user_id, 'admin'::public.app_role) THEN
    RETURN;
  END IF;

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
  'Mantém no máximo _max_sessions TELAS ATIVAS por conta (descarta sessões sem sinal de vida há mais de 7 dias e preserva as de atividade mais recente). Admin não tem limite.';
