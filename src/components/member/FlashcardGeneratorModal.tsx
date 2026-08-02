import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Loader2, Plus, SquareStack, ClipboardList, Upload, FileText, X } from 'lucide-react';
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

// Upload próprio: lido no navegador e mandado em base64 DENTRO da requisição
// de geração — nunca sobe pro Storage nem entra em tabela; o servidor usa e
// descarta junto com a requisição.
//
// Vídeo e áudio podem ter QUALQUER tamanho: o navegador fatia e manda só o
// trecho inicial (mesmo tratamento das aulas da plataforma — a IA transcreve
// o que recebeu). Já PDF/imagem/texto precisam ir INTEIROS (PDF truncado é
// arquivo quebrado), então valem os limites físicos do modelo: ~13MB de
// mídia somada por geração.
const MAX_UPLOADS = 5;
const AV_SLICE = 10 * 1024 * 1024;
const MEDIA_TOTAL = 13 * 1024 * 1024;
const UPLOAD_OK = /^(application\/pdf|image\/(png|jpe?g|webp)|video\/|audio\/|text\/)/i;

interface UploadedFile {
  name: string;
  mime: string;
  size: number;      // tamanho original, só pra exibição
  sentBytes: number; // o que realmente viaja na requisição
  partial: boolean;  // vídeo/áudio fatiado
  data: string;      // base64 sem prefixo
}

function readAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

const FORMATS = [
  { value: 'classic', label: 'Pergunta e resposta', hint: 'Estilo Anki clássico: pensa e revela' },
  { value: 'multiple_choice', label: 'Múltipla escolha', hint: '4 alternativas para marcar' },
] as const;

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

export type GeneratorMode = 'flashcards' | 'questions';

