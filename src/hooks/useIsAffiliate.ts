import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

/**
 * Conta de afiliado é separada da de assinante: quem se cadastrou SÓ como
 * afiliado não tem acesso à plataforma (não há linha em `accesses`), a RLS já
 * barra todo o conteúdo. Este hook detecta que o usuário logado é afiliado
 * para mandá-lo ao painel de afiliado em vez da tela de "adquira acesso"
 * quando ele cai numa rota de membro.
 *
 * `null` = ainda carregando; `true`/`false` = resultado.
 */
export function useIsAffiliate() {
  const { user } = useAuth();
  const [isAffiliate, setIsAffiliate] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setIsAffiliate(false); return; }
    let alive = true;
    supabase.from('affiliates' as never)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (alive) setIsAffiliate(!!data); })
      .catch(() => { if (alive) setIsAffiliate(false); });
    return () => { alive = false; };
  }, [user]);

  return isAffiliate;
}
