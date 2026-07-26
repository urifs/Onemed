-- Configurações da aba Comunidade — hoje só o link do grupo do WhatsApp,
-- editável pelo admin e lido por qualquer membro logado (card na aba
-- Comunidade + notificação fixa no sininho).
CREATE TABLE IF NOT EXISTS public.community_settings (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_group_url text,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Garante apenas 1 linha de configuração global (mesmo truque do whatsapp_config).
CREATE UNIQUE INDEX IF NOT EXISTS community_settings_single
  ON public.community_settings ((true));

ALTER TABLE public.community_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros autenticados podem ler community_settings"
  ON public.community_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin gerencia community_settings"
  ON public.community_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_community_settings_updated_at
  BEFORE UPDATE ON public.community_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
