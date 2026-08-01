import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [name, setName] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('name').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setName(data?.name || null));
  }, [user]);

  const ensureName = useCallback((action: () => void) => {
    if (name) { action(); return; }
    pendingAction.current = action;
    setPromptOpen(true);
  }, [name]);

  const submitName = useCallback(async (newName: string) => {
    if (!user || !newName.trim()) return;
    const trimmed = newName.trim();
    await supabase.from('profiles').update({ name: trimmed }).eq('user_id', user.id);
    setName(trimmed);
    setPromptOpen(false);
    pendingAction.current?.();
    pendingAction.current = null;
  }, [user]);

  return { name, promptOpen, setPromptOpen, ensureName, submitName };
}
