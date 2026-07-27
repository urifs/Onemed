import { useCallback, useEffect, useState } from 'react';
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
export function useMemberLocationsMap() {
  const [points, setPoints] = useState<MemberLocationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchPoints = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_member_locations_map');
      if (error) throw error;
      setPoints((data || []) as MemberLocationPoint[]);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoints();
    const interval = setInterval(fetchPoints, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchPoints]);

  return { points, loading, loadError, refetch: fetchPoints };
}
