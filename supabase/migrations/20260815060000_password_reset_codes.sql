-- ─────────────────────────────────────────────────────────────────────────────
-- Recuperação de senha por CÓDIGO no e-mail (autoatendimento).
--
-- Substitui o fluxo manual (aluno chamava o suporte no WhatsApp e um admin
-- liberava novo cadastro em /admin/membros) — que estava sobrecarregando o
-- suporte. Agora: o aluno pede o código, recebe por e-mail (Resend), digita na
-- plataforma e, se válido, cadastra a nova senha.
--
-- Guarda o SHA-256 do código, nunca o código em claro. Uma linha por e-mail
-- (a PK) — pedir de novo sobrescreve o código anterior. `attempts` limita o
-- número de tentativas de digitar o código (anti-força-bruta de 6 dígitos).
--
-- Acesso: SOMENTE service role (a Edge Function member-auth-request). Nenhuma
-- policy pública — o cliente nunca lê nem escreve nesta tabela direto.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  email       text PRIMARY KEY,
  code_hash   text NOT NULL,
  expires_at  timestamptz NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  used        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;
-- Sem policies: só a service role (que ignora RLS) acessa, via Edge Function.

-- Limpeza de códigos vencidos há mais de 1 dia — evita a tabela crescer sem
-- fim. Roda de graça sempre que a função escreve (chamada pela própria função).
CREATE OR REPLACE FUNCTION public.purge_expired_reset_codes()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.password_reset_codes WHERE expires_at < now() - interval '1 day';
$$;

REVOKE ALL ON FUNCTION public.purge_expired_reset_codes() FROM public, anon, authenticated;
