import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Send, ChevronDown, BadgeCheck, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useRequireName } from '@/hooks/useRequireName';
import { explainPostDenial } from '@/hooks/useCommunityPostingStatus';
import { NameRequiredModal } from './NameRequiredModal';
import { PlanAvatarRing, PlanBadge } from './PlanBadge';
import { LikeButton } from './LikeButton';

interface ReplyNode {
  id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  user_id: string;
  author_name: string | null;
  author_email: string | null;
  is_admin: boolean;
  plan: string | null;
  like_count: number;
  liked_by_me: boolean;
}

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

// Aninha visualmente até essa profundidade — além disso, mais respostas
// continuam existindo e sendo salvas normalmente, só param de recuar mais
// (evita a coluna de texto ficar espremida numa tela de celular).
const MAX_VISUAL_DEPTH = 4;

interface ThreadState {
  currentUserId?: string;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  replyBody: string;
  setReplyBody: (v: string) => void;
  posting: boolean;
  onSubmitReply: (parentId: string) => void;
  editingId: string | null;
  editBody: string;
  setEditBody: (v: string) => void;
  onStartEdit: (node: ReplyNode) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  savingEdit: boolean;
  childrenByParent: Map<string, ReplyNode[]>;
}

function ReplyItem({ node, depth, state }: { node: ReplyNode; depth: number; state: ThreadState }) {
  const children = state.childrenByParent.get(node.id) || [];
  const isOwn = !!state.currentUserId && node.user_id === state.currentUserId;
  const indent = Math.min(depth, MAX_VISUAL_DEPTH);
  const isReplying = state.replyingTo === node.id;
  const isEditing = state.editingId === node.id;

  return (
    <div className={depth > 0 ? 'mt-3 pl-3 border-l-2 border-border' : 'mt-3'} style={indent > 1 ? { marginLeft: `${(indent - 1) * 1.25}rem` } : undefined}>
      <div className="flex gap-2.5">
        <PlanAvatarRing plan={node.plan} isAdmin={node.is_admin}>
          <div className={`w-7 h-7 rounded-full border flex items-center justify-center font-semibold text-xs shrink-0 ${node.is_admin ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-secondary border-border text-foreground'}`}>
            {initials(node.author_name, node.author_email)}
          </div>
        </PlanAvatarRing>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground">{displayName(node.author_name, node.author_email)}</span>
            {node.is_admin && <AdminBadge />}
            {!node.is_admin && <PlanBadge plan={node.plan} />}
            <span className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(node.created_at), { addSuffix: true, locale: ptBR })}
            </span>
            {isOwn && !isEditing && (
              <button onClick={() => state.onStartEdit(node)} className="ml-auto text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                <Pencil className="w-3 h-3" /> Editar
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="mt-1.5 space-y-1.5">
              <textarea
                value={state.editBody}
                onChange={e => state.setEditBody(e.target.value)}
                rows={2}
                spellCheck
                lang="pt-BR"
                className="w-full resize-none rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
              <div className="flex justify-end gap-2">
                <button onClick={state.onCancelEdit} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">Cancelar</button>
                <button
                  onClick={state.onSaveEdit}
                  disabled={state.savingEdit || !state.editBody.trim()}
                  className="text-xs font-semibold bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground px-3 py-1 rounded-lg transition-colors"
                >
                  {state.savingEdit ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">{node.body}</p>
          )}

          <div className="flex items-center gap-1 mt-1">
            <LikeButton
              commentId={node.id}
              initialCount={Number(node.like_count ?? 0)}
              initialLiked={!!node.liked_by_me}
              size="sm"
            />
            <button
              onClick={() => { state.setReplyingTo(isReplying ? null : node.id); state.setReplyBody(''); }}
              className="text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors px-1.5 py-0.5"
            >
              {isReplying ? 'Cancelar' : 'Responder'}
            </button>
          </div>

          {isReplying && (
            <div className="flex gap-2 mt-1.5">
              <input
                value={state.replyBody}
                onChange={e => state.setReplyBody(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && state.onSubmitReply(node.id)}
                placeholder={`Responder ${displayName(node.author_name, node.author_email)}…`}
                spellCheck
                lang="pt-BR"
                className="flex-1 rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
              <button
                onClick={() => state.onSubmitReply(node.id)}
                disabled={state.posting || !state.replyBody.trim()}
                className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {children.map(child => <ReplyItem key={child.id} node={child} depth={depth + 1} state={state} />)}
    </div>
  );
}

// Compartilhado entre o feed geral da comunidade (tópicos) e os
// comentários por curso — ambos ganharam a mesma capacidade de responder
// qualquer comentário, inclusive resposta de resposta (thread aninhado,
// não só um nível). community_replies devolve a subárvore inteira.
export function CommentThread({ rootId, replyCount }: { rootId: string; replyCount?: number }) {
  const { user } = useAuth();
  const { promptOpen, setPromptOpen, ensureName, submitName } = useRequireName();
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState<ReplyNode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [rootReplyBody, setRootReplyBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadReplies = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase.rpc('community_replies', { _parent_id: rootId });
      if (error) throw error;
      setReplies((data || []) as ReplyNode[]);
    } catch (err) {
      console.error('Failed to load replies', err);
      // replies fica null: reabrir o thread tenta de novo, e o render mostra
      // o erro em vez de um thread vazio que engana.
      setReplies(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    setOpen(o => !o);
    if (!replies) loadReplies();
  };

  const submitReply = async (parentId: string, body: string, onSuccess: () => void) => {
    if (!body.trim() || !user) return;
    if (posting) return; // guarda o ESTADO, não só o disabled do botão: as
                         // respostas enviam no Enter, e Enter repetido/duplo
                         // clique disparava dois inserts antes do re-render.
    setPosting(true);
    const { error } = await supabase.from('course_comments').insert({
      parent_id: parentId, user_id: user.id, body: body.trim(),
    });
    setPosting(false);
    if (!error) { onSuccess(); loadReplies(); }
    else {
      // Comunidade pausada / usuário restrito: a RLS recusa e a razão real
      // vem do servidor — "tente novamente" aqui só frustraria.
      const motivo = await explainPostDenial(error);
      toast.error(motivo || 'Não foi possível enviar sua resposta. Tente novamente.');
    }
  };

  // ensureName também na resposta ANINHADA: sem isto, quem nunca definiu nome
  // conseguia responder um nó específico (aparecia como "Aluno", author_name
  // null) — o gate só existia na resposta ao comentário raiz.
  const submitNodeReply = (parentId: string) =>
    ensureName(() => submitReply(parentId, replyBody, () => { setReplyBody(''); setReplyingTo(null); }));

  const startEdit = (node: ReplyNode) => { setEditingId(node.id); setEditBody(node.body); };
  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!editBody.trim() || !editingId) return;
    setSavingEdit(true);
    const { error } = await supabase.from('course_comments').update({ body: editBody.trim() }).eq('id', editingId);
    setSavingEdit(false);
    if (!error) {
      setReplies(prev => (prev || []).map(r => r.id === editingId ? { ...r, body: editBody.trim() } : r));
      setEditingId(null);
    } else toast.error('Não foi possível salvar a edição. Tente novamente.');
  };

  const childrenByParent = useMemo(() => {
    const map = new Map<string, ReplyNode[]>();
    for (const r of replies || []) {
      const key = r.parent_id || '';
      const arr = map.get(key) || [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [replies]);

  const topLevel = childrenByParent.get(rootId) || [];

  const threadState: ThreadState = {
    currentUserId: user?.id,
    replyingTo, setReplyingTo, replyBody, setReplyBody, posting, onSubmitReply: submitNodeReply,
    editingId, editBody, setEditBody, onStartEdit: startEdit, onCancelEdit: cancelEdit, onSaveEdit: saveEdit, savingEdit,
    childrenByParent,
  };

  const handleReplyToRoot = () => ensureName(() => submitReply(rootId, rootReplyBody, () => setRootReplyBody('')));

  return (
    <div className="mt-2">
      <button
        onClick={toggle}
        className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        {open ? 'Ocultar respostas' : replyCount ? `Responder / ver ${replyCount} resposta${replyCount !== 1 ? 's' : ''}` : 'Responder'}
      </button>

      {open && (
        <div className="mt-3 pl-4 border-l-2 border-border">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : loadError ? (
            <div className="py-3 text-center">
              <p className="text-xs text-muted-foreground">Não foi possível carregar as respostas.</p>
              <button
                onClick={loadReplies}
                className="mt-2 text-xs font-medium text-primary hover:underline"
              >
                Tentar de novo
              </button>
            </div>
          ) : (
            <>
              {topLevel.map(node => <ReplyItem key={node.id} node={node} depth={0} state={threadState} />)}

              <div className="flex gap-2.5 mt-4">
                <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                  {initials(user?.user_metadata?.name as string | undefined, user?.email)}
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    value={rootReplyBody}
                    onChange={e => setRootReplyBody(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleReplyToRoot()}
                    placeholder="Escreva uma resposta…"
                    spellCheck
                    lang="pt-BR"
                    className="flex-1 rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <button
                    onClick={handleReplyToRoot}
                    disabled={posting || !rootReplyBody.trim()}
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
