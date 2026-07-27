import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/utils';
import { PLAN_LABELS, PLAN_PRICES } from '@/lib/plans';

// Ordem de valor dos planos — upgrade só oferece o que vem DEPOIS do plano
// atual nessa lista (nunca downgrade).
const PLAN_ORDER = ['monthly', 'annual', 'lifetime', 'lifetime_plus', 'lifetime_pro'];

export function upgradeTargetsFor(plan: string | null | undefined): string[] {
  if (!plan) return [];
  const idx = PLAN_ORDER.indexOf(plan);
  return idx === -1 ? [] : PLAN_ORDER.slice(idx + 1);
}

interface UpgradePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
  amountPaid: number;
  userEmail: string;
  userName?: string;
}

export function UpgradePlanModal({ open, onOpenChange, currentPlan, amountPaid, userEmail, userName }: UpgradePlanModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const targets = upgradeTargetsFor(currentPlan);

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
      <DialogContent className="bg-background-paper border-border max-w-lg">
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
              Você já pagou <span className="text-foreground font-medium">R$ {amountPaid.toFixed(2).replace('.', ',')}</span>
            </p>
          </div>

          {targets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Você já está no plano mais completo. 🎉</p>
          ) : (
            <div className="space-y-3">
              {targets.map(targetPlan => {
                const fullPrice = PLAN_PRICES[targetPlan];
                const diff = Math.max(fullPrice - amountPaid, 1);
                return (
                  <div key={targetPlan} className="rounded-xl border border-border p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-foreground font-semibold">{PLAN_LABELS[targetPlan]}</p>
                      <p className="text-xs text-muted-foreground">
                        Preço cheio: <span className="line-through">R$ {fullPrice.toFixed(2).replace('.', ',')}</span>
                      </p>
                      <p className="text-sm text-accent-success font-semibold mt-1">
                        Você paga apenas R$ {diff.toFixed(2).replace('.', ',')}
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
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Você paga só a diferença do que já investiu — o valor acima já desconta o que você pagou no seu plano atual.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
