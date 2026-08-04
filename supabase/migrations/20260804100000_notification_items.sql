-- ─────────────────────────────────────────────────────────────────────────────
-- Sino de notificações da área de membros: a lista "Cursos em processo de
-- atualização" era hardcoded no frontend (NotificationsBell.tsx) — todo ajuste
-- exigia deploy. Vira tabela editável pelo painel admin, com o título da seção
-- editável junto (announcement_settings.notifications_heading).
--
-- done=true → bolinha verde (curso atualizado); done=false → bolinha vermelha
-- (ainda em atualização).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  label      text        NOT NULL,
  done       boolean     NOT NULL DEFAULT false,
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_items ENABLE ROW LEVEL SECURITY;

-- Membros leem (trial não vê o sino — mesma regra da loja). Checagens dentro
-- de (SELECT ...) SEMPRE: fora dele o Postgres reexecuta por linha.
CREATE POLICY "Membros leem notificacoes"
  ON public.notification_items FOR SELECT TO authenticated
  USING (((SELECT is_member()) OR (SELECT has_role(auth.uid(), 'admin'::app_role)))
         AND (NOT (SELECT is_trial_member())));

CREATE POLICY "Admin gerencia notificacoes"
  ON public.notification_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_notification_items_updated_at
  BEFORE UPDATE ON public.notification_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Título da seção no popover do sino, editável junto com a lista.
ALTER TABLE public.announcement_settings
  ADD COLUMN IF NOT EXISTS notifications_heading text;

-- Estado atual do frontend vira o estado inicial da tabela + MED 2026 (verde).
INSERT INTO public.notification_items (label, done, sort_order) VALUES
  ('MED 2026', true, 0),
  ('MedReview 2026', true, 1),
  ('Apostilas EstratégiaMed 2026', true, 2),
  ('Casal MED 2026', true, 3),
  ('Medcurso 2026', false, 4),
  ('Medcel 2026', false, 5),
  ('Estratégia MED 2026', false, 6),
  ('Casal MED Resumos 2026', false, 7),
  ('Medcof USA 2026', false, 8),
  ('MEDgrupo 2026', false, 9),
  ('Eu Médico Residente 2026', false, 10),
  ('MedCards 2026', false, 11),
  ('MedWay 2026', false, 12),
  ('PS Zerado 2026', false, 13),
  ('HardWork Revalida 2026', false, 14),
  ('TEPs Medcof 2026', false, 15);
