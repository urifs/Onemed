import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, Crown, Check, Ticket, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/utils';
import { PLAN_LABELS, PLAN_PRICES, PLAN_FEATURES, upgradePriceFor } from '@/lib/plans';

// Ordem de valor dos planos — upgrade só oferece o que vem DEPOIS do plano
// atual nessa lista (nunca downgrade).
const PLAN_ORDER = ['monthly', 'annual', 'lifetime', 'lifetime_plus', 'lifetime_pro'];

export function upgradeTargetsFor(plan: string | null | undefined): string[] {
  if (!plan) return [];
  const idx = PLAN_ORDER.indexOf(plan);
  return idx === -1 ? [] : PLAN_ORDER.slice(idx + 1);
}

interface AppliedCoupon {
  code: string;
  discount_percent: number;
  allowed_plans: string | null;
}

interface UpgradePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
  // Mantido por compatibilidade com quem já passa, mas NÃO entra mais no
  // preço: o upgrade é diferença de tabela, igual pra quem pagou cheio e pra
  // quem pagou com cupom.
  amountPaid?: number;
  userEmail: string;
  userName?: string;
}

export function UpgradePlanModal({ open, onOpenChange, currentPlan, userEmail, userName }: UpgradePlanModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const targets = upgradeTargetsFor(currentPlan);

  // Mesma validação de cupom do checkout — o preço final continua sendo
  // calculado no SERVIDOR (mp-create-payment), aqui é só pra mostrar o valor
  // com desconto antes de abrir o pagamento.
  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) { toast.error('Digite um código de cupom'); return; }
    setCouponLoading(true);
    try {
      const { data } = await supabase
        .from('coupons')
        .select('code, discount_percent, allowed_plans, expires_at, max_uses, times_used')
        .eq('code', code)
        .eq('active', true)
        .maybeSingle();
      const expirado = data?.expires_at && new Date(data.expires_at) < new Date();
      const esgotado = data?.max_uses !== null && data?.max_uses !== undefined
        && data?.times_used !== null && Number(data?.times_used) >= Number(data?.max_uses);
      if (!data || expirado || esgotado) {
        setCoupon(null);
        toast.error(!data ? 'Cupom inválido ou expirado' : expirado ? 'Cupom expirado' : 'Cupom esgotado');
        return;
      }
      setCoupon({ code: data.code, discount_percent: data.discount_percent, allowed_plans: data.allowed_plans });
      toast.success(`Cupom aplicado! ${data.discount_percent}% de desconto`);
    } catch {
      toast.error('Erro ao validar cupom');
    } finally {
      setCouponLoading(false);
    }
  };

  // Cupom com restrição de plano só vale pro plano permitido — nos demais o
  // preço fica cheio e o servidor nem recebe o código (senão recusaria a compra).
  const couponAppliesTo = (targetPlan: string) =>
    !!coupon && (!coupon.allowed_plans || coupon.allowed_plans === 'all' || coupon.allowed_plans === targetPlan);

  const handleUpgrade = async (targetPlan: string) => {
    setLoadingPlan(targetPlan);
    try {
      const ref = `onemed_upgrade_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const { error: buyerErr } = await supabase.from('buyers').insert({
        email: userEmail.toLowerCase().trim(),
        name: userName?.trim() || null,
        plan: targetPlan,
        amount: 0,
        status: 'pending',
        external_reference: ref,
      });
      if (buyerErr) throw buyerErr;

      const { data: result, error: fnErr } = await supabase.functions.invoke('mp-create-payment', {
        body: {
          plan: targetPlan,
          email: userEmail.toLowerCase().trim(),
          name: userName?.trim() || '',
          externalReference: ref,
          isUpgrade: true,
          couponCode: couponAppliesTo(targetPlan) ? coupon!.code : undefined,
          origin: window.location.origin,
        },
      });
      if (fnErr || result?.error) {
        throw new Error(result?.error || await extractFunctionErrorMessage(fnErr, 'Erro ao gerar pagamento'));
      }
      window.location.href = result.init_point || result.sandbox_init_point;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar upgrade');
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background-paper border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" /> Upgrade de Plano
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Seu plano atual</p>
            <p className="text-foreground font-semibold">{PLAN_LABELS[currentPlan] || currentPlan}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Valor de tabela{' '}
              <span className="text-foreground font-medium">
                R$ {(PLAN_PRICES[currentPlan] ?? 0).toFixed(2).replace('.', ',')}
              </span>
              {' '}— no upgrade você paga só a diferença para o novo plano.
            </p>
          </div>

          {/* cupom de desconto — aplica em cima da diferença do upgrade */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1.5 flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-primary" /> Cupom de desconto (opcional)
            </p>
            {coupon ? (
              <div className="flex items-center gap-2 rounded-lg border border-accent-success/40 bg-accent-success/10 px-3 py-2">
                <Check className="w-4 h-4 text-accent-success shrink-0" />
                <p className="flex-1 text-sm text-foreground">
                  <span className="font-semibold">{coupon.code}</span> — {coupon.discount_percent}% de desconto
                </p>
                <button
                  onClick={() => { setCoupon(null); setCouponCode(''); }}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="Remover cupom"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                  placeholder="Digite seu cupom"
                  className="flex-1 min-w-0 rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 uppercase"
                />
                <Button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  variant="outline"
                  className="shrink-0"
                >
                  {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                </Button>
              </div>
            )}
          </div>

          {targets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Você já está no plano mais completo.</p>
          ) : (
            <div className="space-y-3">
              {targets.map(targetPlan => {
                const fullPrice = PLAN_PRICES[targetPlan];
                // Diferença de TABELA entre os planos, igual pra todo mundo —
                // quanto a pessoa pagou (com ou sem cupom) não entra na conta.
                const diff = upgradePriceFor(currentPlan, targetPlan);
                const comCupom = couponAppliesTo(targetPlan);
                // Mesma conta do servidor (mp-create-payment): desconto em cima
                // da DIFERENÇA do upgrade, arredondado a 2 casas.
                const finalPrice = comCupom
                  ? Math.round(diff * (1 - coupon!.discount_percent / 100) * 100) / 100
                  : diff;
                const currentFeatures = PLAN_FEATURES[currentPlan] || [];
                const newFeatures = (PLAN_FEATURES[targetPlan] || []).filter(f => !currentFeatures.includes(f));
                return (
                  <div key={targetPlan} className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-foreground font-semibold">{PLAN_LABELS[targetPlan]}</p>
                        <p className="text-xs text-muted-foreground">
                          Preço cheio: <span className="line-through">R$ {fullPrice.toFixed(2).replace('.', ',')}</span>
                          {comCupom && (
                            <> · diferença: <span className="line-through">R$ {diff.toFixed(2).replace('.', ',')}</span></>
                          )}
                        </p>
                        <p className="text-sm text-accent-success font-semibold mt-1">
                          Você paga apenas R$ {finalPrice.toFixed(2).replace('.', ',')}
                          {comCupom && (
                            <span className="ml-1.5 text-[10px] uppercase font-bold bg-accent-success/15 text-accent-success rounded px-1.5 py-0.5">
                              cupom -{coupon!.discount_percent}%
                            </span>
                          )}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleUpgrade(targetPlan)}
                        disabled={loadingPlan !== null}
                        size="sm"
                        className="shrink-0 gap-1.5 bg-primary hover:bg-primary-hover text-primary-foreground"
                      >
                        {loadingPlan === targetPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        {loadingPlan === targetPlan ? 'Abrindo...' : 'Fazer upgrade'}
                      </Button>
                    </div>
                    {newFeatures.length > 0 && (
                      <div className="pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1.5">O que você ganha a mais</p>
                        <ul className="space-y-1">
                          {newFeatures.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                              <Check className="w-4 h-4 text-accent-success shrink-0 mt-0.5" /> {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Você paga só a diferença entre os planos — o valor acima já desconta o preço integral do seu plano atual.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
