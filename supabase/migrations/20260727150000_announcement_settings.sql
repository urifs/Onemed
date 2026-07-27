-- Aviso configurável pelo admin, exibido num card compacto no topo da área
-- de membros — mesmo padrão de linha única do community_settings (whatsapp
-- group), mas pra mensagens livres com um botão de liga/desliga.
CREATE TABLE IF NOT EXISTS public.announcement_settings (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message    text,
  enabled    boolean     NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS announcement_settings_single
  ON public.announcement_settings ((true));

ALTER TABLE public.announcement_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros autenticados podem ler announcement_settings"
  ON public.announcement_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin gerencia announcement_settings"
  ON public.announcement_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_announcement_settings_updated_at
  BEFORE UPDATE ON public.announcement_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
