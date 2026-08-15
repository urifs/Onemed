-- ─────────────────────────────────────────────────────────────────────────────
-- Fechamento de dois furos de RLS explorados num pentest (15/08/2026).
--
-- Nenhum concedia acesso PAGO nem admin — o webhook e a checagem de tipo
-- seguraram (todas as "compras fake" ficaram access_granted=false e nenhum
-- acesso lifetime/paid foi autoconcedido). Mas os dois abaixo são reais:
--
-- FURO A — trial "para sempre": a política pública de INSERT em accesses só
--   exigia access_type='trial' e status='active', SEM limite de expires_at.
--   Um POST anônimo com expires_at=2099 criava um trial que nunca expira =
--   acesso grátis vitalício a todo o conteúdo (o member-lesson-token libera
--   trial ativo cujo expires_at ainda não passou). Também explica o relato
--   "os trials não estão expirando": o cron marca expirado quando
--   expires_at <= now(), e 2099 nunca chega.
--   O fluxo REAL de trial passa por create-trial-access (service role, ignora
--   RLS) e fixa expires_at = now()+10min. Então o único caso legítimo que
--   sobra para o navegador é um trial curto — limitamos a janela.
--
-- FURO B — venda fake: a política pública de INSERT em buyers só exigia
--   access_granted=false e email_sent=false, deixando o cliente gravar
--   status='approved' e amount=99999 → poluía a receita do painel. O checkout
--   real (CheckoutPage, AccountMenu, UpgradePlanModal) SEMPRE insere
--   status='pending'; a aprovação só vem do mp-webhook (service role) depois
--   de conferir o pagamento no Mercado Pago. Travamos o insert público em
--   'pending' com valor sano.
--
-- Admin/viewer e as Edge Functions (service role) têm políticas próprias e não
-- são afetados por estas mudanças.
-- ─────────────────────────────────────────────────────────────────────────────

-- FURO A — removida de vez, não apenas limitada.
-- O fluxo real de trial é 100% via create-trial-access, que usa a
-- SUPABASE_SERVICE_ROLE_KEY (ignora RLS) e fixa expires_at server-side. NENHUM
-- código do navegador insere trial direto (a landing chama a Edge Function).
-- Logo, esta política pública só servia de superfície de ataque — além do
-- "free-forever" (expires_at=2099), permitia floodar trials de 45min para
-- qualquer e-mail, contornando o rate limit da função. Sem ela, criar acesso
-- (trial ou pago) pelo navegador fica impossível; admin/viewer e as Edge
-- Functions seguem pelas suas próprias políticas.
DROP POLICY IF EXISTS "Public can insert trial access" ON public.accesses;

-- FURO B
DROP POLICY IF EXISTS "Public can insert buyers" ON public.buyers;
CREATE POLICY "Public can insert buyers" ON public.buyers
  FOR INSERT TO public
  WITH CHECK (
    access_granted = false
    AND email_sent = false
    AND status = 'pending'
    AND (amount IS NULL OR (amount >= 0 AND amount <= 100000))
  );
