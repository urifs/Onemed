import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

// Conta em teste grátis. Quem decide é o banco (is_trial_member), a mesma
// função que barra os feeds da comunidade e o link do grupo — assim a tela e
// o acesso nunca discordam sobre quem é trial.
export function useIsTrial() {
  const { user } = useAuth();
  const [isTrial, setIsTrial] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setIsTrial(false); return; }
    let alive = true;
    supabase.rpc('is_trial_member' as never).then(({ data }) => {
      if (alive) setIsTrial(data === true);
    });
    return () => { alive = false; };
  }, [user?.id]);

  // `loading` importa: enquanto não se sabe, a tela não deve piscar o
  // conteúdo da comunidade nem o bloqueio.
  return { isTrial: isTrial === true, loading: isTrial === null };
}
