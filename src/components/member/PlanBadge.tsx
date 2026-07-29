import { PLAN_LABELS } from '@/lib/plans';

// Anel colorido ao redor do avatar por plano — Mensal fica sem anel (base),
// os demais escalam em intensidade/cor conforme o tier.
const RING_CLASSES: Record<string, string> = {
  annual: 'ring-2 ring-primary/40',
  lifetime: 'ring-2 ring-primary',
  lifetime_plus: 'ring-2 ring-orange-500',
};

const GOLD_GRADIENT = 'conic-gradient(from 0deg, #fef3c7, #d97706, #fbbf24, #d97706, #fef3c7)';

function SpinningRingAvatar({ gradient, children }: { gradient: string; children: React.ReactNode }) {
  return (
    <div className="relative self-start shrink-0 rounded-full leading-none">
      <div
        className="absolute -inset-[3px] rounded-full animate-spin-slow"
        style={{ background: gradient }}
        aria-hidden
      />
      {/* Máscara opaca do tamanho exato do avatar — sem ela, avatares com fundo
          translúcido (ex: bg-primary/15 do admin) deixam o degradê vazar pro
          meio inteiro em vez de aparecer só nos 3px de borda. */}
      <div className="absolute inset-0 rounded-full bg-background" aria-hidden />
      <div className="relative">{children}</div>
    </div>
  );
}

// Envolve o avatar (children) com o anel do plano. Admin ganha um anel
// vermelho pulsando (box-shadow puro — nunca cobre o meio do avatar, então
// não precisa da máscara usada pelo giratório) e mais grosso (4px) que
// qualquer anel de plano pago (2-3px), pra se destacar de qualquer usuário
// normal de cara. Vitalício Pro ganha um anel dourado girando (pseudo-borda
// via conic-gradient + animate-spin-slow, já que o `ring` do Tailwind não
// anima cor/rotação). Os demais planos usam só a classe `ring-*` estática.
export function PlanAvatarRing({ plan, isAdmin, children }: { plan?: string | null; isAdmin?: boolean; children: React.ReactNode }) {
  if (isAdmin) {
    return (
      <div className="relative self-start shrink-0 rounded-full leading-none animate-admin-ring-pulse">
        {children}
      </div>
    );
  }
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
