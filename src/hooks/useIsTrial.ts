import { useMemberStatus } from '@/hooks/useMemberStatus';

// Conta em teste grátis. Sai do mesmo my_member_status que o guardião das
// rotas usa (uma consulta só, em cache) — assim quem bloqueia a comunidade e
// quem bloqueia a área de membros nunca discordam sobre a situação da conta.
export function useIsTrial() {
  const { status, loading } = useMemberStatus();
  return { isTrial: status === 'trial', loading };
}
