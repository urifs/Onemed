import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, MonitorSmartphone, Minus, Plus, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/utils';
import { EXTRA_SCREEN_PRICE, MAX_EXTRA_SCREENS } from '@/lib/plans';

interface BuyScreensModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  userName?: string;
  // Telas que a conta já tem hoje (limite do plano + extras já compradas),
  // só pra mostrar "de X para X+N" — o servidor é quem soma de verdade.
  currentLimit?: number | null;
}

const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export function BuyScreensModal({ open, onOpenChange, userEmail, userName, currentLimit }: BuyScreensModalProps) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const total = Math.round(qty * EXTRA_SCREEN_PRICE * 100) / 100;

  const handleBuy = async () => {
    if (qty < 1) return;
    setLoading(true);
    try {
      const ref = `onemed_screens_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const { error: buyerErr } = await supabase.from('buyers').insert({
        email: userEmail.toLowerCase().trim(),
        name: userName?.trim() || null,
        plan: 'screens',
        amount: 0,
        status: 'pending',
        external_reference: ref,
        extra_screens: qty,
      });
      if (buyerErr) throw buyerErr;

      const { data: result, error: fnErr } = await supabase.functions.invoke('mp-create-payment', {
        body: {
          plan: 'screens',
          extraScreens: qty,
          email: userEmail.toLowerCase().trim(),
          name: userName?.trim() || '',
          externalReference: ref,
          origin: window.location.origin,
        },
      });
      if (fnErr || result?.error) {
        throw new Error(result?.error || await extractFunctionErrorMessage(fnErr, 'Erro ao gerar pagamento'));
      }
      window.location.href = result.init_point || result.sandbox_init_point;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar compra');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background-paper border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <MonitorSmartphone className="w-5 h-5 text-primary" /> Comprar telas simultâneas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cada tela extra permite mais um dispositivo conectado ao mesmo tempo na sua conta.
            {typeof currentLimit === 'number' && (
              <> Hoje sua conta permite <span className="text-foreground font-medium">{currentLimit} tela(s)</span> simultânea(s).</>
            )}
          </p>

          <div className="rounded-xl border border-border p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-foreground font-semibold">Telas extras</p>
                <p className="text-xs text-muted-foreground">{fmt(EXTRA_SCREEN_PRICE)} por tela</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 border-border"
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  disabled={qty <= 1 || loading}
                  aria-label="Menos uma tela"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center text-lg font-semibold text-foreground tabular-nums">{qty}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 border-border"
                  onClick={() => setQty(q => Math.min(MAX_EXTRA_SCREENS, q + 1))}
                  disabled={qty >= MAX_EXTRA_SCREENS || loading}
                  aria-label="Mais uma tela"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {typeof currentLimit === 'number' && (
              <div className="flex items-center gap-2 text-sm text-accent-success">
                <Check className="w-4 h-4 shrink-0" />
                Sua conta passará a permitir {currentLimit + qty} telas simultâneas
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-bold text-foreground">{fmt(total)}</span>
            </div>
          </div>

          <Button
            onClick={handleBuy}
            disabled={loading}
            className="w-full gap-1.5 bg-primary hover:bg-primary-hover text-primary-foreground"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? 'Abrindo pagamento...' : `Pagar ${fmt(total)}`}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            A tela extra é permanente e vale enquanto sua assinatura estiver ativa. O acréscimo passa a
            valer no seu próximo login após o pagamento aprovado.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
