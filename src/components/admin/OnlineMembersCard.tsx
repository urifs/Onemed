import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Circle, Users, AlertTriangle } from 'lucide-react';
import { useOnlineMembers } from '@/hooks/useOnlineMembers';
import { formatLastSeen } from '@/lib/utils';

const TICK_MS = 30000;

export function OnlineMembersCard() {
  const { members, onlineCount, loading, loadError } = useOnlineMembers();
  // Só pra "há X min/h" avançar sozinho na tela sem precisar de novo fetch.
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-background-paper border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Quem está online
        </CardTitle>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-success bg-accent-success/10 border border-accent-success/25 rounded-full px-2.5 py-1">
          <Circle className="w-2 h-2 fill-accent-success text-accent-success animate-pulse" />
          {onlineCount} online agora
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map(i => <div key={i} className="h-8 bg-secondary rounded animate-pulse" />)}
          </div>
        ) : loadError ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm px-5 py-6">
            <AlertTriangle className="w-4 h-4 text-accent-warning" /> Não foi possível carregar a presença dos membros.
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum membro com atividade registrada ainda.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {members.map(m => (
              <div key={m.user_id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <span className="text-sm text-foreground truncate">{m.email}</span>
                {m.online ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-success shrink-0">
                    <Circle className="w-2 h-2 fill-accent-success text-accent-success animate-pulse" /> Online agora
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    <Circle className="w-2 h-2 fill-muted-foreground/40 text-muted-foreground/40" /> Online {formatLastSeen(m.last_active)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
