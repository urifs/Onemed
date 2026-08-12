import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Lock, Unlock, Search, Users, Plus, Trash2, Loader2, ShieldCheck, X, BookOpen, UserPlus, AlertTriangle,
} from 'lucide-react';
import { PLAN_LABELS } from '@/lib/plans';
import { formatDateTimeSP } from '@/lib/utils';

// Ordem de valor — a mesma do checkout e do upgrade.
const PLANOS = ['monthly', 'annual', 'lifetime', 'lifetime_plus', 'lifetime_pro'];

interface CursoRestrito {
  course_id: string;
  title: string;
  slug: string;
  category: string;
  lesson_count: number;
  active: boolean;
  required_plans: string[];
  membros_por_plano: number;
  acessos_manuais: number;
  total_com_acesso: number;
}

interface CursoBusca { id: string; title: string; category: string; lesson_count: number; required_plans: string[] | null; }
interface Grant { id: string; email: string; note: string | null; granted_at: string; }
interface MembroBusca { email: string; plano: string; status: string; expires_at: string | null; ja_tem_grant: boolean; }

const rpc = <T,>(nome: string, args: Record<string, unknown> = {}) =>
  supabase.rpc(nome as never, args as never) as unknown as Promise<{ data: T | null; error: { message: string } | null }>;

