import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Send, MessageCircle, AlertTriangle, RefreshCw, ChevronDown, BookOpen, Play, BadgeCheck, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useRequireName } from '@/hooks/useRequireName';
import { MemberHeader } from '@/components/member/MemberHeader';
import { NameRequiredModal } from '@/components/member/NameRequiredModal';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { withTimeout, stripYearFromTitle } from '@/lib/utils';
import { CATEGORY_ORDER } from '@/lib/courseCategories';
import type { Database } from '@/integrations/supabase/types';

type CourseOption = Pick<Database['public']['Tables']['courses']['Row'], 'id' | 'title' | 'category'>;

interface FeedItem {
  id: string;
  user_id: string;
  author_name: string | null;
  author_email: string | null;
  is_admin: boolean;
  course_id: string | null;
  course_title: string | null;
  course_slug: string | null;
  lesson_id: string | null;
  lesson_title: string | null;
  category: string | null;
  title: string | null;
  body: string;
  created_at: string;
  reply_count: number;
}

interface Reply {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author_name: string | null;
  author_email: string | null;
  is_admin: boolean;
}

const PAGE_SIZE = 20;

function initials(name?: string | null, email?: string | null): string {
  return (name || email || '?').trim().charAt(0).toUpperCase();
}

function displayName(name?: string | null, email?: string | null): string {
  return name || email?.split('@')[0] || 'Aluno';
}

function AdminBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/25 rounded-full px-2 py-0.5">
      <BadgeCheck className="w-3 h-3" /> Equipe OneMed
    </span>
  );
}

function RepliesSection({ postId }: { postId: string }) {
  const { user } = useAuth();
  const { promptOpen, setPromptOpen, ensureName, submitName } = useRequireName();
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState<Reply[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  const loadReplies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('community_replies', { _parent_id: postId });
      if (error) throw error;
      setReplies((data || []) as Reply[]);
    } catch (err) {
      console.error('Failed to load replies', err);
      setReplies([]);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    setOpen(o => !o);
    if (!replies) loadReplies();
  };

  const doReply = async () => {
    if (!body.trim() || !user) return;
    setPosting(true);
    const { error } = await supabase.from('course_comments').insert({
      parent_id: postId, user_id: user.id, body: body.trim(),
    });
    setPosting(false);
    if (!error) { setBody(''); loadReplies(); }
  };

  const handleReply = () => ensureName(doReply);

  return (
    <div className="mt-2">
      <button
        onClick={toggle}
        className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        {open ? 'Ocultar respostas' : 'Responder / ver respostas'}
      </button>

      {open && (
        <div className="mt-3 pl-4 border-l-2 border-border space-y-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {(replies || []).map(r => (
                <div key={r.id} className="flex gap-2.5">
                  <div className={`w-7 h-7 rounded-full border flex items-center justify-center font-semibold text-xs shrink-0 ${r.is_admin ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-secondary border-border text-foreground'}`}>
                    {initials(r.author_name, r.author_email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">{displayName(r.author_name, r.author_email)}</span>
                      {r.is_admin && <AdminBadge />}
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">{r.body}</p>
                  </div>
                </div>
              ))}

              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                  {initials(user?.user_metadata?.name as string | undefined, user?.email)}
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleReply()}
                    placeholder="Escreva uma resposta…"
                    className="flex-1 rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <button
                    onClick={handleReply}
                    disabled={posting || !body.trim()}
                    className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <NameRequiredModal open={promptOpen} onOpenChange={setPromptOpen} onSubmit={submitName} />
    </div>
  );
}

