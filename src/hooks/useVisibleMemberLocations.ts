import { useMemo } from 'react';
import { useMemberLocationsMap, MemberLocationPoint } from '@/hooks/useMemberLocationsMap';
import { useOnlineMembers } from '@/hooks/useOnlineMembers';

export interface LocationPoint extends MemberLocationPoint {
  is_online: boolean;
}

export interface LocationGroup {
  key: string;
  label: string;
  country: string | null;
  countryCode: string | null;
  users: LocationPoint[];
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
  // Total online de verdade (mesma contagem do card "Quem está online") —
  // pode ser maior que online.length: só entra no mapa quem já teve a
  // localização capturada (1ª navegação numa página de membro depois do
  // login), então uma sessão recém-conectada que ainda não navegou fica
  // online mas sem ponto no mapa por alguns instantes.
  const totalOnlineCount = onlineIds.size;

  // TODAS as localizações, da mais populosa pra menos — sem corte. Quem
  // exibe é que decide a altura (o card rola por dentro); cortar aqui
  // escondia cidades inteiras sem nenhum sinal de que existiam.
  //
  // A chave do agrupamento inclui o país, não só o rótulo: existem cidades
  // homônimas em países diferentes (Santiago, Córdoba, San Jose), e juntá-las
  // no mesmo grupo daria uma bandeira errada pra metade dos usuários dali.
  const locationGroups: LocationGroup[] = useMemo(() => {
    const groups = new Map<string, LocationGroup>();
    for (const p of visible) {
      // Cidade/estado bastam pra quem está no Brasil (a esmagadora maioria);
      // fora dele, "Asunción, Central" não diz de que país é — então o país
      // entra no rótulo só nesse caso.
      const local = [p.city, p.region].filter(Boolean).join(', ');
      const label = !local
        ? p.country || 'Desconhecido'
        : p.country && p.country_code !== 'BR'
          ? `${local} — ${p.country}`
          : local;
      const key = `${p.country_code || '??'}|${label}`;
      let group = groups.get(key);
      if (!group) {
        group = { key, label, country: p.country, countryCode: p.country_code, users: [] };
        groups.set(key, group);
      }
      group.users.push(p);
    }
    return [...groups.values()].sort((a, b) => b.users.length - a.users.length);
  }, [visible]);

  return { visible, online, offline, totalOnlineCount, locationGroups, loading, loadError };
}
