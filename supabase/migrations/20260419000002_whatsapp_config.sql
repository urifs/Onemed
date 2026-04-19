-- Configuração do WhatsApp Business via Evolution API

CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  evolution_api_url   text,
  evolution_api_key   text,
  instance_name       text        NOT NULL DEFAULT 'onemed',
  auto_reply_message  text        NOT NULL DEFAULT '',
  trigger_keyword     text        NOT NULL DEFAULT 'Tenho interesse',
  connected           boolean     NOT NULL DEFAULT false,
  phone_number        text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Garante apenas 1 linha de configuração global
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_config_single
  ON public.whatsapp_config ((true));

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin acesso total whatsapp_config"
  ON public.whatsapp_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Log de mensagens recebidas e respondidas

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   text        UNIQUE,
  remote_jid   text        NOT NULL,
  phone_number text,
  message_text text,
  replied      boolean     NOT NULL DEFAULT false,
  reply_text   text,
  error        text,
  received_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_messages_received_at_idx
  ON public.whatsapp_messages (received_at DESC);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin acesso total whatsapp_messages"
  ON public.whatsapp_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
