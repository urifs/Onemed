import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CountryFlag } from '@/components/admin/CountryFlag';
import { ThreatRadar } from '@/components/admin/ThreatRadar';
import { SecurityMap } from '@/components/admin/SecurityMap';
import { useSecurityOverview, computeThreat, SecAlert } from '@/hooks/useSecurityOverview';
import { formatBRL, formatLastSeen, formatDateTimeSP } from '@/lib/utils';
import {
  Shield, ShieldAlert, ShieldCheck, RefreshCw, Users, UserPlus, DollarSign,
  Ticket, KeyRound, Globe, Activity, AlertTriangle, MapPin, Network, CreditCard,
  Fingerprint, Clock, TrendingUp, Wifi,
} from 'lucide-react';

const RANGES = [
  { label: '6h', h: 6 }, { label: '24h', h: 24 }, { label: '7d', h: 168 },
];

const NIVEL_INFO: Record<string, { txt: string; cor: string; anel: string; Icon: typeof Shield }> = {
  critico: { txt: 'CRÍTICO', cor: 'text-red-500', anel: 'stroke-red-500', Icon: ShieldAlert },
  alto: { txt: 'ALTO', cor: 'text-orange-500', anel: 'stroke-orange-500', Icon: ShieldAlert },
  medio: { txt: 'MÉDIO', cor: 'text-amber-500', anel: 'stroke-amber-500', Icon: Shield },
  baixo: { txt: 'BAIXO', cor: 'text-yellow-500', anel: 'stroke-yellow-500', Icon: Shield },
  ok: { txt: 'SEGURO', cor: 'text-emerald-500', anel: 'stroke-emerald-500', Icon: ShieldCheck },
};

const SEV_STYLE: Record<SecAlert['severidade'], string> = {
  alta: 'border-red-500/40 bg-red-500/10 text-red-500',
  media: 'border-amber-500/40 bg-amber-500/10 text-amber-500',
  baixa: 'border-sky-500/40 bg-sky-500/10 text-sky-500',
};

function Gauge({ score, nivel }: { score: number; nivel: string }) {
  const info = NIVEL_INFO[nivel] ?? NIVEL_INFO.ok;
  const R = 42, C = 2 * Math.PI * R, off = C * (1 - score / 100);
  return (
    <div className="relative w-[150px] h-[150px] mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth="7" className="stroke-muted/30" />
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth="7" strokeLinecap="round"
          className={info.anel} strokeDasharray={C} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset .8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <info.Icon className={`w-6 h-6 ${info.cor}`} />
        <div className={`text-2xl font-bold ${info.cor}`}>{score}</div>
        <div className={`text-[10px] font-bold tracking-wider ${info.cor}`}>{info.txt}</div>
      </div>
    </div>
  );
}

