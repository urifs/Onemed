-- Adiciona restrição de plano aos cupons
-- Valores: 'all' (ambos), 'annual' (só anual), 'lifetime' (só vitalício)
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS allowed_plans TEXT NOT NULL DEFAULT 'all';
