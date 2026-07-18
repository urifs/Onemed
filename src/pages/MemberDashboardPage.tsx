import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MemberHeader } from '@/components/member/MemberHeader';
import { CourseCard } from '@/components/member/CourseCard';
import { CourseCover } from '@/components/member/CourseCover';
import { CATEGORY_ORDER } from '@/lib/courseCategories';
import { formatDuration } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Course = Database['public']['Tables']['courses']['Row'];
type Lesson = Database['public']['Tables']['lessons']['Row'];
type ProgressRow = Database['public']['Tables']['lesson_progress']['Row'] & {
  lessons: Lesson | null;
  courses: Course | null;
};

export default function MemberDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [continueList, setContinueList] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: coursesData }, progressResult] = await Promise.all([
        supabase.from('courses').select('*').eq('active', true).order('sort_order').order('title'),
        user
          ? supabase
              .from('lesson_progress')
              .select('*, lessons(*), courses(*)')
              .eq('user_id', user.id)
              .order('last_watched_at', { ascending: false })
              .limit(12)
          : Promise.resolve({ data: [] as ProgressRow[] }),
      ]);
      if (!alive) return;
      setCourses(coursesData || []);
      setContinueList(((progressResult as any).data || []) as ProgressRow[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user]);

  const filtered = useMemo(() => {
    if (!query.trim()) return courses;
    const q = query.trim().toLowerCase();
    return courses.filter(c => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
  }, [courses, query]);

  const searching = query.trim().length > 0;

  const rows = useMemo(() => {
    const byCat = new Map<string, Course[]>();
    for (const c of filtered) {
      if (!byCat.has(c.category)) byCat.set(c.category, []);
      byCat.get(c.category)!.push(c);
    }
    const order = [...CATEGORY_ORDER];
    for (const key of byCat.keys()) if (!order.includes(key)) order.push(key);
    return order.filter(cat => byCat.has(cat)).map(cat => ({ category: cat, items: byCat.get(cat)! }));
  }, [filtered]);

  const featured = continueList[0]?.courses || courses.find(c => c.category === 'Grandes Cursos · Extensivo R1') || courses[0];
  const featuredProgressPct = continueList[0] && continueList[0].lessons?.duration_seconds
    ? Math.min(100, (continueList[0].watched_seconds / continueList[0].lessons.duration_seconds) * 100)
    : 0;
  const featuredLessonId = continueList[0]?.courses?.id === featured?.id ? continueList[0]?.lesson_id : undefined;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MemberHeader query={query} onQueryChange={setQuery} />

      {!searching && featured && (
        <section className="max-w-[1400px] mx-auto px-4 md:px-8 pt-6">
          <div className="relative rounded-2xl overflow-hidden border border-border min-h-[280px] md:min-h-[340px] flex items-end shadow-[0_30px_70px_-40px_rgba(239,68,68,0.4)]">
            <div className="absolute inset-0">
              <CourseCover title={featured.title} coverImageUrl={featured.cover_image_url} iconClassName="text-9xl" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-transparent" />
            <div className="relative p-6 md:p-10 max-w-xl">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-primary mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_0_4px_rgba(239,68,68,0.2)]" />
                {continueList[0] ? 'Continue de onde parou' : 'Destaque'}
              </span>
              <h1 className="font-secondary text-2xl md:text-4xl font-bold text-foreground leading-tight mb-3">
                {featured.title}
              </h1>
              <p className="text-muted-foreground text-sm md:text-base mb-6 line-clamp-2">
                {featured.description || `${featured.lesson_count} aulas · ${formatDuration(featured.total_duration_seconds) || `${featured.material_count} materiais`}`}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(`/membros/curso/${featured.slug}${featuredLessonId ? `?lesson=${featuredLessonId}` : ''}`)}
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                  <Play className="w-4 h-4" fill="currentColor" /> {continueList[0] ? 'Continuar assistindo' : 'Ver curso'}
                </button>
                <button
                  onClick={() => navigate(`/membros/curso/${featured.slug}`)}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-foreground font-semibold px-5 py-3 rounded-xl border border-white/15 transition-colors backdrop-blur"
                >
                  <Info className="w-4 h-4" /> Detalhes
                </button>
              </div>
              {featuredProgressPct > 0 && (
                <div className="mt-5 max-w-xs">
                  <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${featuredProgressPct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{Math.round(featuredProgressPct)}% concluído</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <main className="max-w-[1400px] mx-auto px-4 md:px-8 pb-16 pt-8 space-y-9">
        {searching ? (
          <section>
            <h2 className="font-secondary text-lg font-bold text-foreground mb-1">
              Resultados para "{query}"
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              {filtered.length} curso{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-7">
              {filtered.map(c => <CourseCard key={c.id} course={c} />)}
            </div>
          </section>
        ) : (
          <>
            {continueList.length > 0 && (
              <Row
                title="Continuar assistindo"
                items={continueList.filter(p => p.courses).map(p => ({
                  course: p.courses as Course,
                  progressPercent: p.lessons?.duration_seconds ? (p.watched_seconds / p.lessons.duration_seconds) * 100 : undefined,
                }))}
              />
            )}
            {rows.map(row => (
              <Row key={row.category} title={row.category} items={row.items.map(course => ({ course }))} />
            ))}
          </>
        )}
      </main>
    </div>
  );
}

function Row({ title, items }: { title: string; items: { course: Course; progressPercent?: number }[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="font-secondary text-[17px] font-bold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
      </div>
      <div className="flex gap-3.5 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-thin">
        {items.map(({ course, progressPercent }) => (
          <CourseCard key={course.id} course={course} progressPercent={progressPercent} />
        ))}
      </div>
    </section>
  );
}
