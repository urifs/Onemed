-- ─────────────────────────────────────────────────────────────────────────────
-- Origem da compra: assinante novo, upgrade, renovação ou telas extras.
--
-- O painel de compras (/admin/buyers) não tinha como distinguir um cliente novo
-- de alguém subindo de plano: o `isUpgrade` chegava no mp-create-payment (era
-- usado no preço e na descrição do Mercado Pago) mas NUNCA era gravado.
--
-- A classificação é derivada do que a pessoa já tinha ANTES desta compra —
-- nunca de um sinal do navegador. Assim vale para qualquer caminho de compra
-- (checkout, modal de upgrade, renovação pelo menu) e não dá para forjar.
--
--   new      → não tinha acesso nenhum antes
--   upgrade  → já tinha acesso e comprou um plano de tier MAIOR
--   renewal  → já tinha acesso e comprou o mesmo tier ou menor
--   screens  → compra avulsa de telas simultâneas (plan = 'screens')
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS purchase_kind text;

-- Ordem dos planos. Usada para decidir upgrade × renovação aqui e espelhada no
-- mp-create-payment. 'paid' é o rótulo que o webhook antigo gravava em accesses
-- (sem dizer o tier), então vale como "tinha algum acesso" no piso da escala.
CREATE OR REPLACE FUNCTION public.plan_rank(_plan text)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE _plan
    WHEN 'monthly'       THEN 1
    WHEN 'paid'          THEN 1
    WHEN 'annual'        THEN 2
    WHEN 'lifetime'      THEN 3
    WHEN 'lifetime_plus' THEN 4
    WHEN 'lifetime_pro'  THEN 5
    ELSE 0
  END;
$$;

-- ── Backfill do histórico ────────────────────────────────────────────────────
-- Olha SÓ as compras aprovadas anteriores do mesmo e-mail.
--
-- ⚠️ `accesses` NÃO serve para reconstruir o passado, por mais tentador que
-- pareça: 2.515 das suas linhas foram criadas num único minuto (19/07/2026
-- 23:45, a carga em massa da área de membros), então `granted_at` ali é a data
-- da manutenção, não a data em que a pessoa ganhou acesso. Usar esse campo
-- classificava upgrades reais como renovação — quem comprou lifetime em abril
-- e subiu para o Pro em julho aparecia com "já tinha Pro antes".
--
-- Compras aprovadas, ao contrário, são imutáveis e datadas de verdade. A conta
-- histórica então é: "esta é a primeira compra desta pessoa?" (novo), "ela já
-- comprou e agora subiu de tier?" (upgrade) ou "mesmo tier ou menor?"
-- (renovação). Daqui pra frente o mp-create-payment classifica na hora, aí sim
-- cruzando com o acesso ATIVO do momento — que é confiável para o presente e
-- cobre também quem recebeu acesso concedido à mão.
WITH antes AS (
  SELECT
    b.id,
    coalesce((
      SELECT max(public.plan_rank(b2.plan))
      FROM public.buyers b2
      WHERE lower(b2.email) = lower(b.email)
        AND b2.access_granted = true
        AND b2.created_at < b.created_at
    ), 0) AS rank_antes
  FROM public.buyers b
)
UPDATE public.buyers b
SET purchase_kind = CASE
  WHEN b.plan = 'screens'                          THEN 'screens'
  WHEN antes.rank_antes = 0                        THEN 'new'
  WHEN public.plan_rank(b.plan) > antes.rank_antes THEN 'upgrade'
  ELSE 'renewal'
END
FROM antes
WHERE antes.id = b.id;

-- O painel filtra e ordena por essa coluna junto com a data.
CREATE INDEX IF NOT EXISTS idx_buyers_purchase_kind ON public.buyers (purchase_kind, created_at DESC);