function FeedItemCard({ item }: { item: FeedItem }) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex gap-3">
        <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-semibold text-sm shrink-0 ${item.is_admin ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-secondary border-border text-foreground'}`}>
          {initials(item.author_name, item.author_email)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{displayName(item.author_name, item.author_email)}</span>
            {item.is_admin && <AdminBadge />}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>

          {(item.course_title || item.lesson_title || item.category) && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {item.category && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary border border-border rounded-full px-2.5 py-1">
                  <Tag className="w-3 h-3" /> {item.category}
                </span>
              )}
              {(item.course_title || item.lesson_title) && (
                <Link
                  to={item.course_slug ? `/membros/curso/${item.course_slug}${item.lesson_id ? `?lesson=${item.lesson_id}` : ''}` : '#'}
                  className="inline-flex items-center gap-1.5 text-xs text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1 hover:bg-primary/15 transition-colors"
                >
                  {item.lesson_title ? <Play className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                  {item.lesson_title || stripYearFromTitle(item.course_title || '')}
                </Link>
              )}
            </div>
          )}

          {item.title && (
            <p className="text-base font-semibold text-foreground mt-2">{item.title}</p>
          )}
          <p className="text-sm text-foreground/90 mt-1.5 whitespace-pre-wrap break-words">{item.body}</p>

          <RepliesSection postId={item.id} />
        </div>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const { user } = useAuth();
  const { promptOpen, setPromptOpen, ensureName, submitName } = useRequireName();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState<string>('none');
  const [newCourseId, setNewCourseId] = useState<string>('none');
  const [posting, setPosting] = useState(false);
  const [courses, setCourses] = useState<CourseOption[]>([]);

  const load = async (offset = 0) => {
    try {
      const { data, error } = await withTimeout(
        supabase.rpc('community_feed', { _limit: PAGE_SIZE, _offset: offset }),
        12000, 'feed da comunidade',
      );
      if (error) throw error;
      const rows = (data || []) as FeedItem[];
      setItems(prev => (offset === 0 ? rows : [...prev, ...rows]));
      setHasMore(rows.length === PAGE_SIZE);
      setLoadError(false);
    } catch (err) {
      console.error('Failed to load community feed', err);
      setLoadError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    load(0);
    supabase.from('courses').select('id, title, category').eq('active', true).order('title')
      .then(({ data }) => setCourses((data || []) as CourseOption[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => { setLoading(true); load(0); };
  const handleLoadMore = () => { setLoadingMore(true); load(items.length); };

  const categoriesPresent = useMemo(
    () => CATEGORY_ORDER.filter(cat => courses.some(c => c.category === cat)),
    [courses],
  );
  const coursesInCategory = useMemo(
    () => (newCategory === 'none' ? [] : courses.filter(c => c.category === newCategory)),
    [courses, newCategory],
  );

  const doNewTopic = async () => {
    if (!newBody.trim() || !user) return;
    setPosting(true);
    const { error } = await supabase.from('course_comments').insert({
      user_id: user.id,
      title: newTitle.trim() || null,
      body: newBody.trim(),
      category: newCategory === 'none' ? null : newCategory,
      course_id: newCourseId === 'none' ? null : newCourseId,
    });
    setPosting(false);
    if (!error) {
      setNewTitle(''); setNewBody(''); setNewCategory('none'); setNewCourseId('none');
      load(0);
    }
  };

  const handleNewTopic = () => ensureName(doNewTopic);

  return (
    <div className="min-h-screen bg-background">
      <MemberHeader />
      <div className="max-w-2xl mx-auto px-4 md:px-0 py-8 space-y-6">
        <div>
          <h1 className="font-secondary text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" /> Comunidade
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Dúvidas e comentários de todos os cursos e conteúdos, num só lugar.
          </p>
        </div>

        <div className="glass rounded-xl p-5">
          <p className="text-sm font-semibold text-foreground mb-3">Abrir um novo tópico</p>
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Título (opcional)"
            className="w-full rounded-lg bg-secondary border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors mb-2.5"
          />
          <textarea
            value={newBody}
            onChange={e => setNewBody(e.target.value)}
            placeholder="Compartilhe uma dúvida, dica ou comentário…"
            rows={2}
            className="w-full resize-none rounded-lg bg-secondary border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
          <div className="flex flex-col sm:flex-row gap-2.5 mt-2.5">
            <Select value={newCategory} onValueChange={v => { setNewCategory(v); setNewCourseId('none'); }}>
              <SelectTrigger className="flex-1 bg-secondary border-border text-foreground">
                <SelectValue placeholder="Categoria (opcional)" />
              </SelectTrigger>
              <SelectContent className="bg-background-paper border-border">
                <SelectItem value="none">Sem categoria</SelectItem>
                {categoriesPresent.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newCourseId} onValueChange={setNewCourseId} disabled={newCategory === 'none'}>
              <SelectTrigger className="flex-1 bg-secondary border-border text-foreground">
                <SelectValue placeholder="Curso (opcional)" />
              </SelectTrigger>
              <SelectContent className="bg-background-paper border-border">
                <SelectItem value="none">Sem curso específico</SelectItem>
                {coursesInCategory.map(c => (
                  <SelectItem key={c.id} value={c.id}>{stripYearFromTitle(c.title)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end mt-2.5">
            <button
              onClick={handleNewTopic}
              disabled={posting || !newBody.trim()}
              className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" /> Publicar
            </button>
          </div>
        </div>

        {loadError && !loading ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertTriangle className="w-6 h-6 text-accent-warning" />
            <p className="text-foreground text-sm font-medium">Não foi possível carregar a comunidade</p>
            <Button onClick={handleRetry} size="sm" variant="outline" className="border-border text-muted-foreground hover:text-foreground gap-2">
              <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
            </Button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum tópico ainda. Seja o primeiro a comentar!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => <FeedItemCard key={item.id} item={item} />)}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button onClick={handleLoadMore} disabled={loadingMore} variant="outline" className="border-border text-muted-foreground hover:text-foreground">
                  {loadingMore ? 'Carregando...' : 'Carregar mais'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <NameRequiredModal open={promptOpen} onOpenChange={setPromptOpen} onSubmit={submitName} />
    </div>
  );
}
