import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SecurityOverview } from '@/lib/security';

export * from '@/lib/security';

export function useSecurityOverview(hours = 24, enabled = true) {
  return useQuery({
    queryKey: ['security-overview', hours],
    enabled,
    queryFn: async (): Promise<SecurityOverview> => {
      const { data, error } = await supabase.rpc('admin_security_overview' as never, { _hours: hours } as never);
      if (error) throw error;
      return data as unknown as SecurityOverview;
    },
    // "ao vivo": atualiza sozinho a cada 20s enquanto a aba está aberta.
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });
}
