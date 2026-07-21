-- Suporte ao streaming direto do Google Drive (sem proxy pelas Edge
-- Functions) — pedido explícito do usuário pra zerar o custo de egress do
-- Supabase. Cada linha é uma permissão temporária "qualquer um com o link"
-- concedida num arquivo específico do Drive; um cron revoga e apaga a linha
-- depois que expires_at passa (ver drive-revoke-access).
CREATE TABLE IF NOT EXISTS public.direct_link_grants (
  drive_file_id text PRIMARY KEY,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_direct_link_grants_expires_at ON public.direct_link_grants (expires_at);

ALTER TABLE public.direct_link_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver direct_link_grants"
  ON public.direct_link_grants FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
