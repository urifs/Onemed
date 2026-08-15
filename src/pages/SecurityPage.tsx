import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CountryFlag } from '@/components/admin/CountryFlag';
import { SecurityMap } from '@/components/admin/SecurityMap';
import { useSecurityOverview, computeThreat } from '@/hooks/useSecurityOverview';
import { ataqueInfo, type SecAlert } from '@/lib/security';
import { formatBRL, formatLastSeen, formatDateTimeSP } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  Shield, ShieldAlert, ShieldCheck, RefreshCw, UserPlus, DollarSign, KeyRound,
  Activity, AlertTriangle, MapPin, Network, CreditCard, Clock, Wifi, Crosshair,
  ChevronDown, ChevronRight, Users, Radar, Ticket,
} from 'lucide-react';

const RANGES = [{ label: '6h', h: 6 }, { label: '24h', h: 24 }, { label: '7 dias', h: 168 }];

const NIVEL: Record<string, { txt: string; cor: string; bg: string; barra: string; Icon: typeof Shield }> = {
  critico: { txt: 'CRÍTICO', cor: 'text-red-600 dark:text-red-500', bg: 'bg-red-500/10 border-red-500/30', barra: 'bg-red-500', Icon: ShieldAlert },
  alto: { txt: 'ELEVADO', cor: 'text-orange-600 dark:text-orange-500', bg: 'bg-orange-500/10 border-orange-500/30', barra: 'bg-orange-500', Icon: ShieldAlert },
  medio: { txt: 'MODERADO', cor: 'text-amber-600 dark:text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30', barra: 'bg-amber-500', Icon: Shield },
  baixo: { txt: 'BAIXO', cor: 'text-yellow-600 dark:text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/30', barra: 'bg-yellow-500', Icon: Shield },
  ok: { txt: 'SEGURO', cor: 'text-emerald-600 dark:text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30', barra: 'bg-emerald-500', Icon: ShieldCheck },
};

