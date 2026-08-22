import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, Mail, Phone, Calendar, DollarSign, Monitor, MonitorUp, Crown } from 'lucide-react';
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
  /** Telas extras COMPRADAS além do limite do plano. */
  extraScreens?: number;
  /** Limite total já somado pelo servidor (plano + extras). */
  deviceLimit?: number | null;
}

// Rótulos que só existem aqui: PLAN_LABELS (plans.ts) cobre os planos à
// venda, mas esta tela também abre para trial, admin e o 'paid' legado — sem
// isto o aluno via o slug cru ("trial") como nome do plano.
const EXTRA_LABELS: Record<string, string> = {
  trial: 'Teste Grátis',
  paid: 'Plano Pago',
  admin: 'Administrador',
};

export function PlanDetailsModal({ open, onOpenChange, plan, email, whatsapp, amountPaid, expiresAt, isLifetime, grantedAt, extraScreens = 0, deviceLimit }: PlanDetailsModalProps) {
  // A lista de benefícios descreve o PLANO, então traz o número de telas de
  // tabela. Com telas extras compradas isso ficava contradizendo a linha logo
  // abaixo ("2 telas simultâneas" acima de "Telas simultâneas 4"). Aqui o item
  // passa a refletir o que a conta REALMENTE tem, dizendo de onde vem.
  const features = (PLAN_FEATURES[plan] || []).map(f =>
    extraScreens > 0 && /\d+\s*telas?\s+simult/i.test(f)
      ? f.replace(/\d+\s*telas?\s+simult[âa]neas?/i,
          `${(PLAN_DEVICE_LIMITS[plan] ?? DEFAULT_DEVICE_LIMIT) + extraScreens} telas simultâneas`)
        + ` (${PLAN_DEVICE_LIMITS[plan] ?? DEFAULT_DEVICE_LIMIT} do plano + ${extraScreens} extra${extraScreens > 1 ? 's' : ''})`
      : f);
  // Admin não passa pelo enforce_session_limit, então não tem teto de telas.
  const telasDoPlano = PLAN_DEVICE_LIMITS[plan] ?? DEFAULT_DEVICE_LIMIT;
  // O TOTAL vem do servidor, que é quem soma as telas extras compradas — e é o
  // mesmo número que o limite de sessões aplica. Recalcular aqui pela tabela do
  // plano ignorava as extras: quem comprava uma tela continuava vendo o limite
  // antigo no perfil, sem sinal nenhum de que a compra valeu.
  const totalTelas = plan === 'admin'
    ? 'Ilimitado'
    : (typeof deviceLimit === 'number' ? deviceLimit : telasDoPlano + extraScreens);
  const temExtras = plan !== 'admin' && extraScreens > 0;
  // Trial e admin não têm valor de tabela — "R$ 0,00" como preço do plano só
  // confundiria; a linha some.
  const mostraValor = amountPaid > 0 && plan !== 'trial' && plan !== 'admin';

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
            <p className="text-foreground text-lg font-bold">{PLAN_LABELS[plan] || EXTRA_LABELS[plan] || 'Plano OneMed'}</p>
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
            {mostraValor && (
              <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                {/* Valor de TABELA do plano atual — nunca a diferença paga num
                    upgrade (o servidor já manda o preço cheio em amountPaid). */}
                <span className="text-muted-foreground flex items-center gap-2"><DollarSign className="w-3.5 h-3.5" /> Valor do plano</span>
                <span className="text-foreground font-medium">{formatBRL(amountPaid)}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Vencimento</span>
              <span className="text-foreground font-medium">{isLifetime ? 'Nunca expira' : expiresAt ? formatDateSP(expiresAt) : '—'}</span>
            </div>
            <div className="flex items-start justify-between px-4 py-2.5 text-sm gap-3">
              <span className="text-muted-foreground flex items-center gap-2 shrink-0"><Monitor className="w-3.5 h-3.5" /> Telas simultâneas</span>
              <span className="text-right">
                <span className="text-foreground font-medium">{totalTelas}</span>
                {temExtras && (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {telasDoPlano} do plano + {extraScreens} extra{extraScreens > 1 ? 's' : ''}
                  </span>
                )}
              </span>
            </div>
            {temExtras && (
              <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><MonitorUp className="w-3.5 h-3.5 text-accent-success" /> Telas extras compradas</span>
                <span className="text-accent-success font-medium">+{extraScreens}</span>
              </div>
            )}
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
