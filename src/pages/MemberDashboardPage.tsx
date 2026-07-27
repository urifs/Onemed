import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Play, Info, FileText, File, Music, Image as ImageIcon, Loader2, FileSpreadsheet, FileType, Megaphone, Star } from 'lucide-react';
import { useAnnouncementSettings } from '@/hooks/useAnnouncementSettings';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MemberHeader } from '@/components/member/MemberHeader';
import { ContentTypeFilter, MemberSearchBar } from '@/components/member/MemberSearchBar';
import { CourseCard } from '@/components/member/CourseCard';
import { CourseCover } from '@/components/member/CourseCover';
import { CategorySidebar } from '@/components/member/CategorySidebar';
import { Checkbox } from '@/components/ui/checkbox';
import { CATEGORY_ORDER } from '@/lib/courseCategories';
import { formatDuration, matchesSearch, stripYearFromTitle, withTimeout, withRetry, describeLoadError } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Course = Database['public']['Tables']['courses']['Row'];
type Lesson = Database['public']['Tables']['lessons']['Row'];
type ProgressRow = Database['public']['Tables']['lesson_progress']['Row'] & {
  lessons: Lesson | null;
  courses: Course | null;
};

interface ContentResult {
  lesson_id: string; lesson_title: string; lesson_type: string;
  course_id: string; course_title: string; course_slug: string; course_category: string;
}

interface FavoriteLesson {
  lesson_id: string; title: string; type: string;
  duration_seconds: number | null; size_bytes: number | null;
  course_title: string; course_slug: string;
}

const CONTENT_TYPE_ICON: Record<string, typeof Play> = {
  video: Play, pdf: FileText, doc: File, sheet: FileSpreadsheet, txt: FileType, audio: Music, image: ImageIcon, other: File,
};

