import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface AccountInfo {
  email: string;
  plan: string | null;
  isLifetime: boolean;
  isAdmin: boolean;
  expiresAt: string | null;
  amountPaid: number | null;
  whatsapp: string | null;
  grantedAt: string | null;
}

/**
 * Dados da conta via `member-account-info`, em cache compartilhado.
 *
 * Antes, o TrialCountdownBar invocava a Edge Function a CADA navegação (o
 * MemberHeader remonta por rota) e o AccountMenu invocava de novo a cada
 * abertura do popover — para todo aluno, de qualquer plano. Com a chave
 * única do react-query, todos os consumidores dividem a mesma resposta e a
 * função só é chamada de novo quando o cache de 1 minuto vence.
 */
export function useAccountInfo(enabled = true) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['member-account-info', user?.id],
    enabled: !!user && enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<AccountInfo> => {
      const { data, error } = await supabase.functions.invoke('member-account-info');
      if (error || data?.error) throw new Error(data?.error || error?.message);
      return data as AccountInfo;
    },
  });

  return {
    info: query.data ?? null,
    loading: query.isLoading,
    error: query.isError ? (query.error as Error) : null,
    refetch: query.refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ['member-account-info', user?.id] }),
  };
}
