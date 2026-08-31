import { useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';
import { MapContainer, CircleMarker, Popup } from 'react-leaflet';
import { SecLocation } from '@/hooks/useSecurityOverview';
import { MapBaseLayers } from '@/components/admin/MapBaseLayers';
import { formatLastSeen } from '@/lib/utils';

// Espalha pontos que caem exatamente na mesma lat/lng (cidade/ISP) de forma
// determinística — mesmo ponto sempre desloca pro mesmo lugar.
function jitter(seed: string): [number, number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) { h = (h << 5) - h + seed.charCodeAt(i); h |= 0; }
  const ang = (h % 360) * (Math.PI / 180);
  const rad = 0.02 + (Math.abs(h >> 8) % 100) / 100 * 0.03;
  return [Math.cos(ang) * rad, Math.sin(ang) * rad];
}

export function SecurityMap({ locais }: { locais: SecLocation[] }) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const pontos = useMemo(() => locais
    .filter(l => l.lat != null && l.lng != null)
    .map((l) => {
      const [dLat, dLng] = jitter((l.email || '') + (l.ip || ''));
      const risco = (l.contas_no_ip ?? 1) >= 3;
      return {
        ...l,
        center: [l.lat + dLat, l.lng + dLng] as [number, number],
        cor: risco ? 'hsl(0,84%,58%)' : l.online ? 'hsl(38,92%,50%)' : (isLight ? 'hsl(150,30%,40%)' : 'hsl(150,25%,55%)'),
        raio: risco ? 7 : l.online ? 5 : 4,
        risco,
      };
    }), [locais, isLight]);

  return (
    <div className="h-[420px] w-full rounded-lg overflow-hidden border border-border">
      <MapContainer center={[-14.2, -51.9]} zoom={3} className="h-full w-full" style={{ background: isLight ? '#e8ecef' : '#0b1220' }} worldCopyJump>
        <MapBaseLayers light={isLight} />
        {pontos.map((p, i) => (
          <CircleMarker key={(p.email || '') + i} center={p.center} radius={p.raio}
            pathOptions={{ color: p.cor, fillColor: p.cor, fillOpacity: 0.7, weight: p.risco ? 2 : 1 }}>
            <Popup>
              <div className="text-xs space-y-0.5">
                <div className="font-semibold break-all">{p.email}</div>
                <div>{[p.city, p.region, p.country].filter(Boolean).join(', ') || 'Local desconhecido'}</div>
                <div className="font-mono">{p.ip || '—'}</div>
                {p.risco && <div className="text-red-600 font-semibold">⚠ {p.contas_no_ip} contas neste IP</div>}
                <div className="text-muted-foreground">{p.online ? '● online agora' : formatLastSeen(p.quando)}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
