import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Circle, AlertTriangle } from 'lucide-react';
import { useVisibleMemberLocations, LocationPoint } from '@/hooks/useVisibleMemberLocations';
import { formatLastSeen } from '@/lib/utils';

export function MemberLocationsList() {
  const { visible, locationGroups, loading, loadError } = useVisibleMemberLocations();
  const [selectedLocation, setSelectedLocation] = useState<{ label: string; users: LocationPoint[] } | null>(null);

  return (
    <Card className="bg-background-paper border-border overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" /> Localizações
        </CardTitle>
        {!loading && !loadError && (
          <p className="text-xs text-muted-foreground">
            {locationGroups.length} localizaç{locationGroups.length !== 1 ? 'ões' : 'ão'} · {visible.length} usuário{visible.length !== 1 ? 's' : ''} no total
          </p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map(i => <div key={i} className="h-8 bg-secondary rounded animate-pulse" />)}
          </div>
        ) : loadError ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm px-5 py-6">
            <AlertTriangle className="w-4 h-4 text-accent-warning" /> Não foi possível carregar as localizações.
          </div>
        ) : locationGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma localização registrada ainda.</p>
        ) : (
          // Mesma altura do mapa do card irmão (h-[420px]), pros dois
          // ficarem alinhados lado a lado — a lista inteira rola por dentro
          // em vez de esticar a página.
          <div className="grid sm:grid-cols-2 sm:gap-x-4 max-h-[420px] overflow-y-auto overscroll-contain">
            {locationGroups.map(([label, users], i) => (
              <button
                key={label}
                onClick={() => setSelectedLocation({ label, users })}
                className="flex items-center gap-2.5 px-5 py-2.5 text-sm text-left hover:bg-secondary transition-colors border-b border-border last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0"
              >
                <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}</span>
                <span className="text-foreground truncate flex-1">{label}</span>
                <span className="text-xs font-semibold text-primary shrink-0">{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!selectedLocation} onOpenChange={(open) => !open && setSelectedLocation(null)}>
        <DialogContent className="bg-background-paper border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> {selectedLocation?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto divide-y divide-border -mx-6">
            {selectedLocation?.users.map(u => (
              <div key={u.user_id} className="flex items-center justify-between gap-3 px-6 py-2.5">
                <span className="text-sm text-foreground truncate">{u.email}</span>
                {u.is_online ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-success shrink-0">
                    <Circle className="w-2 h-2 fill-accent-success text-accent-success animate-pulse" /> Online agora
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    <Circle className="w-2 h-2 fill-muted-foreground/40 text-muted-foreground/40" />
                    {u.last_active ? `Online ${formatLastSeen(u.last_active)}` : 'Offline'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
