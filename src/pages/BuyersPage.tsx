import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTimeSP, todayStartISO, yesterdayStartISO, fetchAllRows, formatBRL } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Users, Clock, TrendingUp, Mail, Calendar, Phone, Trash2, UserPlus, Loader2, RefreshCw, CheckCircle, XCircle, X, Download, AlertTriangle } from 'lucide-react';
import { WhatsAppLink } from '@/components/WhatsAppLink';

const PLAN_LABELS: Record<string, string> = {
  monthly: 'Mensal', annual: 'Anual', lifetime: 'Vitalício', lifetime_plus: 'Vitalício Plus', lifetime_pro: 'Vitalício Pro',
};

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
  // A lista carrega só os APROVADOS (é dela que sai a receita). Mas o suporte
  // recebe o comprovante de compras que deram errado também — cancelada,
  // recusada, estornada —, e era justamente essa que não aparecia em busca
  // nenhuma. Quando o termo não casa com nenhum aprovado, procura no banco
  // inteiro e mostra à parte.
  const [foraDaLista, setForaDaLista] = useState<any[]>([]);

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
      const yesterdayISO = yesterdayStartISO();
      const today = all.filter(b => b.created_at >= todayISO);
      // Ontem = janela fechada [ontem 00h, hoje 00h): não pode incluir hoje.
      const yesterday = all.filter(b => b.created_at >= yesterdayISO && b.created_at < todayISO);
      const byPlan: Record<string, number> = {};
      for (const plan of Object.keys(PLAN_LABELS)) {
        byPlan[plan] = today.filter(b => b.plan === plan).length;
      }
      const somaAmount = (rows: any[]) => rows.reduce((s: number, b: any) => s + (b.amount || 0), 0);
      setStats({
        total: today.length,
        approved: today.filter(b => b.status === 'approved').length,
        revenue: somaAmount(today.filter(b => b.status === 'approved')),
        revenueYesterday: somaAmount(yesterday.filter(b => b.status === 'approved')),
        approvedYesterday: yesterday.filter(b => b.status === 'approved').length,
        byPlan,
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
    const buyer = buyers.find(b => b.id === id);
    // Registro de pagamento é histórico financeiro (e atribuição do pixel) —
    // um clique errado no ícone da lixeira não pode apagar sem perguntar.
    if (!confirm(`Excluir permanentemente o comprador ${buyer?.email || ''}? O registro do pagamento se perde.`)) return;
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

  // Antes do pagamento, `payment_id` guarda o id da PREFERÊNCIA do Mercado
  // Pago (tem hífen) — não existe transação ainda. O número que o cliente vê
  // no comprovante é só o numérico, gravado pelo webhook quando o pagamento
  // se confirma. Mostrar a preferência como "número da transação" faria o
  // suporte procurar por um número que o cliente nunca viu.
  const numeroTransacao = (paymentId: string | null | undefined) => {
    const v = String(paymentId || '').trim();
    return /^\d+$/.test(v) ? v : null;
  };

  const copiarTransacao = (numero: string) => {
    navigator.clipboard?.writeText(numero)
      .then(() => toast.success('Número da transação copiado'))
      .catch(() => toast.error('Não foi possível copiar'));
  };

  // Buscar pelo NÚMERO DA TRANSAÇÃO é o caminho de suporte mais comum: o
  // cliente manda o print do comprovante do Mercado Pago e é preciso descobrir
  // de quem é a compra.
  const filtered = buyers.filter(b =>
    !search
    || b.email.toLowerCase().includes(search.toLowerCase())
    || (b.name || '').toLowerCase().includes(search.toLowerCase())
    || (b.whatsapp || '').includes(search)
    || String(b.payment_id || '').includes(search.trim())
    || String(b.external_reference || '').toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const termo = search.trim();
    if (!termo || filtered.length > 0) { setForaDaLista([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase.from('buyers')
        .select('*')
        .or(`payment_id.ilike.%${termo}%,external_reference.ilike.%${termo}%,email.ilike.%${termo}%`)
        .neq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(20);
      setForaDaLista(data || []);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filtered.length]);

  const statusBadge = (status: string) => {
    const map: Record<string, [string, string]> = {
      approved: ['badge-active', 'Aprovado'],
      pending: ['badge-pending', 'Pendente'],
      cancelled: ['badge-expired', 'Cancelado'],
      rejected: ['badge-revoked', 'Recusado'],
      charged_back: ['badge-revoked', 'Estornado'],
      refunded: ['badge-revoked', 'Reembolsado'],
    };
    const [cls, label] = map[status] || ['badge-revoked', status];
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
  };

  // Origem da venda, gravada pelo mp-create-payment a partir do que a conta já
  // tinha. Compra antiga sem a coluna preenchida mostra "—" em vez de chutar.
  const origemBadge = (kind: string | null | undefined) => {
    const map: Record<string, [string, string]> = {
      new: ['bg-accent-success/15 text-accent-success', 'Novo assinante'],
      upgrade: ['bg-primary/15 text-primary', 'Upgrade'],
      renewal: ['bg-secondary text-muted-foreground', 'Renovação'],
      screens: ['bg-secondary text-muted-foreground', 'Telas extras'],
    };
    const achado = kind ? map[kind] : undefined;
    if (!achado) return <span className="text-muted-foreground text-xs">—</span>;
    const [cls, label] = achado;
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>{label}</span>;
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 3xl:max-w-[1400px]">
          <Card className="bg-background-paper border-border lg:col-span-1">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Total</p>
                <DollarSign className="w-4 h-4 text-accent-success" />
              </div>
              <p className="font-secondary text-2xl font-bold text-foreground">
                {loading ? '—' : formatBRL(buyers.reduce((s, b) => s + (b.amount || 0), 0))}
              </p>
            </CardContent>
          </Card>
          {[
            { label: 'Compradores', value: loading ? '—' : buyers.length, icon: Users, color: 'text-primary' },
            { label: 'Receita Hoje', value: stats ? formatBRL(stats.revenue) : '—', icon: DollarSign, color: 'text-accent-warning' },
            { label: 'Receita Ontem', value: stats ? formatBRL(stats.revenueYesterday ?? 0) : '—', icon: DollarSign, color: 'text-accent-info' },
            { label: 'Aprovados Hoje', value: stats?.approved ?? '—', icon: CheckCircle, color: 'text-accent-success' },
            { label: 'Aprovados Ontem', value: stats?.approvedYesterday ?? '—', icon: CheckCircle, color: 'text-accent-info' },
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
          <Card className="bg-background-paper border-border col-span-2 lg:col-span-3">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Vendas Hoje por Plano</p>
                <TrendingUp className="w-4 h-4 text-accent-info" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {Object.entries(PLAN_LABELS).map(([plan, label]) => (
                  <div key={plan} className="rounded-lg bg-secondary/50 border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground truncate">{label}</p>
                    <p className="font-secondary text-lg font-bold text-foreground">{loading ? '—' : stats?.byPlan?.[plan] ?? 0}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por email, nome, WhatsApp ou nº da transação..." className="bg-background-paper border-border text-foreground max-w-md" />

        {/* Table */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="px-4 py-3 border-b border-border">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between gap-3">
              <span>Compradores</span>
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                {loading ? '—' : `${filtered.length} ${filtered.length === 1 ? 'registro' : 'registros'}`}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Quadro com altura própria: a lista rola AQUI dentro em vez de
                esticar a página. Com centenas de compradores, a rolagem da
                página inteira deixava os cartões de resumo e a busca longe
                da tela. O cabeçalho fica fixo no topo do quadro (cada th
                precisa do próprio fundo, senão as linhas passam por baixo). */}
            <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border">
                    {['Email', 'WhatsApp', 'Nome', 'Plano', 'Origem', 'Valor', 'Transação', 'Status', 'Data', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase text-muted-foreground bg-background-paper border-b border-border">{h}</th>
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
                      <td className="px-4 py-3 text-sm text-muted-foreground">{PLAN_LABELS[buyer.plan] || buyer.plan}</td>
                      <td className="px-4 py-3">{origemBadge(buyer.purchase_kind)}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{buyer.amount ? formatBRL(buyer.amount) : '—'}</td>
                      <td className="px-4 py-3">
                        {numeroTransacao(buyer.payment_id) ? (
                          <button
                            onClick={() => copiarTransacao(numeroTransacao(buyer.payment_id)!)}
                            title="Copiar número da transação"
                            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {numeroTransacao(buyer.payment_id)}
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
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
              {!loadError && filtered.length === 0 && foraDaLista.length > 0 && (
                <div className="px-4 py-5 space-y-3">
                  <p className="text-sm text-foreground">
                    Nenhum comprador <strong>aprovado</strong> com esse termo. Encontrado em compras não aprovadas:
                  </p>
                  {foraDaLista.map(b => (
                    <div key={b.id} className="rounded-lg border border-border bg-secondary/30 px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-foreground font-medium">{b.email}</span>
                        {statusBadge(b.status)}
                        <span className="text-muted-foreground">{PLAN_LABELS[b.plan] || b.plan}</span>
                        <span className="text-foreground">{b.amount ? formatBRL(b.amount) : '—'}</span>
                        <span className="text-muted-foreground">{formatDateTimeSP(b.created_at)}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                        <span>Nome: {b.name || '— (não informado nesta compra)'}</span>
                        {numeroTransacao(b.payment_id) && <span className="font-mono">Transação: {numeroTransacao(b.payment_id)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!loadError && filtered.length === 0 && foraDaLista.length === 0 && !loading && (
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
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                    <SelectItem value="lifetime">Vitalício</SelectItem>
                    <SelectItem value="lifetime_plus">Vitalício Plus</SelectItem>
                    <SelectItem value="lifetime_pro">Vitalício Pro</SelectItem>
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
