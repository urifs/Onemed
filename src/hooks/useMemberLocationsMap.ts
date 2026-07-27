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
  is_online: boolean;
  is_trial: boolean;
}

const POLL_MS = 60000;
// Considera "online" quem teve atividade de sessão nos últimos N minutos —
// aproximação por polling, diferente do dot em tempo real do OnlineMembersCard.
const ONLINE_WINDOW_MINUTES = 5;

export function useMemberLocationsMap() {
  const [points, setPoints] = useState<MemberLocationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchPoints = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_member_locations_map', { _online_minutes: ONLINE_WINDOW_MINUTES });
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
