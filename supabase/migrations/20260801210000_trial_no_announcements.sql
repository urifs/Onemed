-- Avisos do painel admin são recado para assinante — quem está no teste
-- grátis não vê.
--
-- O corte é na RLS, não na tela: assim o texto do aviso nem chega ao
-- navegador de quem não deve lê-lo, e não há um segundo lugar pra esquecer
-- de bloquear depois. Mesmo tratamento já dado ao link do grupo no WhatsApp
-- (community_settings).
DROP POLICY IF EXISTS "Membros autenticados podem ler announcement_settings" ON public.announcement_settings;
CREATE POLICY "Membros autenticados podem ler announcement_settings"
  ON public.announcement_settings FOR SELECT TO authenticated
  USING (NOT public.is_trial_member());