function Medidor({ Icon, label, valor, sub, alerta }: {
  Icon: typeof Shield; label: string; valor: React.ReactNode; sub?: string; alerta?: boolean;
}) {
  return (
    <Card className={`bg-background-paper border-border ${alerta ? 'ring-1 ring-red-500/40' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`w-4 h-4 ${alerta ? 'text-red-500' : 'text-primary'}`} />
        </div>
        <div className={`text-2xl font-bold mt-1 ${alerta ? 'text-red-500' : 'text-foreground'}`}>{valor}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function SerieChart({ serie }: { serie: { hora: string; signups: number; trials: number; buyers: number }[] }) {
  const max = Math.max(1, ...serie.map(s => Math.max(s.signups, s.trials, s.buyers)));
  return (
    <div className="flex items-end gap-[3px] h-32 w-full overflow-x-auto">
      {serie.map((s, i) => {
        const hora = new Date(s.hora).getHours();
        return (
          <div key={i} className="flex-1 min-w-[10px] flex flex-col items-center gap-0.5 group relative">
            <div className="w-full flex flex-col justify-end gap-[1px] h-28">
              <div className="w-full bg-sky-500/70 rounded-sm" style={{ height: `${(s.signups / max) * 100}%` }} title={`${s.signups} cadastros`} />
              <div className="w-full bg-amber-500/70 rounded-sm" style={{ height: `${(s.trials / max) * 100}%` }} title={`${s.trials} trials`} />
              <div className="w-full bg-emerald-500/70 rounded-sm" style={{ height: `${(s.buyers / max) * 100}%` }} title={`${s.buyers} compras`} />
            </div>
            {hora % 3 === 0 && <span className="text-[8px] text-muted-foreground">{hora}h</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function SecurityPage() {
  // Todos os hooks ANTES de qualquer return condicional (Rules of Hooks).
  const { isViewer } = useAuth();
  const [hours, setHours] = useState(24);
  const { data, isFetching, refetch, dataUpdatedAt, isError } = useSecurityOverview(hours, !isViewer);
  const { score, nivel } = computeThreat(data);
  const m = data?.metricas;

  // Viewer entra no painel (isAdmin=true), mas Segurança é só de admin — a RPC
  // já recusa (has_role('admin')); aqui damos a mensagem em vez do card de erro.
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

  return (
    <AdminLayout>
      <div className="shell-wide space-y-6">
        {/* header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-secondary text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-7 h-7 text-primary" /> Central de Segurança
            </h1>
            <p className="text-muted-foreground mt-1">Monitoramento de ataques em tempo real — radar, mapa, alertas e medidores.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              {RANGES.map(r => (
                <button key={r.h} onClick={() => setHours(r.h)}
                  className={`px-3 py-1.5 text-sm ${hours === r.h ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {r.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 border-border">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>
        </div>

        {dataUpdatedAt > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground -mt-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Ao vivo · atualizado {formatLastSeen(new Date(dataUpdatedAt).toISOString())} · auto a cada 20s
          </div>
        )}

        {isError && (
          <Card className="bg-red-500/10 border-red-500/40"><CardContent className="p-4 text-red-500 text-sm">
            Não foi possível carregar os dados de segurança. Tente atualizar.
          </CardContent></Card>
        )}

        {/* topo: medidor + radar + série */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="bg-background-paper border-border">
            <CardHeader className="pb-2"><CardTitle className="text-base font-medium flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-primary" /> Nível de Ameaça
            </CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <Gauge score={score} nivel={nivel} />
              <div className="text-xs text-center text-muted-foreground">
                {data?.alertas.length ? `${data.alertas.length} alerta(s) ativo(s)` : 'Nenhum alerta ativo'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background-paper border-border">
            <CardHeader className="pb-2"><CardTitle className="text-base font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Radar de Atividade
            </CardTitle></CardHeader>
            <CardContent>
              <ThreatRadar locais={data?.localizacoes ?? []} janelaHoras={hours} />
              <div className="flex justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> IP suspeito</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> online</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground" /> login</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background-paper border-border">
            <CardHeader className="pb-2"><CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Atividade (24h)
            </CardTitle></CardHeader>
            <CardContent>
              <SerieChart serie={data?.serie ?? []} />
              <div className="flex justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-sky-500" /> cadastros</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" /> trials</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> compras</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* medidores */}
        <div className="grid grid-cols-2 md:grid-cols-4 3xl:grid-cols-8 gap-3">
          <Medidor Icon={UserPlus} label="Cadastros (1h)" valor={m?.signups_1h ?? '—'} sub={`${m?.signups_24h ?? 0} em 24h`} alerta={(m?.signups_1h ?? 0) > 25} />
          <Medidor Icon={Clock} label="Trials (1h)" valor={m?.trials_1h ?? '—'} sub={`${m?.trials_24h ?? 0} em 24h`} alerta={(m?.trials_1h ?? 0) > 25} />
          <Medidor Icon={Wifi} label="Sessões ativas" valor={m?.sessoes_ativas ?? '—'} sub={`${m?.sessoes_total ?? 0} no total`} />
          <Medidor Icon={CreditCard} label="Compras pend. (24h)" valor={m?.buyers_pending_24h ?? '—'} sub={`${m?.buyers_approved_24h ?? 0} aprovadas`} />
          <Medidor Icon={DollarSign} label="Receita (24h)" valor={formatBRL(m?.receita_24h ?? 0)} />
          <Medidor Icon={KeyRound} label="Logins falhos (1h)" valor={m?.logins_falhos_1h ?? '—'} alerta={(m?.logins_falhos_1h ?? 0) > 40} />
          <Medidor Icon={Network} label="IPs multi-conta" valor={m?.ips_multi_conta ?? '—'} sub="≥ 3 contas" alerta={(m?.ips_multi_conta ?? 0) > 0} />
          <Medidor Icon={Users} label="Painel" valor={`${m?.admins_total ?? 0}A / ${m?.viewers_total ?? 0}V`} sub="admins / viewers" />
        </div>

        {/* alertas */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-primary" /> Alertas {data?.alertas.length ? `(${data.alertas.length})` : ''}
          </CardTitle></CardHeader>
          <CardContent>
            {!data?.alertas.length ? (
              <div className="flex items-center gap-2 text-sm text-emerald-500 py-2">
                <ShieldCheck className="w-4 h-4" /> Nenhum alerta ativo — tudo tranquilo.
              </div>
            ) : (
              <div className="space-y-2">
                {data.alertas.map((a, i) => (
                  <div key={i} className={`flex items-start gap-3 rounded-lg border p-3 ${SEV_STYLE[a.severidade]}`}>
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-sm">{a.titulo}</span>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${SEV_STYLE[a.severidade]}`}>{a.severidade}</span>
                        <span className="text-xs font-bold">{a.valor}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 break-words">{a.detalhe}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* mapa */}
        <Card className="bg-background-paper border-border overflow-hidden">
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Mapa de Logins ({data?.localizacoes.length ?? 0} pontos)
          </CardTitle></CardHeader>
          <CardContent><SecurityMap locais={data?.localizacoes ?? []} /></CardContent>
        </Card>

        {/* tabelas: IPs suspeitos + rate limits */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-background-paper border-border">
            <CardHeader className="pb-2"><CardTitle className="text-base font-medium flex items-center gap-2">
              <Network className="w-4 h-4 text-primary" /> IPs com múltiplas contas
            </CardTitle></CardHeader>
            <CardContent className="max-h-80 overflow-y-auto">
              {!data?.ips_suspeitos.length ? <p className="text-sm text-muted-foreground">Nenhum.</p> : (
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-muted-foreground text-left border-b border-border">
                    <th className="py-1 font-medium">IP</th><th className="font-medium">Contas</th><th className="font-medium">Local</th><th className="font-medium">Último</th>
                  </tr></thead>
                  <tbody>
                    {data.ips_suspeitos.map((ip, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1.5 font-mono text-xs break-all">{ip.ip}</td>
                        <td className={`font-bold ${ip.contas >= 3 ? 'text-red-500' : 'text-foreground'}`}>{ip.contas}</td>
                        <td className="text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><CountryFlag code={ip.cc} /> {ip.city || ip.country || '—'}</span>
                        </td>
                        <td className="text-xs text-muted-foreground whitespace-nowrap">{formatLastSeen(ip.ultimo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card className="bg-background-paper border-border">
            <CardHeader className="pb-2"><CardTitle className="text-base font-medium flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" /> Rate-limits estourados (1h)
            </CardTitle></CardHeader>
            <CardContent className="max-h-80 overflow-y-auto">
              {!data?.rate_limits.length ? <p className="text-sm text-muted-foreground">Nenhum.</p> : (
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-muted-foreground text-left border-b border-border">
                    <th className="py-1 font-medium">Identificador</th><th className="font-medium">Ação</th><th className="font-medium">Tentativas</th>
                  </tr></thead>
                  <tbody>
                    {data.rate_limits.map((r, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1.5 font-mono text-xs break-all">{r.identifier}</td>
                        <td className="text-xs">{r.action}</td>
                        <td className={`font-bold ${r.attempts >= 5 ? 'text-red-500' : 'text-amber-500'}`}>{r.attempts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* tabelas: cadastros + compras recentes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-background-paper border-border">
            <CardHeader className="pb-2"><CardTitle className="text-base font-medium flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" /> Cadastros recentes
            </CardTitle></CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              {!data?.signups_recentes.length ? <p className="text-sm text-muted-foreground">Nenhum.</p> : (
                <div className="space-y-1">
                  {data.signups_recentes.map((s, i) => (
                    <div key={i} className={`flex items-center justify-between gap-2 text-sm rounded px-2 py-1 ${s.suspeito ? 'bg-red-500/10' : ''}`}>
                      <span className={`truncate ${s.suspeito ? 'text-red-500 font-medium' : 'text-foreground'}`}>
                        {s.suspeito && <AlertTriangle className="w-3 h-3 inline mr-1" />}{s.email}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatLastSeen(s.quando)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-background-paper border-border">
            <CardHeader className="pb-2"><CardTitle className="text-base font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Compras recentes
            </CardTitle></CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              {!data?.compras_recentes.length ? <p className="text-sm text-muted-foreground">Nenhuma.</p> : (
                <div className="space-y-1">
                  {data.compras_recentes.map((b, i) => (
                    <div key={i} className={`flex items-center justify-between gap-2 text-sm rounded px-2 py-1 ${b.suspeito ? 'bg-red-500/10' : ''}`}>
                      <div className="min-w-0">
                        <div className={`truncate ${b.suspeito ? 'text-red-500 font-medium' : 'text-foreground'}`}>
                          {b.suspeito && <AlertTriangle className="w-3 h-3 inline mr-1" />}{b.email}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{b.plan} · {formatBRL(b.amount ?? 0)} · {b.status}{b.status === 'approved' && !b.granted ? ' ⚠ sem acesso' : ''}</div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatLastSeen(b.quando)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* vigília de privilégio */}
        <Card className="bg-background-paper border-border">
          <CardHeader className="pb-2"><CardTitle className="text-base font-medium flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" /> Contas do painel (vigília de privilégio)
          </CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data?.papeis.map((p, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${p.role === 'admin' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>{p.role}</span>
                  <span className="text-foreground">{p.email}</span>
                  <span className="text-xs text-muted-foreground">· {p.ultimo_login ? `entrou ${formatLastSeen(p.ultimo_login)}` : 'nunca entrou'}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Qualquer conta nova aqui que você não reconheça é um alerta grave — só deve haver os administradores e visualizadores que você criou.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
