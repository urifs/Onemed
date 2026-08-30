import { memo, useState, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTimeSP, todayStartISO, fetchAllRows } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Clock, Search, Filter, RefreshCw, MessageCircle, UserCheck, Send, AlertTriangle } from 'lucide-react';
import { WhatsAppLink } from '@/components/WhatsAppLink';

// Linha memoizada: sem isto, cada "Mostrar mais" re-renderizava TODAS as
// linhas já na tela (a lista chega a centenas), e cada clique na página
// pagava esse custo de novo. Com memo, só as linhas NOVAS montam.
const statusBadgeDe = (status: string) => {
  const map: Record<string, [string, string]> = {
    active: ['badge-active', 'Ativo'],
    expired: ['badge-expired', 'Expirado'],
    revoked: ['badge-revoked', 'Revogado'],
  };
  const [cls, label] = map[status] || ['badge-pending', status];
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
};

const TrialRow = memo(function TrialRow({ trial }: { trial: any }) {
  return (
    <tr className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
      <td className="px-4 py-3 text-sm text-foreground">{trial.email}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {trial.whatsapp ? (
          <WhatsAppLink phone={trial.whatsapp} showIcon className="text-accent-success" />
        ) : '—'}
      </td>
      <td className="px-4 py-3">{statusBadgeDe(trial.status)}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDateTimeSP(trial.created_at)}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDateTimeSP(trial.expires_at)}</td>
    </tr>
  );
});

