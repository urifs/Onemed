import { PLAN_LABELS } from '@/lib/plans';

// Anel colorido ao redor do avatar por plano — Mensal fica sem anel (base),
// os demais escalam em intensidade/cor conforme o tier.
const RING_CLASSES: Record<string, string> = {
  annual: 'ring-2 ring-primary/40',
  lifetime: 'ring-2 ring-primary',
  lifetime_plus: 'ring-2 ring-orange-500',
};

const GOLD_GRADIENT = 'conic-gradient(from 0deg, #fef3c7, #d97706, #fbbf24, #d97706, #fef3c7)';
const BLUE_GRADIENT = 'conic-gradient(from 0deg, #dbeafe, #2563eb, #60a5fa, #2563eb, #dbeafe)';

function SpinningRingAvatar({ gradient, children }: { gradient: string; children: React.ReactNode }) {
  return (
    <div className="relative self-start shrink-0 rounded-full leading-none">
      <div
        className="absolute -inset-[3px] rounded-full animate-spin-slow"
        style={{ background: gradient }}
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  );
}

// Envolve o avatar (children) com o anel do plano. Admin e Vitalício Pro
// ganham um anel girando (pseudo-borda via conic-gradient +
// animate-spin-slow, já que box-shadow/ring do Tailwind não anima
// cor/rotação) — azul pra admin, dourado pra Pro. Os demais planos usam só
// a classe `ring-*` estática, sem custo extra de DOM.
export function PlanAvatarRing({ plan, isAdmin, children }: { plan?: string | null; isAdmin?: boolean; children: React.ReactNode }) {
  if (isAdmin) return <SpinningRingAvatar gradient={BLUE_GRADIENT}>{children}</SpinningRingAvatar>;
  if (plan === 'lifetime_pro') return <SpinningRingAvatar gradient={GOLD_GRADIENT}>{children}</SpinningRingAvatar>;
  const ringClass = plan ? RING_CLASSES[plan] || '' : '';
  return <div className={`relative self-start shrink-0 rounded-full leading-none ${ringClass}`}>{children}</div>;
}

const BADGE_STYLES: Record<string, string> = {
  monthly: 'text-muted-foreground bg-secondary border-border',
  annual: 'text-primary bg-primary/10 border-primary/25',
  lifetime: 'text-primary bg-primary/15 border-primary/40',
  lifetime_plus: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30',
  lifetime_pro: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30',
};

export function PlanBadge({ plan }: { plan?: string | null }) {
  if (!plan) return null;
  const label = PLAN_LABELS[plan];
  if (!label) return null;
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold rounded-full px-2 py-0.5 border ${BADGE_STYLES[plan] || BADGE_STYLES.monthly}`}>
      {label.replace('Plano ', '')}
    </span>
  );
}
