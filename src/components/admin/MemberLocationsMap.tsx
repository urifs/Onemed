import { useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Circle, AlertTriangle } from 'lucide-react';
import { useMemberLocationsMap, MemberLocationPoint } from '@/hooks/useMemberLocationsMap';
import { useOnlineMembers } from '@/hooks/useOnlineMembers';
import { formatLastSeen } from '@/lib/utils';

// Mesmos tons de --success/--muted-foreground de src/index.css (claro e
// escuro), pra bater com o resto do painel admin — o Leaflet não lê
// variáveis CSS do Tailwind, então os valores precisam vir hardcoded aqui.
const THEME_COLORS = {
  dark: { online: 'hsl(160, 84%, 39%)', offline: 'hsl(215, 20%, 55%)', tiles: 'dark_all' },
  light: { online: 'hsl(160, 84%, 30%)', offline: 'hsl(215, 14%, 40%)', tiles: 'light_all' },
};

interface LocationPoint extends MemberLocationPoint {
  is_online: boolean;
}

export function MemberLocationsMap() {
  const { points, loading, loadError } = useMemberLocationsMap();
  const { onlineIds } = useOnlineMembers();
  const { resolvedTheme } = useTheme();
  const colors = resolvedTheme === 'light' ? THEME_COLORS.light : THEME_COLORS.dark;

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
    const counts = new Map<string, number>();
    for (const p of visible) {
      const label = [p.city, p.region].filter(Boolean).join(', ') || p.country || 'Desconhecido';
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [visible]);

  return (
    <Card className="bg-background-paper border-border overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" /> Mapa de Usuários
        </CardTitle>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-accent-success bg-accent-success/10 border border-accent-success/25 rounded-full px-2.5 py-1">
            <Circle className="w-2 h-2 fill-accent-success text-accent-success animate-pulse" />
            {online.length} online (inclui testes)
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground bg-secondary border border-border rounded-full px-2.5 py-1">
            <Circle className="w-2 h-2 fill-muted-foreground/50 text-muted-foreground/50" />
            {offline.length} assinantes offline
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="h-[420px] bg-secondary animate-pulse" />
        ) : loadError ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm px-5 py-10 justify-center">
            <AlertTriangle className="w-4 h-4 text-accent-warning" /> Não foi possível carregar as localizações.
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nenhuma localização registrada ainda.</p>
        ) : (
          <div className="grid lg:grid-cols-[1fr_260px]">
            <div
              className="h-[420px] w-full [&_.leaflet-container]:bg-background-subtle
                [&_.leaflet-popup-content-wrapper]:!bg-popover [&_.leaflet-popup-content-wrapper]:!text-popover-foreground
                [&_.leaflet-popup-tip]:!bg-popover [&_.leaflet-popup-content-wrapper]:!shadow-xl
                [&_.leaflet-popup-close-button]:!text-muted-foreground"
            >
              <MapContainer
                center={[-14, -51]}
                zoom={3}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url={`https://{s}.basemaps.cartocdn.com/${colors.tiles}/{z}/{x}/{y}{r}.png`}
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                {visible.map(p => (
                  <CircleMarker
                    key={p.user_id}
                    center={[p.latitude, p.longitude]}
                    radius={5}
                    pathOptions={{
                      color: p.is_online ? colors.online : colors.offline,
                      fillColor: p.is_online ? colors.online : colors.offline,
                      fillOpacity: 0.85,
                      weight: 1,
                    }}
                  >
                    <Popup>
                      <div className="text-xs leading-relaxed">
                        <p className="font-semibold">{p.email}</p>
                        <p>{[p.city, p.region].filter(Boolean).join(', ')}{p.country ? ` — ${p.country}` : ''}</p>
                        <p>
                          {p.is_online ? 'Online agora' : p.last_active ? `Online ${formatLastSeen(p.last_active)}` : 'Última atividade desconhecida'}
                          {p.is_trial ? ' · Teste grátis' : ''}
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>

            <div className="border-t lg:border-t-0 lg:border-l border-border">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Localizações</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{visible.length} usuário{visible.length !== 1 ? 's' : ''} no total</p>
              </div>
              <div className="max-h-[372px] overflow-y-auto divide-y divide-border">
                {topLocations.map(([label, count], i) => (
                  <div key={label} className="flex items-center gap-2.5 px-4 py-2 text-sm">
                    <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}</span>
                    <span className="text-foreground truncate flex-1">{label}</span>
                    <span className="text-xs font-semibold text-primary shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <p className="text-xs text-muted-foreground px-5 py-3 border-t border-border">
        Localização aproximada, estimada pelo IP de acesso.
      </p>
    </Card>
  );
}
