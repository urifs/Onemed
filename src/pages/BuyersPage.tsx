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
import { DollarSign, Users, Clock, TrendingUp, Mail, Calendar, Phone, Trash2, UserPlus, Loader2, RefreshCw, CheckCircle, XCircle, X, Download, AlertTriangle } from 'lucide-react';
import { WhatsAppLink } from '@/components/WhatsAppLink';

export default function BuyersPage() {
  const { session } = useAuth();
  const [buyers, setBuyers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPlan, setNewPlan] = useState('annual');
  const [newAmount, setNewAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const buyersData = await fetchAllRows((f, t) =>
        supabase.from('buyers').select('*').eq('status', 'approved').order('created_at', { ascending: false }).range(f, t)
      );
      setBuyers(buyersData);
      const all = buyersData;
      const todayISO = todayStartISO();
      const today = all.filter(b => b.created_at >= todayISO);
      setStats({
        total: today.length,
        approved: today.filter(b => b.status === 'approved').length,
        revenue: today.filter(b => b.status === 'approved').reduce((s: number, b: any) => s + (b.amount || 0), 0),
        lifetime: today.filter(b => b.plan === 'lifetime').length,
        annual: today.filter(b => b.plan === 'annual').length,
      });
    } catch {
      toast.error('Erro ao carregar compradores');
      setLoadError(true);
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const exportTxt = () => {
    const lines = buyers.map(b => `${b.email} ${b.whatsapp || ''}`.trimEnd());
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compradores_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = buyers.filter(b =>
    !search || b.email.toLowerCase().includes(search.toLowerCase()) || (b.name || '').toLowerCase().includes(search.toLowerCase()) || (b.whatsapp || '').includes(search)
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-secondary text-3xl font-bold text-foreground">Compradores</h1>
            <p className="text-muted-foreground mt-1">Gerencie os compradores do OneMed</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportTxt} disabled={loading || buyers.length === 0} variant="outline" className="border-border text-muted-foreground hover:text-foreground gap-2">
              <Download className="w-4 h-4" /> Exportar TXT
            </Button>
            <Button onClick={() => setShowModal(true)} className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
              <UserPlus className="w-4 h-4" /> Novo Comprador
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-background-paper border-border lg:col-span-1">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Total</p>
                <DollarSign className="w-4 h-4 text-accent-success" />
              </div>
              <p className="font-secondary text-2xl font-bold text-foreground">
                {loading ? '—' : `R$ ${buyers.reduce((s, b) => s + (b.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </p>
            </CardContent>
          </Card>
          {[
            { label: 'Compradores', value: loading ? '—' : buyers.length, icon: Users, color: 'text-primary' },
            { label: 'Receita Hoje', value: stats ? `R$ ${stats.revenue.toFixed(2)}` : '—', icon: DollarSign, color: 'text-accent-warning' },
            { label: 'Aprovados Hoje', value: stats?.approved ?? '—', icon: CheckCircle, color: 'text-accent-success' },
            { label: 'Vitalícios Hoje', value: stats?.lifetime ?? '—', icon: TrendingUp, color: 'text-accent-info' },
          ].map((s, i) => (
            <Card key={i} className="bg-background-paper border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="font-secondary text-2xl font-bold text-foreground">{s.value}</p>
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
                    {['Email', 'WhatsApp', 'Nome', 'Plano', 'Valor', 'Status', 'Data', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(buyer => (
                    <tr key={buyer.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground">{buyer.email}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {buyer.whatsapp ? (
                          <WhatsAppLink phone={buyer.whatsapp} showIcon className="text-accent-success" />
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{buyer.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{buyer.plan}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{buyer.amount ? `R$ ${Number(buyer.amount).toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-3">{statusBadge(buyer.status)}</td>
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
              {loadError && !loading && (
                <div className="flex flex-col items-center gap-3 py-12 text-center px-4">
                  <AlertTriangle className="w-6 h-6 text-accent-warning" />
                  <p className="text-foreground text-sm font-medium">Não foi possível carregar os compradores</p>
                  <Button onClick={fetchData} size="sm" variant="outline" className="border-border text-muted-foreground hover:text-foreground gap-2">
                    <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                  </Button>
                </div>
              )}
              {!loadError && filtered.length === 0 && !loading && (
                <p className="text-muted-foreground text-center py-12">Nenhum comprador encontrado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-background-paper rounded-2xl p-6 w-full max-w-md border border-border">
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