export function FlashcardGeneratorModal({ open, onOpenChange, initialSources, onGenerated, mode = 'flashcards' }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSources: FlashcardSource[];
  onGenerated: (deck: GeneratedDeck) => void;
  // 'questions' = banco de questões: sempre múltipla escolha, sem seletor de formato.
  mode?: GeneratorMode;
}) {
  const ehQuestoes = mode === 'questions';
  const ModeIcon = ehQuestoes ? ClipboardList : SquareStack;
  const [selected, setSelected] = useState<Map<string, string>>(new Map());
  const [difficulty, setDifficulty] = useState('intermediario');
  const [format, setFormat] = useState<'classic' | 'multiple_choice'>('classic');
  const [count, setCount] = useState(10);
  const [extraText, setExtraText] = useState('');
  const [showTree, setShowTree] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [reading, setReading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setReading(true);
    try {
      const novos: UploadedFile[] = [];
      let totalEnviado = uploads.reduce((t, u) => t + u.sentBytes, 0);
      for (const file of Array.from(files)) {
        if (uploads.length + novos.length >= MAX_UPLOADS) { toast.error(`Máximo de ${MAX_UPLOADS} arquivos por geração`); break; }
        const mime = file.type || 'application/octet-stream';
        if (!UPLOAD_OK.test(mime)) { toast.error(`"${file.name}": envie PDF, imagem, áudio, vídeo ou texto`); continue; }

        const isAv = /^(video|audio)\//i.test(mime);
        const restante = MEDIA_TOTAL - totalEnviado;
        if (restante <= 0) { toast.error('Esta geração já está no limite de conteúdo — gere e depois crie outro baralho com o restante'); break; }

        let blob: Blob = file;
        let partial = false;
        if (isAv) {
          // Aula/vídeo de qualquer tamanho: viaja só o trecho inicial.
          const fatia = Math.min(file.size, AV_SLICE, restante);
          blob = file.slice(0, fatia, mime);
          partial = fatia < file.size;
        } else if (file.size > restante) {
          // PDF/imagem/texto não pode ser cortado — precisa caber inteiro.
          toast.error(`"${file.name}" (${(file.size / 1048576).toFixed(0)}MB) não cabe nesta geração — a IA lê até ~13MB de documentos somados. Vídeos podem ter qualquer tamanho.`);
          continue;
        }

        totalEnviado += blob.size;
        novos.push({ name: file.name, mime, size: file.size, sentBytes: blob.size, partial, data: await readAsBase64(blob) });
      }
      if (novos.length) setUploads(prev => [...prev, ...novos]);
    } finally {
      setReading(false);
    }
  };

  // Reabrir o modal para outra aula recomeça do zero, com a aula clicada.
  useEffect(() => {
    if (!open) return;
    setSelected(new Map(initialSources.map(s => [s.id, s.title])));
    setUploads([]);
    // Aberto pela aba Flashcards (sem aula pré-selecionada), a árvore já
    // aparece — escolher o conteúdo é o primeiro passo, não um opcional.
    setShowTree(initialSources.length === 0);
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
    if (selected.size === 0 && uploads.length === 0) { toast.error('Selecione um conteúdo ou envie um arquivo'); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: {
          lessonIds: [...selected.keys()],
          difficulty,
          format: ehQuestoes ? 'multiple_choice' : format,
          mode,
          count,
          extraText: extraText.trim() || undefined,
          uploads: uploads.map(u => ({ name: u.name, mime: u.mime, data: u.data })),
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
            <ModeIcon className="w-5 h-5 text-primary" /> {ehQuestoes ? 'Gerar banco de questões' : 'Gerar flashcards'}
          </DialogTitle>
          <DialogDescription>
            {ehQuestoes
              ? 'A IA lê o conteúdo selecionado — inclusive o áudio de aulas em vídeo — e monta questões de múltipla escolha no estilo de prova.'
              : 'A IA lê o conteúdo selecionado — inclusive o áudio de aulas em vídeo — e monta um baralho de estudo no estilo Anki.'}
          </DialogDescription>
        </DialogHeader>

        {generating ? (
          <div className="py-10 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm font-semibold text-foreground mb-1">{ehQuestoes ? 'Gerando suas questões…' : 'Gerando seus flashcards…'}</p>
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

              {/* upload próprio */}
              <div className="mt-3">
                {uploads.map((u, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-secondary border border-border rounded-lg px-3 py-1.5 mb-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="flex-1 truncate text-foreground/90">{u.name}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {(u.size / 1048576).toFixed(1)}MB{u.partial ? ' · trecho inicial' : ''}
                    </span>
                    <button
                      onClick={() => setUploads(prev => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                      aria-label={`Remover ${u.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <label className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  {reading ? 'Lendo arquivo…' : 'Enviar arquivo do seu dispositivo (opcional)'}
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.mp3,.m4a,.wav,.mp4,.webm,.mov,.txt,application/pdf,image/*,audio/*,video/*,text/plain"
                    className="hidden"
                    disabled={reading || uploads.length >= MAX_UPLOADS}
                    onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
                  />
                </label>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Vídeos e áudios de qualquer tamanho (a IA usa o trecho inicial). Seus arquivos não
                  ficam salvos na plataforma — são usados só nesta geração e descartados.
                </p>
              </div>
            </div>

            {/* formato (banco de questões é sempre múltipla escolha) */}
            {!ehQuestoes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Formato</p>
              <div className="grid grid-cols-2 gap-2">
                {FORMATS.map(f => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFormat(f.value)}
                    className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      format === f.value
                        ? 'bg-primary/15 border-primary/40'
                        : 'bg-secondary border-border hover:border-primary/25'
                    }`}
                  >
                    <span className={`block text-sm font-medium ${format === f.value ? 'text-primary' : 'text-foreground'}`}>{f.label}</span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">{f.hint}</span>
                  </button>
                ))}
              </div>
            </div>
            )}

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
                {ehQuestoes ? 'Quantidade de questões' : 'Quantidade de flashcards'}
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

            <Button className="w-full" onClick={generate} disabled={selected.size === 0 && uploads.length === 0}>
              <ModeIcon className="w-4 h-4" /> Gerar {count} {ehQuestoes ? (count !== 1 ? 'questões' : 'questão') : `flashcard${count !== 1 ? 's' : ''}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
