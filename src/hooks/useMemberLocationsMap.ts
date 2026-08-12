import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MemberLocationPoint {
  user_id: string;
  email: string;
  city: string | null;
  region: string | null;
  country: string | null;
  country_code: string | null;
  latitude: number;
  longitude: number;
  last_active: string | null;
  is_trial: boolean;
}

const POLL_MS = 60000;

// A RPC só devolve candidatos (localização + trial-ou-assinante); quem está
// online de verdade é decidido aqui no frontend, cruzando com o mesmo canal
// de presença em tempo real do card "Quem está online" — nunca com base em
// auth.sessions (o refresh do token só bate essa coluna perto da expiração,
// não a cada atividade real, então usar ela pra "online" sempre subestimava
// muito quem estava genuinamente conectado).
// react-query com chave única: o mapa e a lista de localizações (cards
// irmãos no dashboard) consomem este hook ao mesmo tempo — sem o cache
// compartilhado cada instância fazia a própria chamada E o próprio polling,
// dobrando as RPCs a cada minuto com a aba aberta.
export function useMemberLocationsMap() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['member-locations-map'],
    refetchInterval: POLL_MS,
    staleTime: POLL_MS - 5000,
    queryFn: async (): Promise<MemberLocationPoint[]> => {
      const { data, error } = await supabase.rpc('get_member_locations_map');
      if (error) throw error;
      return (data || []) as MemberLocationPoint[];
    },
  });

  return { points: data ?? [], loading: isLoading, loadError: isError, refetch };
}
