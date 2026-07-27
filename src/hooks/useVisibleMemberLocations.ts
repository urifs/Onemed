import { useMemo } from 'react';
import { useMemberLocationsMap, MemberLocationPoint } from '@/hooks/useMemberLocationsMap';
import { useOnlineMembers } from '@/hooks/useOnlineMembers';

export interface LocationPoint extends MemberLocationPoint {
  is_online: boolean;
}

// Compartilhado entre o card do mapa e o card de "Localizações" (cards
// irmãos, lado a lado no dashboard) — mesma derivação online/offline pros
// dois nunca ficarem dessincronizados entre si.
export function useVisibleMemberLocations() {
  const { points, loading, loadError } = useMemberLocationsMap();
  const { onlineIds } = useOnlineMembers();

  // Online = está de fato no canal de presença em tempo real agora (mesma
  // fonte do card "Quem está online", nunca uma janela de tempo aproximada)
  // — inclui trial. Offline só aparece se for assinante; trial que saiu do
  // ar simplesmente some do mapa.
  const visible: LocationPoint[] = useMemo(() => points
    .map(p => ({ ...p, is_online: onlineIds.has(p.user_id) }))
    .filter(p => p.is_online || !p.is_trial),
    [points, onlineIds]);

  const online = visible.filter(p => p.is_online);
  const offline = visible.filter(p => !p.is_online);

  const topLocations = useMemo(() => {
    const groups = new Map<string, LocationPoint[]>();
    for (const p of visible) {
      const label = [p.city, p.region].filter(Boolean).join(', ') || p.country || 'Desconhecido';
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(p);
    }
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 10);
  }, [visible]);

  return { visible, online, offline, topLocations, loading, loadError };
}
