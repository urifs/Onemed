import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTimeSP, fetchAllRows, formatBRL } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Users, Clock, TrendingUp, Mail, Calendar, Phone, Trash2, UserPlus, Loader2, RefreshCw, CheckCircle, XCircle, X, Download, AlertTriangle, ChevronDown } from 'lucide-react';
import { WhatsAppLink } from '@/components/WhatsAppLink';

const PLAN_LABELS: Record<string, string> = {
  monthly: 'Mensal', annual: 'Anual', lifetime: 'Vitalício', lifetime_plus: 'Vitalício Plus', lifetime_pro: 'Vitalício Pro',
};

// Quantos compradores por vez. A lista inteira (656 aprovados e crescendo,
// com fbp/fbc/user-agent em cada linha) chegava de uma vez e era renderizada
// de uma vez — a página levava segundos para responder. Os NÚMEROS não dependem
// mais disso: vêm somados do banco pela RPC admin_buyers_overview.
const PAGE_SIZE = 100;

export default function BuyersPage() {
  const { session } = useAuth();
  const [buyers, setBuyers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [temMais, setTemMais] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPlan, setNewPlan] = useState('annual');
  const [newAmount, setNewAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [buscando, setBuscando] = useState(false);
  // Resultado da busca NO BANCO. Com a lista paginada, filtrar só o que já
  // está na tela acharia apenas os 100 mais recentes — quem o suporte procura
  // costuma ser justamente uma compra antiga.
  const [resultados, setResultados] = useState<any[] | null>(null);
  const [exportando, setExportando] = useState(false);
  // A lista carrega só os APROVADOS (é dela que sai a receita). Mas o suporte
  // recebe o comprovante de compras que deram errado também — cancelada,
  // recusada, estornada —, e era justamente essa que não aparecia em busca
  // nenhuma. Quando o termo não casa com nenhum aprovado, procura no banco
  // inteiro e mostra à parte.
  const [foraDaLista, setForaDaLista] = useState<any[]>([]);

  // Uma página de aprovados, do mais recente para o mais antigo. O `id` no fim
  // da ordenação é o desempate estável: sem ele, duas compras no mesmo instante
  // podem aparecer duas vezes (ou sumir) entre uma página e a seguinte.
  const paginaDeCompradores = (de: number) =>
    supabase.from('buyers').select('*').eq('status', 'approved')
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(de, de + PAGE_SIZE - 1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [pagina, resumo] = await Promise.all([
        paginaDeCompradores(0),
        supabase.rpc('admin_buyers_overview' as never),
      ]);
      if (pagina.error) throw pagina.error;
      setBuyers(pagina.data || []);
      setTemMais((pagina.data || []).length === PAGE_SIZE);

      // O resumo é separado da lista de propósito: se ele falhar, a tabela
      // ainda aparece (e os cartões mostram "—") em vez de a página inteira
      // virar tela de erro.
      const r: any = resumo.data;
      if (resumo.error || !r) {
        console.error('Resumo de compradores indisponível', resumo.error);
        setStats(null);
      } else {
        setStats({
          totalRevenue: Number(r.total_revenue) || 0,
          // Duas grandezas diferentes, e cada uma tem o seu lugar:
          // `totalCount` são LINHAS de compra (denominador da lista paginada),
          // `totalPessoas` são pessoas distintas (o cartão "Compradores").
          // Renovação, upgrade e telas extras criam linha nova para o mesmo
          // e-mail — hoje são 663 linhas para 643 pessoas.
          totalCount: Number(r.total_count) || 0,
          totalPessoas: Number(r.total_buyers ?? r.total_count) || 0,
          total: Number(r.today?.count) || 0,
          approved: Number(r.today?.approved) || 0,
          revenue: Number(r.today?.revenue) || 0,
          revenueYesterday: Number(r.yesterday?.revenue) || 0,
          approvedYesterday: Number(r.yesterday?.approved) || 0,
          byPlan: r.today_by_plan || {},
        });
      }
    } catch {
      toast.error('Erro ao carregar compradores');
      setLoadError(true);
    }
    finally { setLoading(false); }
  }, []);

  const carregarMais = async () => {
    if (carregandoMais) return;
    setCarregandoMais(true);
    const { data, error } = await paginaDeCompradores(buyers.length);
    if (error) {
      toast.error('Não foi possível carregar mais compradores. Tente novamente.');
    } else {
      // Concatena sem repetir: um comprador novo criado entre uma página e
      // outra desloca o offset e traria alguém já carregado.
      const jaTem = new Set(buyers.map(b => b.id));
      setBuyers(prev => [...prev, ...(data || []).filter(b => !jaTem.has(b.id))]);
      setTemMais((data || []).length === PAGE_SIZE);
    }
    setCarregandoMais(false);
  };

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

  // Busca TODAS as linhas na hora de exportar. Com a tela paginada, exportar o
  // que está carregado entregaria só os 100 mais recentes — e um arquivo
  // incompleto que parece completo é pior do que nenhum.
  const exportTxt = async () => {
    if (exportando) return;
    setExportando(true);
    try {
      // Só as duas colunas que o arquivo usa — o resto da linha (fbp, fbc,
      // user-agent) não tem por que atravessar a rede num export de contatos.
      const todos = await fetchAllRows<any>(async (f, t) =>
        await supabase.from('buyers').select('email, whatsapp').eq('status', 'approved')
          .order('created_at', { ascending: false }).range(f, t)
      );
      // Uma linha por PESSOA, não por compra. Quem renovou ou fez upgrade tem
      // várias linhas em `buyers`, e numa lista de contatos isso vira mensagem
      // repetida para o mesmo cliente. A consulta vem em ordem decrescente de
      // data, então a primeira ocorrência de cada e-mail é a compra mais
      // recente — é dela que o WhatsApp mais atual sai.
      const porEmail = new Map<string, any>();
      for (const b of todos as any[]) {
        const chave = String(b.email || '').trim().toLowerCase();
        if (!chave || porEmail.has(chave)) continue;
        porEmail.set(chave, b);
      }
      const lines = [...porEmail.values()].map((b: any) => `${b.email} ${b.whatsapp || ''}`.trimEnd());
      const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compradores_${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${lines.length} compradores exportados`);
    } catch {
      toast.error('Não foi possível exportar. Tente novamente.');
    } finally {
      setExportando(false);
    }
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
  // Dentro do .or(), a vírgula separa CONDIÇÕES e os parênteses agrupam — um
  // termo que os contenha quebra a sintaxe e a busca inteira falha. As aspas
  // duplas são o escape do PostgREST para o valor, então saem também.
  const termoSeguro = (t: string) => t.replace(/["\\,()]/g, ' ').trim();

  // Lista exibida: o resultado da busca quando há termo, senão a página atual.
  const filtered = resultados ?? buyers;

  useEffect(() => {
    const termo = search.trim();
    if (!termo) { setResultados(null); setForaDaLista([]); setBuscando(false); return; }
    setBuscando(true);
    let vivo = true;
    const timer = setTimeout(async () => {
      const seguro = termoSeguro(termo);
      if (!seguro) { if (vivo) { setResultados([]); setForaDaLista([]); setBuscando(false); } return; }
      const filtro = `payment_id.ilike."%${seguro}%",external_reference.ilike."%${seguro}%"`
        + `,email.ilike."%${seguro}%",name.ilike."%${seguro}%",whatsapp.ilike."%${seguro}%"`;
      // As duas buscas saem juntas: a de aprovados (a lista) e a de compras que
      // deram errado (o caminho de suporte, mostrado quando a primeira é vazia).
      const [aprovados, outros] = await Promise.all([
        supabase.from('buyers').select('*').eq('status', 'approved').or(filtro)
          .order('created_at', { ascending: false }).limit(PAGE_SIZE),
        supabase.from('buyers').select('*').neq('status', 'approved').or(filtro)
          .order('created_at', { ascending: false }).limit(20),
      ]);
      if (!vivo) return;
      if (aprovados.error) {
        console.error('Busca de compradores falhou', aprovados.error);
        toast.error('Não foi possível buscar. Tente novamente.');
        setResultados([]);
      } else {
        setResultados(aprovados.data || []);
      }
      if (outros.error) {
        console.error('Busca de compras não aprovadas falhou', outros.error);
        setForaDaLista([]);
      } else {
        setForaDaLista((aprovados.data || []).length === 0 ? (outros.data || []) : []);
      }
      setBuscando(false);
    }, 400);
    return () => { vivo = false; clearTimeout(timer); };
  }, [search]);

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
            <Button onClick={exportTxt} disabled={loading || exportando || !stats?.totalCount} variant="outline" className="border-border text-muted-foreground hover:text-foreground gap-2">
              {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exportando ? 'Exportando…' : 'Exportar TXT'}
            </Button>
            <Button onClick={() => setShowModal(true)} className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
              <UserPlus className="w-4 h-4" /> Novo Comprador
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 3xl:max-w-[1400px]">
          <Card className="bg-background-paper border-border lg:col-span-1">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Total</p>
                <DollarSign className="w-4 h-4 text-accent-success" />
              </div>
              <p className="font-secondary text-2xl font-bold text-foreground">
                {stats ? formatBRL(stats.totalRevenue) : '—'}
              </p>
            </CardContent>
          </Card>
          {/* Hoje e ontem no MESMO cartão. Como dois cartões lado a lado, o
              par competia pela leitura e ocupava o dobro do espaço para dizer
              a mesma coisa — o número de hoje é o que importa, e ontem existe
              para dar a referência de comparação logo abaixo dele. */}
          {[
            { label: 'Compradores', value: stats ? stats.totalPessoas : '—', ontem: null, icon: Users, color: 'text-primary' },
            {
              label: 'Receita',
              value: stats ? formatBRL(stats.revenue) : '—',
              ontem: stats ? formatBRL(stats.revenueYesterday ?? 0) : '—',
              icon: DollarSign,
              color: 'text-accent-warning',
            },
            {
              label: 'Aprovados',
              value: stats?.approved ?? '—',
              ontem: stats?.approvedYesterday ?? '—',
              icon: CheckCircle,
              color: 'text-accent-success',
            },
          ].map((s, i) => (
            <Card key={i} className="bg-background-paper border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="font-secondary text-2xl font-bold text-foreground">{s.value}</p>
                {s.ontem !== null && (
                  <>
                    <p className="text-xs text-muted-foreground mt-0.5">hoje</p>
                    <div className="mt-3 pt-3 border-t border-border/60 flex items-baseline justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Ontem</span>
                      <span className="text-sm font-semibold text-foreground tabular-nums">{s.ontem}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
          <Card className="bg-background-paper border-border col-span-2 lg:col-span-4">
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
                {loading ? '—'
                  : resultados !== null ? `${filtered.length} ${filtered.length === 1 ? 'resultado' : 'resultados'}`
                  : `${buyers.length}${stats ? ` de ${stats.totalCount}` : ''}`}
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
                buscando
                  ? <p className="flex items-center justify-center gap-2 text-muted-foreground py-12"><Loader2 className="w-4 h-4 animate-spin" /> Procurando…</p>
                  : <p className="text-muted-foreground text-center py-12">Nenhum comprador encontrado</p>
              )}

              {/* "Carregar mais" só na lista paginada. Durante uma busca a
                  resposta já vem do banco inteiro, não de uma página. */}
              {!loadError && resultados === null && temMais && (
                <div className="flex justify-center border-t border-border/40 py-4">
                  <Button
                    onClick={carregarMais}
                    disabled={carregandoMais}
                    variant="outline"
                    className="border-border text-muted-foreground hover:text-foreground gap-2"
                  >
                    {carregandoMais
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Carregando…</>
                      : <><ChevronDown className="w-4 h-4" /> Carregar mais {PAGE_SIZE}</>}
                  </Button>
                </div>
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
