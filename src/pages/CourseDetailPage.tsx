import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Play, FileText, File, Music, Image as ImageIcon, CheckCircle2, Clock,
  FileSpreadsheet, FileType, Star, ListOrdered, Menu, X, Check, Download, Loader2, ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MemberHeader } from '@/components/member/MemberHeader';
import { ContentTypeFilter, MemberSearchBar } from '@/components/member/MemberSearchBar';
import { CourseCover } from '@/components/member/CourseCover';
import { LessonPlayer } from '@/components/member/LessonPlayer';
import { CommunityTab } from '@/components/member/CommunityTab';
import { CATEGORY_ICON } from '@/lib/courseCategories';
import {
  formatDuration, formatFileSize, matchesSearch, stripYearFromTitle, withTimeout, withRetry, describeLoadError,
} from '@/lib/utils';
import { downloadLesson } from '@/lib/lessonDownload';
import { openLessonInNewTab } from '@/lib/lessonOpen';
import { DownloadUpsellModal } from '@/components/member/DownloadUpsellModal';
import { useDownloadGate } from '@/hooks/useDownloadGate';
import { CourseTree } from '@/components/member/CourseTree';
import type { Database } from '@/integrations/supabase/types';

type Course = Database['public']['Tables']['courses']['Row'];
type CourseModule = Database['public']['Tables']['course_modules']['Row'];
type Lesson = Database['public']['Tables']['lessons']['Row'];
type Progress = Database['public']['Tables']['lesson_progress']['Row'];

const TYPE_ICON: Record<string, typeof Play> = {
  video: Play, pdf: FileText, doc: File, sheet: FileSpreadsheet, txt: FileType, audio: Music, image: ImageIcon, other: File,
};

// O id de cada bloco (module-root ou module-<id>) é a mesma chave usada
// pelo sumário pra rolar até a seção certa — precisa bater exatamente entre
// os dois lados (grupo renderizado e item clicável do sumário).
function moduleBlockId(moduleId: string | null): string {
  return moduleId ? `module-${moduleId}` : 'module-root';
}

// A biblioteca do Drive tem pasta dentro de pasta em vários níveis, e a
// varredura agora importa TODOS eles (antes só dois níveis viravam módulo, o
// resto era achatado). Com isso, dois módulos distintos podem se chamar igual
// ("Aula 1" dentro de "Módulo 2" e dentro de "Módulo 3"), então o título
// exibido é o caminho completo dentro do curso — sem isso o aluno não teria
// como saber a qual parte do curso cada bloco pertence.
function moduleLabel(mod: CourseModule): string {
  const path = (mod as CourseModule & { path?: string | null }).path;
  return path ? path.split('/').join(' › ') : mod.title;
}

function groupLessonsByModule(items: Lesson[], modules: CourseModule[]): { id: string; title: string; lessons: Lesson[] }[] {
  const byModule = new Map<string | null, Lesson[]>();
  for (const l of items) {
    const key = l.module_id;
    if (!byModule.has(key)) byModule.set(key, []);
    byModule.get(key)!.push(l);
  }
  const result: { id: string; title: string; lessons: Lesson[] }[] = [];
  const root = byModule.get(null);
  if (root?.length) result.push({ id: moduleBlockId(null), title: 'Conteúdo geral', lessons: root });
  for (const mod of modules) {
    const modItems = byModule.get(mod.id);
    if (modItems?.length) result.push({ id: moduleBlockId(mod.id), title: moduleLabel(mod), lessons: modItems });
  }
  return result;
}

function filterLessons(items: Lesson[], query: string): Lesson[] {
  if (!query.trim()) return items;
  return items.filter(l => matchesSearch(l.title || '', query));
}

