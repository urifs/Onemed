import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Play, FileText, File, Music, Image as ImageIcon, CheckCircle2, Clock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MemberHeader } from '@/components/member/MemberHeader';
import { CourseCover } from '@/components/member/CourseCover';
import { LessonPlayer } from '@/components/member/LessonPlayer';
import { CommunityTab } from '@/components/member/CommunityTab';
import { CATEGORY_ICON } from '@/lib/courseCategories';
import { formatDuration, formatFileSize } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Course = Database['public']['Tables']['courses']['Row'];
type CourseModule = Database['public']['Tables']['course_modules']['Row'];
type Lesson = Database['public']['Tables']['lessons']['Row'];
type Progress = Database['public']['Tables']['lesson_progress']['Row'];

const TYPE_ICON: Record<string, typeof Play> = {
  video: Play, pdf: FileText, doc: File, audio: Music, image: ImageIcon, other: File,
};

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, Progress>>({});
  const [tab, setTab] = useState<'aulas' | 'comunidade'>('aulas');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const autoOpenId = searchParams.get('lesson');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: courseRow } = await supabase.from('courses').select('*').eq('slug', slug).eq('active', true).maybeSingle();
      if (!alive) return;
      setCourse(courseRow || null);
      if (!courseRow) return;

      const [{ data: moduleRows }, { data: lessonRows }, progressResult] = await Promise.all([
        supabase.from('course_modules').select('*').eq('course_id', courseRow.id).order('sort_order'),
        supabase.from('lessons').select('*').eq('course_id', courseRow.id).order('sort_order'),
        user
          ? supabase.from('lesson_progress').select('*').eq('course_id', courseRow.id).eq('user_id', user.id)
          : Promise.resolve({ data: [] as Progress[] }),
      ]);
      if (!alive) return;
      setModules(moduleRows || []);
      setLessons(lessonRows || []);
      const map: Record<string, Progress> = {};
      for (const p of ((progressResult as any).data || []) as Progress[]) map[p.lesson_id] = p;
      setProgressMap(map);
    })();
    return () => { alive = false; };
  }, [slug, user]);

  useEffect(() => {
    if (autoOpenId && lessons.length > 0 && !activeLesson) {
      const found = lessons.find(l => l.id === autoOpenId);
      if (found) setActiveLesson(found);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenId, lessons]);

  const groups = useMemo(() => {
    const byModule = new Map<string | null, Lesson[]>();
    for (const l of lessons) {
      const key = l.module_id;
      if (!byModule.has(key)) byModule.set(key, []);
      byModule.get(key)!.push(l);
    }
    const result: { title: string; lessons: Lesson[] }[] = [];
    const root = byModule.get(null);
    if (root?.length) result.push({ title: 'Conteúdo geral', lessons: root });
    for (const mod of modules) {
      const items = byModule.get(mod.id);
      if (items?.length) result.push({ title: mod.title, lessons: items });
    }
    return result;
  }, [lessons, modules]);

  const orderedLessons = useMemo(() => groups.flatMap(g => g.lessons), [groups]);

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

  const activeIndex = activeLesson ? orderedLessons.findIndex(l => l.id === activeLesson.id) : -1;

  if (course === undefined) {
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
      <MemberHeader query="" onQueryChange={() => navigate('/membros')} />

      <section className="relative">
        <div className="relative h-[220px] md:h-[280px] overflow-hidden">
          <CourseCover title={course.title} coverImageUrl={course.cover_image_url} iconClassName="text-9xl" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
        </div>
        <div className="max-w-[1000px] mx-auto px-4 md:px-8 -mt-16 relative">
          <button
            onClick={() => navigate('/membros')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white bg-black/40 hover:bg-black/55 backdrop-blur px-3 py-1.5 rounded-full border border-white/10 mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Todos os cursos
          </button>
          <div className="flex items-center gap-2 mb-2">
            <CategoryIcon className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">{course.category}</span>
          </div>
          <h1 className="font-secondary text-2xl md:text-3xl font-bold text-foreground mb-3">{course.title}</h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground mb-6">
            <span>{course.lesson_count} aula{course.lesson_count !== 1 ? 's' : ''}</span>
            {course.total_duration_seconds > 0 && (
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDuration(course.total_duration_seconds)}</span>
            )}
            {course.material_count > 0 && <span>{course.material_count} materiais</span>}
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
            onClick={() => setTab('comunidade')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === 'comunidade' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Comunidade
          </button>
        </div>

        {tab === 'aulas' ? (
          <div className="space-y-8">
            {groups.length === 0 && (
              <p className="text-muted-foreground text-sm">Este curso ainda está sendo sincronizado. Volte em instantes.</p>
            )}
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
                        onClick={() => setActiveLesson(lesson)}
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
        ) : (
          <CommunityTab courseId={course.id} />
        )}
      </main>

      {activeLesson && (
        <LessonPlayer
          lesson={activeLesson}
          courseTitle={course.title}
          initialWatchedSeconds={progressMap[activeLesson.id]?.watched_seconds}
          onClose={() => setActiveLesson(null)}
          onProgress={handleProgress}
          hasPrev={activeIndex > 0}
          hasNext={activeIndex >= 0 && activeIndex < orderedLessons.length - 1}
          onPrev={() => activeIndex > 0 && setActiveLesson(orderedLessons[activeIndex - 1])}
          onNext={() => activeIndex < orderedLessons.length - 1 && setActiveLesson(orderedLessons[activeIndex + 1])}
        />
      )}
    </div>
  );
}
