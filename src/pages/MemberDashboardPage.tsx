import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Play, Info, FileText, File, Music, Image as ImageIcon, Loader2, FileSpreadsheet, FileType, Megaphone, Star, Highlighter, Trash2, SquareStack, ClipboardList, FileDown, FolderUp } from 'lucide-react';
import { useAnnouncementSettings } from '@/hooks/useAnnouncementSettings';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MemberHeader } from '@/components/member/MemberHeader';
import { ContentTypeFilter, MemberSearchBar } from '@/components/member/MemberSearchBar';
import { CourseCard } from '@/components/member/CourseCard';
import { CourseCover } from '@/components/member/CourseCover';
import { CategorySidebar } from '@/components/member/CategorySidebar';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FlashcardViewer, type FlashcardDeck } from '@/components/member/FlashcardViewer';
import { FlashcardGeneratorModal, type GeneratedDeck } from '@/components/member/FlashcardGeneratorModal';
import { QuestionBankViewer } from '@/components/member/QuestionBankViewer';
import { exportQuestionBankPdf } from '@/lib/questionBankPdf';
import { useMemberStatus } from '@/hooks/useMemberStatus';
import { AiUpsellModal } from '@/components/member/AiUpsellModal';
import { CATEGORY_ORDER } from '@/lib/courseCategories';
import { formatDateTimeSP, formatDuration, matchesSearch, stripYearFromTitle, withTimeout, withRetry, describeLoadError } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

interface AnnotatedLesson {
  lesson_id: string;
  lesson_title: string;
  course_title: string;
  course_slug: string;
  stroke_count: number;
  updated_at: string;
}

const ANNOTATIONS_TAB = 'Minhas anotações';
const ACERVO_TAB = 'Acervo Público';
const FLASHCARDS_TAB = 'Flashcards';
const QUESTIONS_TAB = 'Banco de Questões';

interface SavedDeck extends FlashcardDeck {
  id: string;
  created_at: string;
  source: { id: string; title: string }[];
}

interface SavedBank {
  id: string;
  title: string;
  difficulty: string;
  questions: { front: string; back: string; options?: string[]; correct?: number; why?: string[] }[];
  source: { id: string | null; title: string }[];
  created_at: string;
}

interface BankSession {
  id: string;
  bank_id: string | null;
  bank_title: string;
  total_questions: number;
  correct: number;
  duration_seconds: number | null;
  created_at: string;
}

interface StudySession {
  id: string;
  deck_id: string | null;
  deck_title: string;
  total_cards: number;
  correct_first_try: number;
  reviews: number;
  duration_seconds: number | null;
  created_at: string;
}

