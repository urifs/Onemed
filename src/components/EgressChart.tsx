import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatFileSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Table2, BarChart3 } from 'lucide-react';

interface EgressRow { day: string; source: string; bytes: number; requests: number; }

const SOURCE_LABEL: Record<string, string> = {
  'member-stream-file': 'Streaming de aulas/arquivos',
  'admin-database-backup': 'Backup do banco',
};
const SOURCE_ORDER = ['member-stream-file', 'admin-database-backup'];
const SOURCE_COLOR: Record<string, string> = {
  'member-stream-file': 'bg-primary',
  'admin-database-backup': 'bg-accent-info',
};
const DAYS_SHOWN = 14;

function todayISO(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

export function EgressChart() {
  const [rows, setRows] = useState<EgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [hoverDay, setHoverDay] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from('egress_daily')
        .select('*')
        .gte('day', todayISO(DAYS_SHOWN - 1))
        .order('day', { ascending: true });
      if (error) throw error;
      setRows((data || []) as EgressRow[]);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => todayISO(DAYS_SHOWN - 1 - i));
  const sourcesPresent = SOURCE_ORDER.filter(s => rows.some(r => r.source === s));
  const bySources = sourcesPresent.length ? sourcesPresent : SOURCE_ORDER;

  const byDay = new Map<string, Record<string, number>>();
  for (const day of days) byDay.set(day, {});
  for (const r of rows) {
    if (!byDay.has(r.day)) byDay.set(r.day, {});
    byDay.get(r.day)![r.source] = r.bytes;
  }

  const dayTotal = (day: string) => bySources.reduce((s, src) => s + (byDay.get(day)?.[src] || 0), 0);
  const maxTotal = Math.max(1, ...days.map(dayTotal));
  const periodTotal = rows.reduce((s, r) => s + r.bytes, 0);
  const totalBySource: Record<string, number> = {};
  for (const r of rows) totalBySource[r.source] = (totalBySource[r.source] || 0) + r.bytes;

  if (loadError && !loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <AlertTriangle className="w-6 h-6 text-accent-warning" />
        <p className="text-foreground text-sm font-medium">Não foi possível carregar o egress</p>
        <Button onClick={fetchData} size="sm" variant="outline" className="border-border text-muted-foreground hover:text-foreground gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 3 categorias, espelhando o dashboard da Supabase */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-secondary/40 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Auth Egress</p>
          <p className="text-sm text-muted-foreground">Não disponível via API — consulte o dashboard da Supabase (historicamente irrelevante: ~2MB/dia)</p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/40 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">PostgREST Egress</p>
          <p className="text-sm text-muted-foreground">Não disponível via API — consulte o dashboard da Supabase (historicamente irrelevante: ~55MB/dia)</p>
        </div>
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs text-primary uppercase tracking-wide mb-1 font-semibold">Functions Egress ({DAYS_SHOWN}d)</p>
          <p className="font-secondary text-2xl font-bold text-foreground">{loading ? '—' : formatFileSize(periodTotal) || '0 B'}</p>
          <p className="text-xs text-muted-foreground mt-1">Rastreado diretamente pelo app — é a categoria que de fato consome a cota</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {bySources.map(src => (
            <div key={src} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`w-2.5 h-2.5 rounded-sm ${SOURCE_COLOR[src] || 'bg-muted'}`} />
              {SOURCE_LABEL[src] || src}
              {!loading && <span className="text-foreground font-medium ml-0.5">{formatFileSize(totalBySource[src] || 0) || '0 B'}</span>}
            </div>
          ))}
        </div>
        <Button onClick={() => setShowTable(v => !v)} size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground gap-1.5">
          {showTable ? <BarChart3 className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
          {showTable ? 'Ver gráfico' : 'Ver tabela'}
        </Button>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
      ) : showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-xs font-mono uppercase text-muted-foreground">Dia</th>
                {bySources.map(src => (
                  <th key={src} className="text-right px-3 py-2 text-xs font-mono uppercase text-muted-foreground">{SOURCE_LABEL[src] || src}</th>
                ))}
                <th className="text-right px-3 py-2 text-xs font-mono uppercase text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map(day => (
                <tr key={day} className="border-b border-border/40">
                  <td className="px-3 py-2 text-muted-foreground">{day}</td>
                  {bySources.map(src => (
                    <td key={src} className="px-3 py-2 text-right text-foreground">{formatFileSize(byDay.get(day)?.[src] || 0) || '—'}</td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold text-foreground">{formatFileSize(dayTotal(day)) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-end gap-1.5 h-40 relative">
          {days.map(day => {
            const total = dayTotal(day);
            const heightPct = maxTotal > 0 ? Math.max(total > 0 ? 2 : 0, (total / maxTotal) * 100) : 0;
            return (
              <div
                key={day}
                className="flex-1 h-full flex flex-col justify-end items-stretch relative group"
                onMouseEnter={() => setHoverDay(day)}
                onMouseLeave={() => setHoverDay(h => (h === day ? null : h))}
              >
                {hoverDay === day && (
                  <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap bg-popover border border-border rounded-md px-2.5 py-1.5 text-xs shadow-md">
                    <p className="font-semibold text-foreground mb-0.5">{day}</p>
                    {bySources.map(src => (
                      <p key={src} className="text-muted-foreground">{SOURCE_LABEL[src] || src}: <span className="text-foreground">{formatFileSize(byDay.get(day)?.[src] || 0) || '0 B'}</span></p>
                    ))}
                  </div>
                )}
                <div
                  className="w-full rounded-t-sm flex flex-col-reverse overflow-hidden transition-opacity group-hover:opacity-80"
                  style={{ height: `${heightPct}%`, minHeight: total > 0 ? '2px' : '0' }}
                >
                  {bySources.map(src => {
                    const val = byDay.get(day)?.[src] || 0;
                    if (!val || !total) return null;
                    return (
                      <div
                        key={src}
                        className={`${SOURCE_COLOR[src] || 'bg-muted'} w-full`}
                        style={{ height: `${(val / total) * 100}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!loading && !showTable && (
        <div className="flex gap-1.5 text-[10px] text-muted-foreground -mt-1">
          {days.map(day => (
            <span key={day} className="flex-1 text-center truncate">{day.slice(8, 10)}/{day.slice(5, 7)}</span>
          ))}
        </div>
      )}
    </div>
  );
}
