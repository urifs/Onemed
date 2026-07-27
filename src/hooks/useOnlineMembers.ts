import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PresenceMember {
  user_id: string;
  email: string;
  last_active: string;
  online: boolean;
}

const ROSTER_LIMIT = 50;
const ROSTER_POLL_MS = 60000;

interface RosterRow {
  user_id: string;
  email: string;
  last_active: string;
}

// Combina o roster dos membros mais recentemente ativos (RPC admin-only,
// polling — pega quem está offline há dias) com o canal de presença em
// tempo real (Supabase Realtime, instantâneo — pega quem está online AGORA,
// sem precisar esperar o próximo poll pra saber que alguém entrou/saiu).
export function useOnlineMembers() {
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchRoster = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_member_presence_roster', { _limit: ROSTER_LIMIT });
      if (error) throw error;
      setRoster((data || []) as RosterRow[]);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoster();
    const interval = setInterval(fetchRoster, ROSTER_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchRoster]);

  useEffect(() => {
    const channel = supabase.channel('online-members');
    channel.on('presence', { event: 'sync' }, () => {
      setOnlineIds(new Set(Object.keys(channel.presenceState())));
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const members: PresenceMember[] = [...roster]
    .map(m => ({ ...m, online: onlineIds.has(m.user_id) }))
    .sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return new Date(b.last_active).getTime() - new Date(a.last_active).getTime();
    });

  return { members, onlineIds, onlineCount: onlineIds.size, loading, loadError, refetch: fetchRoster };
}
