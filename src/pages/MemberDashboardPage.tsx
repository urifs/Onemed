import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Play, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MemberHeader } from '@/components/member/MemberHeader';
import { CourseCard } from '@/components/member/CourseCard';
import { CourseCover } from '@/components/member/CourseCover';
import { CategorySidebar } from '@/components/member/CategorySidebar';
import { CATEGORY_ORDER } from '@/lib/courseCategories';
import { formatDuration, matchesSearch, stripYearFromTitle } from '@/lib/utils';
import { showDiagnosticBanner } from '@/lib/diagnosticBanner';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [continueList, setContinueList] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Chegando de dentro de um curso (busca redireciona pra cá com ?q=...) —
  // limpa o parâmetro da URL depois de capturar o valor inicial, senão ele
  // fica preso lá mesmo quando o usuário edita a busca.
  useEffect(() => {
    if (searchParams.get('q')) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim()) setActiveCategory(null);
  };

  const handleSelectCategory = (category: string | null) => {
    setActiveCategory(category);
    setQuery('');
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data: coursesData, error: coursesErr }, progressResult] = await Promise.all([
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
        if (coursesErr) throw coursesErr;
        if (!alive) return;
        setCourses(coursesData || []);
        setContinueList(((progressResult as any).data || []) as ProgressRow[]);
        setLoadError(false);
      } catch (err: any) {
        console.error('Failed to load member dashboard', err);
        showDiagnosticBanner(`Falha ao carregar cursos: ${err?.message || err}`);
        if (!alive) return;
        setLoadError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user, retryTick]);

  const handleRetry = () => {
    setLoading(true);
    setRetryTick(t => t + 1);
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return courses;
    return courses.filter(c => matchesSearch(c.title, query) || matchesSearch(c.category, query));
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

  const categoryList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of courses) counts.set(c.category, (counts.get(c.category) || 0) + 1);
    const order = [...CATEGORY_ORDER];
    for (const key of counts.keys()) if (!order.includes(key)) order.push(key);
    return order.filter(cat => counts.has(cat)).map(cat => ({ name: cat, count: counts.get(cat)! }));
  }, [courses]);

  const categoryCourses = useMemo(() => {
    if (!activeCategory) return [];
    return courses.filter(c => c.category === activeCategory);
  }, [courses, activeCategory]);

  // Hero rotation: the in-progress course (if any) leads, followed by the
  // biggest flagship courses — ranked by lesson_count as a proxy for "maior
  // nome" — so the destaque card cycles through the platform's best content.
  const featuredPool = useMemo(() => {
    const flagship = courses
      .filter(c => c.category === 'Extensivo & Intensivo · Residência')
      .slice()
      .sort((a, b) => b.lesson_count - a.lesson_count)
      .slice(0, 8);
    const pool: Course[] = [];
    const seen = new Set<string>();
    const continuing = continueList[0]?.courses;
    if (continuing) { pool.push(continuing); seen.add(continuing.id); }
    for (const c of flagship) { if (!seen.has(c.id)) { pool.push(c); seen.add(c.id); } }
    if (pool.length === 0 && courses[0]) pool.push(courses[0]);
    return pool;
  }, [courses, continueList]);

  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);

  useEffect(() => {
    setFeaturedIndex(0);
  }, [featuredPool.length]);

  useEffect(() => {
    if (heroPaused || featuredPool.length < 2) return;
    const id = setInterval(() => {
      setFeaturedIndex(i => (i + 1) % featuredPool.length);
    }, 3000);
    return () => clearInterval(id);
  }, [heroPaused, featuredPool.length]);

  const featured = featuredPool[featuredIndex];
  const isContinuing = continueList[0]?.courses?.id === featured?.id;
  const featuredProgressPct = isContinuing && continueList[0]?.lessons?.duration_seconds
    ? Math.min(100, (continueList[0].watched_seconds / continueList[0].lessons.duration_seconds) * 100)
    : 0;
  const featuredLessonId = isContinuing ? continueList[0]?.lesson_id : undefined;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError && courses.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-foreground font-secondary text-xl font-bold">Não foi possível carregar os cursos</p>
        <p className="text-muted-foreground text-sm max-w-xs">Verifique sua conexão e tente novamente.</p>
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MemberHeader query={query} onQueryChange={handleQueryChange} />

      {!searching && !activeCategory && featured && (
        <section className="max-w-[1400px] mx-auto px-4 md:px-8 pt-6">
          <div
            className="relative rounded-2xl overflow-hidden border border-border min-h-[280px] md:min-h-[340px] flex items-end shadow-[0_30px_70px_-40px_rgba(239,68,68,0.4)]"
            onMouseEnter={() => setHeroPaused(true)}
            onMouseLeave={() => setHeroPaused(false)}
          >
            <div key={`${featured.id}-cover`} className="absolute inset-0 animate-fade-in">
              <CourseCover title={featured.title} showTitle={false} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-transparent" />
            <div key={`${featured.id}-copy`} className="relative p-6 md:p-10 max-w-xl animate-fade-in">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-primary mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_0_4px_rgba(239,68,68,0.2)]" />
                {isContinuing ? 'Continue de onde parou' : 'Destaque'}
              </span>
              <h1 className="font-secondary text-2xl md:text-4xl font-bold text-foreground leading-tight mb-3">
                {stripYearFromTitle(featured.title)}
              </h1>
              <p className="text-muted-foreground text-sm md:text-base mb-6 line-clamp-2">
                {featured.description || `${featured.lesson_count} aulas · ${formatDuration(featured.total_duration_seconds) || `${featured.material_count} materiais`}`}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(`/membros/curso/${featured.slug}${featuredLessonId ? `?lesson=${featuredLessonId}` : ''}`)}
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                  <Play className="w-4 h-4" fill="currentColor" /> {isContinuing ? 'Continuar assistindo' : 'Ver curso'}
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

            {featuredPool.length > 1 && (
              <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 flex items-center gap-1.5">
                {featuredPool.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => setFeaturedIndex(i)}
                    aria-label={`Ver destaque ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${i === featuredIndex ? 'w-6 bg-primary' : 'w-1.5 bg-white/30 hover:bg-white/50'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <main className="max-w-[1400px] mx-auto px-4 md:px-8 pb-16 pt-8">
        <div className="md:flex md:items-start md:gap-8">
          <CategorySidebar
            categories={categoryList}
            active={activeCategory}
            onSelect={handleSelectCategory}
            totalCount={courses.length}
          />

          <div className="flex-1 min-w-0 space-y-9">
            {searching ? (
              <section>
                <h2 className="font-secondary text-lg font-bold text-foreground mb-1">
                  Resultados para "{query}"
                </h2>
                <p className="text-sm text-muted-foreground mb-5">
                  {filtered.length} curso{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 items-start">
                  {filtered.map(c => <CourseCard key={c.id} course={c} />)}
                </div>
              </section>
            ) : activeCategory ? (
              <section>
                <h2 className="font-secondary text-lg font-bold text-foreground mb-1">{activeCategory}</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  {categoryCourses.length} curso{categoryCourses.length !== 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 items-start">
                  {categoryCourses.map(c => <CourseCard key={c.id} course={c} />)}
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
          </div>
        </div>
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
      <div className="flex items-start gap-3.5 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-thin">
        {items.map(({ course, progressPercent }) => (
          <div key={course.id} className="w-[168px] sm:w-[192px] shrink-0">
            <CourseCard course={course} progressPercent={progressPercent} />
          </div>
        ))}
      </div>
    </section>
  );
}