// Images only show up after every PDF (and every other file type) — a
// stable sort so it only moves images to the end, leaving everything else
// in its original relative order.
function sortImagesLast(items: Lesson[]): Lesson[] {
  return [...items].sort((a, b) => (a.type === 'image' ? 1 : 0) - (b.type === 'image' ? 1 : 0));
}

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLessonIds, setFavoriteLessonIds] = useState<Set<string>>(new Set());
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all');
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, Progress>>({});
  const [tab, setTab] = useState<'aulas' | 'arquivos' | 'comunidade'>('aulas');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [retryTick, setRetryTick] = useState(0);
  const [query, setQuery] = useState('');
  const autoOpenId = searchParams.get('lesson');

  // Qual aula está sendo baixada agora (spinner no ícone da linha). O
  // download é um de cada vez, por item — não existe mais seleção em massa.
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  // Teste grátis não baixa nada; Mensal e Anual também não — o clique abre o
  // convite pra assinar/fazer upgrade em vez de baixar.
  const { upsellOpen, setUpsellOpen, ensureCanDownload, reason: downloadReason, plan: downloadPlan } = useDownloadGate();

  useEffect(() => {
    let alive = true;
    setCourse(undefined);
    setModules([]);
    setLessons([]);
    setProgressMap({});
    setActiveLesson(null);
    setLoadError(false);
    (async () => {
      try {
        await withRetry(async () => {
          const { data: courseRow, error: courseErr } = await withTimeout(
            supabase.from('courses').select('*').eq('slug', slug).eq('active', true).maybeSingle(),
            12000,
            'dados do curso',
          );
          if (courseErr) throw courseErr;
          if (!alive) return;
          setCourse(courseRow || null);
          if (!courseRow) return;

          const fetchAllLessons = async () => {
            let items: Lesson[] = [];
            let from = 0;
            const step = 1000;
            while (true) {
              const { data, error } = await supabase.from('lessons').select('*').eq('course_id', courseRow.id).order('sort_order').range(from, from + step - 1);
              if (error) throw error;
              if (data) items = items.concat(data);
              if (!data || data.length < step) break;
              from += step;
            }
            return items;
          };

          const fetchAllProgress = async () => {
            if (!user) return [];
            let items: Progress[] = [];
            let from = 0;
            const step = 1000;
            while (true) {
              const { data, error } = await supabase.from('lesson_progress').select('*').eq('course_id', courseRow.id).eq('user_id', user.id).range(from, from + step - 1);
              if (error) throw error;
              if (data) items = items.concat(data);
              if (!data || data.length < step) break;
              from += step;
            }
            return items;
          };

          const [moduleRows, lessonRows, progressRows, { data: favData }, { data: lessonFavData }] = await withTimeout(
            Promise.all([
              supabase.from('course_modules').select('*').eq('course_id', courseRow.id).order('sort_order').then(res => { if (res.error) throw res.error; return res.data || []; }),
              fetchAllLessons(),
              fetchAllProgress(),
              user?.id ? supabase.from('user_favorites').select('course_id').eq('user_id', user.id).eq('course_id', courseRow.id).maybeSingle() : Promise.resolve({ data: null }),
              user?.id ? supabase.from('user_lesson_favorites').select('lesson_id').eq('user_id', user.id) : Promise.resolve({ data: [] as { lesson_id: string }[] }),
            ]),
            30000,
            'aulas do curso'
          );

          if (!alive) return;
          setModules(moduleRows);
          setLessons(lessonRows);
          setIsFavorite(!!favData);
          setFavoriteLessonIds(new Set((lessonFavData || []).map(f => f.lesson_id)));
          const map: Record<string, Progress> = {};
          for (const p of progressRows) map[p.lesson_id] = p;
          setProgressMap(map);
          setLoadError(false);
        });
      } catch (err) {
        console.error('Failed to load course', err);
        if (!alive) return;
        setLoadErrorMessage(describeLoadError(err, 'o curso'));
        setLoadError(true);
      }
    })();
    return () => { alive = false; };
  }, [slug, user?.id, retryTick]);

  useEffect(() => {
    if (autoOpenId && lessons.length > 0 && !activeLesson) {
      const found = lessons.find(l => l.id === autoOpenId);
      if (found) {
        setActiveLesson(found);
        setTab(found.type === 'video' ? 'aulas' : 'arquivos');
      }
    }
  }, [autoOpenId, lessons]);

  const videoLessons = useMemo(() => lessons.filter(l => l.type === 'video'), [lessons]);
  const fileLessons = useMemo(() => lessons.filter(l => l.type !== 'video'), [lessons]);
  const filteredVideoLessons = useMemo(() => {
    if (contentTypeFilter === 'files') return [];
    return filterLessons(videoLessons, query);
  }, [videoLessons, query, contentTypeFilter]);

  const filteredFileLessons = useMemo(() => {
    if (contentTypeFilter === 'videos') return [];
    return sortImagesLast(filterLessons(fileLessons, query));
  }, [fileLessons, query, contentTypeFilter]);
  const videoGroups = useMemo(() => groupLessonsByModule(filteredVideoLessons, modules), [filteredVideoLessons, modules]);
  const fileGroups = useMemo(() => groupLessonsByModule(filteredFileLessons, modules), [filteredFileLessons, modules]);
  const orderedVideoLessons = useMemo(() => videoGroups.flatMap(g => g.lessons), [videoGroups]);
  const orderedFileLessons = useMemo(() => fileGroups.flatMap(g => g.lessons), [fileGroups]);
  const activeOrderedLessons = activeLesson?.type === 'video' ? orderedVideoLessons : orderedFileLessons;

  // Sumário: sempre reflete a estrutura completa do curso (nunca filtrado
  // por busca/tipo), pra servir de índice confiável — cada bloco é um
  // módulo (ou o "Conteúdo geral" pra aulas soltas sem módulo).
  // A árvore marca as aulas já concluídas com um check, do mesmo jeito que a
  // lista principal.
  const completedLessonIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [lessonId, p] of Object.entries(progressMap)) if (p.completed) ids.add(lessonId);
    return ids;
  }, [progressMap]);


  // Clicar num arquivo da árvore abre o player direto. Limpa busca/filtro e
  // põe a aba certa por baixo, pra que fechar o player caia numa lista que de
  // fato contém aquele item em vez de numa tela vazia.
  const handleTreeSelect = (lesson: Lesson) => {
    setQuery('');
    setContentTypeFilter('all');
    setTab(lesson.type === 'video' ? 'aulas' : 'arquivos');
    setActiveLesson(lesson);
  };

  const handleProgress = async (lessonId: string, watchedSeconds: number, completed: boolean) => {
    if (!user || !course) return;
    setProgressMap(prev => ({
      ...prev,
      [lessonId]: {
        ...(prev[lessonId] || { id: '', user_id: user.id, course_id: course.id, lesson_id: lessonId, last_watched_at: new Date().toISOString() }),
        watched_seconds: watchedSeconds,
        completed,
      } as Progress,
    }));
    await supabase.from('lesson_progress').upsert({
      user_id: user.id, course_id: course.id, lesson_id: lessonId,
      watched_seconds: watchedSeconds, completed, last_watched_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' });
  };
  
  // Marcar/desmarcar conclusão manualmente, de qualquer tipo de arquivo.
  // Ao desmarcar zera o progresso junto: manter "assistiu 95%" numa aula que o
  // aluno acabou de declarar não concluída deixaria a barra cheia embaixo de
  // uma caixa vazia.
  const handleToggleCompleted = async (lesson: Lesson, completed: boolean) => {
    if (!user || !course) return;
    const watched = completed ? (progressMap[lesson.id]?.watched_seconds ?? lesson.duration_seconds ?? 0) : 0;
    setProgressMap(prev => ({
      ...prev,
      [lesson.id]: {
        ...(prev[lesson.id] || { id: '', user_id: user.id, course_id: course.id, lesson_id: lesson.id }),
        watched_seconds: watched,
        completed,
        last_watched_at: new Date().toISOString(),
      } as Progress,
    }));
    await supabase.from('lesson_progress').upsert({
      user_id: user.id, course_id: course.id, lesson_id: lesson.id,
      watched_seconds: watched, completed, last_watched_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' });
  };

  const handleToggleFavorite = async () => {
    if (!user || !course) return;
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    if (!nextState) {
      await supabase.from('user_favorites').delete().match({ user_id: user.id, course_id: course.id });
    } else {
      await supabase.from('user_favorites').insert({ user_id: user.id, course_id: course.id });
    }
  };

  const handleToggleLessonFavorite = async (lesson: Lesson) => {
    if (!user) return;
    const currentStatus = favoriteLessonIds.has(lesson.id);
    setFavoriteLessonIds(prev => {
      const next = new Set(prev);
      if (currentStatus) next.delete(lesson.id); else next.add(lesson.id);
      return next;
    });
    if (currentStatus) {
      await supabase.from('user_lesson_favorites').delete().match({ user_id: user.id, lesson_id: lesson.id });
    } else {
      await supabase.from('user_lesson_favorites').insert({ user_id: user.id, lesson_id: lesson.id });
    }
  };

  // Baixar direto da lista, sem precisar abrir a aula.
  const handleDownloadLesson = async (lesson: Lesson) => {
    if (!ensureCanDownload()) return;
    if (downloadingId) return;
    setDownloadingId(lesson.id);
    try {
      await downloadLesson(lesson);
    } catch (err) {
      console.error('Falha ao baixar', lesson.title, err);
      toast.error(`Não foi possível baixar "${lesson.title}"`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Abrir em outra aba: é leitura, o mesmo conteúdo que já toca no player —
  // por isso não passa pelo porteiro do download.
  const handleOpenLesson = async (lesson: Lesson) => {
    if (openingId) return;
    setOpeningId(lesson.id);
    try {
      await openLessonInNewTab(lesson);
    } catch (err: any) {
      toast.error(err?.message || `Não foi possível abrir "${lesson.title}"`);
    } finally {
      setOpeningId(null);
    }
  };

  const activeIndex = activeLesson ? activeOrderedLessons.findIndex(l => l.id === activeLesson.id) : -1;

  if (course === undefined) {
    if (loadError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-foreground font-secondary text-xl font-bold">Não foi possível carregar o curso</p>
          <p className="text-muted-foreground text-sm max-w-xs">{loadErrorMessage || 'Tente novamente em instantes.'}</p>
          <button
            onClick={() => setRetryTick(t => t + 1)}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (course === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-foreground font-secondary text-xl font-bold">Curso não encontrado</p>
        <Link to="/membros" className="text-primary hover:text-primary-hover text-sm font-medium">← Voltar para a plataforma</Link>
      </div>
    );
  }

  const CategoryIcon = CATEGORY_ICON[course.category] || File;

  return (
    <div className="min-h-screen bg-background">
      <MemberHeader />
      <MemberSearchBar 
        query={query} 
        onQueryChange={setQuery} 
        placeholder="Buscar aula ou arquivo…" 
        contentTypeFilter={contentTypeFilter}
        onContentTypeFilterChange={setContentTypeFilter}
      />

      <section className="relative">
        <div className="relative h-[220px] md:h-[280px] overflow-hidden">
          <CourseCover title={course.title} showTitle={false} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
        </div>
        <div className="max-w-[1000px] mx-auto px-4 md:px-8 -mt-16 relative">
          <div className="flex items-center justify-between gap-4 mb-4">
            <button
              onClick={() => navigate('/membros')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/80 hover:text-foreground bg-background/60 hover:bg-background/75 backdrop-blur px-3 py-1.5 rounded-full border border-border transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Todos os cursos
            </button>
            <button
              onClick={handleToggleFavorite}
              className={`inline-flex items-center gap-2 text-xs font-medium backdrop-blur px-3 py-1.5 rounded-full border transition-colors ${
                isFavorite 
                  ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/30' 
                  : 'bg-background/60 text-foreground/80 border-border hover:bg-background/75 hover:text-foreground'
              }`}
            >
              <Star className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
              {isFavorite ? 'Favorito' : 'Marcar como favorito'}
            </button>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <CategoryIcon className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">{course.category}</span>
          </div>
          <h1 className="font-secondary text-2xl md:text-3xl font-bold text-foreground mb-3">{stripYearFromTitle(course.title)}</h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground mb-6">
            <span>{videoLessons.length} aula{videoLessons.length !== 1 ? 's' : ''}</span>
            {course.total_duration_seconds > 0 && (
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDuration(course.total_duration_seconds)}</span>
            )}
            {fileLessons.length > 0 && <span>{fileLessons.length} arquivo{fileLessons.length !== 1 ? 's' : ''}</span>}
          </div>
        </div>
      </section>

      <main className="max-w-[1280px] mx-auto px-4 md:px-8 pb-16">
        <div className="md:flex md:items-start md:gap-8">
          <CourseSummarySidebar
            modules={modules}
            lessons={lessons}
            activeLessonId={activeLesson?.id}
            completedIds={completedLessonIds}
            onSelectLesson={handleTreeSelect}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 border-b border-border mb-6">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTab('aulas')}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === 'aulas' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  Aulas
                </button>
                <button
                  onClick={() => setTab('arquivos')}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === 'arquivos' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  Arquivos
                </button>
                <button
                  onClick={() => setTab('comunidade')}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === 'comunidade' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  Comunidade
                </button>
              </div>

            </div>

            {tab === 'aulas' ? (
              <>
                {lessons.length === 0 && (
                  <p className="text-muted-foreground text-sm">O curso está sendo sincronizado, aguarde alguns segundos.</p>
                )}
                {lessons.length > 0 && videoGroups.length === 0 && query.trim() && (
                  <p className="text-muted-foreground text-sm">Nenhuma aula encontrada para "{query}".</p>
                )}
                {lessons.length > 0 && videoGroups.length === 0 && !query.trim() && (
                  <p className="text-muted-foreground text-sm">Nenhuma aula em vídeo neste curso.</p>
                )}
                <LessonGroupList
                  groups={videoGroups} progressMap={progressMap} onSelect={setActiveLesson}
                  favoriteIds={favoriteLessonIds} onToggleFavorite={handleToggleLessonFavorite}
                  onToggleCompleted={handleToggleCompleted}
                  onDownload={handleDownloadLesson} downloadingId={downloadingId}
                  onOpenExternal={handleOpenLesson} openingId={openingId}
                />
              </>
            ) : tab === 'arquivos' ? (
              <>
                {lessons.length === 0 && (
                  <p className="text-muted-foreground text-sm">O curso está sendo sincronizado, aguarde alguns segundos.</p>
                )}
                {lessons.length > 0 && fileGroups.length === 0 && query.trim() && (
                  <p className="text-muted-foreground text-sm">Nenhum arquivo encontrado para "{query}".</p>
                )}
                {lessons.length > 0 && fileGroups.length === 0 && !query.trim() && (
                  <p className="text-muted-foreground text-sm">Nenhum arquivo complementar neste curso.</p>
                )}
                <LessonGroupList
                  groups={fileGroups} progressMap={progressMap} onSelect={setActiveLesson}
                  favoriteIds={favoriteLessonIds} onToggleFavorite={handleToggleLessonFavorite}
                  onToggleCompleted={handleToggleCompleted}
                  onDownload={handleDownloadLesson} downloadingId={downloadingId}
                  onOpenExternal={handleOpenLesson} openingId={openingId}
                />
              </>
            ) : (
              <CommunityTab courseId={course.id} />
            )}
          </div>
        </div>
      </main>

      {activeLesson && (
        <LessonPlayer
          lesson={activeLesson}
          courseTitle={stripYearFromTitle(course.title)}
          initialWatchedSeconds={progressMap[activeLesson.id]?.watched_seconds}
          onClose={() => setActiveLesson(null)}
          onProgress={handleProgress}
          completed={!!progressMap[activeLesson.id]?.completed}
          onToggleCompleted={(c) => handleToggleCompleted(activeLesson, c)}
          hasPrev={activeIndex > 0}
          hasNext={activeIndex >= 0 && activeIndex < activeOrderedLessons.length - 1}
          onPrev={() => activeIndex > 0 && setActiveLesson(activeOrderedLessons[activeIndex - 1])}
          onNext={() => activeIndex < activeOrderedLessons.length - 1 && setActiveLesson(activeOrderedLessons[activeIndex + 1])}
        />
      )}

      <DownloadUpsellModal open={upsellOpen} onOpenChange={setUpsellOpen} reason={downloadReason} plan={downloadPlan} />
    </div>
  );
}


// Mesma receita do CategorySidebar: coluna fixa (sticky) no desktop, gaveta
// por hambúrguer no mobile — o sumário precisa ficar visível junto do
// conteúdo (não substituindo ele numa aba), pra servir de índice de
// verdade enquanto o aluno navega pelo curso.
function CourseSummarySidebar({
  modules, lessons, activeLessonId, completedIds, onSelectLesson,
}: {
  modules: CourseModule[];
  lessons: Lesson[];
  activeLessonId?: string | null;
  completedIds: Set<string>;
  onSelectLesson: (lesson: Lesson) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  if (modules.length === 0 && lessons.length === 0) return null;

  const list = (
    <CourseTree
      modules={modules}
      lessons={lessons}
      activeLessonId={activeLessonId}
      completedIds={completedIds}
      onSelectLesson={(lesson) => { onSelectLesson(lesson); setMobileOpen(false); }}
    />
  );

  return (
    <>
      {/* Desktop: coluna fixa à esquerda, acompanha o scroll da página. */}
      <aside className="hidden md:block w-[280px] shrink-0">
        <div className="sticky top-[84px] max-h-[calc(100vh-104px)] overflow-y-auto pr-1">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Mapa do curso
          </p>
          {list}
        </div>
      </aside>

      {/* Mobile: botão abre uma gaveta com a lista completa. */}
      <div className="md:hidden mb-5">
        <button
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-2 max-w-full px-3.5 py-2 rounded-lg bg-secondary border border-border text-sm font-medium text-foreground"
        >
          <ListOrdered className="w-4 h-4 shrink-0" />
          <span className="truncate">Mapa do curso</span>
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[80vw] max-w-xs h-full bg-background border-r border-border overflow-y-auto p-5 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mapa do curso</p>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar"
                className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {list}
          </div>
        </div>
      )}
    </>
  );
}

function LessonGroupList({
  groups, progressMap, onSelect, favoriteIds, onToggleFavorite,
  onToggleCompleted, onDownload, downloadingId, onOpenExternal, openingId,
}: {
  groups: { id: string; title: string; lessons: Lesson[] }[];
  progressMap: Record<string, Progress>;
  onSelect: (lesson: Lesson) => void;
  favoriteIds?: Set<string>;
  onToggleFavorite?: (lesson: Lesson) => void;
  onToggleCompleted?: (lesson: Lesson, completed: boolean) => void;
  onDownload?: (lesson: Lesson) => void;
  downloadingId?: string | null;
  onOpenExternal?: (lesson: Lesson) => void;
  openingId?: string | null;
}) {
  return (
    <div className="space-y-8">
      {groups.map(group => (
        // O id aqui precisa bater com moduleBlockId() — é o alvo do
        // scrollIntoView disparado ao clicar num item do Sumário. O
        // scroll-mt garante que o título não fique escondido atrás do
        // header fixo do site ao rolar até aqui.
        <div key={group.id} id={group.id} className="scroll-mt-20">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2.5">{group.title}</h3>
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {group.lessons.map(lesson => {
              const Icon = TYPE_ICON[lesson.type] || File;
              const p = progressMap[lesson.id];
              const pct = p && lesson.duration_seconds ? Math.min(100, (p.watched_seconds / lesson.duration_seconds) * 100) : 0;
              const isLessonFavorite = !!favoriteIds?.has(lesson.id);
              const isDownloading = downloadingId === lesson.id;
              return (
                // Não é <button> — dentro tem vários controles clicáveis
                // independentes (abrir, baixar, concluir, favoritar), e botão
                // aninhado dentro de botão é HTML inválido.
                <div key={lesson.id} className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-card hover:bg-secondary transition-colors group">
                  <button
                    onClick={() => onSelect(lesson)}
                    className="flex-1 min-w-0 flex items-center gap-3.5 text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-secondary group-hover:bg-primary/15 flex items-center justify-center shrink-0 transition-colors">
                      {p?.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-accent-success" />
                      ) : (
                        <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" fill={lesson.type === 'video' ? 'currentColor' : 'none'} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                      {pct > 0 && !p?.completed && (
                        <div className="h-1 w-24 rounded-full bg-secondary mt-1.5 overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {lesson.type === 'video' ? formatDuration(lesson.duration_seconds) : formatFileSize(lesson.size_bytes)}
                    </span>
                  </button>
                  {/* Baixar sem precisar abrir. Vale pra aula em vídeo do
                      mesmo jeito que pra PDF — o arquivo sai com o nome e a
                      extensão que aparecem aqui na lista. */}
                  <button
                    onClick={() => onDownload?.(lesson)}
                    disabled={!!downloadingId}
                    className="shrink-0 p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10 disabled:opacity-40 transition-colors"
                    title={`Baixar "${lesson.title}"`}
                    aria-label={`Baixar ${lesson.title}`}
                  >
                    {isDownloading
                      ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      : <Download className="w-4 h-4" />}
                  </button>
                  {/* Abrir numa aba nova, no visualizador do navegador —
                      sem sair da plataforma nem perder a posição da lista. */}
                  <button
                    onClick={() => onOpenExternal?.(lesson)}
                    disabled={openingId === lesson.id}
                    className="shrink-0 p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10 disabled:opacity-40 transition-colors"
                    title={`Abrir "${lesson.title}" em outra aba`}
                    aria-label={`Abrir ${lesson.title} em outra aba`}
                  >
                    {openingId === lesson.id
                      ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      : <ExternalLink className="w-4 h-4" />}
                  </button>
                  {/* Caixa de concluída: vale pra qualquer tipo. Antes só
                      vídeo virava "assistido" (pelos 92% de reprodução) — PDF,
                      apostila e imagem não tinham como ser marcados. */}
                  <button
                    onClick={() => onToggleCompleted?.(lesson, !p?.completed)}
                    className={`shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                      p?.completed
                        ? 'bg-accent-success border-accent-success text-white'
                        : 'border-muted-foreground/30 hover:border-accent-success text-transparent'
                    }`}
                    title={p?.completed ? 'Marcar como não concluída' : 'Marcar como concluída'}
                    aria-pressed={!!p?.completed}
                    aria-label="Concluída"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => onToggleFavorite?.(lesson)}
                    className={`shrink-0 p-1.5 rounded-lg transition-colors ${isLessonFavorite ? 'text-accent-warning' : 'text-muted-foreground/30 hover:text-muted-foreground'}`}
                    title={isLessonFavorite ? 'Remover dos favoritos' : 'Favoritar'}
                  >
                    <Star className="w-4 h-4" fill={isLessonFavorite ? 'currentColor' : 'none'} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
