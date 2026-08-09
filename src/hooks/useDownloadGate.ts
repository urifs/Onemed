import { useState } from 'react';
import { useMemberStatus } from '@/hooks/useMemberStatus';
import { canDownloadItem, isLessonVideo } from '@/lib/plans';
import type { DownloadBlockReason } from '@/components/member/DownloadUpsellModal';

type GatedItem = { type?: string | null } | null | undefined;

// Porteiro do download: quem não pode baixar não dispara o download, vê o
// convite. Uma consulta só (a mesma do guardião de rotas, em cache).
//
// A decisão depende do TIPO do item, não só do plano: aula em vídeo é
// exclusividade do Vitalício Pro, arquivo continua liberado do Vitalício pra
// cima. Por isso `ensureCanDownload` e `allowedFor` recebem o item.
export function useDownloadGate() {
  const { status, plan, loading } = useMemberStatus();
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [reason, setReason] = useState<DownloadBlockReason>('upgrade');

  // Enquanto a situação não chega, não bloqueia: pior que deixar baixar sem
  // saber é acusar um assinante de não poder por causa de uma consulta lenta.
  // (O servidor decide de verdade — aqui é só a interface.)
  const indefinido = loading || status === null;

  const allowedFor = (item?: GatedItem) =>
    indefinido || status === 'admin' || canDownloadItem(plan, item);

  const motivoPara = (item?: GatedItem): DownloadBlockReason => {
    if (status === 'trial') return 'trial';
    // Assinante que já podia baixar arquivo e esbarrou numa aula: o convite
    // tem que dizer que o que falta é o Pro, não que "seu plano não baixa".
    if (isLessonVideo(item) && canDownloadItem(plan, { type: 'pdf' })) return 'lesson-pro';
    return 'upgrade';
  };

  // Envolve a ação de download: devolve true quando pode seguir.
  const ensureCanDownload = (item?: GatedItem) => {
    if (allowedFor(item)) return true;
    setReason(motivoPara(item));
    setUpsellOpen(true);
    return false;
  };

  return { allowedFor, reason, plan, upsellOpen, setUpsellOpen, ensureCanDownload };
}
