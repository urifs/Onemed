import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { OnlineMembersCard } from '@/components/admin/OnlineMembersCard';
import { MemberLocationsMap } from '@/components/admin/MemberLocationsMap';
import { MetaPixelHealthCard } from '@/components/admin/MetaPixelHealthCard';
import { MemberLocationsList } from '@/components/admin/MemberLocationsList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatDateTimeSP, todayStartISO } from '@/lib/utils';
import { Users, Clock, XCircle, AlertTriangle, ArrowRight, FolderOpen, Eye, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link as RouterLink } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [stats, setStats] = useState<any>(null);
  const [recentAccesses, setRecentAccesses] = useState<any[]>([]);
  const [driveConnected, setDriveConnected] = useState(false);
  const [visitCount, setVisitCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      // Início do dia atual no fuso horário de São Paulo (America/Sao_Paulo)
      const todayISO = todayStartISO();

      const [accessStats, recent, drive, visits] = await Promise.all([
        supabase.from('accesses').select('status, access_type').gte('created_at', todayISO),
        supabase.from('accesses').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('drive_config').select('connected').single(),
        supabase.from('visits').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
      ]);

      if (accessStats.error || recent.error || visits.error) {
        throw accessStats.error || recent.error || visits.error;
      }

      const accesses = accessStats.data || [];
      setStats({
        total: accesses.length,
        active: accesses.filter(a => a.status === 'active').length,
        expired: accesses.filter(a => a.status === 'expired').length,
        revoked: accesses.filter(a => a.status === 'revoked').length,
        trial: accesses.filter(a => a.access_type === 'trial').length,
        paid: accesses.filter(a => a.access_type !== 'trial').length,
      });

      // Deduplica por email, mantendo apenas o mais recente
      const seen = new Set<string>();
      const deduped = (recent.data || []).filter((a: any) => {
        if (seen.has(a.email)) return false;
        seen.add(a.email);
        return true;
      });
      setRecentAccesses(deduped);
      setDriveConnected(drive.data?.connected || false);
      setVisitCount(visits.count || 0);
    } catch {
      toast.error('Erro ao carregar dados');
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, location]);

  const statusBadge = (status: string) => {
    const classes: Record<string, string> = {
      active: 'badge-active',
      expired: 'badge-expired',
      revoked: 'badge-revoked',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${classes[status] || 'badge-pending'}`}>
        {status === 'active' ? 'Ativo' : status === 'expired' ? 'Expirado' : 'Revogado'}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-secondary text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do sistema OneMed</p>
        </div>

        {/* Load error */}
        {loadError && !loading && (
          <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">Não foi possível carregar os dados do dashboard.</span>
            <Button onClick={fetchData} size="sm" variant="outline" className="ml-auto border-border text-foreground hover:bg-secondary gap-2">
              <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
            </Button>
          </div>
        )}

        {/* Drive Alert */}
        {!driveConnected && !loading && !loadError && (
          <div className="flex items-center gap-3 bg-accent-warning/10 border border-accent-warning/20 text-accent-warning rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">Google Drive desconectado.</span>
            <RouterLink to="/admin/drive" className="ml-auto text-sm underline flex items-center gap-1">
              Conectar <ArrowRight className="w-3 h-3" />
            </RouterLink>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Acessos Hoje', value: stats?.total ?? '—', icon: Users, color: 'text-primary' },
            { label: 'Ativos Hoje', value: stats?.active ?? '—', icon: Clock, color: 'text-accent-success' },
            { label: 'Expirados Hoje', value: stats?.expired ?? '—', icon: XCircle, color: 'text-primary' },
            { label: 'Visitas Hoje', value: visitCount, icon: Eye, color: 'text-accent-info' },
          ].map((stat, i) => (
            <Card key={i} className="bg-background-paper border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="font-secondary text-3xl font-bold text-foreground">
                  {loading ? <span className="opacity-30">—</span> : stat.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quem está online (tempo real) + mapa de localização aproximada
            (online inclui testes, offline só assinantes) lado a lado */}
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          <OnlineMembersCard />
          <MetaPixelHealthCard />

          <MemberLocationsMap />
        </div>
        <MemberLocationsList />

        {/* Trial vs Paid */}
        {stats && (
          <Card className="bg-background-paper border-border">
            <CardHeader>
              <CardTitle className="text-base font-medium text-foreground">Trial vs Pagante</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Trial</span>
                    <span className="text-foreground">{stats.trial}</span>
                  </div>
                  <Progress value={stats.total ? (stats.trial / stats.total) * 100 : 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Pagante</span>
                    <span className="text-foreground">{stats.paid}</span>
                  </div>
                  <Progress value={stats.total ? (stats.paid / stats.total) * 100 : 0} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent accesses */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium text-foreground">Acessos Recentes</CardTitle>
            <RouterLink to="/admin/access" className="text-sm text-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </RouterLink>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-secondary rounded animate-pulse" />)}
              </div>
            ) : recentAccesses.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Nenhum acesso ainda</p>
            ) : (
              <div className="space-y-3">
                {recentAccesses.map(access => (
                  <div key={access.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{access.email}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTimeSP(access.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground capitalize">{access.access_type}</span>
                      {statusBadge(access.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
