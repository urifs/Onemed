import { formatDateTimeSP } from '@/lib/utils';

// Estado de postagem na comunidade — espelho da RPC `community_posting_status()`,
// a MESMA regra que a policy de INSERT de course_comments aplica no servidor.
// Módulo puro (sem client do Supabase) para ser testável; o hook
// useCommunityPostingStatus é quem busca o estado.
export interface CommunityPostingStatus {
  allowed: boolean;
  reason?: 'paused' | 'restricted';
  until?: string | null;
}

export function postingBlockedMessage(st: CommunityPostingStatus | undefined): string | null {
  if (!st || st.allowed) return null;
  if (st.reason === 'paused') {
    return 'A criação de novas publicações na comunidade está temporariamente pausada pela equipe. As publicações existentes continuam visíveis.';
  }
  if (st.reason === 'restricted') {
    return st.until
      ? `Sua participação na comunidade está suspensa até ${formatDateTimeSP(st.until)}.`
      : 'Sua participação na comunidade está suspensa. Fale com o suporte se acreditar que houve um engano.';
  }
  return 'Não é possível publicar na comunidade neste momento.';
}
