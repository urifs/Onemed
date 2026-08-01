import { useState } from 'react';
import { useMemberStatus } from '@/hooks/useMemberStatus';
import { canDownloadPlan } from '@/lib/plans';
import type { DownloadBlockReason } from '@/components/member/DownloadUpsellModal';

// Porteiro do download: quem não pode baixar não dispara o download, vê o
// convite. Uma consulta só (a mesma do guardião de rotas, em cache).
export function useDownloadGate() {
  const { status, plan, loading } = useMemberStatus();
  const [upsellOpen, setUpsellOpen] = useState(false);

  // Enquanto a situação não chega, não bloqueia: pior que deixar baixar sem
  // saber é acusar um assinante de não poder por causa de uma consulta lenta.
  const allowed = loading || status === null || status === 'admin' || canDownloadPlan(plan);
  const reason: DownloadBlockReason = status === 'trial' ? 'trial' : 'upgrade';

  // Envolve a ação de download: devolve true quando pode seguir.
  const ensureCanDownload = () => {
    if (allowed) return true;
    setUpsellOpen(true);
    return false;
  };

  return { allowed, reason, plan, upsellOpen, setUpsellOpen, ensureCanDownload };
}
