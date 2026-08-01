import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Curtir tópico ou comentário da comunidade.
 *
 * A contagem é pública (todo membro vê quantas curtidas algo recebeu), mas
 * quem curtiu não: a RPC só devolve `liked_by_me`, nunca a lista de pessoas.
 *
 * O clique é otimista — o número muda na hora e só depois confirma com o
 * servidor. Numa lista de comentários o aluno clica em vários seguidos, e
 * esperar a ida e volta a cada clique faria o botão parecer travado. Se a
 * chamada falhar, volta ao estado anterior e avisa.
 */
export function LikeButton({
  commentId, initialCount, initialLiked, size = 'md',
}: {
  commentId: string;
  initialCount: number;
  initialLiked: boolean;
  size?: 'sm' | 'md';
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [busy, setBusy] = useState(false);

  // O feed recarrega (troca de filtro, nova página) e traz números novos —
  // sem isso o botão ficaria preso no estado do primeiro render.
  useEffect(() => { setCount(initialCount); }, [initialCount]);
  useEffect(() => { setLiked(initialLiked); }, [initialLiked]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);

    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(c => c + (prevLiked ? -1 : 1));

    try {
      const { data, error } = await supabase.rpc('toggle_comment_like' as never, { _comment_id: commentId } as never);
      if (error) throw error;
      // A RPC devolve a contagem real: adota ela em vez do palpite otimista,
      // senão duas pessoas curtindo ao mesmo tempo deixariam o número errado.
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setCount(Number((row as { like_count: number }).like_count));
        setLiked(Boolean((row as { liked_by_me: boolean }).liked_by_me));
      }
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
      toast.error('Não foi possível registrar sua curtida.');
    } finally {
      setBusy(false);
    }
  };

  const small = size === 'sm';

  return (
    <button
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? 'Remover curtida' : 'Curtir'}
      title={liked ? 'Remover curtida' : 'Curtir'}
      className={`inline-flex items-center gap-1.5 rounded-full transition-colors select-none ${
        small ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      } ${
        liked
          ? 'text-primary bg-primary/10 hover:bg-primary/15'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
    >
      <Heart
        className={`${small ? 'w-3.5 h-3.5' : 'w-4 h-4'} transition-transform ${liked ? 'scale-110' : ''}`}
        fill={liked ? 'currentColor' : 'none'}
      />
      {count > 0 && <span className="tabular-nums font-medium">{count}</span>}
    </button>
  );
}
