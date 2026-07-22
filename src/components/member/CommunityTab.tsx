import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Send, MessageCircle, BadgeCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface Comment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: { name: string | null; email: string | null } | null;
}

export function CommunityTab({ courseId }: { courseId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const load = async () => {
    try {
      const [{ data, error }, roles] = await Promise.all([
        supabase
          .from('course_comments')
          .select('id, body, created_at, user_id, profiles(name, email)')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false }),
        supabase.rpc('list_admin_user_ids'),
      ]);
      if (error) throw error;
      setComments(((data as any) || []) as Comment[]);
      setAdminIds(new Set((roles.data || []).map((r: any) => r.user_id)));
    } catch (err) {
      console.error('Failed to load comments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [courseId]);

  const handlePost = async () => {
    if (!body.trim() || !user) return;
    setPosting(true);
    const { error } = await supabase.from('course_comments').insert({
      course_id: courseId, user_id: user.id, body: body.trim(),
    });
    setPosting(false);
    if (!error) { setBody(''); load(); }
  };

  const initials = (name?: string | null, email?: string | null) => (name || email || '?').trim().charAt(0).toUpperCase();
  const displayName = (c: Comment) => c.profiles?.name || c.profiles?.email?.split('@')[0] || 'Aluno';

  return (
    <div className="max-w-2xl">
      <div className="flex gap-3 mb-8">
        <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
          {initials(user?.user_metadata?.name as string | undefined, user?.email)}
        </div>
        <div className="flex-1">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Compartilhe uma dúvida, dica ou comentário sobre este curso…"
            rows={2}
            className="w-full resize-none rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handlePost}
              disabled={posting || !body.trim()}
              className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" /> Comentar
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Seja o primeiro a comentar neste curso.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-semibold text-sm shrink-0 ${adminIds.has(c.user_id) ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-secondary border-border text-foreground'}`}>
                {initials(c.profiles?.name, c.profiles?.email)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{displayName(c)}</span>
                  {adminIds.has(c.user_id) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/25 rounded-full px-2 py-0.5">
                      <BadgeCheck className="w-3 h-3" /> Equipe OneMed
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
