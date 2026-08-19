import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft, CalendarClock, Plus, Loader2, Target, Trash2, Check, Brain,
  Flag, Lightbulb, Clock, BookOpen, RefreshCw, PencilLine, Dumbbell, Coffee, ListChecks,
} from 'lucide-react';
import { useMemberStatus } from '@/hooks/useMemberStatus';
import { extractFunctionErrorMessage } from '@/lib/utils';
import { MindMap, type MindNode } from '@/components/member/MindMap';
import { SaveToPlaylistButton } from '@/components/member/SaveToPlaylistButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Seo } from '@/seo/Seo';

interface Task { id: string; label: string; type: string; hours: number | null; }
interface Week { week: number; theme: string; focus: string; goal: string; tasks: Task[]; }
interface Milestone { week: number; label: string; }
type Tip = string | { label?: string; description?: string };
interface PlanBody {
  title: string; overview: string; durationWeeks: number; weeklyHours: number;
  weeks: Week[]; milestones: Milestone[]; mindmap: MindNode; tips: Tip[];
}
interface StudyPlan {
  id: string; title: string; objective: string; weekly_hours: number | null;
  duration_weeks: number | null; exam_date: string | null; plan: PlanBody;
  completed_tasks: string[]; created_at: string;
}

const TASK_ICON: Record<string, typeof BookOpen> = {
  estudo: BookOpen, revisao: RefreshCw, pratica: PencilLine, simulado: Dumbbell, descanso: Coffee,
};
const TASK_LABEL: Record<string, string> = {
  estudo: 'Estudo', revisao: 'Revisão', pratica: 'Prática', simulado: 'Simulado', descanso: 'Descanso',
};

