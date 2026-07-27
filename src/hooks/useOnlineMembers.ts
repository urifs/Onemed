import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

// supabase.channel(topic) returns the SAME instance for a topic that's
// already registered — calling .on('presence', ...) on it again after
// .subscribe() already ran throws ("cannot add `presence` callbacks ...
// after `subscribe()`"). This hook is used by more than one component on
// the same admin dashboard page (OnlineMembersCard + MemberLocationsMap),
// so the channel has to be a single shared instance, ref-counted across
// every mounted consumer, instead of each hook call creating its own.
let sharedChannel: RealtimeChannel | null = null;
let sharedOnlineIds = new Set<string>();
const sharedListeners = new Set<(ids: Set<string>) => void>();

function subscribeShared(listener: (ids: Set<string>) => void) {
  if (!sharedChannel) {
    sharedChannel = supabase.channel('online-members');
    sharedChannel.on('presence', { event: 'sync' }, () => {
      sharedOnlineIds = new Set(Object.keys(sharedChannel!.presenceState()));
      sharedListeners.forEach(cb => cb(sharedOnlineIds));
    });
    sharedChannel.subscribe();
  }
  sharedListeners.add(listener);
  listener(sharedOnlineIds);

  return () => {
    sharedListeners.delete(listener);
    if (sharedListeners.size === 0 && sharedChannel) {
      supabase.removeChannel(sharedChannel);
      sharedChannel = null;
      sharedOnlineIds = new Set();
    }
  };
}

// Combina o roster dos membros mais recentemente ativos (RPC admin-only,
// polling — pega quem está offline há dias) com o canal de presença em
// tempo real (Supabase Realtime, instantâneo — pega quem está online AGORA,
// sem precisar esperar o próximo poll pra saber que alguém entrou/saiu).
export function useOnlineMembers() {
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(sharedOnlineIds);
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

  useEffect(() => subscribeShared(setOnlineIds), []);

  const members: PresenceMember[] = [...roster]
    .map(m => ({ ...m, online: onlineIds.has(m.user_id) }))
    .sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return new Date(b.last_active).getTime() - new Date(a.last_active).getTime();
    });

  return { members, onlineIds, onlineCount: onlineIds.size, loading, loadError, refetch: fetchRoster };
}
