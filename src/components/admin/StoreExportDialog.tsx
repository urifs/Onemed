import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatBRL } from '@/lib/utils';
import { PLAN_LABELS } from '@/lib/plans';
import { exportStoreToExcel, rotuloStatus, type OrderRow } from '@/lib/storeExport';

/**
 * Filtros da exportação da Loja.
 *
 * Tudo é decidido AQUI e o arquivo sai com exatamente o que está na tela — o
 * contador no rodapé mostra quantos pedidos e quanta receita vão no arquivo
 * antes de clicar, para não haver a surpresa de abrir a planilha e descobrir
 * que o filtro pegou o período errado.
 */

const STATUS_OPCOES = ['approved', 'pending', 'cancelled', 'rejected', 'refunded', 'charged_back'];

type Preset = 'tudo' | 'hoje' | 'ontem' | '7d' | '30d' | 'mes' | 'mes_passado' | 'custom';

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'tudo', label: 'Tudo' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'ontem', label: 'Ontem' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: 'mes', label: 'Este mês' },
  { id: 'mes_passado', label: 'Mês passado' },
  { id: 'custom', label: 'Personalizado' },
];

/** Início do dia em São Paulo, devolvido como instante UTC. */
function inicioDoDiaSP(d: Date): Date {
  const ymd = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // YYYY-MM-DD
  // O deslocamento de SP é descoberto pelo próprio Intl, no instante certo:
  // assim o horário de verão histórico não desloca o corte por um dia.
  const meiaNoite = new Date(`${ymd}T00:00:00`);
  const comoSP = new Date(meiaNoite.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return new Date(meiaNoite.getTime() + (meiaNoite.getTime() - comoSP.getTime()));
}

const diasAtras = (n: number) => inicioDoDiaSP(new Date(Date.now() - n * 86400000));

function intervaloDoPreset(p: Preset, de: string, ate: string): { inicio: Date | null; fim: Date | null; label: string } {
  const hoje = inicioDoDiaSP(new Date());
  const amanha = new Date(hoje.getTime() + 86400000);
  switch (p) {
    case 'hoje': return { inicio: hoje, fim: amanha, label: 'Hoje' };
    case 'ontem': return { inicio: diasAtras(1), fim: hoje, label: 'Ontem' };
    case '7d': return { inicio: diasAtras(6), fim: amanha, label: 'Últimos 7 dias' };
    case '30d': return { inicio: diasAtras(29), fim: amanha, label: 'Últimos 30 dias' };
    case 'mes': {
      const ymd = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      const inicio = inicioDoDiaSP(new Date(`${ymd.slice(0, 7)}-01T12:00:00`));
      return { inicio, fim: amanha, label: 'Este mês' };
    }
    case 'mes_passado': {
      const ymd = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      const primeiroDesteMes = new Date(`${ymd.slice(0, 7)}-01T12:00:00`);
      const noMesPassado = new Date(primeiroDesteMes.getTime() - 15 * 86400000);
      const ymdPassado = noMesPassado.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      return {
        inicio: inicioDoDiaSP(new Date(`${ymdPassado.slice(0, 7)}-01T12:00:00`)),
        fim: inicioDoDiaSP(primeiroDesteMes),
        label: 'Mês passado',
      };
    }
    case 'custom': {
      // `fim` é EXCLUSIVO e cai na meia-noite seguinte: sem isso, escolher
      // 19/08 até 19/08 não traria nada do próprio dia 19.
      const inicio = de ? inicioDoDiaSP(new Date(`${de}T12:00:00`)) : null;
      const fim = ate ? new Date(inicioDoDiaSP(new Date(`${ate}T12:00:00`)).getTime() + 86400000) : null;
      const fmt = (s: string) => s.split('-').reverse().join('/');
      const label = de && ate ? `${fmt(de)} a ${fmt(ate)}` : de ? `A partir de ${fmt(de)}` : ate ? `Até ${fmt(ate)}` : 'Tudo';
      return { inicio, fim, label };
    }
    default: return { inicio: null, fim: null, label: 'Todo o histórico' };
  }
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orders: OrderRow[];
}

export function StoreExportDialog({ open, onOpenChange, orders }: Props) {
  const [preset, setPreset] = useState<Preset>('tudo');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [baseData, setBaseData] = useState<'compra' | 'pagamento'>('compra');
  const [statusSel, setStatusSel] = useState<string[]>([...STATUS_OPCOES]);
  const [cursosSel, setCursosSel] = useState<string[] | null>(null); // null = todos
  const [umaAbaPorCurso, setUmaAbaPorCurso] = useState(true);
  const [abaDeCompradores, setAbaDeCompradores] = useState(true);
  const [exportando, setExportando] = useState(false);

  // ⚠️ Declarado ANTES de `cursos` de propósito: `useMemo` roda durante a
  // renderização, então referenciar algo declarado abaixo estoura TDZ.
  const { inicio, fim, label: periodoLabel } = useMemo(
    () => intervaloDoPreset(preset, de, ate), [preset, de, ate],
  );

  const dentroDoPeriodo = useMemo(() => (o: OrderRow) => {
    // Filtrar por PAGAMENTO exclui quem nunca pagou — é o que se quer num
    // relatório de caixa, e seria um erro silencioso somar pendentes ali.
    const ref = baseData === 'pagamento' ? o.paid_at : o.created_at;
    if (!ref) return baseData !== 'pagamento';
    const t = new Date(ref).getTime();
    if (inicio && t < inicio.getTime()) return false;
    if (fim && t >= fim.getTime()) return false;
    return true;
  }, [baseData, inicio, fim]);

  // Os cursos vêm dos PEDIDOS, não do catálogo: um curso removido da loja
  // continua tendo histórico de compra, e ele precisa poder ser exportado.
  //
  // Dois números por curso, e a distinção importa: `pagantes` são PESSOAS
  // distintas com pagamento aprovado (quem comprou duas vezes conta uma), e
  // `pedidos` é quanta LINHA vai no arquivo com os filtros atuais. Antes havia
  // só um número — a contagem crua de pedidos — que se lia como "compradores"
  // e inflava tudo: um curso com 55 pagantes aparecia como 115, porque somava
  // os checkouts abandonados que nunca viraram pagamento.
  const cursos = useMemo(() => {
    const statusEscolhidos = new Set(statusSel);
    const m = new Map<string, { chave: string; nome: string; pedidos: number; pagantes: Set<string> }>();
    for (const o of orders) {
      if (!dentroDoPeriodo(o)) continue;
      const chave = o.product_id || `nome:${o.product_name}`;
      if (!m.has(chave)) m.set(chave, { chave, nome: o.product_name, pedidos: 0, pagantes: new Set() });
      const c = m.get(chave)!;
      if (statusEscolhidos.has(o.status)) c.pedidos++;
      if (o.status === 'approved') c.pagantes.add(o.email.toLowerCase());
    }
    return [...m.values()]
      .map(c => ({ chave: c.chave, nome: c.nome, pedidos: c.pedidos, pagantes: c.pagantes.size }))
      .sort((a, b) => b.pagantes - a.pagantes || b.pedidos - a.pedidos);
  }, [orders, statusSel, dentroDoPeriodo]);

  const filtrados = useMemo(() => {
    const chavesEscolhidas = cursosSel === null ? null : new Set(cursosSel);
    const statusEscolhidos = new Set(statusSel);
    return orders.filter(o => {
      if (!statusEscolhidos.has(o.status)) return false;
      if (chavesEscolhidas && !chavesEscolhidas.has(o.product_id || `nome:${o.product_name}`)) return false;
      return dentroDoPeriodo(o);
    });
  }, [orders, cursosSel, statusSel, dentroDoPeriodo]);

  const receita = filtrados
    .filter(o => o.status === 'approved')
    .reduce((s, o) => s + (Number(o.price_paid) || 0), 0);

  const alternar = (lista: string[], v: string) =>
    lista.includes(v) ? lista.filter(x => x !== v) : [...lista, v];

  const exportar = async () => {
    if (!filtrados.length) { toast.error('Nenhum pedido no filtro escolhido.'); return; }
    setExportando(true);
    try {
      await exportStoreToExcel(filtrados, {
        periodoLabel,
        cursosLabel: cursosSel === null
          ? `Todos (${cursos.length})`
          : cursos.filter(c => cursosSel.includes(c.chave)).map(c => c.nome).join(' · ') || 'Nenhum',
        statusLabel: statusSel.length === STATUS_OPCOES.length
          ? 'Todos' : statusSel.map(rotuloStatus).join(' · '),
        baseDataLabel: baseData === 'pagamento' ? 'Data do pagamento' : 'Data da compra',
        umaAbaPorCurso,
        abaDeCompradores,
        planLabel: (p) => (p ? (PLAN_LABELS as Record<string, string>)[p] || p : 'Sem plano'),
      });
      toast.success(`${filtrados.length} pedidos exportados.`);
      onOpenChange(false);
    } catch (err) {
      console.error('Falha ao exportar a loja', err);
      toast.error('Não foi possível gerar a planilha. Tente novamente.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background-paper border-border max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-accent-success" />
            Exportar a Loja para Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Período */}
          <section className="space-y-2">
            <Label className="text-foreground">Período</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    preset === p.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {preset === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">De</Label>
                  <Input type="date" value={de} onChange={e => setDe(e.target.value)} className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Até</Label>
                  <Input type="date" value={ate} onChange={e => setAte(e.target.value)} className="bg-secondary border-border text-foreground" />
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-4 pt-1">
              {([['compra', 'Pela data da compra'], ['pagamento', 'Pela data do pagamento']] as const).map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="radio"
                    checked={baseData === v}
                    onChange={() => setBaseData(v)}
                    className="accent-primary"
                  />
                  {l}
                </label>
              ))}
            </div>
            {baseData === 'pagamento' && (
              <p className="text-xs text-muted-foreground">
                Pedidos que nunca foram pagos ficam de fora — é o que se espera de um relatório de caixa.
              </p>
            )}
          </section>

          {/* Cursos */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-foreground">Cursos</Label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setCursosSel(null)} className="text-xs text-primary hover:underline">Todos</button>
                <button type="button" onClick={() => setCursosSel([])} className="text-xs text-muted-foreground hover:text-foreground hover:underline">Limpar</button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">pagantes</strong> = pessoas distintas com pagamento aprovado ·{' '}
              <strong className="text-foreground">pedidos</strong> = linhas que vão no arquivo com os filtros de agora
              (inclui checkout iniciado e não concluído, se o status estiver marcado).
            </p>
            <div className="max-h-52 overflow-y-auto rounded-lg border border-border divide-y divide-border/40">
              {cursos.length === 0 && (
                <p className="text-sm text-muted-foreground p-3">
                  {orders.length === 0 ? 'Nenhum pedido na loja ainda.' : 'Nenhum curso teve pedido no período escolhido.'}
                </p>
              )}
              {cursos.map(c => {
                const marcado = cursosSel === null || cursosSel.includes(c.chave);
                return (
                  <label key={c.chave} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-secondary/40">
                    <Checkbox
                      checked={marcado}
                      onCheckedChange={() => {
                        // "Todos" é um estado próprio (null). Ao desmarcar um
                        // item a partir dele, a lista vira explícita.
                        const base = cursosSel === null ? cursos.map(x => x.chave) : cursosSel;
                        setCursosSel(alternar(base, c.chave));
                      }}
                    />
                    <span className="text-sm text-foreground flex-1 truncate">{c.nome}</span>
                    <span className="text-xs tabular-nums whitespace-nowrap">
                      <strong className="text-accent-success font-semibold">{c.pagantes}</strong>
                      <span className="text-muted-foreground"> pagantes · {c.pedidos} pedidos</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Status */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-foreground">Status</Label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStatusSel([...STATUS_OPCOES])} className="text-xs text-primary hover:underline">Todos</button>
                <button type="button" onClick={() => setStatusSel(['approved'])} className="text-xs text-muted-foreground hover:text-foreground hover:underline">Só aprovados</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {STATUS_OPCOES.map(s => (
                <label key={s} className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <Checkbox checked={statusSel.includes(s)} onCheckedChange={() => setStatusSel(alternar(statusSel, s))} />
                  {rotuloStatus(s)}
                </label>
              ))}
            </div>
          </section>

          {/* Formato */}
          <section className="space-y-2">
            <Label className="text-foreground">O que vai no arquivo</Label>
            <p className="text-xs text-muted-foreground">
              Sempre saem as abas <strong>Resumo</strong> (totais e um quadro por curso) e <strong>Pedidos</strong> (a lista completa).
            </p>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Checkbox checked={umaAbaPorCurso} onCheckedChange={v => setUmaAbaPorCurso(!!v)} />
              Uma aba separada para cada curso
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Checkbox checked={abaDeCompradores} onCheckedChange={v => setAbaDeCompradores(!!v)} />
              Aba de compradores (uma linha por pessoa, com o total gasto)
            </label>
          </section>
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground tabular-nums">{filtrados.length}</strong> pedido{filtrados.length === 1 ? '' : 's'}
            {' · '}<strong className="text-foreground">{formatBRL(receita)}</strong> aprovado
          </p>
          <Button onClick={exportar} disabled={exportando || !filtrados.length} className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
            {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exportando ? 'Gerando…' : 'Exportar .xlsx'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StoreExportDialog;