const SEV: Record<SecAlert['severidade'], { chip: string; dot: string; label: string }> = {
  alta: { chip: 'bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/30', dot: 'bg-red-500', label: 'Alta' },
  media: { chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/30', dot: 'bg-amber-500', label: 'Média' },
  baixa: { chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-500 border-sky-500/30', dot: 'bg-sky-500', label: 'Baixa' },
};

const CAT_COR: Record<string, string> = {
  'Sequestro de conta': 'text-red-600 dark:text-red-500',
  'Financeiro': 'text-red-600 dark:text-red-500',
  'Autenticação': 'text-orange-600 dark:text-orange-500',
  'Reconhecimento': 'text-amber-600 dark:text-amber-500',
  'Afiliados': 'text-sky-600 dark:text-sky-500',
  'Trial': 'text-violet-600 dark:text-violet-400',
  'IA': 'text-teal-600 dark:text-teal-400',
};

function Stat({ Icon, label, valor, sub, alerta }: { Icon: typeof Shield; label: string; valor: React.ReactNode; sub?: string; alerta?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 bg-background-paper ${alerta ? 'border-red-500/40' : 'border-border'}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={`w-3.5 h-3.5 ${alerta ? 'text-red-500' : 'text-muted-foreground'}`} />
      </div>
      <div className={`text-xl font-semibold mt-1 tabular-nums ${alerta ? 'text-red-600 dark:text-red-500' : 'text-foreground'}`}>{valor}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export default function SecurityPage() {
  const { isViewer } = useAuth();
  const [hours, setHours] = useState(24);
  const { data, isFetching, refetch, dataUpdatedAt, isError } = useSecurityOverview(hours, !isViewer);
  const { score, nivel } = computeThreat(data);
  const [alertasAbertos, setAlertasAbertos] = useState<Set<number>>(new Set());
  const [ataquesAbertos, setAtaquesAbertos] = useState<Set<string>>(new Set());
  const [origensAbertas, setOrigensAbertas] = useState<Set<string>>(new Set());
  const m = data?.metricas;
  const info = NIVEL[nivel] ?? NIVEL.ok;

  const toggle = <T,>(set: Set<T>, v: T, fn: (s: Set<T>) => void) => {
    const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); fn(n);
  };

  if (isViewer) {
    return (
      <AdminLayout>
        <div className="shell-wide flex flex-col items-center justify-center py-24 text-center gap-3">
          <ShieldAlert className="w-10 h-10 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Área exclusiva de administradores</h1>
          <p className="text-muted-foreground max-w-md">A Central de Segurança só está disponível para contas de administrador.</p>
        </div>
      </AdminLayout>
    );
  }

  const serie = (data?.serie ?? []).map(s => ({ ...s, h: new Date(s.hora).getHours() + 'h' }));

  return (
    <AdminLayout>
      <div className="shell-wide space-y-5">
        {/* header */}
        <div className="flex items-end justify-between flex-wrap gap-3 border-b border-border pb-4">
          <div>
            <h1 className="font-secondary text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" /> Central de Segurança
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
              {dataUpdatedAt > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  Monitoramento ativo · atualizado {formatLastSeen(new Date(dataUpdatedAt).toISOString())} · auto 20s
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border overflow-hidden text-sm">
              {RANGES.map(r => (
                <button key={r.h} onClick={() => setHours(r.h)}
                  className={`px-3 py-1.5 ${hours === r.h ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{r.label}</button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 border-border">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>
        </div>

        {isError && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-600 dark:text-red-500 text-sm">
            Não foi possível carregar os dados de segurança. Tente atualizar.
          </div>
        )}

        {/* faixa de nível de ameaça */}
        <div className={`rounded-lg border p-4 ${info.bg}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <info.Icon className={`w-8 h-8 ${info.cor}`} />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Nível de ameaça</div>
                <div className={`text-2xl font-bold ${info.cor}`}>{info.txt}</div>
              </div>
            </div>
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>{data?.alertas.length ?? 0} alerta(s) ativo(s)</span><span>{score}/100</span>
              </div>
              <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                <div className={`h-full ${info.barra} transition-all duration-700`} style={{ width: `${score}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 3xl:grid-cols-8 gap-3">
          <Stat Icon={UserPlus} label="Cadastros 1h" valor={m?.signups_1h ?? '—'} sub={`${m?.signups_24h ?? 0} em 24h`} alerta={(m?.signups_1h ?? 0) > 25} />
          <Stat Icon={Clock} label="Trials 1h" valor={m?.trials_1h ?? '—'} sub={`${m?.trials_24h ?? 0} em 24h`} alerta={(m?.trials_1h ?? 0) > 25} />
          <Stat Icon={Wifi} label="Sessões ativas" valor={m?.sessoes_ativas ?? '—'} sub={`${m?.sessoes_total ?? 0} no total`} />
          <Stat Icon={CreditCard} label="Compras 24h" valor={m?.buyers_approved_24h ?? '—'} sub={`${m?.buyers_pending_24h ?? 0} pendentes`} />
          <Stat Icon={DollarSign} label="Receita 24h" valor={formatBRL(m?.receita_24h ?? 0)} />
          <Stat Icon={KeyRound} label="Logins falhos 1h" valor={m?.logins_falhos_1h ?? '—'} alerta={(m?.logins_falhos_1h ?? 0) > 40} />
          <Stat Icon={Network} label="IPs multi-conta" valor={m?.ips_multi_conta ?? '—'} sub="≥ 3 contas" alerta={(m?.ips_multi_conta ?? 0) > 0} />
          <Stat Icon={Users} label="Painel" valor={`${m?.admins_total ?? 0} adm / ${m?.viewers_total ?? 0} vis`} />
        </div>

        {/* MAPA + ALERTAS lado a lado, mesma linha */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Card className="bg-background-paper border-border overflow-hidden lg:col-span-3">
            <CardHeader className="pb-2 border-b border-border"><CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Mapa de logins · {data?.localizacoes.length ?? 0} pontos
            </CardTitle></CardHeader>
            <CardContent className="p-0"><SecurityMap locais={data?.localizacoes ?? []} /></CardContent>
          </Card>

          <Card className="bg-background-paper border-border lg:col-span-2 flex flex-col">
            <CardHeader className="pb-2 border-b border-border"><CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" /> Alertas {data?.alertas.length ? `· ${data.alertas.length}` : ''}
            </CardTitle></CardHeader>
            <CardContent className="p-2 overflow-y-auto max-h-[420px]">
              {!data?.alertas.length ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-500 p-3">
                  <ShieldCheck className="w-4 h-4" /> Nenhum alerta ativo.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {data.alertas.map((a, i) => {
                    const aberto = alertasAbertos.has(i);
                    return (
                      <div key={i} className="rounded-md border border-border overflow-hidden">
                        <button onClick={() => toggle(alertasAbertos, i, setAlertasAbertos)}
                          className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-muted/40">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEV[a.severidade].dot}`} />
                          <span className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground block truncate">{a.titulo}</span>
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${SEV[a.severidade].chip}`}>{a.valor}</span>
                          {aberto ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                        </button>
                        {aberto && (
                          <div className="px-3 pb-3 pt-0 text-xs text-muted-foreground border-t border-border/50 space-y-1.5">
                            <div className="flex items-center gap-2 pt-2">
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${SEV[a.severidade].chip}`}>severidade {SEV[a.severidade].label}</span>
                              <span className="text-[10px] uppercase tracking-wide">{a.tipo}</span>
                            </div>
                            <p className="leading-relaxed">{a.detalhe}</p>
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

        {/* TIPOS DE ATAQUE */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-2 border-b border-border"><CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-primary" /> Tipos de ataque detectados ({data?.ataques_por_tipo.length ?? 0})
          </CardTitle></CardHeader>
          <CardContent className="p-0">
            {!data?.ataques_por_tipo.length ? <p className="text-sm text-muted-foreground p-4">Nenhuma atividade suspeita registrada na janela.</p> : (
              <div className="divide-y divide-border">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <span>Tipo</span><span className="text-right">Tentativas</span><span className="text-right hidden sm:block">IPs</span><span className="text-right">Último</span>
                </div>
                {data.ataques_por_tipo.map((a) => {
                  const inf = ataqueInfo(a.acao);
                  const aberto = ataquesAbertos.has(a.acao);
                  const origensDoTipo = (data.origens ?? []).filter(o => o.acoes.includes(a.acao)).slice(0, 8);
                  return (
                    <div key={a.acao}>
                      <button onClick={() => toggle(ataquesAbertos, a.acao, setAtaquesAbertos)}
                        className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2.5 items-center text-left hover:bg-muted/40">
                        <span className="min-w-0 flex items-center gap-2">
                          {aberto ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                          <span className="min-w-0">
                            <span className="text-sm font-medium text-foreground block truncate">{inf.label}</span>
                            <span className={`text-[11px] ${CAT_COR[inf.categoria] ?? 'text-muted-foreground'}`}>{inf.categoria}</span>
                          </span>
                        </span>
                        <span className="text-right text-sm font-semibold text-foreground tabular-nums">{a.tentativas}</span>
                        <span className="text-right text-sm text-muted-foreground tabular-nums hidden sm:block">{a.ips || '—'}</span>
                        <span className="text-right text-[11px] text-muted-foreground whitespace-nowrap">{formatLastSeen(a.ultimo)}</span>
                      </button>
                      {aberto && (
                        <div className="px-4 pb-3 pl-10 text-xs text-muted-foreground space-y-2 bg-muted/20">
                          <p className="leading-relaxed pt-1">{inf.descricao}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            <span><span className="text-muted-foreground/70">ação:</span> <code className="font-mono">{a.acao}</code></span>
                            <span><span className="text-muted-foreground/70">ocorrências:</span> {a.ocorrencias}</span>
                            <span><span className="text-muted-foreground/70">IPs distintos:</span> {a.ips || '—'}</span>
                          </div>
                          {origensDoTipo.length > 0 && (
                            <div>
                              <div className="text-muted-foreground/70 mb-1">Origens desta ação:</div>
                              <div className="flex flex-wrap gap-1.5">
                                {origensDoTipo.map(o => (
                                  <code key={o.ip} className="font-mono text-[11px] bg-background border border-border rounded px-1.5 py-0.5">{o.ip} <span className="text-muted-foreground">×{o.tentativas}</span></code>
                                ))}
                              </div>
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

        {/* ORIGENS (IPs) + SÉRIE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-background-paper border-border">
            <CardHeader className="pb-2 border-b border-border"><CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Radar className="w-4 h-4 text-primary" /> Origens dos ataques · IPs ({data?.origens.length ?? 0})
            </CardTitle></CardHeader>
            <CardContent className="p-0 max-h-[360px] overflow-y-auto">
              {!data?.origens.length ? <p className="text-sm text-muted-foreground p-4">Nenhuma.</p> : (
                <div className="divide-y divide-border">
                  {data.origens.map((o) => {
                    const aberto = origensAbertas.has(o.ip);
                    return (
                      <div key={o.ip}>
                        <button onClick={() => toggle(origensAbertas, o.ip, setOrigensAbertas)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/40">
                          {aberto ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                          <code className="font-mono text-sm text-foreground flex-1 truncate">{o.ip}</code>
                          <span className="text-[11px] text-muted-foreground">{o.acoes.length} ação(ões)</span>
                          <span className="text-sm font-semibold text-foreground tabular-nums w-10 text-right">{o.tentativas}</span>
                        </button>
                        {aberto && (
                          <div className="px-4 pb-3 pl-10 text-xs bg-muted/20 space-y-1.5">
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {o.acoes.map(ac => (
                                <span key={ac} className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-background text-muted-foreground">{ataqueInfo(ac).label}</span>
                              ))}
                            </div>
                            <div className="text-muted-foreground">Último: {formatDateTimeSP(o.ultimo)} · {o.ocorrencias} janela(s) de limite</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-background-paper border-border">
            <CardHeader className="pb-2 border-b border-border"><CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Atividade por hora (24h)
            </CardTitle></CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={serie} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSign" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(200,80%,55%)" stopOpacity={0.5} /><stop offset="100%" stopColor="hsl(200,80%,55%)" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gTrial" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(38,90%,55%)" stopOpacity={0.5} /><stop offset="100%" stopColor="hsl(38,90%,55%)" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="h" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval={2} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="signups" name="Cadastros" stroke="hsl(200,80%,55%)" fill="url(#gSign)" strokeWidth={2} />
                  <Area type="monotone" dataKey="trials" name="Trials" stroke="hsl(38,90%,55%)" fill="url(#gTrial)" strokeWidth={2} />
                  <Area type="monotone" dataKey="buyers" name="Compras" stroke="hsl(150,60%,45%)" fill="transparent" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* cadastros + compras recentes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-background-paper border-border">
            <CardHeader className="pb-2 border-b border-border"><CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" /> Cadastros recentes
            </CardTitle></CardHeader>
            <CardContent className="p-2 max-h-96 overflow-y-auto">
              {!data?.signups_recentes.length ? <p className="text-sm text-muted-foreground p-2">Nenhum.</p> : (
                <div className="space-y-0.5">
                  {data.signups_recentes.map((s, i) => (
                    <div key={i} className={`flex items-center justify-between gap-2 text-sm rounded px-2 py-1.5 ${s.suspeito ? 'bg-red-500/10' : ''}`}>
                      <span className={`truncate ${s.suspeito ? 'text-red-600 dark:text-red-500 font-medium' : 'text-foreground'}`}>
                        {s.suspeito && <AlertTriangle className="w-3 h-3 inline mr-1" />}{s.email}
                      </span>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatLastSeen(s.quando)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-background-paper border-border">
            <CardHeader className="pb-2 border-b border-border"><CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Compras recentes
            </CardTitle></CardHeader>
            <CardContent className="p-2 max-h-96 overflow-y-auto">
              {!data?.compras_recentes.length ? <p className="text-sm text-muted-foreground p-2">Nenhuma.</p> : (
                <div className="space-y-0.5">
                  {data.compras_recentes.map((b, i) => (
                    <div key={i} className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 ${b.suspeito ? 'bg-red-500/10' : ''}`}>
                      <div className="min-w-0">
                        <div className={`text-sm truncate ${b.suspeito ? 'text-red-600 dark:text-red-500 font-medium' : 'text-foreground'}`}>
                          {b.suspeito && <AlertTriangle className="w-3 h-3 inline mr-1" />}{b.email}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{b.plan} · {formatBRL(b.amount ?? 0)} · {b.status}{b.status === 'approved' && !b.granted ? ' · ⚠ sem acesso' : ''}</div>
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatLastSeen(b.quando)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* vigília de privilégio */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-2 border-b border-border"><CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" /> Contas do painel · vigília de privilégio
          </CardTitle></CardHeader>
          <CardContent className="pt-3">
            <div className="flex flex-wrap gap-2">
              {data?.papeis.map((p, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm bg-background">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${p.role === 'admin' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>{p.role}</span>
                  <span className="text-foreground">{p.email}</span>
                  <span className="text-[11px] text-muted-foreground">· {p.ultimo_login ? formatLastSeen(p.ultimo_login) : 'nunca entrou'}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Só devem aparecer os administradores e visualizadores que você criou. Qualquer conta nova aqui é um alerta grave.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
