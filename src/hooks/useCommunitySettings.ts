import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Em cache compartilhado (react-query): o link do grupo muda raramente e este
// hook é montado pelo header em TODA página da área de membros — sem cache,
// cada navegação pagava uma consulta ao banco só pra reler o mesmo valor.
export function useCommunitySettings() {
  const { data, isLoading } = useQuery({
    queryKey: ['community-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('community_settings').select('whatsapp_group_url').maybeSingle();
      return (data as { whatsapp_group_url: string | null } | null)?.whatsapp_group_url || null;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return { whatsappGroupUrl: data ?? null, loading: isLoading };
}