export default function StudyPlanPage() {
  const navigate = useNavigate();
  const { plan: memberPlan } = useMemberStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('id'));

  // Trial agora PODE gerar cronograma (limite de 5 usos aplicado no servidor,
  // como todas as ferramentas de IA). Só o Mensal fica sem — bloqueado no
  // diálogo de criação abaixo.
  const isMonthly = memberPlan === 'monthly';

  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('study_plans' as never)
      .select('*').order('created_at', { ascending: false });
    // Engolir o erro mostrava "Monte seu primeiro cronograma" pra quem TEM
    // cronogramas salvos — como se tivessem sumido.
    if (!error) { setPlans((data || []) as unknown as StudyPlan[]); setLoadError(false); }
    else setLoadError(true);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = useMemo(() => plans.find(p => p.id === selectedId) || null, [plans, selectedId]);

  const openPlan = (id: string) => { setSelectedId(id); setSearchParams({ id }, { replace: true }); };
  const closePlan = () => { setSelectedId(null); setSearchParams({}, { replace: true }); };

  const onCreated = (p: StudyPlan) => {
    setPlans(prev => [p, ...prev]);
    setCreateOpen(false);
    openPlan(p.id);
  };

  const updatePlanLocal = (p: StudyPlan) => setPlans(prev => prev.map(x => x.id === p.id ? p : x));

  const removePlan = async (p: StudyPlan) => {
    if (!confirm(`Excluir o cronograma "${p.title}"?`)) return;
    const { error } = await supabase.from('study_plans' as never).delete().eq('id', p.id);
    if (error) { toast.error('Não foi possível excluir.'); return; }
    setPlans(prev => prev.filter(x => x.id !== p.id));
    closePlan();
    toast.success('Cronograma excluído.');
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Cronograma de Estudos | OneMed" description="Gere um cronograma de estudos personalizado com IA." path="/membros/cronograma" noindex />

      <header className="border-b border-border bg-background-paper sticky top-0 z-30">
        <div className="shell-form px-4 sm:px-6 py-3.5 flex items-center gap-3">
          <button onClick={() => selected ? closePlan() : navigate('/membros')} title="Voltar"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-secondary text-lg font-bold text-foreground flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-primary" /> Cronograma de Estudos
            </h1>
            <p className="text-xs text-muted-foreground truncate">Seu plano de estudos personalizado, com checklist e mapa mental</p>
          </div>
          {!selected && (
            <button onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold px-4 py-2.5 transition-colors shrink-0">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo cronograma</span><span className="sm:hidden">Novo</span>
            </button>
          )}
        </div>
      </header>

      <main className="shell-form px-4 sm:px-6 py-6">
        {selected ? (
          <PlanDetail plan={selected} onChange={updatePlanLocal} onDelete={removePlan} />
        ) : loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : loadError && plans.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center">
            <h2 className="font-secondary text-lg font-bold text-foreground mb-1">Não foi possível carregar seus cronogramas</h2>
            <p className="text-sm text-muted-foreground mb-5">Verifique sua conexão e tente novamente.</p>
            <button onClick={load}
              className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-6 py-3 transition-colors">
              Tentar novamente
            </button>
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center">
            <CalendarClock className="w-9 h-9 text-primary mx-auto mb-3" />
            <h2 className="font-secondary text-lg font-bold text-foreground mb-1">Monte seu primeiro cronograma</h2>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              Descreva seu objetivo (a prova que vai prestar, o prazo, suas dificuldades) e a IA monta um plano de
              estudos completo — semana a semana, com tarefas, marcos, dicas e um mapa mental do conteúdo.
            </p>
            <button onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-6 py-3 transition-colors">
              <Plus className="w-4 h-4" /> Criar cronograma
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {plans.map(p => {
              const total = p.plan.weeks.reduce((a, w) => a + w.tasks.length, 0);
              const done = (p.completed_tasks || []).length;
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <div key={p.id}
                  className="relative rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors">
                  <div className="absolute top-3 right-3 z-10">
                    <SaveToPlaylistButton itemType="study_plan" itemId={p.id} label="Salvar cronograma em playlist" />
                  </div>
                  <button onClick={() => openPlan(p.id)} className="w-full p-5 text-left">
                    <div className="flex items-start gap-3 mb-3 pr-8">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <CalendarClock className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-2">{p.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.duration_weeks} semanas{p.weekly_hours ? ` · ${p.weekly_hours}h/sem` : ''}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.objective}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground tabular-nums">{done}/{total}</span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {createOpen && (
        <CreateDialog isMonthly={isMonthly} onClose={() => setCreateOpen(false)} onCreated={onCreated} />
      )}
    </div>
  );
}

// ─── CRIAÇÃO ─────────────────────────────────────────────────────────────────
function CreateDialog({ isMonthly, onClose, onCreated }: {
  isMonthly: boolean; onClose: () => void; onCreated: (p: StudyPlan) => void;
}) {
  const [objective, setObjective] = useState('');
  const [weeklyHours, setWeeklyHours] = useState('');
  const [examDate, setExamDate] = useState('');
  const [focus, setFocus] = useState('');
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (objective.trim().length < 10) { toast.error('Descreva seu objetivo com mais detalhes.'); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-study-plan', {
        body: {
          objective: objective.trim(),
          weeklyHours: weeklyHours ? Number(weeklyHours) : undefined,
          examDate: examDate || undefined,
          focus: focus.trim() || undefined,
        },
      });
      // O motivo real de um 403/429 (plano sem acesso, limite diário) vem no
      // corpo da resposta — error.message cru é só a frase genérica em inglês.
      if (error || data?.error) {
        throw new Error(data?.error || await extractFunctionErrorMessage(error, 'Não foi possível gerar o cronograma.'));
      }
      toast.success('Cronograma criado!');
      onCreated(data.plan as StudyPlan);
    } catch (err: any) {
      const cru = String(err?.message || '');
      const rede = /Failed to send a request|Failed to fetch|NetworkError|aborted/i.test(cru);
      toast.error(rede ? 'A conexão caiu durante a geração. Tente de novo.' : cru || 'Não foi possível gerar o cronograma.');
      setGenerating(false);
    }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v && !generating) onClose(); }}>
      <DialogContent className="bg-background-paper border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" /> Novo cronograma de estudos
          </DialogTitle>
        </DialogHeader>

        {isMonthly ? (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              O gerador de cronograma por IA não está incluído no Plano Mensal. Faça upgrade para liberar.
            </p>
            <Link to="/membros?upgrade=1" onClick={onClose}
              className="inline-flex rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-6 py-3 transition-colors">
              Ver planos
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1.5">
                <Target className="w-3.5 h-3.5 text-primary" /> Qual é o seu objetivo?
              </label>
              <textarea
                value={objective} onChange={e => setObjective(e.target.value.slice(0, 2000))} rows={4} disabled={generating}
                placeholder="Ex: Passar na residência de Clínica Médica. Tenho 6 meses, estudo à noite e tenho dificuldade em cardiologia e nefrologia."
                className="w-full resize-none rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Horas por semana</label>
                <input type="number" min={1} max={100} value={weeklyHours} onChange={e => setWeeklyHours(e.target.value)} disabled={generating}
                  placeholder="Ex: 15"
                  className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Data da prova (opcional)</label>
                <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} disabled={generating}
                  className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50" />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Pontos fracos / preferências (opcional)</label>
              <textarea
                value={focus} onChange={e => setFocus(e.target.value.slice(0, 1000))} rows={2} disabled={generating}
                placeholder="Ex: reforçar cardiologia, gosto de resolver questões, pouco tempo aos fins de semana"
                className="w-full resize-none rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
            </div>

            {generating && (
              <div className="rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3 flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">Montando seu cronograma detalhado… isso leva de 30 a 60 segundos.</p>
              </div>
            )}

            <button onClick={generate} disabled={generating || objective.trim().length < 10}
              className="w-full rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground font-semibold py-3.5 transition-colors flex items-center justify-center gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
              {generating ? 'Gerando…' : 'Gerar cronograma'}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── DETALHE ─────────────────────────────────────────────────────────────────
function PlanDetail({ plan, onChange, onDelete }: {
  plan: StudyPlan; onChange: (p: StudyPlan) => void; onDelete: (p: StudyPlan) => void;
}) {
  const [openWeek, setOpenWeek] = useState<number | null>(plan.plan.weeks[0]?.week ?? null);
  const done = useMemo(() => new Set(plan.completed_tasks || []), [plan.completed_tasks]);
  const total = useMemo(() => plan.plan.weeks.reduce((a, w) => a + w.tasks.length, 0), [plan]);
  const pct = total ? Math.round((done.size / total) * 100) : 0;

  const toggleTask = async (taskId: string) => {
    const next = new Set(done);
    if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
    const arr = [...next];
    onChange({ ...plan, completed_tasks: arr }); // otimista
    const { error } = await supabase.from('study_plans' as never)
      .update({ completed_tasks: arr, updated_at: new Date().toISOString() } as never)
      .eq('id', plan.id);
    if (error) { toast.error('Não foi possível salvar o progresso.'); onChange(plan); }
  };

  const weekDone = (w: Week) => w.tasks.filter(t => done.has(t.id)).length;

  return (
    <div className="space-y-6">
      {/* cabeçalho */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-secondary text-xl font-bold text-foreground">{plan.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{plan.plan.overview}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <SaveToPlaylistButton itemType="study_plan" itemId={plan.id} label="Salvar cronograma em playlist" />
            <button onClick={() => onDelete(plan)} title="Excluir cronograma"
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5 text-primary" /> {plan.duration_weeks} semanas</span>
          {plan.weekly_hours && <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" /> {plan.weekly_hours}h por semana</span>}
          {plan.exam_date && <span className="inline-flex items-center gap-1.5"><Flag className="w-3.5 h-3.5 text-primary" /> Prova em {new Date(plan.exam_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="inline-flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5" /> Progresso</span>
            <span className="tabular-nums font-medium text-foreground">{done.size} de {total} tarefas · {pct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-border overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
          <span className="font-medium text-foreground">Objetivo:</span> {plan.objective}
        </p>
      </div>

      {/* mapa mental */}
      {plan.plan.mindmap && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-primary" /> Mapa mental do conteúdo
          </h3>
          <MindMap root={plan.plan.mindmap} />
        </div>
      )}

      {/* marcos */}
      {plan.plan.milestones?.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Flag className="w-4 h-4 text-primary" /> Marcos
          </h3>
          <div className="space-y-2.5">
            {plan.plan.milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="shrink-0 w-16 text-xs font-semibold text-primary">Semana {m.week}</span>
                <span className="text-sm text-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* semanas + checklist */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary" /> Cronograma semanal
        </h3>
        {plan.plan.weeks.map(w => {
          const wDone = weekDone(w);
          const isOpen = openWeek === w.week;
          return (
            <div key={w.week} className="rounded-2xl border border-border bg-card overflow-hidden">
              <button onClick={() => setOpenWeek(isOpen ? null : w.week)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary/40 transition-colors">
                <span className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex flex-col items-center justify-center text-primary">
                  <span className="text-[9px] uppercase leading-none">Sem</span>
                  <span className="text-sm font-bold leading-none">{w.week}</span>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{w.theme}</p>
                  {w.focus && <p className="text-xs text-muted-foreground truncate">{w.focus}</p>}
                </div>
                <span className={`shrink-0 text-[11px] tabular-nums rounded-full px-2 py-0.5 ${wDone === w.tasks.length && w.tasks.length > 0 ? 'bg-accent-success/15 text-accent-success' : 'bg-secondary text-muted-foreground'}`}>
                  {wDone}/{w.tasks.length}
                </span>
              </button>
              {isOpen && (
                <div className="px-5 pb-5">
                  {w.goal && (
                    <p className="text-xs text-muted-foreground mb-3 rounded-lg bg-secondary/50 border border-border px-3 py-2">
                      <span className="font-semibold text-foreground">Meta da semana:</span> {w.goal}
                    </p>
                  )}
                  <div className="space-y-1.5">
                    {w.tasks.map(t => {
                      const Icon = TASK_ICON[t.type] || BookOpen;
                      const checked = done.has(t.id);
                      return (
                        <button key={t.id} onClick={() => toggleTask(t.id)}
                          className="w-full flex items-start gap-3 rounded-lg border border-border bg-secondary/40 hover:bg-secondary px-3 py-2.5 text-left transition-colors group">
                          <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${checked ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                            {checked && <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className={`block text-sm ${checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{t.label}</span>
                            <span className="inline-flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                              <Icon className="w-3 h-3" /> {TASK_LABEL[t.type] || t.type}{t.hours ? ` · ${t.hours}h` : ''}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* dicas */}
      {plan.plan.tips?.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-primary" /> Dicas de estudo
          </h3>
          <ul className="space-y-3">
            {plan.plan.tips.map((t, i) => {
              // Aceita dica como texto simples ou {label, description}.
              const label = typeof t === 'string' ? t : (t?.label || '');
              const desc = typeof t === 'string' ? '' : (t?.description || '');
              return (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="shrink-0 mt-0.5 text-primary">•</span>
                  <span>
                    <span className="font-medium text-foreground">{label}</span>
                    {desc && <span className="text-muted-foreground">{label ? ' — ' : ''}{desc}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
