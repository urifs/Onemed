import { useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';
import { MapContainer, CircleMarker, Popup } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Circle, AlertTriangle } from 'lucide-react';
import { useVisibleMemberLocations, LocationPoint } from '@/hooks/useVisibleMemberLocations';
import { CountryFlag } from '@/components/admin/CountryFlag';
import { MapBaseLayers } from '@/components/admin/MapBaseLayers';
import { formatLastSeen } from '@/lib/utils';

// Mesmo tom de --primary de src/index.css (claro e escuro) — todo ponto no
// mapa usa a cor da marca; online/offline se distingue por opacidade e
// tamanho, não por cor.
const THEME_COLORS = {
  dark: { dot: 'hsl(0, 84%, 60%)' },
  light: { dot: 'hsl(0, 74%, 46%)' },
};

// IPs de geolocalização costumam devolver a mesma lat/lng pra cidade/ISP
// inteiros — vários usuários da mesma cidade caem exatamente em cima uns
// dos outros e viram um único ponto visível, mesmo dando zoom. Um
// deslocamento pequeno e determinístico (mesmo usuário sempre desloca pro
// mesmo lugar, não pula a cada atualização) espalha esses pontos o
// suficiente pra dar pra contar/ver cada um ao aproximar o zoom.
function jitter(seed: string): [number, number] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const angle = (hash % 360) * (Math.PI / 180);
  const radiusDeg = 0.03 + (Math.abs(hash >> 8) % 100) / 100 * 0.03;
  return [Math.cos(angle) * radiusDeg, Math.sin(angle) * radiusDeg];
}

export function MemberLocationsMap() {
  const { visible, online, offline, totalOnlineCount, loading, loadError } = useVisibleMemberLocations();
  const { resolvedTheme } = useTheme();
  const colors = resolvedTheme === 'light' ? THEME_COLORS.light : THEME_COLORS.dark;
  const unlocated = totalOnlineCount - online.length;

  const plotted = useMemo(() => visible.map((p: LocationPoint) => {
    const [dLat, dLng] = jitter(p.user_id);
    return { ...p, center: [p.latitude + dLat, p.longitude + dLng] as [number, number] };
  }), [visible]);

  return (
    <Card className="bg-background-paper border-border overflow-hidden flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" /> Mapa de Usuários
        </CardTitle>
        <div className="flex items-center gap-2 text-xs">
          <span
            className="inline-flex items-center gap-1.5 font-semibold text-accent-success bg-accent-success/10 border border-accent-success/25 rounded-full px-2.5 py-1"
            title={unlocated > 0 ? `${unlocated} online sem localização conhecida ainda (some ao navegar pra qualquer página)` : undefined}
          >
            <Circle className="w-2 h-2 fill-accent-success text-accent-success animate-pulse" />
            {totalOnlineCount} online{unlocated > 0 ? ` · ${online.length} no mapa` : ''}
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground bg-secondary border border-border rounded-full px-2.5 py-1">
            <Circle className="w-2 h-2 fill-muted-foreground/50 text-muted-foreground/50" />
            {offline.length} assinantes offline
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        {loading ? (
          <div className="h-[420px] bg-secondary animate-pulse" />
        ) : loadError ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm px-5 py-10 justify-center">
            <AlertTriangle className="w-4 h-4 text-accent-warning" /> Não foi possível carregar as localizações.
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nenhuma localização registrada ainda.</p>
        ) : (
          // isolate: os painéis internos do Leaflet (tiles, marcadores,
          // controles de zoom) usam z-index de até 1000 — sem isolar o
          // stacking context aqui, eles vazam por cima de QUALQUER coisa
          // com z-index menor na página inteira, inclusive modais (Dialog
          // usa z-50), abrindo por baixo do mapa em vez de por cima.
          <div
            className="isolate h-[420px] w-full [&_.leaflet-container]:bg-background-subtle
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
              <MapBaseLayers light={resolvedTheme === 'light'} />
              {plotted.map(p => (
                <CircleMarker
                  key={p.user_id}
                  center={p.center}
                  radius={p.is_online ? 6 : 4}
                  pathOptions={{
                    color: colors.dot,
                    fillColor: colors.dot,
                    fillOpacity: p.is_online ? 0.9 : 0.35,
                    opacity: p.is_online ? 1 : 0.6,
                    weight: 1,
                  }}
                >
                  <Popup>
                    <div className="text-xs leading-relaxed">
                      <p className="font-semibold">{p.email}</p>
                      <p className="flex items-center gap-1.5">
                        <CountryFlag code={p.country_code} country={p.country} />
                        <span>{[p.city, p.region].filter(Boolean).join(', ')}{p.country ? ` — ${p.country}` : ''}</span>
                      </p>
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
        )}
      </CardContent>
      <p className="text-xs text-muted-foreground px-5 py-3 border-t border-border">
        Localização aproximada, estimada pelo IP de acesso.
      </p>
    </Card>
  );
}
