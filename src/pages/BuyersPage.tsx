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
import { DollarSign, Users, Clock, TrendingUp, Mail, Calendar, Phone, Trash2, UserPlus, Loader2, RefreshCw, CheckCircle, XCircle, X } from 'lucide-react';

export default function BuyersPage() {
  const { session } = useAuth();
  const [buyers, setBuyers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPlan, setNewPlan] = useState('annual');
  const [newAmount, setNewAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);

  const [driveMap, setDriveMap] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: buyersData }, { data: accessesData }] = await Promise.all([
        supabase.from('buyers').select('*').eq('status', 'approved').order('created_at', { ascending: false }),
        supabase.from('accesses').select('email,drive_permission_id').eq('access_type', 'paid'),
      ]);
      setBuyers(buyersData || []);

      // Mapa email → tem Drive compartilhado
      const map: Record<string, boolean> = {};
      for (const a of accessesData || []) {
        map[a.email] = !!a.drive_permission_id;
      }
      setDriveMap(map);

      const all = buyersData || [];
      const todayISO = todayStartISO();
      const today = all.filter(b => b.created_at >= todayISO);
      setStats({
        total: today.length,
        approved: today.filter(b => b.status === 'approved').length,
        revenue: today.filter(b => b.status === 'approved').reduce((s: number, b: any) => s + (b.amount || 0), 0),
        lifetime: today.filter(b => b.plan === 'lifetime').length,
        annual: today.filter(b => b.plan === 'annual').length,
      });
    } catch { toast.error('Erro ao carregar compradores'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const syncPending = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-pending-buyers', { body: {} });
      if (error) throw new Error('Erro ao sincronizar. Tente novamente.');
      if (data?.error) throw new Error(data.error);
      if (data?.synced > 0) {
        toast.success(`${data.synced} compra(s) sincronizada(s)!`);
        fetchData();
      } else {
        toast.info(`Nenhuma compra nova. Pendentes: ${data?.still_pending ?? 0}, Total: ${data?.total ?? 0}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const createBuyer = async () => {
    if (!newEmail) { toast.error('Informe um email'); return; }
    setCreating(true);
    try {
      const { error } = await supabase.from('buyers').insert({
        email: newEmail.toLowerCase(),
        plan: newPlan,
        amount: newAmount ? parseFloat(newAmount) : null,
        status: 'approved',
        access_granted: true,
      });
      if (error) throw error;
      toast.success('Comprador criado!');
      setShowModal(false);
      setNewEmail(''); setNewAmount('');
      fetchData();
    } catch (err: any) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const deleteBuyer = async (id: string) => {
    const { error } = await supabase.from('buyers').delete().eq('id', id);
    if (error) toast.error('Erro ao deletar');
    else { toast.success('Deletado'); fetchData(); }
  };

  const filtered = buyers.filter(b =>
    !search || b.email.toLowerCase().includes(search.toLowerCase()) || (b.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const map: Record<string, [string, string]> = {
      approved: ['badge-active', 'Aprovado'],
      pending: ['badge-pending', 'Pendente'],
      cancelled: ['badge-expired', 'Cancelado'],
    };
    const [cls, label] = map[status] || ['badge-revoked', status];
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-secondary text-3xl font-bold text-foreground">Compradores</h1>
            <p className="text-muted-foreground mt-1">Gerencie os compradores do OneMed</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={syncPending} disabled={syncing} variant="outline" className="border-border text-foreground gap-2">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sincronizar
            </Button>
            <Button onClick={() => setShowModal(true)} className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
              <UserPlus className="w-4 h-4" /> Novo Comprador
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Hoje', value: stats?.total ?? '—', icon: Users, color: 'text-primary' },
            { label: 'Aprovados Hoje', value: stats?.approved ?? '—', icon: CheckCircle, color: 'text-accent-success' },
            { label: 'Receita Hoje', value: stats ? `R$ ${stats.revenue.toFixed(2)}` : '—', icon: DollarSign, color: 'text-accent-warning' },
            { label: 'Vitalícios Hoje', value: stats?.lifetime ?? '—', icon: TrendingUp, color: 'text-accent-info' },
          ].map((s, i) => (
            <Card key={i} className="bg-background-paper border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="font-secondary text-2xl font-bold text-foreground">{loading ? '—' : s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por email ou nome..." className="bg-background-paper border-border text-foreground max-w-md" />

        {/* Table */}
        <Card className="bg-background-paper border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Email', 'Nome', 'WhatsApp', 'Plano', 'Valor', 'Status', 'Drive', 'Data', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(buyer => (
                    <tr key={buyer.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground">{buyer.email}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{buyer.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{buyer.whatsapp || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{buyer.plan}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{buyer.amount ? `R$ ${Number(buyer.amount).toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-3">{statusBadge(buyer.status)}</td>
                      <td className="px-4 py-3">
                        {driveMap[buyer.email] === true
                          ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-active">Compartilhado</span>
                          : driveMap[buyer.email] === false
                          ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-expired">Pendente</span>
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDateTimeSP(buyer.created_at)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteBuyer(buyer.id)} className="p-1.5 text-muted-foreground hover:text-primary">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && !loading && (
                <p className="text-muted-foreground text-center py-12">Nenhum comprador encontrado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-secondary text-xl font-bold text-foreground">Novo Comprador</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemplo.com" className="bg-secondary border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Plano</label>
                <Select value={newPlan} onValueChange={setNewPlan}>
                  <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background-paper border-border">
                    <SelectItem value="annual">Anual</SelectItem>
                    <SelectItem value="lifetime">Vitalício</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Valor (R$)</label>
                <Input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="199.00" className="bg-secondary border-border text-foreground" />
              </div>
              <Button onClick={createBuyer} disabled={creating} className="w-full bg-primary hover:bg-primary-hover text-primary-foreground">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Comprador'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
