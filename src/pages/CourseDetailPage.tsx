import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Play, FileText, File, Music, Image as ImageIcon, CheckCircle2, Clock,
  FileSpreadsheet, FileType, Star,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MemberHeader } from '@/components/member/MemberHeader';
import { ContentTypeFilter, MemberSearchBar } from '@/components/member/MemberSearchBar';
import { CourseCover } from '@/components/member/CourseCover';
import { LessonPlayer } from '@/components/member/LessonPlayer';
import { CommunityTab } from '@/components/member/CommunityTab';
import { CATEGORY_ICON } from '@/lib/courseCategories';
import { formatDuration, formatFileSize, matchesSearch, stripYearFromTitle, withTimeout } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Course = Database['public']['Tables']['courses']['Row'];
type CourseModule = Database['public']['Tables']['course_modules']['Row'];
type Lesson = Database['public']['Tables']['lessons']['Row'];
type Progress = Database['public']['Tables']['lesson_progress']['Row'];

const TYPE_ICON: Record<string, typeof Play> = {
  video: Play, pdf: FileText, doc: File, sheet: FileSpreadsheet, txt: FileType, audio: Music, image: ImageIcon, other: File,
};

function groupLessonsByModule(items: Lesson[], modules: CourseModule[]): { title: string; lessons: Lesson[] }[] {
  const byModule = new Map<string | null, Lesson[]>();
  for (const l of items) {
    const key = l.module_id;
    if (!byModule.has(key)) byModule.set(key, []);
    byModule.get(key)!.push(l);
  }
  const result: { title: string; lessons: Lesson[] }[] = [];
  const root = byModule.get(null);
  if (root?.length) result.push({ title: 'Conteúdo geral', lessons: root });
  for (const mod of modules) {
    const modItems = byModule.get(mod.id);
    if (modItems?.length) result.push({ title: mod.title, lessons: modItems });
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
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all');
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, Progress>>({});
  const [tab, setTab] = useState<'aulas' | 'arquivos' | 'comunidade'>('aulas');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [query, setQuery] = useState('');
  const autoOpenId = searchParams.get('lesson');

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

        const [moduleRows, lessonRows, progressRows, { data: favData }] = await withTimeout(
          Promise.all([
            supabase.from('course_modules').select('*').eq('course_id', courseRow.id).order('sort_order').then(res => { if (res.error) throw res.error; return res.data || []; }),
            fetchAllLessons(),
            fetchAllProgress(),
            user?.id ? supabase.from('user_favorites').select('course_id').eq('user_id', user.id).eq('course_id', courseRow.id).maybeSingle() : Promise.resolve({ data: null }),
          ]),
          30000,
          'aulas do curso'
        );

        if (!alive) return;
        setModules(moduleRows);
        setLessons(lessonRows);
        setIsFavorite(!!favData);
        const map: Record<string, Progress> = {};
        for (const p of progressRows) map[p.lesson_id] = p;
        setProgressMap(map);
        setLoadError(false);
      } catch (err) {
        console.error('Failed to load course', err);
        if (!alive) return;
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

  const activeIndex = activeLesson ? activeOrderedLessons.findIndex(l => l.id === activeLesson.id) : -1;

  if (course === undefined) {
    if (loadError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-foreground font-secondary text-xl font-bold">Não foi possível carregar o curso</p>
          <p className="text-muted-foreground text-sm max-w-xs">Verifique sua conexão e tente novamente.</p>
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
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white bg-black/40 hover:bg-black/55 backdrop-blur px-3 py-1.5 rounded-full border border-white/10 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Todos os cursos
            </button>
            <button
              onClick={handleToggleFavorite}
              className={`inline-flex items-center gap-2 text-xs font-medium backdrop-blur px-3 py-1.5 rounded-full border transition-colors ${
                isFavorite 
                  ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/30' 
                  : 'bg-black/40 text-white/80 border-white/10 hover:bg-black/55 hover:text-white'
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

      <main className="max-w-[1000px] mx-auto px-4 md:px-8 pb-16">
        <div className="flex items-center gap-1 border-b border-border mb-6">
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

        {tab === 'aulas' ? (
          <>
            {lessons.length === 0 && (
              <p className="text-muted-foreground text-sm">Este curso ainda está sendo sincronizado. Volte em instantes.</p>
            )}
            {lessons.length > 0 && videoGroups.length === 0 && query.trim() && (
              <p className="text-muted-foreground text-sm">Nenhuma aula encontrada para "{query}".</p>
            )}
            {lessons.length > 0 && videoGroups.length === 0 && !query.trim() && (
              <p className="text-muted-foreground text-sm">Nenhuma aula em vídeo neste curso.</p>
            )}
            <LessonGroupList groups={videoGroups} progressMap={progressMap} onSelect={setActiveLesson} />
          </>
        ) : tab === 'arquivos' ? (
          <>
            {lessons.length === 0 && (
              <p className="text-muted-foreground text-sm">Este curso ainda está sendo sincronizado. Volte em instantes.</p>
            )}
            {lessons.length > 0 && fileGroups.length === 0 && query.trim() && (
              <p className="text-muted-foreground text-sm">Nenhum arquivo encontrado para "{query}".</p>
            )}
            {lessons.length > 0 && fileGroups.length === 0 && !query.trim() && (
              <p className="text-muted-foreground text-sm">Nenhum arquivo complementar neste curso.</p>
            )}
            <LessonGroupList groups={fileGroups} progressMap={progressMap} onSelect={setActiveLesson} />
          </>
        ) : (
          <CommunityTab courseId={course.id} />
        )}
      </main>

      {activeLesson && (
        <LessonPlayer
          lesson={activeLesson}
          courseTitle={stripYearFromTitle(course.title)}
          initialWatchedSeconds={progressMap[activeLesson.id]?.watched_seconds}
          onClose={() => setActiveLesson(null)}
          onProgress={handleProgress}
          hasPrev={activeIndex > 0}
          hasNext={activeIndex >= 0 && activeIndex < activeOrderedLessons.length - 1}
          onPrev={() => activeIndex > 0 && setActiveLesson(activeOrderedLessons[activeIndex - 1])}
          onNext={() => activeIndex < activeOrderedLessons.length - 1 && setActiveLesson(activeOrderedLessons[activeIndex + 1])}
        />
      )}
    </div>
  );
}

function LessonGroupList({
  groups, progressMap, onSelect,
}: {
  groups: { title: string; lessons: Lesson[] }[];
  progressMap: Record<string, Progress>;
  onSelect: (lesson: Lesson) => void;
}) {
  return (
    <div className="space-y-8">
      {groups.map(group => (
        <div key={group.title}>
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2.5">{group.title}</h3>
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {group.lessons.map(lesson => {
              const Icon = TYPE_ICON[lesson.type] || File;
              const p = progressMap[lesson.id];
              const pct = p && lesson.duration_seconds ? Math.min(100, (p.watched_seconds / lesson.duration_seconds) * 100) : 0;
              return (
                <button
                  key={lesson.id}
                  onClick={() => onSelect(lesson)}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-card hover:bg-secondary text-left transition-colors group"
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
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
