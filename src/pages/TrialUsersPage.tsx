import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTimeSP, todayStartISO } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Phone, Mail, Clock, Search, Filter, RefreshCw, MessageCircle, UserCheck } from 'lucide-react';

export default function TrialUsersPage() {
  const { session } = useAuth();
  const [trials, setTrials] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: trialsData }, { data: buyersData }] = await Promise.all([
        supabase.from('accesses').select('*').eq('access_type', 'trial').order('created_at', { ascending: false }),
        supabase.from('buyers').select('email').eq('status', 'approved'),
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
    } catch { toast.error('Erro ao carregar trials'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const syncPurchased = useCallback(async () => {
    setSyncing(true);
    try {
      const [{ data: trialsData }, { data: buyersData }] = await Promise.all([
        supabase.from('accesses').select('*').eq('access_type', 'trial').order('created_at', { ascending: false }),
        supabase.from('buyers').select('email').eq('status', 'approved'),
      ]);
      const buyerEmails = new Set((buyersData || []).map((b: any) => b.email.toLowerCase()));
      const all = (trialsData || []);
      const filtered_out = all.filter(t => buyerEmails.has(t.email.toLowerCase()));
      const remaining = all.filter(t => !buyerEmails.has(t.email.toLowerCase()));
      setTrials(remaining);
      const todayISO = todayStartISO();
      const today = remaining.filter(t => t.created_at >= todayISO);
      setStats({
        total: today.length,
        active: today.filter(t => t.status === 'active').length,
        expired: today.filter(t => t.status === 'expired').length,
        withWhatsapp: today.filter(t => t.whatsapp).length,
      });
      if (filtered_out.length > 0) {
        toast.success(`${filtered_out.length} trial(s) removido(s) — já compraram`);
      } else {
        toast.success('Lista já sincronizada, nenhum comprador encontrado nos trials');
      }
    } catch {
      toast.error('Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    let result = trials;
    if (search) result = result.filter(t => t.email.includes(search) || (t.whatsapp || '').includes(search));
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    setFiltered(result);
  }, [trials, search, statusFilter]);

  const statusBadge = (status: string) => {
    const map: Record<string, [string, string]> = {
      active: ['badge-active', 'Ativo'],
      expired: ['badge-expired', 'Expirado'],
      revoked: ['badge-revoked', 'Revogado'],
    };
    const [cls, label] = map[status] || ['badge-pending', status];
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
  };

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                  {filtered.map(trial => (
                    <tr key={trial.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground">{trial.email}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {trial.whatsapp ? (
                          <a href={`https://wa.me/${trial.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent-success hover:underline">
                            <MessageCircle className="w-3.5 h-3.5" />
                            {trial.whatsapp}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">{statusBadge(trial.status)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDateTimeSP(trial.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDateTimeSP(trial.expires_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && !loading && (
                <p className="text-muted-foreground text-center py-12">Nenhum usuário trial encontrado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