export default function TrialUsersPage() {
  const { session } = useAuth();
  const [trials, setTrials] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingManychat, setSyncingManychat] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // Quantas linhas de fato renderizar. A lista tem milhares de trials e cada
  // linha monta um menu Radix (WhatsApp) — jogar tudo no DOM de uma vez
  // engasgava o render e o clique. Renderiza em lotes com "Mostrar mais".
  const [visiveis, setVisiveis] = useState(100);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [trialsData, buyersData] = await Promise.all([
        fetchAllRows((f, t) => supabase.from('accesses').select('*').eq('access_type', 'trial').order('created_at', { ascending: false }).range(f, t)),
        fetchAllRows((f, t) => supabase.from('buyers').select('email').eq('status', 'approved').range(f, t)),
      ]);
      const buyerEmails = new Set((buyersData || []).map((b: any) => b.email.toLowerCase()));
      const all = (trialsData || []).filter(t => !buyerEmails.has(t.email.toLowerCase()));
      setTrials(all);

      const todayISO = todayStartISO();
      const today = all.filter(t => t.created_at >= todayISO);
      setStats({
        total: today.length,
        active: today.filter(t => t.status === 'active').length,
        expired: today.filter(t => t.status === 'expired').length,
        withWhatsapp: today.filter(t => t.whatsapp).length,
      });
    } catch {
      toast.error('Erro ao carregar trials');
      setLoadError(true);
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const syncPurchased = useCallback(async () => {
    setSyncing(true);
    try {
      const [trialsData, buyersData] = await Promise.all([
        fetchAllRows((f, t) => supabase.from('accesses').select('id, email').eq('access_type', 'trial').range(f, t)),
        fetchAllRows((f, t) => supabase.from('buyers').select('email').eq('status', 'approved').range(f, t)),
      ]);
      const buyerEmails = new Set(buyersData.map((b: any) => b.email.toLowerCase()));
      const toDelete = trialsData.filter((t: any) => buyerEmails.has(t.email.toLowerCase()));

      if (toDelete.length === 0) {
        toast.success('Lista já sincronizada, nenhum comprador encontrado nos trials');
        return;
      }

      // Nada no rótulo "Sincronizar" avisa que isto é um DELETE em massa —
      // mostra o tamanho do estrago e pede confirmação antes.
      if (!confirm(`${toDelete.length} trial(s) pertencem a compradores aprovados e serão excluído(s) PERMANENTEMENTE. Continuar?`)) {
        return;
      }

      const ids = toDelete.map((t: any) => t.id);
      const { error } = await supabase.from('accesses').delete().in('id', ids);
      if (error) throw error;

      toast.success(`${toDelete.length} trial(s) excluído(s) permanentemente — já compraram`);
      fetchData();
    } catch (err: any) {
      toast.error('Erro ao sincronizar: ' + (err?.message || 'desconhecido'));
    } finally {
      setSyncing(false);
    }
  }, [fetchData]);

  const syncManychat = useCallback(async () => {
    setSyncingManychat(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const token = s?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-manychat-contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na sincronização');
      toast.success(`Manychat: ${data.synced} sincronizados${data.failed ? `, ${data.failed} com erro` : ''}`);
    } catch (err: any) {
      toast.error('Erro ao sincronizar com Manychat: ' + (err?.message || 'desconhecido'));
    } finally {
      setSyncingManychat(false);
    }
  }, []);

  // Derivado com useMemo (era um useEffect espelhando a lista inteira num
  // segundo estado: dobrava a memória e renderizava duas vezes por tecla).
  // Busca em minúsculas dos dois lados — "Joao@" digitado com maiúscula
  // voltava zero resultados.
  // Busca deferida: digitar não trava a UI mesmo com milhares de linhas — o
  // React mantém a lista antiga responsiva enquanto recalcula o filtro.
  const buscaDeferida = useDeferredValue(search);
  const filtered = useMemo(() => {
    let result = trials;
    const term = buscaDeferida.toLowerCase();
    if (term) result = result.filter(t => t.email.toLowerCase().includes(term) || (t.whatsapp || '').includes(term));
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    return result;
  }, [trials, buscaDeferida, statusFilter]);

  // Ao mudar busca/filtro, volta pro 1º lote (senão "Mostrar mais" acumulava
  // e a lista podia ficar gigante de novo depois de umas buscas).
  useEffect(() => { setVisiveis(100); }, [buscaDeferida, statusFilter]);

  const visiveisLista = useMemo(() => filtered.slice(0, visiveis), [filtered, visiveis]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-secondary text-3xl font-bold text-foreground">Usuários Trial</h1>
            <p className="text-muted-foreground mt-1">Usuários que utilizaram o acesso de teste</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={syncManychat}
              disabled={syncingManychat}
              className="flex items-center gap-2 border-border text-foreground hover:bg-secondary"
            >
              <Send className={`w-4 h-4 ${syncingManychat ? 'animate-pulse' : ''}`} />
              {syncingManychat ? 'Sincronizando...' : 'Sync Manychat'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={syncPurchased}
              disabled={syncing}
              className="flex items-center gap-2 border-border text-foreground hover:bg-secondary"
            >
              <UserCheck className={`w-4 h-4 ${syncing ? 'animate-pulse' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
            <Button variant="ghost" size="icon" onClick={fetchData} className="text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 3xl:max-w-[1400px]">
          {[
            { label: 'Trial Hoje', value: stats?.total ?? '—', icon: Users },
            { label: 'Ativos Hoje', value: stats?.active ?? '—', icon: Clock },
            { label: 'Expirados Hoje', value: stats?.expired ?? '—', icon: Filter },
            { label: 'WhatsApp Hoje', value: stats?.withWhatsapp ?? '—', icon: MessageCircle },
          ].map((s, i) => (
            <Card key={i} className="bg-background-paper border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <s.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="font-secondary text-2xl font-bold text-foreground">{loading ? '—' : s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9 bg-background-paper border-border text-foreground" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-background-paper border-border text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-background-paper border-border">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="bg-background-paper border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Email', 'WhatsApp', 'Status', 'Data', 'Expiração'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visiveisLista.map(trial => <TrialRow key={trial.id} trial={trial} />)}
                </tbody>
              </table>
              {loadError && !loading && (
                <div className="flex flex-col items-center gap-3 py-12 text-center px-4">
                  <AlertTriangle className="w-6 h-6 text-accent-warning" />
                  <p className="text-foreground text-sm font-medium">Não foi possível carregar os trials</p>
                  <Button onClick={fetchData} size="sm" variant="outline" className="border-border text-muted-foreground hover:text-foreground gap-2">
                    <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                  </Button>
                </div>
              )}
              {!loadError && filtered.length === 0 && !loading && (
                <p className="text-muted-foreground text-center py-12">Nenhum usuário trial encontrado</p>
              )}
            </div>
            {!loading && filtered.length > 0 && (
              <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Mostrando {Math.min(visiveis, filtered.length)} de {filtered.length}
                </span>
                {visiveis < filtered.length && (
                  <Button variant="outline" size="sm" onClick={() => setVisiveis(v => v + 200)}
                    className="border-border text-muted-foreground hover:text-foreground">
                    Mostrar mais ({filtered.length - visiveis} restantes)
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
