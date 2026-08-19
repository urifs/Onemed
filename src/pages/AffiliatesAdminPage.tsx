import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Handshake, ChevronDown, ChevronUp, Banknote, CheckCircle2, Clock, Tag, Users, Loader2,
  AlertTriangle, RefreshCw,
} from 'lucide-react';
import { PLAN_LABELS } from '@/lib/plans';
import { fetchAllRows } from '@/lib/utils';

interface Affiliate {
  id: string;
  name: string;
  email: string;
  coupon_code: string | null;
  pix_key: string | null;
  pix_name: string | null;
  pix_bank: string | null;
  created_at: string;
}

interface Sale {
  id: string;
  affiliate_id: string;
  buyer_name: string | null;
  buyer_email: string;
  plan: string;
  amount: number;
  commission_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

// Padrão da moeda real: milhar com ponto e centavos com vírgula (R$ 4.469,00).
const brl = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AffiliatesAdminPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [affRes, salesRows] = await Promise.all([
        supabase.from('affiliates' as never).select('*').order('created_at', { ascending: false }),
        // Paginado: o select simples parava nas primeiras 1000 linhas (limite
        // padrão do PostgREST) — vendas antigas sumiam e a comissão "a pagar"
        // aparecia menor do que é.
        fetchAllRows<Sale>((from, to) =>
          supabase.from('affiliate_sales' as never).select('*').order('created_at', { ascending: false }).range(from, to) as any
        ),
      ]);
      // Erro (RLS/rede) resolve a promise com {error} — sem checar, a tela
      // mostrava tudo vazio como se não houvesse comissão a pagar.
      if (affRes.error) throw affRes.error;
      setAffiliates(((affRes.data || []) as unknown as Affiliate[]));
      setSales(salesRows);
    } catch (err: any) {
      toast.error('Erro ao carregar afiliados: ' + (err?.message || 'falha de rede'));
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const porAfiliado = useMemo(() => {
    const map = new Map<string, { vendas: Sale[]; pendente: number; pago: number }>();
    for (const a of affiliates) map.set(a.id, { vendas: [], pendente: 0, pago: 0 });
    for (const s of sales) {
      const e = map.get(s.affiliate_id);
      if (!e) continue;
      e.vendas.push(s);
      // 'reversed' (venda reembolsada) NÃO entra em pago nem em pendente —
      // sem este if explícito, o else jogava a comissão estornada de volta
      // no "a pagar".
      if (s.status === 'paid') e.pago += Number(s.commission_amount);
      else if (s.status === 'pending') e.pendente += Number(s.commission_amount);
    }
    return map;
  }, [affiliates, sales]);

  const totais = useMemo(() => ({
    pendente: sales.filter(s => s.status === 'pending').reduce((a, s) => a + Number(s.commission_amount), 0),
    pago: sales.filter(s => s.status === 'paid').reduce((a, s) => a + Number(s.commission_amount), 0),
    vendas: sales.length,
  }), [sales]);

  // "Já quitado": marca TODAS as vendas pendentes do afiliado como pagas.
  const quitar = async (a: Affiliate) => {
    const pendente = porAfiliado.get(a.id)?.pendente || 0;
    if (!confirm(`Marcar como quitado ${brl(pendente)} de ${a.name}? Faça isso somente depois de transferir o PIX.`)) return;
    setPaying(a.id);
    try {
      const { error } = await supabase.from('affiliate_sales' as never)
        .update({ status: 'paid', paid_at: new Date().toISOString() } as never)
        .eq('affiliate_id', a.id)
        .eq('status', 'pending');
      if (error) throw error;
      toast.success(`Comissões de ${a.name} marcadas como pagas.`);
      await load();
    } catch (err: any) {
      toast.error('Erro ao quitar: ' + (err?.message || 'desconhecido'));
    } finally {
      setPaying(null);
    }
  };

  const aPagar = affiliates.filter(a => (porAfiliado.get(a.id)?.pendente || 0) > 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-secondary text-3xl font-bold text-foreground flex items-center gap-2">
            <Handshake className="w-7 h-7 text-primary" /> Afiliados
          </h1>
          <p className="text-muted-foreground mt-1">Contas, vendas e comissões do programa de afiliados</p>
        </div>

        {/* Sem este aviso, uma falha de carga rendia zeros em toda a tela — e
            "Comissões a pagar R$ 0,00" é indistinguível de "ninguém a receber". */}
        {loadError && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm text-foreground flex-1 min-w-[16rem]">
              Não foi possível carregar afiliados e vendas. Os números abaixo estão incompletos.
            </p>
            <Button onClick={load} size="sm" variant="outline" className="gap-1.5 border-border text-foreground">
              <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
            </Button>
          </div>
        )}

        {/* resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 3xl:max-w-[1400px]">
          {[
            { icon: Users, label: 'Afiliados', value: String(affiliates.length) },
            { icon: Tag, label: 'Vendas por afiliados', value: String(totais.vendas) },
            { icon: Clock, label: 'Comissões a pagar', value: brl(totais.pendente), destaque: totais.pendente > 0 },
            { icon: CheckCircle2, label: 'Comissões pagas', value: brl(totais.pago) },
          ].map(c => (
            <Card key={c.label} className={`bg-background-paper border-border ${c.destaque ? 'border-primary/40' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-2">
                  <c.icon className="w-3.5 h-3.5 text-primary" /> {c.label}
                </div>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* afiliados a pagar */}
        {aPagar.length > 0 && (
          <Card className="bg-background-paper border-primary/40">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Banknote className="w-4 h-4 text-primary" /> Afiliados com comissão a pagar
              </h2>
              <div className="space-y-2">
                {aPagar.map(a => {
                  const info = porAfiliado.get(a.id)!;
                  return (
                    <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-border bg-secondary/50 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{a.name} <span className="text-muted-foreground font-normal">· {a.email}</span></p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {a.pix_key
                            ? <>PIX: <b className="text-foreground">{a.pix_key}</b> · {a.pix_bank} · {a.pix_name}</>
                            : 'PIX ainda não cadastrado pelo afiliado'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold text-primary">{brl(info.pendente)}</span>
                        <Button
                          size="sm"
                          onClick={() => quitar(a)}
                          disabled={paying === a.id}
                          className="bg-primary hover:bg-primary-hover text-primary-foreground"
                        >
                          {paying === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Já quitado'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* lista completa */}
        <Card className="bg-background-paper border-border">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
            ) : affiliates.length === 0 ? (
              <p className="p-10 text-sm text-muted-foreground text-center">Nenhum afiliado cadastrado ainda.</p>
            ) : (
              <div className="divide-y divide-border">
                {affiliates.map(a => {
                  const info = porAfiliado.get(a.id)!;
                  const isOpen = expanded === a.id;
                  return (
                    <div key={a.id}>
                      <button
                        onClick={() => setExpanded(isOpen ? null : a.id)}
                        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary/40 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {a.email} · cupom <b className="text-foreground">{a.coupon_code || '—'}</b> · desde {new Date(a.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-foreground">{info.vendas.length} venda{info.vendas.length === 1 ? '' : 's'}</p>
                          <p className="text-xs">
                            {info.pendente > 0
                              ? <span className="text-primary font-medium">{brl(info.pendente)} a pagar</span>
                              : <span className="text-accent-success font-medium">{info.pago > 0 ? 'Pago' : '—'}</span>}
                          </p>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5">
                          <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 mb-3 text-xs text-muted-foreground grid sm:grid-cols-2 gap-y-1">
                            <span>Comissão pendente: <b className="text-foreground">{brl(info.pendente)}</b></span>
                            <span>Comissão paga: <b className="text-foreground">{brl(info.pago)}</b></span>
                            <span className="sm:col-span-2">
                              {a.pix_key ? <>PIX: <b className="text-foreground">{a.pix_key}</b> · {a.pix_bank} · {a.pix_name}</> : 'PIX não cadastrado'}
                            </span>
                          </div>
                          {info.vendas.length === 0 ? (
                            <p className="text-sm text-muted-foreground px-1">Nenhuma venda ainda.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                                    <th className="px-2 py-2 font-medium">Data</th>
                                    <th className="px-2 py-2 font-medium">Comprador</th>
                                    <th className="px-2 py-2 font-medium">Plano</th>
                                    <th className="px-2 py-2 font-medium">Valor</th>
                                    <th className="px-2 py-2 font-medium">Comissão</th>
                                    <th className="px-2 py-2 font-medium">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {info.vendas.map(s => (
                                    <tr key={s.id} className="border-b border-border/50 last:border-0">
                                      <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap">{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                                      <td className="px-2 py-2.5 text-foreground">{s.buyer_name || s.buyer_email}</td>
                                      <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap">{PLAN_LABELS[s.plan] || s.plan}</td>
                                      <td className="px-2 py-2.5 text-muted-foreground whitespace-nowrap">{brl(s.amount)}</td>
                                      <td className="px-2 py-2.5 font-semibold text-foreground whitespace-nowrap">{brl(s.commission_amount)}</td>
                                      <td className="px-2 py-2.5 whitespace-nowrap">
                                        {s.status === 'paid'
                                          ? <span className="inline-flex items-center gap-1 text-xs text-accent-success"><CheckCircle2 className="w-3 h-3" /> Pago {s.paid_at ? new Date(s.paid_at).toLocaleDateString('pt-BR') : ''}</span>
                                          : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" /> Pendente</span>}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
