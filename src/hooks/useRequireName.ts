import { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

/**
 * Comunidade mostra o nome de quem posta — muitos alunos entram via link
 * mágico (trial/compra) sem nunca terem digitado um nome em lugar nenhum,
 * então profiles.name fica nulo. Antes de deixar postar (tópico, comentário
 * ou resposta), pede o nome uma vez e salva em profiles pra sempre.
 */
export function useRequireName() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [promptOpen, setPromptOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  // Cache por usuário: cada CommentThread monta este hook — sem cache, uma
  // página com 20+ comentários fazia 20+ consultas idênticas a profiles.
  const { data: name = null } = useQuery({
    queryKey: ['profile-name', user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data } = await supabase.from('profiles').select('name').eq('user_id', user!.id).maybeSingle();
      return data?.name || null;
    },
  });

  const ensureName = useCallback((action: () => void) => {
    if (name) { action(); return; }
    pendingAction.current = action;
    setPromptOpen(true);
  }, [name]);

  const submitName = useCallback(async (newName: string) => {
    if (!user || !newName.trim()) return;
    const trimmed = newName.trim();
    const { error } = await supabase.from('profiles').update({ name: trimmed }).eq('user_id', user.id);
    // Sem o nome gravado, o post sairia como "Aluno" — não segue nem fecha o
    // modal quando o update falha.
    if (error) {
      toast.error('Não foi possível salvar seu nome. Tente novamente.');
      return;
    }
    qc.setQueryData(['profile-name', user.id], trimmed);
    setPromptOpen(false);
    pendingAction.current?.();
    pendingAction.current = null;
  }, [user, qc]);

  return { name, promptOpen, setPromptOpen, ensureName, submitName };
}
