import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, Mail, Phone, Calendar, DollarSign, Monitor, Crown } from 'lucide-react';
import { PLAN_LABELS, PLAN_FEATURES, PLAN_DEVICE_LIMITS, DEFAULT_DEVICE_LIMIT } from '@/lib/plans';
import { formatDateSP, formatBRL } from '@/lib/utils';

interface PlanDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: string;
  email: string;
  whatsapp?: string | null;
  amountPaid: number;
  expiresAt: string | null;
  isLifetime: boolean;
  grantedAt?: string | null;
}

export function PlanDetailsModal({ open, onOpenChange, plan, email, whatsapp, amountPaid, expiresAt, isLifetime, grantedAt }: PlanDetailsModalProps) {
  const features = PLAN_FEATURES[plan] || [];
  const deviceLimit = PLAN_DEVICE_LIMITS[plan] ?? DEFAULT_DEVICE_LIMIT;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background-paper border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" /> Detalhes do Plano
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Seu plano</p>
            <p className="text-foreground text-lg font-bold">{PLAN_LABELS[plan] || plan}</p>
          </div>

          {features.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Benefícios inclusos</p>
              <ul className="space-y-1.5">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-accent-success shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              {/* Valor de TABELA do plano atual — nunca a diferença paga num
                  upgrade (o servidor já manda o preço cheio em amountPaid). */}
              <span className="text-muted-foreground flex items-center gap-2"><DollarSign className="w-3.5 h-3.5" /> Valor do plano</span>
              <span className="text-foreground font-medium">{formatBRL(amountPaid)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Vencimento</span>
              <span className="text-foreground font-medium">{isLifetime ? 'Nunca expira' : expiresAt ? formatDateSP(expiresAt) : '—'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground flex items-center gap-2"><Monitor className="w-3.5 h-3.5" /> Telas simultâneas</span>
              <span className="text-foreground font-medium">{deviceLimit}</span>
            </div>
            {grantedAt && (
              <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Desde</span>
                <span className="text-foreground font-medium">{formatDateSP(grantedAt)}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-2.5 text-sm gap-3">
              <span className="text-muted-foreground flex items-center gap-2 shrink-0"><Mail className="w-3.5 h-3.5" /> E-mail</span>
              <span className="text-foreground font-medium truncate">{email}</span>
            </div>
            {whatsapp && (
              <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> WhatsApp</span>
                <span className="text-foreground font-medium">{whatsapp}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
