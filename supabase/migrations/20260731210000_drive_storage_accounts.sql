-- ═══════════════════════════════════════════════════════════════════════════
-- Contas de armazenamento adicionais no Google Drive
--
-- Motivo: o Drive impõe cota DIÁRIA DE DOWNLOAD POR ARQUIVO em arquivos que a
-- conta não possui, e ela é por bytes — uma aula de 3 GB esgota a franquia
-- dela num único download, todo dia. Isso trava tanto a conversão dessas
-- aulas quanto o aluno assistir. Copiar o arquivo para uma conta NOSSA
-- resolve de vez, porque dono não tem cota de download no próprio arquivo —
-- mas a conta de conteúdo atual está sem espaço.
--
-- Esta tabela guarda contas EXTRAS, só para armazenamento. Ela é separada de
-- `drive_config` de propósito: a conexão de conteúdo (a que serve as aulas
-- hoje) não pode ser tocada por engano ao conectar uma conta nova.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.drive_storage_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT NOT NULL UNIQUE,
  access_token        TEXT,
  refresh_token       TEXT,
  token_expiry        TIMESTAMPTZ,
  connected           BOOLEAN NOT NULL DEFAULT true,
  -- Última cota lida da API do Drive. Guardada para o painel não precisar
  -- consultar o Google a cada render.
  storage_limit_bytes BIGINT,
  storage_usage_bytes BIGINT,
  quota_checked_at    TIMESTAMPTZ,
  label               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS ligada e SEM NENHUMA POLICY, de propósito.
--
-- Sem policy, o PostgREST não devolve nada para `anon`/`authenticated` — nem
-- para o admin. Isso é intencional: a tabela guarda refresh tokens de contas
-- Google, que dão acesso permanente ao Drive de alguém. Eles não podem
-- trafegar até o navegador em hipótese nenhuma, nem no painel do dono.
--
-- Todo acesso passa por Edge Function com a service role, que devolve só o
-- que a tela precisa (e-mail, espaço, estado) e nunca os tokens.
ALTER TABLE public.drive_storage_accounts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.drive_storage_accounts IS
  'Contas Google extras usadas só como armazenamento. Sem policy de RLS: acesso exclusivamente por Edge Function com service role, para os refresh tokens nunca chegarem ao cliente.';
