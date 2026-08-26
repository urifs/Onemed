import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Send, MessageCircle, BadgeCheck, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useRequireName } from '@/hooks/useRequireName';
import { useIsTrial } from '@/hooks/useIsTrial';
import { CommunityLocked } from './CommunityLocked';
import { NameRequiredModal } from './NameRequiredModal';
import { CommentThread } from './CommentThread';
import { useCommunityPostingStatus, explainPostDenial } from '@/hooks/useCommunityPostingStatus';
import { PlanAvatarRing, PlanBadge } from './PlanBadge';
import { LikeButton } from './LikeButton';

interface Comment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author_name: string | null;
  author_email: string | null;
  is_admin: boolean;
  plan: string | null;
  reply_count: number;
  like_count: number;
  liked_by_me: boolean;
}

export function CommunityTab({ courseId }: { courseId: string }) {
  const { user } = useAuth();
  const { isTrial, loading: trialLoading } = useIsTrial();
  const { promptOpen, setPromptOpen, ensureName, submitName } = useRequireName();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [posting, setPosting] = useState(false);
  const { blockedMessage } = useCommunityPostingStatus();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    try {
      // RPC (SECURITY DEFINER) em vez de select direto com embed de profiles:
      // e-mail só volta se quem chama for admin, e não depende mais da RLS
      // ampla de profiles que permitia qualquer membro ler o e-mail de outro.
      const { data, error } = await supabase.rpc('course_comments_feed', { _course_id: courseId });
      if (error) throw error;
      setComments(((data as any) || []) as Comment[]);
      setLoadError(false);
    } catch (err) {
      console.error('Failed to load comments', err);
      // Falha de carga ≠ curso sem comentários — sem isto a tela mostrava
      // "Seja o primeiro a comentar" por cima de um erro de rede.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  // Trial não busca comentário nenhum — o servidor recusa o feed, e a aba
  // mostra o bloqueio no lugar.
  useEffect(() => {
    if (trialLoading || isTrial) { setLoading(false); return; }
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [courseId, trialLoading, isTrial]);

  const doPost = async () => {
    if (!body.trim() || !user) return;
    if (posting) return; // trava anti-duplo-submit no estado (o textarea pode
                         // enviar rápido); só o disabled do botão não basta
    setPosting(true);
    const { error } = await supabase.from('course_comments').insert({
      course_id: courseId, user_id: user.id, body: body.trim(),
    });
    setPosting(false);
    if (!error) { setBody(''); load(); }
    else {
      const motivo = await explainPostDenial(error);
      toast.error(motivo || 'Não foi possível publicar o comentário. Tente novamente.');
    }
  };

  const handlePost = () => ensureName(doPost);

  const startEdit = (c: Comment) => { setEditingId(c.id); setEditBody(c.body); };

  const saveEdit = async () => {
    if (!editBody.trim() || !editingId) return;
    setSavingEdit(true);
    const { error } = await supabase.from('course_comments').update({ body: editBody.trim() }).eq('id', editingId);
    setSavingEdit(false);
    if (!error) {
      setComments(prev => prev.map(c => c.id === editingId ? { ...c, body: editBody.trim() } : c));
      setEditingId(null);
    } else toast.error('Não foi possível salvar a edição. Tente novamente.');
  };

  const initials = (name?: string | null, email?: string | null) => (name || email || '?').trim().charAt(0).toUpperCase();
  const displayName = (c: Comment) => c.author_name || c.author_email?.split('@')[0] || 'Aluno';

  return (
    <div className="max-w-2xl">
      {!trialLoading && isTrial ? <CommunityLocked compact /> : (
      <>
      {blockedMessage && (
        <div className="rounded-xl border border-accent-warning/30 bg-accent-warning/10 px-4 py-3 text-sm text-foreground mb-4">
          {blockedMessage}
        </div>
      )}
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
            spellCheck
            lang="pt-BR"
            className="w-full resize-none rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handlePost}
              disabled={posting || !body.trim() || !!blockedMessage}
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
      ) : loadError ? (
        <div className="text-center py-14 text-muted-foreground">
          <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Não foi possível carregar os comentários.</p>
          <button
            onClick={() => { setLoading(true); load(); }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/70 text-foreground text-sm font-medium px-4 py-2 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Seja o primeiro a comentar neste curso.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {comments.map(c => {
            const isOwn = !!user && c.user_id === user.id;
            return (
            <div key={c.id} className="flex gap-3">
              <PlanAvatarRing plan={c.plan} isAdmin={c.is_admin}>
                <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-semibold text-sm shrink-0 ${c.is_admin ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-secondary border-border text-foreground'}`}>
                  {initials(c.author_name, c.author_email)}
                </div>
              </PlanAvatarRing>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{displayName(c)}</span>
                  {c.is_admin && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/25 rounded-full px-2 py-0.5">
                      <BadgeCheck className="w-3 h-3" /> Equipe OneMed
                    </span>
                  )}
                  {!c.is_admin && <PlanBadge plan={c.plan} />}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                  {isOwn && editingId !== c.id && (
                    <button onClick={() => startEdit(c)} className="ml-auto text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                      <Pencil className="w-3 h-3" /> Editar
                    </button>
                  )}
                </div>
                {editingId === c.id ? (
                  <div className="mt-1.5 space-y-1.5">
                    <textarea
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      rows={2}
                      spellCheck
                      lang="pt-BR"
                      className="w-full resize-none rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">Cancelar</button>
                      <button
                        onClick={saveEdit}
                        disabled={savingEdit || !editBody.trim()}
                        className="text-xs font-semibold bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground px-3 py-1 rounded-lg transition-colors"
                      >
                        {savingEdit ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
                )}
                <div className="mt-2">
                  <LikeButton
                    commentId={c.id}
                    initialCount={Number(c.like_count ?? 0)}
                    initialLiked={!!c.liked_by_me}
                  />
                </div>
                <CommentThread rootId={c.id} replyCount={c.reply_count} />
              </div>
            </div>
            );
          })}
        </div>
      )}
      <NameRequiredModal open={promptOpen} onOpenChange={setPromptOpen} onSubmit={submitName} />
      </>
      )}
    </div>
  );
}
