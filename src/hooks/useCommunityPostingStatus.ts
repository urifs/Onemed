import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { postingBlockedMessage, type CommunityPostingStatus } from '@/lib/communityPosting';

export { postingBlockedMessage, type CommunityPostingStatus } from '@/lib/communityPosting';

export function useCommunityPostingStatus() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['community-posting-status', user?.id],
    enabled: !!user,
    // Curto de propósito: o admin pode pausar/restringir a qualquer momento e
    // o aviso deve aparecer sem exigir F5.
    staleTime: 30_000,
    queryFn: async (): Promise<CommunityPostingStatus> => {
      const { data, error } = await supabase.rpc('community_posting_status' as never);
      if (error) throw error;
      return (data as unknown as CommunityPostingStatus) ?? { allowed: true };
    },
  });
  return { status: query.data, blockedMessage: postingBlockedMessage(query.data) };
}

/**
 * Quando um INSERT é recusado pela RLS, descobre o PORQUÊ perguntando ao
 * servidor — a recusa crua ("violates row-level security") não diz se a
 * comunidade está pausada ou se o usuário está restrito. Devolve null quando
 * o erro não é de permissão (aí a mensagem genérica da tela vale).
 */
export async function explainPostDenial(error: { code?: string; message?: string } | null): Promise<string | null> {
  const texto = `${error?.code || ''} ${error?.message || ''}`;
  if (!/42501|row-level security/i.test(texto)) return null;
  try {
    const { data } = await supabase.rpc('community_posting_status' as never);
    return postingBlockedMessage(data as unknown as CommunityPostingStatus);
  } catch {
    return null;
  }
}
