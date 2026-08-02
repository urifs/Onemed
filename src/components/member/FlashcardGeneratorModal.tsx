import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Loader2, Plus, Sparkles, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { FlashcardDeck } from './FlashcardViewer';

export interface FlashcardSource {
  id: string;
  title: string;
}

export interface GeneratedDeck extends FlashcardDeck {
  source: FlashcardSource[];
  warnings: string[];
}

const MAX_SOURCES = 8;

const DIFFICULTIES = [
  { value: 'basico', label: 'Básico' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
] as const;

interface CourseNode {
  id: string;
  title: string;
}

interface ModuleNode {
  id: string;
  title: string;
  path: string | null;
}

interface LessonNode {
  id: string;
  title: string;
  module_id: string | null;
}

interface SearchResult {
  lesson_id: string;
  lesson_title: string;
  lesson_type: string;
  course_title: string;
}

// Árvore de cursos para juntar mais conteúdo à geração. Tudo é carregado sob
// demanda — são 400+ cursos e 200 mil+ aulas, impossível trazer de uma vez:
// expandir um curso busca os módulos e as aulas soltas dele; expandir um
// módulo busca as aulas daquele módulo.
function ContentTree({ selected, onToggle }: {
  selected: Map<string, string>;
  onToggle: (lesson: FlashcardSource) => void;
}) {
  const [courses, setCourses] = useState<CourseNode[] | null>(null);
  const [openCourses, setOpenCourses] = useState<Set<string>>(new Set());
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [modulesByCourse, setModulesByCourse] = useState<Record<string, ModuleNode[]>>({});
  const [lessonsByKey, setLessonsByKey] = useState<Record<string, LessonNode[]>>({});
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [lessonResults, setLessonResults] = useState<SearchResult[]>([]);
  const [searchingLessons, setSearchingLessons] = useState(false);

  useEffect(() => {
    supabase.from('courses').select('id, title').eq('active', true).order('title')
      .then(({ data }) => setCourses((data || []) as CourseNode[]));
  }, []);

  // A busca não filtra só os cursos: procura também AULAS E ARQUIVOS pelo
  // nome, no banco (mesma search_lessons da busca da página inicial — são
  // 200 mil+ aulas, impossível filtrar no cliente). Debounce pra não
  // disparar uma consulta a cada tecla.
  useEffect(() => {
    const q = filter.trim();
    if (!q) { setLessonResults([]); setSearchingLessons(false); return; }
    let alive = true;
    setSearchingLessons(true);
    const timer = setTimeout(() => {
      supabase.rpc('search_lessons' as never, { _query: q, _limit: 40 } as never)
        .then(({ data }: { data: unknown }) => {
          if (!alive) return;
          setLessonResults(((data || []) as SearchResult[]));
          setSearchingLessons(false);
        });
    }, 350);
    return () => { alive = false; clearTimeout(timer); };
  }, [filter]);

  const markLoading = (key: string, on: boolean) => setLoadingKeys(prev => {
    const next = new Set(prev);
    if (on) next.add(key); else next.delete(key);
    return next;
  });

  const toggleCourse = async (course: CourseNode) => {
    const open = new Set(openCourses);
    if (open.has(course.id)) { open.delete(course.id); setOpenCourses(open); return; }
    open.add(course.id);
    setOpenCourses(open);
    if (!modulesByCourse[course.id]) {
      markLoading(course.id, true);
      const [{ data: mods }, { data: rootLessons }] = await Promise.all([
        supabase.from('course_modules').select('id, title, path').eq('course_id', course.id).order('sort_order'),
        supabase.from('lessons').select('id, title, module_id').eq('course_id', course.id).is('module_id', null).order('sort_order').limit(400),
      ]);
      setModulesByCourse(prev => ({ ...prev, [course.id]: (mods || []) as ModuleNode[] }));
      setLessonsByKey(prev => ({ ...prev, [`root-${course.id}`]: (rootLessons || []) as LessonNode[] }));
      markLoading(course.id, false);
    }
  };

  const toggleModule = async (moduleId: string) => {
    const open = new Set(openModules);
    if (open.has(moduleId)) { open.delete(moduleId); setOpenModules(open); return; }
    open.add(moduleId);
    setOpenModules(open);
    if (!lessonsByKey[moduleId]) {
      markLoading(moduleId, true);
      const { data } = await supabase.from('lessons').select('id, title, module_id').eq('module_id', moduleId).order('sort_order').limit(400);
      setLessonsByKey(prev => ({ ...prev, [moduleId]: (data || []) as LessonNode[] }));
      markLoading(moduleId, false);
    }
  };

  const LessonRow = ({ lesson }: { lesson: LessonNode }) => {
    const checked = selected.has(lesson.id);
    const full = !checked && selected.size >= MAX_SOURCES;
    return (
      <label className={`flex items-center gap-2 py-1 pl-1 pr-2 rounded cursor-pointer hover:bg-secondary/60 ${full ? 'opacity-40 cursor-not-allowed' : ''}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={full}
          onChange={() => onToggle({ id: lesson.id, title: lesson.title })}
          className="w-3.5 h-3.5 accent-primary shrink-0"
        />
        <span className="text-xs text-foreground/90 truncate">{lesson.title}</span>
      </label>
    );
  };

  const visibleCourses = (courses || []).filter(c => !filter.trim() || c.title.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Buscar curso, aula ou arquivo…"
        className="w-full bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none border-b border-border"
      />
      <div className="max-h-56 overflow-y-auto p-1.5">
        {/* Resultados de aulas/arquivos que casam com a busca — seleção direta,
            sem precisar navegar até a pasta. */}
        {filter.trim() && (
          <div className="mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 py-1">
              Aulas e arquivos {searchingLessons && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
            </p>
            {!searchingLessons && lessonResults.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 pb-1">Nenhuma aula ou arquivo com esse nome.</p>
            ) : lessonResults.map(r => {
              const checked = selected.has(r.lesson_id);
              const full = !checked && selected.size >= MAX_SOURCES;
              return (
                <label key={r.lesson_id} className={`flex items-center gap-2 py-1 pl-1 pr-2 rounded cursor-pointer hover:bg-secondary/60 ${full ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={full}
                    onChange={() => onToggle({ id: r.lesson_id, title: r.lesson_title })}
                    className="w-3.5 h-3.5 accent-primary shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-foreground/90 truncate">{r.lesson_title}</span>
                    <span className="block text-[10px] text-muted-foreground truncate">{r.course_title}</span>
                  </span>
                </label>
              );
            })}
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 pt-2 pb-1">Cursos</p>
          </div>
        )}
        {courses === null ? (
          <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : visibleCourses.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum curso com esse nome.</p>
        ) : visibleCourses.map(course => (
          <div key={course.id}>
            <button
              type="button"
              onClick={() => toggleCourse(course)}
              className="w-full flex items-center gap-1.5 py-1.5 px-1 rounded text-left hover:bg-secondary/60"
            >
              {openCourses.has(course.id)
                ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
              <span className="text-xs font-medium text-foreground truncate">{course.title}</span>
              {loadingKeys.has(course.id) && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />}
            </button>

            {openCourses.has(course.id) && (
              <div className="ml-4 border-l border-border pl-2 mb-1">
                {(lessonsByKey[`root-${course.id}`] || []).map(l => <LessonRow key={l.id} lesson={l} />)}
                {(modulesByCourse[course.id] || []).map(mod => (
                  <div key={mod.id}>
                    <button
                      type="button"
                      onClick={() => toggleModule(mod.id)}
                      className="w-full flex items-center gap-1.5 py-1 px-1 rounded text-left hover:bg-secondary/60"
                    >
                      {openModules.has(mod.id)
                        ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                        : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
                      <span className="text-[11px] text-muted-foreground truncate">
                        {mod.path ? mod.path.split('/').join(' › ') : mod.title}
                      </span>
                      {loadingKeys.has(mod.id) && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />}
                    </button>
                    {openModules.has(mod.id) && (
                      <div className="ml-4 border-l border-border pl-2">
                        {(lessonsByKey[mod.id] || []).map(l => <LessonRow key={l.id} lesson={l} />)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FlashcardGeneratorModal({ open, onOpenChange, initialSources, onGenerated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSources: FlashcardSource[];
  onGenerated: (deck: GeneratedDeck) => void;
}) {
  const [selected, setSelected] = useState<Map<string, string>>(new Map());
  const [difficulty, setDifficulty] = useState('intermediario');
  const [count, setCount] = useState(10);
  const [extraText, setExtraText] = useState('');
  const [showTree, setShowTree] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Reabrir o modal para outra aula recomeça do zero, com a aula clicada.
  useEffect(() => {
    if (!open) return;
    setSelected(new Map(initialSources.map(s => [s.id, s.title])));
    setShowTree(false);
    setGenerating(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (lesson: FlashcardSource) => {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(lesson.id)) next.delete(lesson.id);
      else if (next.size < MAX_SOURCES) next.set(lesson.id, lesson.title);
      return next;
    });
  };

  const generate = async () => {
    if (selected.size === 0) { toast.error('Selecione ao menos um conteúdo'); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: {
          lessonIds: [...selected.keys()],
          difficulty,
          count,
          extraText: extraText.trim() || undefined,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      for (const w of data.warnings || []) toast.warning(w);
      onOpenChange(false);
      onGenerated(data as GeneratedDeck);
    } catch (err: any) {
      const cru = String(err?.message || '');
      const rede = /Failed to send a request|Failed to fetch|NetworkError|aborted/i.test(cru);
      toast.error(rede ? 'A conexão caiu durante a geração. Tente de novo.' : cru || 'Não foi possível gerar os flashcards');
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!generating) onOpenChange(o); }}>
      <DialogContent className="bg-background-paper border-border max-w-lg z-[85] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Gerar flashcards
          </DialogTitle>
          <DialogDescription>
            A IA lê o conteúdo selecionado — inclusive o áudio de aulas em vídeo — e monta um baralho de estudo no estilo Anki.
          </DialogDescription>
        </DialogHeader>

        {generating ? (
          <div className="py-10 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm font-semibold text-foreground mb-1">Gerando seus flashcards…</p>
            <p className="text-xs text-muted-foreground">
              Esse processo pode levar alguns minutos — a IA está lendo o conteúdo selecionado.
              Mantenha esta tela aberta.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* conteúdo selecionado */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Conteúdo ({selected.size}/{MAX_SOURCES})
              </p>
              <div className="space-y-1.5">
                {[...selected.entries()].map(([id, title]) => (
                  <div key={id} className="flex items-center gap-2 text-sm bg-secondary border border-border rounded-lg px-3 py-1.5">
                    <span className="flex-1 truncate text-foreground/90">{title}</span>
                    <button
                      onClick={() => setSelected(prev => { const n = new Map(prev); n.delete(id); return n; })}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                      aria-label={`Remover ${title}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowTree(v => !v)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> {showTree ? 'Ocultar cursos' : 'Adicionar mais conteúdo (opcional)'}
              </button>
              {showTree && <div className="mt-2"><ContentTree selected={selected} onToggle={toggle} /></div>}
            </div>

            {/* dificuldade */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Dificuldade</p>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDifficulty(d.value)}
                    className={`text-sm font-medium py-2 rounded-lg border transition-colors ${
                      difficulty === d.value
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* quantidade */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Quantidade de flashcards
              </p>
              <input
                type="number"
                min={1}
                max={30}
                value={count}
                onChange={e => setCount(Math.min(Math.max(Number(e.target.value) || 1, 1), 30))}
                className="w-24 rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
              <span className="text-xs text-muted-foreground ml-2">máx. 30 por geração</span>
            </div>

            {/* complemento */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Complemento (opcional)
              </p>
              <textarea
                value={extraText}
                onChange={e => setExtraText(e.target.value.slice(0, 2000))}
                rows={2}
                spellCheck
                lang="pt-BR"
                placeholder="Ex: foque em critérios diagnósticos e doses…"
                className="w-full resize-none rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>

            <Button className="w-full" onClick={generate} disabled={selected.size === 0}>
              <Sparkles className="w-4 h-4" /> Gerar {count} flashcard{count !== 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
