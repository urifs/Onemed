import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTimeSP, todayStartISO, fetchAllRows } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Phone, Mail, Clock, Search, Filter, RefreshCw, MessageCircle, UserCheck, CheckCircle2, XCircle, Send } from 'lucide-react';
import { WhatsAppLink } from '@/components/WhatsAppLink';

export default function TrialUsersPage() {
  const { session } = useAuth();
  const [trials, setTrials] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingManychat, setSyncingManychat] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [waSentPhones, setWaSentPhones] = useState<Set<string>>(new Set());
  const [waFailedPhones, setWaFailedPhones] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [trialsData, buyersData, waSends] = await Promise.all([
        fetchAllRows((f, t) => supabase.from('accesses').select('*').eq('access_type', 'trial').order('created_at', { ascending: false }).range(f, t)),
        fetchAllRows((f, t) => supabase.from('buyers').select('email').eq('status', 'approved').range(f, t)),
        fetchAllRows((f, t) => supabase.from('whatsapp_sends').select('phone, status').range(f, t)).catch(() => []),
      ]);
      const buyerEmails = new Set((buyersData || []).map((b: any) => b.email.toLowerCase()));
      const all = (trialsData || []).filter(t => !buyerEmails.has(t.email.toLowerCase()));
      setTrials(all);

      // Montar sets de telefones que receberam/falharam WA
      const sent = new Set<string>();
      const failed = new Set<string>();
      for (const s of (waSends || [])) {
        const digits = (s.phone || '').replace(/\D/g, '');
        if (s.status === 'sent') sent.add(digits);
        else if (s.status === 'failed') failed.add(digits);
      }
      setWaSentPhones(sent);
      setWaFailedPhones(failed);

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
                    {['Email', 'WhatsApp', 'WA Enviado', 'Status', 'Data', 'Expiração'].map(h => (
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
                          <WhatsAppLink phone={trial.whatsapp} showIcon className="text-accent-success" />
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          if (!trial.whatsapp) return <span className="text-muted-foreground text-xs">—</span>;
                          const digits = trial.whatsapp.replace(/\D/g, '');
                          const normalized = digits.startsWith('55') ? digits : '55' + digits;
                          if (waSentPhones.has(normalized) || waSentPhones.has(digits)) {
                            return (
                              <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Enviado
                              </span>
                            );
                          }
                          if (waFailedPhones.has(normalized) || waFailedPhones.has(digits)) {
                            return (
                              <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium">
                                <XCircle className="w-3.5 h-3.5" /> Falhou
                              </span>
                            );
                          }
                          return <span className="text-muted-foreground text-xs">Não enviado</span>;
                        })()}
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