export default function MemberDashboardPage() {
  const { user } = useAuth();
  const { message: announcementMessage } = useAnnouncementSettings();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [continueList, setContinueList] = useState<ProgressRow[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteLessons, setFavoriteLessons] = useState<FavoriteLesson[]>([]);
  const [favoriteLessonsLoading, setFavoriteLessonsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState('');
  const [retryTick, setRetryTick] = useState(0);
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [searchCourses, setSearchCourses] = useState(true);
  const [searchContents, setSearchContents] = useState(false);
  const [contentResults, setContentResults] = useState<ContentResult[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all');

  // Nunca deixa as duas caixas desmarcadas ao mesmo tempo — sempre precisa
  // sobrar pelo menos um escopo de busca ativo.
  const toggleSearchCourses = (checked: boolean) => {
    if (!checked && !searchContents) return;
    setSearchCourses(checked);
  };
  const toggleSearchContents = (checked: boolean) => {
    if (!checked && !searchCourses) return;
    setSearchContents(checked);
  };

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

  const userId = user?.id;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data: coursesData, error: coursesErr }, progressResult, { data: favData }] = await withRetry(() => withTimeout(
          Promise.all([
            supabase.from('courses').select('*').eq('active', true).order('sort_order').order('title'),
            userId
              ? supabase
                  .from('lesson_progress')
                  .select('*, lessons(*), courses(*)')
                  .eq('user_id', userId)
                  .order('last_watched_at', { ascending: false })
                  .limit(12)
              : Promise.resolve({ data: [] as ProgressRow[] }),
            userId
              ? supabase.from('user_favorites').select('course_id').eq('user_id', userId)
              : Promise.resolve({ data: [] })
          ]),
          12000,
          'busca de cursos',
        ));
        if (coursesErr) throw coursesErr;
        if (!alive) return;
        setCourses(coursesData || []);
        setContinueList(((progressResult as any).data || []) as ProgressRow[]);

        if (favData) {
          setFavorites(new Set(favData.map(f => f.course_id)));
        }

        setLoadError(false);
      } catch (err) {
        console.error('Failed to load member dashboard', err);
        if (!alive) return;
        setLoadErrorMessage(describeLoadError(err, 'os cursos'));
        setLoadError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId, retryTick]);

  const handleRetry = () => {
    setLoading(true);
    setRetryTick(t => t + 1);
  };
  
  const handleToggleFavorite = async (courseId: string, currentStatus: boolean) => {
    if (!userId) return;
    
    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev);
      if (currentStatus) next.delete(courseId);
      else next.add(courseId);
      return next;
    });

    if (currentStatus) {
      await supabase.from('user_favorites').delete().match({ user_id: userId, course_id: courseId });
    } else {
      await supabase.from('user_favorites').insert({ user_id: userId, course_id: courseId });
    }
  };

  // Só busca aulas/arquivos favoritados quando a aba Favoritos é aberta —
  // ninguém precisa disso carregado de cara junto com o resto do dashboard.
  useEffect(() => {
    if (activeCategory !== 'Favoritos' || !userId) return;
    let alive = true;
    setFavoriteLessonsLoading(true);
    supabase
      .from('user_lesson_favorites')
      .select('lesson_id, lessons(id, title, type, duration_seconds, size_bytes, courses(title, slug))')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (!alive) return;
        const rows: FavoriteLesson[] = (data || [])
          .map((r: any) => r.lessons && r.lessons.courses ? {
            lesson_id: r.lessons.id as string,
            title: r.lessons.title as string,
            type: r.lessons.type as string,
            duration_seconds: r.lessons.duration_seconds,
            size_bytes: r.lessons.size_bytes,
            course_title: r.lessons.courses.title as string,
            course_slug: r.lessons.courses.slug as string,
          } : null)
          .filter((r: FavoriteLesson | null): r is FavoriteLesson => r !== null);
        setFavoriteLessons(rows);
        setFavoriteLessonsLoading(false);
      });
    return () => { alive = false; };
  }, [activeCategory, userId]);

  const handleUnfavoriteLesson = async (lessonId: string) => {
    if (!userId) return;
    setFavoriteLessons(prev => prev.filter(l => l.lesson_id !== lessonId));
    await supabase.from('user_lesson_favorites').delete().match({ user_id: userId, lesson_id: lessonId });
  };

  const favoriteVideos = useMemo(() => favoriteLessons.filter(l => l.type === 'video'), [favoriteLessons]);
  const favoriteFiles = useMemo(() => favoriteLessons.filter(l => l.type !== 'video'), [favoriteLessons]);

  // 81 mil linhas em lessons é demais pra trazer pro cliente e filtrar em
  // JS — a busca de conteúdo roda no banco (search_lessons), com debounce
  // pra não disparar uma consulta a cada tecla.
  useEffect(() => {
    if (!searchContents || !query.trim()) { setContentResults([]); return; }
    let alive = true;
    setContentLoading(true);
    const timer = setTimeout(() => {
      supabase.rpc('search_lessons', { _query: query.trim(), _limit: 60 })
        .then(({ data, error }) => {
          if (!alive) return;
          if (error) { console.error('Erro na busca de conteúdo', error); setContentResults([]); return; }
          
          let results = (data || []) as ContentResult[];
          if (contentTypeFilter === 'videos') {
            results = results.filter(r => r.lesson_type === 'video');
          } else if (contentTypeFilter === 'files') {
            results = results.filter(r => r.lesson_type !== 'video');
          }
          
          setContentResults(results);
        })
        .finally(() => { if (alive) setContentLoading(false); });
    }, 350);
    return () => { alive = false; clearTimeout(timer); };
  }, [query, searchContents, contentTypeFilter]);

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
    return order.filter(cat => byCat.has(cat))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map(cat => ({ category: cat, items: byCat.get(cat)! }));
  }, [filtered]);

  const categoryList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of courses) counts.set(c.category, (counts.get(c.category) || 0) + 1);
    const order = [...CATEGORY_ORDER];
    for (const key of counts.keys()) if (!order.includes(key)) order.push(key);
    
    const cats = order.filter(cat => counts.has(cat)).map(cat => ({ name: cat, count: counts.get(cat)! }));

    // Favoritos sempre aparece, mesmo sem nada marcado ainda — o cliente
    // precisa ver que a opção existe, não só depois de favoritar algo.
    cats.unshift({ name: 'Favoritos', count: favorites.size });

    return cats;
  }, [courses, favorites.size]);

  const categoryCourses = useMemo(() => {
    if (!activeCategory) return [];
    if (activeCategory === 'Favoritos') {
      return courses.filter(c => favorites.has(c.id));
    }
    return courses.filter(c => c.category === activeCategory);
  }, [courses, activeCategory, favorites]);

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
        <p className="text-muted-foreground text-sm max-w-xs">{loadErrorMessage || 'Tente novamente em instantes.'}</p>
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
      <MemberHeader />
      <MemberSearchBar
        query={query}
        onQueryChange={handleQueryChange}
        contentTypeFilter={contentTypeFilter}
        onContentTypeFilterChange={setContentTypeFilter}
      />

      {announcementMessage && (
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-4">
          <div className="rounded-xl bg-primary px-4 py-3 flex items-start gap-2.5">
            <Megaphone className="w-4 h-4 text-white shrink-0 mt-0.5" />
            <p className="text-sm text-white leading-snug">{announcementMessage}</p>
          </div>
        </div>
      )}

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
                  className="inline-flex items-center gap-2 bg-foreground/10 hover:bg-foreground/15 text-foreground font-semibold px-5 py-3 rounded-xl border border-foreground/15 transition-colors backdrop-blur"
                >
                  <Info className="w-4 h-4" /> Detalhes
                </button>
              </div>
              {featuredProgressPct > 0 && (
                <div className="mt-5 max-w-xs">
                  <div className="h-1.5 rounded-full bg-foreground/15 overflow-hidden">
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
              <section className="space-y-8">
                <div>
                  <h2 className="font-secondary text-lg font-bold text-foreground mb-3">
                    Resultados para "{query}"
                  </h2>
                  <div className="flex items-center gap-5">
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                      <Checkbox checked={searchCourses} onCheckedChange={v => toggleSearchCourses(v === true)} />
                      Cursos
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                      <Checkbox checked={searchContents} onCheckedChange={v => toggleSearchContents(v === true)} />
                      Conteúdos internos (aulas/arquivos)
                    </label>
                  </div>
                </div>

                {searchCourses && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-5">
                      {filtered.length} curso{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 items-start">
                      {filtered.map(c => <CourseCard key={c.id} course={c} isFavorite={favorites.has(c.id)} onToggleFavorite={handleToggleFavorite} />)}
                    </div>
                  </div>
                )}

                {searchContents && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-5 flex items-center gap-2">
                      {contentLoading ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando conteúdos...</>
                      ) : (
                        `${contentResults.length} conteúdo${contentResults.length !== 1 ? 's' : ''} encontrado${contentResults.length !== 1 ? 's' : ''}`
                      )}
                    </p>
                    {!contentLoading && contentResults.length > 0 && (
                      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                        {contentResults.map(r => {
                          const Icon = CONTENT_TYPE_ICON[r.lesson_type] || File;
                          return (
                            <button
                              key={r.lesson_id}
                              onClick={() => navigate(`/membros/curso/${r.course_slug}?lesson=${r.lesson_id}`)}
                              className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-card hover:bg-secondary text-left transition-colors group"
                            >
                              <div className="w-9 h-9 rounded-full bg-secondary group-hover:bg-primary/15 flex items-center justify-center shrink-0 transition-colors">
                                <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" fill={r.lesson_type === 'video' ? 'currentColor' : 'none'} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{r.lesson_title}</p>
                                <p className="text-xs text-muted-foreground truncate">{stripYearFromTitle(r.course_title)}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </section>
            ) : activeCategory === 'Favoritos' ? (
              <section className="space-y-8">
                <h2 className="font-secondary text-lg font-bold text-foreground mb-1">Favoritos</h2>

                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">
                    Cursos favoritados {categoryCourses.length > 0 && `(${categoryCourses.length})`}
                  </p>
                  {categoryCourses.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 items-start">
                      {categoryCourses.map(c => <CourseCard key={c.id} course={c} isFavorite={favorites.has(c.id)} onToggleFavorite={handleToggleFavorite} />)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum curso favoritado ainda.</p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">
                    Aulas favoritadas {favoriteVideos.length > 0 && `(${favoriteVideos.length})`}
                  </p>
                  {favoriteLessonsLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : favoriteVideos.length > 0 ? (
                    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                      {favoriteVideos.map(l => (
                        <div key={l.lesson_id} className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-card hover:bg-secondary transition-colors group">
                          <button
                            onClick={() => navigate(`/membros/curso/${l.course_slug}?lesson=${l.lesson_id}`)}
                            className="flex-1 min-w-0 flex items-center gap-3.5 text-left"
                          >
                            <div className="w-9 h-9 rounded-full bg-secondary group-hover:bg-primary/15 flex items-center justify-center shrink-0 transition-colors">
                              <Play className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" fill="currentColor" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{l.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{stripYearFromTitle(l.course_title)}</p>
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums shrink-0">{formatDuration(l.duration_seconds)}</span>
                          </button>
                          <button
                            onClick={() => handleUnfavoriteLesson(l.lesson_id)}
                            className="shrink-0 p-1.5 rounded-lg text-accent-warning hover:text-accent-warning/70 transition-colors"
                            title="Remover dos favoritos"
                          >
                            <Star className="w-4 h-4" fill="currentColor" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma aula favoritada ainda.</p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">
                    Arquivos favoritados {favoriteFiles.length > 0 && `(${favoriteFiles.length})`}
                  </p>
                  {favoriteLessonsLoading ? null : favoriteFiles.length > 0 ? (
                    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                      {favoriteFiles.map(l => {
                        const Icon = CONTENT_TYPE_ICON[l.type] || File;
                        return (
                          <div key={l.lesson_id} className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-card hover:bg-secondary transition-colors group">
                            <button
                              onClick={() => navigate(`/membros/curso/${l.course_slug}?lesson=${l.lesson_id}`)}
                              className="flex-1 min-w-0 flex items-center gap-3.5 text-left"
                            >
                              <div className="w-9 h-9 rounded-full bg-secondary group-hover:bg-primary/15 flex items-center justify-center shrink-0 transition-colors">
                                <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{l.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{stripYearFromTitle(l.course_title)}</p>
                              </div>
                            </button>
                            <button
                              onClick={() => handleUnfavoriteLesson(l.lesson_id)}
                              className="shrink-0 p-1.5 rounded-lg text-accent-warning hover:text-accent-warning/70 transition-colors"
                              title="Remover dos favoritos"
                            >
                              <Star className="w-4 h-4" fill="currentColor" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum arquivo favoritado ainda.</p>
                  )}
                </div>
              </section>
            ) : activeCategory ? (
              <section>
                <h2 className="font-secondary text-lg font-bold text-foreground mb-1">{activeCategory}</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  {categoryCourses.length} curso{categoryCourses.length !== 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 items-start">
                  {categoryCourses.map(c => <CourseCard key={c.id} course={c} isFavorite={favorites.has(c.id)} onToggleFavorite={handleToggleFavorite} />)}
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
                      isFavorite: p.courses ? favorites.has(p.courses.id) : false,
                    }))}
                    onToggleFavorite={handleToggleFavorite}
                  />
                )}
                {rows.map(row => (
                  <Row key={row.category} title={row.category} items={row.items.map(course => ({ 
                    course,
                    isFavorite: favorites.has(course.id)
                  }))} onToggleFavorite={handleToggleFavorite} />
                ))}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Row({ title, items, onToggleFavorite }: { title: string; items: { course: Course; progressPercent?: number; isFavorite?: boolean }[]; onToggleFavorite?: (id: string, current: boolean) => void }) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="font-secondary text-[17px] font-bold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
      </div>
      <div className="flex items-start gap-3.5 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-thin">
        {items.map(({ course, progressPercent, isFavorite }) => (
          <div key={course.id} className="w-[168px] sm:w-[192px] shrink-0">
            <CourseCard course={course} progressPercent={progressPercent} isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />
          </div>
        ))}
      </div>
    </section>
  );
}