const notaCor = (pct: number) =>
  pct >= 70 ? 'text-accent-success' : pct >= 40 ? 'text-accent-warning' : 'text-red-500';

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
  // course_id → quando o aluno tirou esse curso dos recentes. Guardar a hora
  // (e não só "escondido") é o que faz o curso voltar sozinho quando ele
  // assiste de novo, sem precisar desfazer nada à mão.
  const [hiddenRecents, setHiddenRecents] = useState<Map<string, string>>(new Map());
  const [managingRecents, setManagingRecents] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteLessons, setFavoriteLessons] = useState<FavoriteLesson[]>([]);
  const [favoriteLessonsLoading, setFavoriteLessonsLoading] = useState(false);
  const [annotated, setAnnotated] = useState<AnnotatedLesson[]>([]);
  const [annotatedLoading, setAnnotatedLoading] = useState(false);
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [decksLoading, setDecksLoading] = useState(false);
  const [openDeck, setOpenDeck] = useState<SavedDeck | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [sessionsTick, setSessionsTick] = useState(0);
  const [banks, setBanks] = useState<SavedBank[]>([]);
  const [bankSessions, setBankSessions] = useState<BankSession[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [openBank, setOpenBank] = useState<SavedBank | null>(null);
  const [qbCreateOpen, setQbCreateOpen] = useState(false);
  const { plan: memberPlan, status: memberStatus } = useMemberStatus();
  const podeGerarIa = memberPlan !== 'monthly';
  const [aiUpsell, setAiUpsell] = useState<null | 'flashcards' | 'questoes'>(null);
  const [qbNew, setQbNew] = useState<GeneratedDeck | null>(null);
  const [qbNewSaved, setQbNewSaved] = useState(false);
  const [qbNewSavedId, setQbNewSavedId] = useState<string | null>(null);
  const [qbNewSaving, setQbNewSaving] = useState(false);

  const saveNewBank = async () => {
    if (!qbNew || !userId || qbNewSaved || qbNewSaving) return;
    setQbNewSaving(true);
    const { data: savedRow, error } = await (supabase as any).from('question_banks').insert({
      user_id: userId,
      title: qbNew.title,
      difficulty: qbNew.difficulty,
      questions: qbNew.cards,
      source: qbNew.source,
    }).select('id').single();
    setQbNewSaving(false);
    if (error) return;
    setQbNewSavedId(savedRow?.id || null);
    setQbNewSaved(true);
    setSessionsTick(t => t + 1);
  };

  const [fcCreateOpen, setFcCreateOpen] = useState(false);
  const [fcNewDeck, setFcNewDeck] = useState<GeneratedDeck | null>(null);
  const [fcNewSaved, setFcNewSaved] = useState(false);
  const [fcNewSavedId, setFcNewSavedId] = useState<string | null>(null);
  const [fcNewSaving, setFcNewSaving] = useState(false);

  const saveNewDeck = async () => {
    if (!fcNewDeck || !userId || fcNewSaved || fcNewSaving) return;
    setFcNewSaving(true);
    const { data: savedRow, error } = await (supabase as any).from('flashcard_decks').insert({
      user_id: userId,
      title: fcNewDeck.title,
      difficulty: fcNewDeck.difficulty,
      cards: fcNewDeck.cards,
      source: fcNewDeck.source,
    }).select('id').single();
    setFcNewSaving(false);
    if (error) return;
    setFcNewSavedId(savedRow?.id || null);
    setFcNewSaved(true);
    setSessionsTick(t => t + 1);
  };
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
    if (category === ACERVO_TAB) { navigate('/membros/acervo'); return; }
    setActiveCategory(category);
    setQuery('');
  };

  const userId = user?.id;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data: coursesData, error: coursesErr }, progressResult, { data: favData }, hiddenResult] = await withRetry(() => withTimeout(
          Promise.all([
            supabase.from('courses').select('*').eq('active', true).order('sort_order').order('title'),
            // Vem por AULA, não por curso: várias aulas do mesmo curso ocupam
            // linhas diferentes. Buscar 60 e reduzir a um curso por linha no
            // cliente garante que a faixa continue cheia mesmo quando o aluno
            // esconde alguns cursos ou vê muitas aulas do mesmo curso.
            userId
              ? supabase
                  .from('lesson_progress')
                  .select('*, lessons(*), courses(*)')
                  .eq('user_id', userId)
                  .order('last_watched_at', { ascending: false })
                  .limit(60)
              : Promise.resolve({ data: [] as ProgressRow[] }),
            userId
              ? supabase.from('user_favorites').select('course_id').eq('user_id', userId)
              : Promise.resolve({ data: [] }),
            userId
              ? (supabase as any).from('hidden_recent_courses').select('course_id, hidden_at').eq('user_id', userId)
              : Promise.resolve({ data: [] })
          ]),
          12000,
          'busca de cursos',
        ));
        if (coursesErr) throw coursesErr;
        if (!alive) return;
        setCourses(coursesData || []);
        setContinueList(((progressResult as any).data || []) as ProgressRow[]);
        setHiddenRecents(new Map(
          (((hiddenResult as any)?.data || []) as { course_id: string; hidden_at: string }[])
            .map(h => [h.course_id, h.hidden_at] as const),
        ));

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

  // Mesma ideia da aba Favoritos: só busca as anotações quando o aluno abre a
  // aba. A RPC já devolve ordenado pela anotação mais recente.
  useEffect(() => {
    if (activeCategory !== ANNOTATIONS_TAB || !userId) return;
    let alive = true;
    setAnnotatedLoading(true);
    supabase.rpc('my_annotated_lessons' as never).then(({ data }) => {
      if (!alive) return;
      setAnnotated(((data || []) as unknown as AnnotatedLesson[]));
      setAnnotatedLoading(false);
    });
    return () => { alive = false; };
  }, [activeCategory, userId]);

  // Baralhos salvos: mesma ideia das outras abas, só busca quando abre.
  useEffect(() => {
    if (activeCategory !== FLASHCARDS_TAB || !userId) return;
    let alive = true;
    setDecksLoading(true);
    Promise.all([
      (supabase as any).from('flashcard_decks')
        .select('id, title, difficulty, cards, source, created_at')
        .order('created_at', { ascending: false }),
      (supabase as any).from('flashcard_sessions')
        .select('id, deck_id, deck_title, total_cards, correct_first_try, reviews, duration_seconds, created_at')
        .order('created_at', { ascending: false })
        .limit(200),
    ]).then(([{ data: decksData }, { data: sessData }]: { data: unknown }[]) => {
      if (!alive) return;
      setDecks(((decksData || []) as SavedDeck[]));
      setSessions(((sessData || []) as StudySession[]));
      setDecksLoading(false);
    });
    return () => { alive = false; };
  }, [activeCategory, userId, sessionsTick]);

  useEffect(() => {
    if (activeCategory !== QUESTIONS_TAB || !userId) return;
    let alive = true;
    setBanksLoading(true);
    Promise.all([
      (supabase as any).from('question_banks')
        .select('id, title, difficulty, questions, source, created_at')
        .order('created_at', { ascending: false }),
      (supabase as any).from('question_sessions')
        .select('id, bank_id, bank_title, total_questions, correct, duration_seconds, created_at')
        .order('created_at', { ascending: false })
        .limit(200),
    ]).then(([{ data: banksData }, { data: sessData }]: { data: unknown }[]) => {
      if (!alive) return;
      setBanks(((banksData || []) as SavedBank[]));
      setBankSessions(((sessData || []) as BankSession[]));
      setBanksLoading(false);
    });
    return () => { alive = false; };
  }, [activeCategory, userId, sessionsTick]);

  const deleteBank = async (bank: SavedBank) => {
    if (!confirm(`Excluir o banco "${bank.title}"? O histórico de provas fica.`)) return;
    setBanks(prev => prev.filter(b => b.id !== bank.id));
    await (supabase as any).from('question_banks').delete().eq('id', bank.id);
  };

  const deleteDeck = async (deck: SavedDeck) => {
    if (!confirm(`Excluir o baralho "${deck.title}"?`)) return;
    setDecks(prev => prev.filter(d => d.id !== deck.id));
    await (supabase as any).from('flashcard_decks').delete().eq('id', deck.id);
  };

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

  // Busca geral também olha o Acervo da comunidade — por último e em seção
  // própria. Trial não tem acesso (o RPC recusa; o erro vira lista vazia).
  const [archiveResults, setArchiveResults] = useState<{ id: string; title: string; uploader_name: string; category: string; first_mime: string | null; kind: string }[]>([]);
  useEffect(() => {
    if (!query.trim() || memberStatus === 'trial') { setArchiveResults([]); return; }
    let alive = true;
    const timer = setTimeout(() => {
      supabase.rpc('archive_feed' as never, { _search: query.trim(), _limit: 12 } as never)
        .then(({ data }) => { if (alive) setArchiveResults((data || []) as never[]); })
        .catch(() => { if (alive) setArchiveResults([]); });
    }, 400);
    return () => { alive = false; clearTimeout(timer); };
  }, [query, memberStatus]);

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

    // Sempre visível, junto das categorias: o aluno precisa descobrir que
    // pode anotar, não só encontrar a aba depois de já ter anotado.
    cats.unshift({ name: ANNOTATIONS_TAB, count: annotated.length });

    return cats;
  }, [courses, favorites.size, annotated.length]);

  // Seção "Menu" da barra lateral: as áreas do aluno, acima das categorias.
  // Sempre visíveis, mesmo zeradas — é assim que se descobre que existem.
  const menuList = useMemo(() => [
    { name: 'Favoritos', count: favorites.size },
    { name: FLASHCARDS_TAB, count: decks.length },
    { name: QUESTIONS_TAB, count: banks.length },
    // Acervo Público é página própria (rota /membros/acervo) e é exclusivo de
    // assinante — trial nem vê a opção.
    ...(memberStatus !== 'trial' ? [{ name: ACERVO_TAB, count: 0 }] : []),
  ], [favorites.size, decks.length, banks.length, memberStatus]);

  const categoryCourses = useMemo(() => {
    if (!activeCategory) return [];
    if (activeCategory === 'Favoritos') {
      return courses.filter(c => favorites.has(c.id));
    }
    if (activeCategory === ANNOTATIONS_TAB || activeCategory === FLASHCARDS_TAB || activeCategory === QUESTIONS_TAB) return [];
    return courses.filter(c => c.category === activeCategory);
  }, [courses, activeCategory, favorites]);

  // Hero rotation: the in-progress course (if any) leads, followed by
  // courses marked is_featured (admin-promoted, regardless of size — a
  // freshly-added course is otherwise never big enough by lesson_count to
  // make the cut below), then the biggest flagship courses — ranked by
  // lesson_count as a proxy for "maior nome" — so the destaque card cycles
  // through the platform's best content.
  // "Continuar assistindo" — um curso por card (a consulta vem por aula), na
  // ordem da aula mais recente, sem o que o aluno tirou da faixa.
  //
  // O curso escondido volta sozinho quando ele assiste de novo: basta a aula
  // mais recente daquele curso ser posterior ao momento em que escondeu.
  const recentCourses = useMemo(() => {
    const out: { course: Course; progressPercent?: number; lessonId: string; watchedAt: string }[] = [];
    const seen = new Set<string>();
    for (const p of continueList) {
      const course = p.courses;
      if (!course || seen.has(course.id)) continue;
      const hiddenAt = hiddenRecents.get(course.id);
      if (hiddenAt && new Date(p.last_watched_at) <= new Date(hiddenAt)) continue;
      seen.add(course.id);
      out.push({
        course,
        progressPercent: p.lessons?.duration_seconds ? (p.watched_seconds / p.lessons.duration_seconds) * 100 : undefined,
        lessonId: p.lesson_id,
        watchedAt: p.last_watched_at,
      });
      if (out.length === 12) break;
    }
    return out;
  }, [continueList, hiddenRecents]);

  const hideFromRecents = async (courseIds: string[]) => {
    if (!userId || courseIds.length === 0) return;
    const hiddenAt = new Date().toISOString();
    setHiddenRecents(prev => {
      const next = new Map(prev);
      for (const id of courseIds) next.set(id, hiddenAt);
      return next;
    });
    setManagingRecents(false);
    await (supabase as any)
      .from('hidden_recent_courses')
      .upsert(
        courseIds.map(course_id => ({ user_id: userId, course_id, hidden_at: hiddenAt })),
        { onConflict: 'user_id,course_id' },
      );
  };

  const featuredPool = useMemo(() => {
    const pinned = courses.filter(c => c.is_featured);
    const flagship = courses
      .filter(c => c.category === 'Extensivo & Intensivo · Residência')
      .slice()
      .sort((a, b) => b.lesson_count - a.lesson_count)
      .slice(0, 8);
    const pool: Course[] = [];
    const seen = new Set<string>();
    const continuing = recentCourses[0]?.course;
    if (continuing) { pool.push(continuing); seen.add(continuing.id); }
    for (const c of pinned) { if (!seen.has(c.id)) { pool.push(c); seen.add(c.id); } }
    for (const c of flagship) { if (!seen.has(c.id)) { pool.push(c); seen.add(c.id); } }
    if (pool.length === 0 && courses[0]) pool.push(courses[0]);
    return pool;
  }, [courses, recentCourses]);

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
  // Só chama de "Continue de onde parou" o curso que ainda está na faixa de
  // recentes — escondido de lá, também não pode voltar como destaque.
  const isContinuing = !!featured && recentCourses[0]?.course.id === featured.id;
  const featuredProgressPct = isContinuing ? Math.min(100, recentCourses[0]?.progressPercent ?? 0) : 0;
  const featuredLessonId = isContinuing ? recentCourses[0]?.lessonId : undefined;

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
            menuItems={menuList}
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

                {archiveResults.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-5">
                      Acervo da comunidade · {archiveResults.length} resultado{archiveResults.length !== 1 ? 's' : ''}
                    </p>
                    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                      {archiveResults.map(r => (
                        <button
                          key={r.id}
                          onClick={() => navigate(`/membros/acervo?item=${r.id}`)}
                          className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-card hover:bg-secondary text-left transition-colors group"
                        >
                          <div className="w-9 h-9 rounded-full bg-secondary group-hover:bg-primary/15 flex items-center justify-center shrink-0 transition-colors">
                            <FolderUp className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                            <p className="text-xs text-muted-foreground truncate">Acervo Público · por {r.uploader_name} · {r.category}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            ) : activeCategory === QUESTIONS_TAB ? (
              <QuestionsTab
                banks={banks}
                sessions={bankSessions}
                loading={banksLoading}
                onOpenBank={setOpenBank}
                onDeleteBank={deleteBank}
                onCreate={() => podeGerarIa ? setQbCreateOpen(true) : setAiUpsell('questoes')}
              />
            ) : activeCategory === FLASHCARDS_TAB ? (
              <FlashcardsTab
                decks={decks}
                sessions={sessions}
                loading={decksLoading}
                onOpenDeck={setOpenDeck}
                onDeleteDeck={deleteDeck}
                onCreate={() => podeGerarIa ? setFcCreateOpen(true) : setAiUpsell('flashcards')}
              />
            ) : activeCategory === ANNOTATIONS_TAB ? (
              <section className="space-y-4">
                <div>
                  <h2 className="font-secondary text-lg font-bold text-foreground mb-1">Minhas anotações</h2>
                  <p className="text-sm text-muted-foreground">
                    Tudo que você grifou ou escreveu por cima dos PDFs, do mais recente para o mais antigo.
                  </p>
                </div>

                {annotatedLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : annotated.length > 0 ? (
                  <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                    {annotated.map(a => (
                      <button
                        key={a.lesson_id}
                        onClick={() => navigate(`/membros/curso/${a.course_slug}?lesson=${a.lesson_id}`)}
                        className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-card hover:bg-secondary transition-colors group text-left"
                      >
                        <div className="w-9 h-9 rounded-full bg-secondary group-hover:bg-primary/15 flex items-center justify-center shrink-0 transition-colors">
                          <Highlighter className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{a.lesson_title}</p>
                          <p className="text-xs text-muted-foreground truncate">{stripYearFromTitle(a.course_title)}</p>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                          {a.stroke_count} {a.stroke_count === 1 ? 'marcação' : 'marcações'}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-card px-4 py-8 text-center">
                    <Highlighter className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Você ainda não anotou nada. Abra qualquer PDF e use a caneta ou o marca-texto
                      na barra do topo — fica salvo aqui e sincroniza entre seus aparelhos.
                    </p>
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
                {recentCourses.length > 0 && (
                  <Row
                    title="Continuar assistindo"
                    items={recentCourses.map(r => ({
                      course: r.course,
                      progressPercent: r.progressPercent,
                      isFavorite: favorites.has(r.course.id),
                    }))}
                    onToggleFavorite={handleToggleFavorite}
                    action={(
                      <button
                        type="button"
                        onClick={() => setManagingRecents(true)}
                        title="Remover cursos dos recentes"
                        aria-label="Remover cursos dos recentes"
                        className="p-1.5 -m-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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

      <FlashcardGeneratorModal
        mode="questions"
        open={qbCreateOpen}
        onOpenChange={setQbCreateOpen}
        initialSources={[]}
        onGenerated={(deck) => { setQbNew(deck); setQbNewSaved(false); setQbNewSavedId(null); }}
      />
      {qbNew && (
        <QuestionBankViewer
          bank={{ title: qbNew.title, difficulty: qbNew.difficulty, questions: qbNew.cards }}
          bankId={qbNewSavedId}
          onClose={() => { setQbNew(null); setSessionsTick(t => t + 1); }}
          onSave={saveNewBank}
          saved={qbNewSaved}
          saving={qbNewSaving}
        />
      )}
      {openBank && (
        <QuestionBankViewer
          bank={{ title: openBank.title, difficulty: openBank.difficulty, questions: openBank.questions }}
          bankId={openBank.id}
          onClose={() => { setOpenBank(null); setSessionsTick(t => t + 1); }}
        />
      )}

      <FlashcardGeneratorModal
        open={fcCreateOpen}
        onOpenChange={setFcCreateOpen}
        initialSources={[]}
        onGenerated={(deck) => { setFcNewDeck(deck); setFcNewSaved(false); setFcNewSavedId(null); }}
      />
      {fcNewDeck && (
        <FlashcardViewer
          deck={fcNewDeck}
          deckId={fcNewSavedId}
          onClose={() => { setFcNewDeck(null); setSessionsTick(t => t + 1); }}
          onSave={saveNewDeck}
          saved={fcNewSaved}
          saving={fcNewSaving}
        />
      )}

      {openDeck && (
        <FlashcardViewer deck={openDeck} deckId={openDeck.id} onClose={() => { setOpenDeck(null); setSessionsTick(t => t + 1); }} />
      )}

      {aiUpsell && (
        <AiUpsellModal open onOpenChange={(o) => { if (!o) setAiUpsell(null); }} feature={aiUpsell} />
      )}

      <ManageRecentsDialog
        open={managingRecents}
        onOpenChange={setManagingRecents}
        items={recentCourses.map(r => r.course)}
        onConfirm={hideFromRecents}
      />
    </div>
  );
}

// Tela de remoção dos recentes: marca os cursos e confirma. Só tira o curso
// da faixa — não apaga progresso nem aulas concluídas, e o curso volta
// sozinho se o aluno assistir de novo.
function ManageRecentsDialog({ open, onOpenChange, items, onConfirm }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Course[];
  onConfirm: (courseIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Zera a seleção a cada abertura — reabrir a tela nunca deve vir com
  // caixas marcadas de uma vez anterior.
  useEffect(() => { if (open) setSelected(new Set()); }, [open]);

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background-paper border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">Remover dos recentes</DialogTitle>
          <DialogDescription>
            Marque os cursos que você não quer mais ver em "Continuar assistindo". Seu progresso
            continua salvo, e o curso volta pra faixa se você assistir de novo.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[45vh] overflow-y-auto -mx-6 px-6 divide-y divide-border">
          {items.map(course => (
            <label
              key={course.id}
              className="flex items-center gap-3 py-2.5 cursor-pointer"
            >
              <Checkbox
                checked={selected.has(course.id)}
                onCheckedChange={() => toggle(course.id)}
                aria-label={`Selecionar ${course.title}`}
              />
              <span className="text-sm text-foreground line-clamp-2">{stripYearFromTitle(course.title)}</span>
            </label>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={selected.size === 0}
            onClick={() => onConfirm([...selected])}
          >
            Excluir dos recentes{selected.size > 0 ? ` (${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ title, items, onToggleFavorite, action }: {
  title: string;
  items: { course: Course; progressPercent?: number; isFavorite?: boolean }[];
  onToggleFavorite?: (id: string, current: boolean) => void;
  action?: React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="font-secondary text-[17px] font-bold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
        {action}
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


// ─── Aba Flashcards: estatísticas + baralhos + histórico ────────────────────
//
// Tudo derivado de flashcard_sessions (uma linha por sessão CONCLUÍDA). A
// média é sempre da PRIMEIRA tentativa de cada carta — repetir até acertar
// não infla nota nenhuma daqui.
function FlashcardsTab({ decks, sessions, loading, onOpenDeck, onDeleteDeck, onCreate }: {
  decks: SavedDeck[];
  sessions: StudySession[];
  loading: boolean;
  onOpenDeck: (deck: SavedDeck) => void;
  onDeleteDeck: (deck: SavedDeck) => void;
  onCreate: () => void;
}) {
  const pct = (ok: number, total: number) => total > 0 ? Math.round((ok / total) * 100) : 0;

  const totalCartas = sessions.reduce((t, s) => t + s.total_cards, 0);
  const totalAcertos = sessions.reduce((t, s) => t + s.correct_first_try, 0);
  const mediaGeral = pct(totalAcertos, totalCartas);
  const tempoTotal = sessions.reduce((t, s) => t + (s.duration_seconds || 0), 0);

  const porBaralho = new Map<string, StudySession[]>();
  for (const s of sessions) {
    if (!s.deck_id) continue;
    if (!porBaralho.has(s.deck_id)) porBaralho.set(s.deck_id, []);
    porBaralho.get(s.deck_id)!.push(s);
  }

  // Evolução: até 14 sessões mais recentes, da mais antiga pra mais nova.
  const evolucao = [...sessions].slice(0, 14).reverse();

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-secondary text-lg font-bold text-foreground mb-1">Flashcards</h2>
          <p className="text-sm text-muted-foreground">
            Baralhos de estudo gerados por IA a partir das aulas e arquivos do acervo.
          </p>
        </div>
        <Button onClick={onCreate} className="shrink-0">
          <SquareStack className="w-4 h-4" /> Criar flashcards
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* resumo geral */}
          {sessions.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="glass rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Média geral</p>
                <p className={`text-2xl font-bold ${notaCor(mediaGeral)}`}>{mediaGeral}%</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">acertos sobre o total</p>
              </div>
              <div className="glass rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Sessões de estudo</p>
                <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">concluídas até o fim</p>
              </div>
              <div className="glass rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Cartas respondidas</p>
                <p className="text-2xl font-bold text-foreground">{totalCartas}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {totalAcertos} certas · {totalCartas - totalAcertos} erradas
                </p>
              </div>
              <div className="glass rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Tempo estudando</p>
                <p className="text-2xl font-bold text-foreground">
                  {tempoTotal >= 3600
                    ? `${Math.floor(tempoTotal / 3600)}h${String(Math.floor((tempoTotal % 3600) / 60)).padStart(2, '0')}`
                    : `${Math.max(1, Math.round(tempoTotal / 60))}min`}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">somando todas as sessões</p>
              </div>
            </div>
          )}

          {/* evolução das últimas sessões */}
          {evolucao.length >= 2 && (
            <div className="glass rounded-xl border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Evolução — últimas {evolucao.length} sessões
              </p>
              <div className="flex items-end gap-1.5 h-24">
                {evolucao.map(s => {
                  const nota = pct(s.correct_first_try, s.total_cards);
                  const cor = nota >= 70 ? 'bg-accent-success' : nota >= 40 ? 'bg-accent-warning' : 'bg-red-500';
                  return (
                    <div
                      key={s.id}
                      className="flex-1 flex flex-col items-center gap-1 group relative"
                      title={`${s.deck_title} — ${nota}% (${s.correct_first_try}/${s.total_cards}) · ${formatDateTimeSP(s.created_at)}`}
                    >
                      <span className="text-[10px] tabular-nums text-muted-foreground opacity-0 group-hover:opacity-100 absolute -top-4 transition-opacity">{nota}%</span>
                      <div className={`w-full rounded-t ${cor} transition-all`} style={{ height: `${Math.max(nota, 4)}%` }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* baralhos com estatísticas próprias */}
          {decks.length > 0 ? (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {decks.map(deck => {
                const hist = porBaralho.get(deck.id) || [];
                const cartasDeck = hist.reduce((t, s) => t + s.total_cards, 0);
                const acertosDeck = hist.reduce((t, s) => t + s.correct_first_try, 0);
                const mediaDeck = pct(acertosDeck, cartasDeck);
                const melhor = hist.length ? Math.max(...hist.map(s => pct(s.correct_first_try, s.total_cards))) : 0;
                const ultima = hist[0] ? pct(hist[0].correct_first_try, hist[0].total_cards) : null;
                return (
                  <div key={deck.id} className="flex items-center gap-3.5 px-4 py-3.5 bg-card hover:bg-secondary transition-colors group">
                    <button onClick={() => onOpenDeck(deck)} className="flex items-center gap-3.5 flex-1 min-w-0 text-left">
                      <div className="w-9 h-9 rounded-full bg-secondary group-hover:bg-primary/15 flex items-center justify-center shrink-0 transition-colors">
                        <SquareStack className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{deck.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {deck.cards.length} carta{deck.cards.length !== 1 ? 's' : ''}
                          {' '}· {deck.difficulty === 'basico' ? 'Básico' : deck.difficulty === 'avancado' ? 'Avançado' : 'Intermediário'}
                          {hist.length > 0
                            ? <> · {hist.length} {hist.length === 1 ? 'sessão' : 'sessões'} · melhor {melhor}%</>
                            : <> · nunca estudado</>}
                        </p>
                      </div>
                    </button>
                    {hist.length > 0 && (
                      <div className="hidden sm:block text-right shrink-0">
                        <p className={`text-sm font-bold tabular-nums ${notaCor(mediaDeck)}`}>{mediaDeck}%</p>
                        <p className="text-[10px] text-muted-foreground">média{ultima !== null ? ` · última ${ultima}%` : ''}</p>
                      </div>
                    )}
                    <button
                      onClick={() => onDeleteDeck(deck)}
                      title="Excluir baralho (o histórico de estudo fica)"
                      className="shrink-0 p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-secondary transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card px-4 py-8 text-center">
              <SquareStack className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum baralho salvo ainda. Toque em "Criar flashcards" aqui em cima, escolha as
                aulas e arquivos, e a IA monta um baralho de estudo pra você.
              </p>
            </div>
          )}

          {/* histórico de sessões */}
          {sessions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Histórico de sessões
              </p>
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border max-h-72 overflow-y-auto">
                {sessions.slice(0, 30).map(s => {
                  const nota = pct(s.correct_first_try, s.total_cards);
                  return (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 bg-card text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground truncate">{s.deck_title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDateTimeSP(s.created_at)}
                          {' '}· {s.correct_first_try}/{s.total_cards} certas
                          {s.reviews > s.total_cards ? ` · ${s.reviews - s.total_cards} ${s.reviews - s.total_cards === 1 ? 'repetição' : 'repetições'}` : ''}
                          {s.duration_seconds ? ` · ${Math.max(1, Math.round(s.duration_seconds / 60))}min` : ''}
                        </p>
                      </div>
                      <span className={`text-sm font-bold tabular-nums shrink-0 ${notaCor(nota)}`}>{nota}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}


// ─── Aba Banco de Questões: estatísticas + bancos + histórico ───────────────
// Mesmo desenho da aba Flashcards, sobre question_banks/question_sessions.
function QuestionsTab({ banks, sessions, loading, onOpenBank, onDeleteBank, onCreate }: {
  banks: SavedBank[];
  sessions: BankSession[];
  loading: boolean;
  onOpenBank: (bank: SavedBank) => void;
  onDeleteBank: (bank: SavedBank) => void;
  onCreate: () => void;
}) {
  const pct = (ok: number, total: number) => total > 0 ? Math.round((ok / total) * 100) : 0;

  const totalQ = sessions.reduce((t, s) => t + s.total_questions, 0);
  const totalOk = sessions.reduce((t, s) => t + s.correct, 0);
  const mediaGeral = pct(totalOk, totalQ);
  const tempoTotal = sessions.reduce((t, s) => t + (s.duration_seconds || 0), 0);

  const porBanco = new Map<string, BankSession[]>();
  for (const s of sessions) {
    if (!s.bank_id) continue;
    if (!porBanco.has(s.bank_id)) porBanco.set(s.bank_id, []);
    porBanco.get(s.bank_id)!.push(s);
  }

  const evolucao = [...sessions].slice(0, 14).reverse();

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-secondary text-lg font-bold text-foreground mb-1">Banco de Questões</h2>
          <p className="text-sm text-muted-foreground">
            Provas de múltipla escolha geradas por IA a partir das aulas e arquivos do acervo.
          </p>
        </div>
        <Button onClick={onCreate} className="shrink-0">
          <ClipboardList className="w-4 h-4" /> Criar banco de questões
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {sessions.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="glass rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Média geral</p>
                <p className={`text-2xl font-bold ${notaCor(mediaGeral)}`}>{mediaGeral}%</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">acertos sobre o total</p>
              </div>
              <div className="glass rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Provas corrigidas</p>
                <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">finalizadas até o fim</p>
              </div>
              <div className="glass rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Questões respondidas</p>
                <p className="text-2xl font-bold text-foreground">{totalQ}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {totalOk} certas · {totalQ - totalOk} erradas
                </p>
              </div>
              <div className="glass rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Tempo em prova</p>
                <p className="text-2xl font-bold text-foreground">
                  {tempoTotal >= 3600
                    ? `${Math.floor(tempoTotal / 3600)}h${String(Math.floor((tempoTotal % 3600) / 60)).padStart(2, '0')}`
                    : `${Math.max(1, Math.round(tempoTotal / 60))}min`}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">somando todas as provas</p>
              </div>
            </div>
          )}

          {evolucao.length >= 2 && (
            <div className="glass rounded-xl border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Evolução — últimas {evolucao.length} provas
              </p>
              <div className="flex items-end gap-1.5 h-24">
                {evolucao.map(s => {
                  const nota = pct(s.correct, s.total_questions);
                  const cor = nota >= 70 ? 'bg-accent-success' : nota >= 40 ? 'bg-accent-warning' : 'bg-red-500';
                  return (
                    <div
                      key={s.id}
                      className="flex-1 flex flex-col items-center gap-1 group relative"
                      title={`${s.bank_title} — ${nota}% (${s.correct}/${s.total_questions}) · ${formatDateTimeSP(s.created_at)}`}
                    >
                      <span className="text-[10px] tabular-nums text-muted-foreground opacity-0 group-hover:opacity-100 absolute -top-4 transition-opacity">{nota}%</span>
                      <div className={`w-full rounded-t ${cor} transition-all`} style={{ height: `${Math.max(nota, 4)}%` }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {banks.length > 0 ? (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {banks.map(bank => {
                const hist = porBanco.get(bank.id) || [];
                const q = hist.reduce((t, s) => t + s.total_questions, 0);
                const ok = hist.reduce((t, s) => t + s.correct, 0);
                const mediaBanco = pct(ok, q);
                const melhor = hist.length ? Math.max(...hist.map(s => pct(s.correct, s.total_questions))) : 0;
                const ultima = hist[0] ? pct(hist[0].correct, hist[0].total_questions) : null;
                return (
                  <div key={bank.id} className="flex items-center gap-3.5 px-4 py-3.5 bg-card hover:bg-secondary transition-colors group">
                    <button onClick={() => onOpenBank(bank)} className="flex items-center gap-3.5 flex-1 min-w-0 text-left">
                      <div className="w-9 h-9 rounded-full bg-secondary group-hover:bg-primary/15 flex items-center justify-center shrink-0 transition-colors">
                        <ClipboardList className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{bank.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {bank.questions.length} questõe{bank.questions.length !== 1 ? 's' : ''}{bank.questions.length === 1 ? ' questão' : ''}
                          {' '}· {bank.difficulty === 'basico' ? 'Básico' : bank.difficulty === 'avancado' ? 'Avançado' : 'Intermediário'}
                          {hist.length > 0
                            ? <> · {hist.length} {hist.length === 1 ? 'prova' : 'provas'} · melhor {melhor}%</>
                            : <> · nunca respondido</>}
                        </p>
                      </div>
                    </button>
                    {hist.length > 0 && (
                      <div className="hidden sm:block text-right shrink-0">
                        <p className={`text-sm font-bold tabular-nums ${notaCor(mediaBanco)}`}>{mediaBanco}%</p>
                        <p className="text-[10px] text-muted-foreground">média{ultima !== null ? ` · última ${ultima}%` : ''}</p>
                      </div>
                    )}
                    <button
                      onClick={() => exportQuestionBankPdf({ title: bank.title, difficulty: bank.difficulty, questions: bank.questions })}
                      title="Baixar em PDF (questões + gabarito comentado)"
                      className="shrink-0 p-1.5 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-secondary transition-colors"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteBank(bank)}
                      title="Excluir banco (o histórico de provas fica)"
                      className="shrink-0 p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-secondary transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card px-4 py-8 text-center">
              <ClipboardList className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum banco de questões salvo ainda. Toque em "Criar banco de questões", escolha as
                aulas e arquivos, e a IA monta a prova pra você.
              </p>
            </div>
          )}

          {sessions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Histórico de provas
              </p>
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border max-h-72 overflow-y-auto">
                {sessions.slice(0, 30).map(s => {
                  const nota = pct(s.correct, s.total_questions);
                  return (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 bg-card text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground truncate">{s.bank_title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDateTimeSP(s.created_at)}
                          {' '}· {s.correct}/{s.total_questions} certas
                          {s.duration_seconds ? ` · ${Math.max(1, Math.round(s.duration_seconds / 60))}min` : ''}
                        </p>
                      </div>
                      <span className={`text-sm font-bold tabular-nums shrink-0 ${notaCor(nota)}`}>{nota}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
