import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarClock, ChevronDown, ChevronUp, Loader2, Users, ListChecks, Target, Brain, Flag, Lightbulb } from 'lucide-react';
import { MindMap } from '@/components/member/MindMap';

interface Overview {
  id: string; user_id: string; student_name: string | null; student_email: string | null;
  title: string; objective: string; weekly_hours: number | null; duration_weeks: number | null;
  total_tasks: number; done_tasks: number; created_at: string; updated_at: string;
}

export default function StudyPlansAdminPage() {
  const [rows, setRows] = useState<Overview[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, any>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_study_plans_overview' as never);
    setRows(((data || []) as unknown as Overview[]));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!detail[id]) {
      const { data } = await supabase.from('study_plans' as never).select('*').eq('id', id).maybeSingle();
      if (data) setDetail(prev => ({ ...prev, [id]: data }));
    }
  };

  const totals = useMemo(() => ({
    planos: rows.length,
    alunos: new Set(rows.map(r => r.user_id)).size,
    tarefas: rows.reduce((a, r) => a + r.total_tasks, 0),
    feitas: rows.reduce((a, r) => a + r.done_tasks, 0),
  }), [rows]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-secondary text-3xl font-bold text-foreground flex items-center gap-2">
            <CalendarClock className="w-7 h-7 text-primary" /> Cronogramas de Estudos
          </h1>
          <p className="text-muted-foreground mt-1">Cronogramas que os alunos geraram, com o progresso de cada um</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: CalendarClock, label: 'Cronogramas', value: String(totals.planos) },
            { icon: Users, label: 'Alunos', value: String(totals.alunos) },
            { icon: ListChecks, label: 'Tarefas totais', value: String(totals.tarefas) },
            { icon: ListChecks, label: 'Tarefas concluídas', value: String(totals.feitas) },
          ].map(c => (
            <Card key={c.label} className="bg-background-paper border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-2">
                  <c.icon className="w-3.5 h-3.5 text-primary" /> {c.label}
                </div>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-background-paper border-border">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
            ) : rows.length === 0 ? (
              <p className="p-10 text-sm text-muted-foreground text-center">Nenhum cronograma gerado ainda.</p>
            ) : (
              <div className="divide-y divide-border">
                {rows.map(r => {
                  const pct = r.total_tasks ? Math.round((r.done_tasks / r.total_tasks) * 100) : 0;
                  const isOpen = expanded === r.id;
                  const d = detail[r.id];
                  return (
                    <div key={r.id}>
                      <button onClick={() => toggle(r.id)}
                        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary/40 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {r.student_name || 'Sem nome'} · {r.student_email} · {new Date(r.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right shrink-0 w-28">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[11px] text-muted-foreground tabular-nums">{pct}%</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{r.done_tasks}/{r.total_tasks} tarefas</p>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 space-y-4">
                          <div className="rounded-lg bg-secondary/40 border border-border px-4 py-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground"><Target className="w-3.5 h-3.5 text-primary" /> Objetivo</span>
                            <p className="mt-1">{r.objective}</p>
                            <p className="mt-2">{r.duration_weeks} semanas{r.weekly_hours ? ` · ${r.weekly_hours}h/sem` : ''}</p>
                          </div>
                          {!d ? (
                            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                          ) : (
                            <>
                              {d.plan?.mindmap && (
                                <div>
                                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2"><Brain className="w-3.5 h-3.5 text-primary" /> Mapa mental</p>
                                  <MindMap root={d.plan.mindmap} />
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2"><ListChecks className="w-3.5 h-3.5 text-primary" /> Semanas</p>
                                <div className="space-y-2">
                                  {(d.plan?.weeks || []).map((w: any) => {
                                    const feitos = new Set(d.completed_tasks || []);
                                    const wd = (w.tasks || []).filter((t: any) => feitos.has(t.id)).length;
                                    return (
                                      <div key={w.week} className="rounded-lg border border-border px-3 py-2 text-xs">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-foreground">Semana {w.week}: {w.theme}</span>
                                          <span className="text-muted-foreground tabular-nums">{wd}/{(w.tasks || []).length}</span>
                                        </div>
                                        <ul className="mt-1 space-y-0.5">
                                          {(w.tasks || []).map((t: any) => (
                                            <li key={t.id} className={feitos.has(t.id) ? 'text-accent-success line-through' : 'text-muted-foreground'}>
                                              • {t.label}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              {d.plan?.tips?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2"><Lightbulb className="w-3.5 h-3.5 text-primary" /> Dicas</p>
                                  <ul className="space-y-1 text-xs text-muted-foreground">
                                    {d.plan.tips.map((t: string, i: number) => <li key={i}>• {t}</li>)}
                                  </ul>
                                </div>
                              )}
                            </>
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