export default function ContentAccessPage() {
  const [restritos, setRestritos] = useState<CursoRestrito[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  // busca de curso para aplicar restrição
  const [buscaCurso, setBuscaCurso] = useState('');
  const [resultados, setResultados] = useState<CursoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);

  // diálogo de restrição
  const [editando, setEditando] = useState<CursoBusca | CursoRestrito | null>(null);
  const [planosSel, setPlanosSel] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  // diálogo de acessos manuais
  const [gerindo, setGerindo] = useState<CursoRestrito | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await rpc<CursoRestrito[]>('admin_restricted_courses');
    if (error) { setErro(true); setRestritos([]); }
    else { setErro(false); setRestritos(data || []); }
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Busca de curso: o admin enxerga tudo (policy "Admins manage courses"),
  // inclusive o que já está restrito.
  useEffect(() => {
    const termo = buscaCurso.trim();
    if (termo.length < 2) { setResultados([]); return; }
    let vivo = true;
    setBuscando(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title, category, lesson_count, required_plans')
        .ilike('title', `%${termo}%`)
        .order('title')
        .limit(20);
      if (vivo) { setResultados((data as unknown as CursoBusca[]) || []); setBuscando(false); }
    }, 300);
    return () => { vivo = false; clearTimeout(t); };
  }, [buscaCurso]);

  const abrirRestricao = (c: CursoBusca | CursoRestrito) => {
    setEditando(c);
    setPlanosSel(('required_plans' in c && c.required_plans) ? [...c.required_plans] : []);
  };

  const salvarRestricao = async () => {
    if (!editando || salvando) return;
    setSalvando(true);
    const id = 'course_id' in editando ? editando.course_id : editando.id;
    // Array vazio vira NULL: é o estado "sem restrição", e é o que a função do
    // banco entende como curso visível para todo assinante.
    const valor = planosSel.length > 0 ? planosSel : null;
    const { error } = await supabase.from('courses').update({ required_plans: valor } as never).eq('id', id);
    setSalvando(false);
    if (error) { toast.error('Não foi possível salvar a restrição.'); return; }
    toast.success(valor ? 'Restrição aplicada.' : 'Restrição removida — curso liberado para todos.');
    setEditando(null);
    setBuscaCurso('');
    setResultados([]);
    carregar();
  };

  const totais = useMemo(() => ({
    cursos: restritos.length,
    manuais: restritos.reduce((s, c) => s + Number(c.acessos_manuais || 0), 0),
    aulas: restritos.reduce((s, c) => s + Number(c.lesson_count || 0), 0),
  }), [restritos]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-secondary text-2xl font-bold text-foreground">Gerenciar Conteúdos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Restrinja um curso a planos específicos e libere acesso individual para quem comprou por fora.
          </p>
        </div>

        {/* resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 3xl:max-w-[1240px]">
          {[
            { label: 'Cursos com restrição', valor: totais.cursos, icon: Lock, cor: 'text-primary' },
            { label: 'Acessos manuais concedidos', valor: totais.manuais, icon: UserPlus, cor: 'text-accent-success' },
            { label: 'Aulas sob restrição', valor: totais.aulas, icon: BookOpen, cor: 'text-accent-info' },
          ].map((s, i) => (
            <Card key={i} className="bg-background-paper border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <s.icon className={`w-4 h-4 ${s.cor}`} />
                </div>
                <p className="font-secondary text-2xl font-bold text-foreground">{loading ? '—' : s.valor}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* aplicar restrição */}
        <Card className="bg-background-paper border-border">
          <CardContent className="p-5 space-y-4">
            <div>
              <h2 className="font-secondary text-lg font-bold text-foreground">Restringir um curso</h2>
              <p className="text-sm text-muted-foreground">
                Busque o curso e escolha quais planos podem vê-lo. Para os demais assinantes ele fica invisível —
                não aparece na lista, na busca nem pelo link direto.
              </p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={buscaCurso}
                onChange={e => setBuscaCurso(e.target.value)}
                placeholder="Digite o nome do curso…"
                className="pl-9 bg-background border-border text-foreground"
              />
              {buscando && <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
            </div>
            {resultados.length > 0 && (
              <div className="rounded-xl border border-border divide-y divide-border max-h-80 overflow-y-auto">
                {resultados.map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3 bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.category} · {c.lesson_count} aulas
                        {c.required_plans?.length ? ` · restrito a ${c.required_plans.map(p => PLAN_LABELS[p] || p).join(', ')}` : ''}
                      </p>
                    </div>
                    <Button size="sm" variant={c.required_plans?.length ? 'outline' : 'default'} onClick={() => abrirRestricao(c)}>
                      {c.required_plans?.length ? 'Editar' : <><Lock className="w-3.5 h-3.5 mr-1.5" /> Restringir</>}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* quadro dos restritos */}
        <Card className="bg-background-paper border-border">
          <CardContent className="p-5">
            <h2 className="font-secondary text-lg font-bold text-foreground mb-4">Cursos com restrição de plano</h2>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : erro ? (
              <div className="text-center py-10">
                <AlertTriangle className="w-6 h-6 text-accent-warning mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">Não foi possível carregar.</p>
                <Button variant="outline" onClick={carregar}>Tentar novamente</Button>
              </div>
            ) : restritos.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Unlock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum curso restrito — todo o acervo está visível para os assinantes.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                      <th className="pb-2 pr-4">Curso</th>
                      <th className="pb-2 pr-4">Planos liberados</th>
                      <th className="pb-2 pr-4 text-right">Pelo plano</th>
                      <th className="pb-2 pr-4 text-right">Manuais</th>
                      <th className="pb-2 pr-4 text-right">Total c/ acesso</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {restritos.map(c => (
                      <tr key={c.course_id}>
                        <td className="py-3 pr-4">
                          <p className="text-foreground font-medium">{c.title}</p>
                          <p className="text-xs text-muted-foreground">{c.category} · {c.lesson_count} aulas{!c.active && ' · inativo'}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {(c.required_plans || []).map(p => (
                              <span key={p} className="text-[11px] rounded-full bg-primary/15 text-primary border border-primary/30 px-2 py-0.5">
                                {PLAN_LABELS[p] || p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums text-foreground">{c.membros_por_plano}</td>
                        <td className="py-3 pr-4 text-right tabular-nums text-accent-success">{c.acessos_manuais}</td>
                        <td className="py-3 pr-4 text-right tabular-nums font-semibold text-foreground">{c.total_com_acesso}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5 justify-end">
                            <Button size="sm" variant="outline" onClick={() => setGerindo(c)}>
                              <Users className="w-3.5 h-3.5 mr-1.5" /> Acessos
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => abrirRestricao(c)}>Editar</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {editando && (
        <RestricaoDialog
          curso={editando}
          planosSel={planosSel}
          setPlanosSel={setPlanosSel}
          salvando={salvando}
          onSalvar={salvarRestricao}
          onClose={() => setEditando(null)}
        />
      )}

      {gerindo && (
        <AcessosDialog curso={gerindo} onClose={() => { setGerindo(null); carregar(); }} />
      )}
    </AdminLayout>
  );
}

// ─── Diálogo: quais planos veem o curso ──────────────────────────────────────
function RestricaoDialog({ curso, planosSel, setPlanosSel, salvando, onSalvar, onClose }: {
  curso: CursoBusca | CursoRestrito;
  planosSel: string[];
  setPlanosSel: (p: string[]) => void;
  salvando: boolean;
  onSalvar: () => void;
  onClose: () => void;
}) {
  const titulo = curso.title;
  const alternar = (p: string) =>
    setPlanosSel(planosSel.includes(p) ? planosSel.filter(x => x !== p) : [...planosSel, p]);

  return (
    <Dialog open onOpenChange={v => { if (!v && !salvando) onClose(); }}>
      <DialogContent className="bg-background-paper border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Restrição de plano
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">{titulo}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Marque os planos que podem ver este curso. Sem nenhum marcado, o curso volta a aparecer
            para todos os assinantes.
          </p>

          <div className="space-y-2">
            {PLANOS.map(p => {
              const on = planosSel.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => alternar(p)}
                  className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    on ? 'bg-primary/10 border-primary/50' : 'bg-secondary border-border hover:border-primary/30'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${on ? 'bg-primary border-primary' : 'border-border'}`}>
                    {on && <ShieldCheck className="w-3 h-3 text-primary-foreground" />}
                  </span>
                  <span className={`text-sm font-medium ${on ? 'text-primary' : 'text-foreground'}`}>
                    {PLAN_LABELS[p] || p}
                  </span>
                </button>
              );
            })}
          </div>

          <div className={`rounded-xl border px-4 py-3 text-xs ${
            planosSel.length ? 'border-primary/30 bg-primary/5 text-muted-foreground' : 'border-border bg-secondary text-muted-foreground'
          }`}>
            {planosSel.length ? (
              <>Só assinantes de <span className="text-foreground font-medium">{planosSel.map(p => PLAN_LABELS[p] || p).join(', ')}</span> verão
              este curso. Os demais não o encontram nem pelo link direto — e você ainda pode liberar pessoa por pessoa em "Acessos".</>
            ) : (
              <>Sem restrição: o curso aparece para todos os assinantes.</>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={salvando}>Cancelar</Button>
            <Button onClick={onSalvar} disabled={salvando}>
              {salvando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {planosSel.length ? 'Aplicar restrição' : 'Liberar para todos'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Diálogo: quem tem acesso manual ─────────────────────────────────────────
function AcessosDialog({ curso, onClose }: { curso: CursoRestrito; onClose: () => void }) {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [achados, setAchados] = useState<MembroBusca[]>([]);
  const [procurando, setProcurando] = useState(false);
  const [salvandoEmail, setSalvandoEmail] = useState<string | null>(null);

  const carregarGrants = useCallback(async () => {
    setCarregando(true);
    const { data } = await supabase
      .from('course_access_grants' as never)
      .select('id, email, note, granted_at')
      .eq('course_id', curso.course_id)
      .order('granted_at', { ascending: false });
    setGrants((data as unknown as Grant[]) || []);
    setCarregando(false);
  }, [curso.course_id]);

  useEffect(() => { carregarGrants(); }, [carregarGrants]);

  useEffect(() => {
    const termo = busca.trim();
    if (termo.length < 2) { setAchados([]); return; }
    let vivo = true;
    setProcurando(true);
    const t = setTimeout(async () => {
      const { data } = await rpc<MembroBusca[]>('admin_search_members', { _query: termo, _course_id: curso.course_id });
      if (vivo) { setAchados(data || []); setProcurando(false); }
    }, 350);
    return () => { vivo = false; clearTimeout(t); };
  }, [busca, curso.course_id]);

  const conceder = async (email: string) => {
    if (salvandoEmail) return;
    setSalvandoEmail(email);
    // E-mail sempre em minúsculas: a checagem no banco compara lower(email),
    // e gravar como veio deixaria duas linhas para a mesma pessoa.
    const { error } = await supabase.from('course_access_grants' as never).insert({
      course_id: curso.course_id,
      email: email.toLowerCase().trim(),
      note: 'Comprou o curso por fora do plano',
    } as never);
    setSalvandoEmail(null);
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Esta pessoa já tem acesso.' : 'Não foi possível conceder.');
      return;
    }
    toast.success(`Acesso liberado para ${email}`);
    setBusca(''); setAchados([]);
    carregarGrants();
  };

  const revogar = async (g: Grant) => {
    if (!window.confirm(`Remover o acesso de ${g.email} a "${curso.title}"?\n\nSe o plano dela não incluir este curso, ela deixa de vê-lo.`)) return;
    const { error } = await supabase.from('course_access_grants' as never).delete().eq('id', g.id);
    if (error) { toast.error('Não foi possível remover.'); return; }
    setGrants(prev => prev.filter(x => x.id !== g.id));
    toast.success('Acesso removido.');
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-background-paper border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Acessos ao curso
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {curso.title} — liberado para {(curso.required_plans || []).map(p => PLAN_LABELS[p] || p).join(', ')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
            Quem tem um dos planos acima já vê o curso ({curso.membros_por_plano} pessoas). Use a busca para
            liberar <span className="text-foreground font-medium">individualmente</span> quem comprou o curso por fora
            e está em outro plano.
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-2">Conceder acesso</p>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar aluno por e-mail…"
                className="pl-9 bg-background border-border text-foreground"
              />
              {procurando && <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
            </div>
            {achados.length > 0 && (
              <div className="mt-2 rounded-xl border border-border divide-y divide-border max-h-56 overflow-y-auto">
                {achados.map(m => (
                  <div key={m.email} className="flex items-center gap-3 px-3 py-2.5 bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{m.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {PLAN_LABELS[m.plano] || m.plano} · {m.status}
                      </p>
                    </div>
                    {m.ja_tem_grant ? (
                      <span className="text-xs text-accent-success shrink-0">já tem acesso</span>
                    ) : (
                      <Button size="sm" onClick={() => conceder(m.email)} disabled={salvandoEmail === m.email}>
                        {salvandoEmail === m.email ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Plus className="w-3.5 h-3.5 mr-1" /> Liberar</>}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {busca.trim().length >= 2 && !procurando && achados.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">Nenhum aluno encontrado com esse e-mail.</p>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-2">
              Acessos manuais ({grants.length})
            </p>
            {carregando ? (
              <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : grants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center rounded-xl border border-dashed border-border">
                Ninguém recebeu acesso individual a este curso ainda.
              </p>
            ) : (
              <div className="rounded-xl border border-border divide-y divide-border max-h-64 overflow-y-auto">
                {grants.map(g => (
                  <div key={g.id} className="flex items-center gap-3 px-3 py-2.5 bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{g.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTimeSP(g.granted_at)}{g.note ? ` · ${g.note}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => revogar(g)}
                      title="Remover acesso"
                      className="shrink-0 p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-secondary transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}><X className="w-4 h-4 mr-1.5" /> Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
