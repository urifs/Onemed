import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export type MemberStatus = 'admin' | 'active' | 'trial' | 'expired' | 'none';

interface StatusRow {
  status: MemberStatus;
  last_type: string | null;
  expired_at: string | null;
  // Plano efetivo da conta (o banco já resolve o access_type='paid' legado
  // pela compra correspondente, senão mensal e anual antigos apareceriam
  // como se fossem vitalício).
  plan: string | null;
}

// Situação de acesso da conta logada, decidida pelo banco (my_member_status).
// Fica em cache por sessão via react-query: o guardião das rotas de membro
// remonta a cada navegação, e sem cache seria uma chamada por página aberta.
export function useMemberStatus() {
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['member-status', user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<StatusRow> => {
      const { data, error } = await supabase.rpc('my_member_status' as never);
      if (error) throw error;
      // A RPC devolve uma linha; os tipos gerados do banco ainda não a
      // conhecem, daí o passeio por unknown.
      const raw = data as unknown;
      const row = (Array.isArray(raw) ? raw[0] : raw) as StatusRow | null | undefined;
      return row ?? { status: 'none', last_type: null, expired_at: null, plan: null };
    },
  });

  // Falha de rede NÃO vira "expirado": preferir deixar passar a trancar do
  // lado de fora um aluno em dia por causa de uma consulta que não voltou. O
  // conteúdo em si continua protegido pela RLS de qualquer jeito.
  const status: MemberStatus | null = isError ? null : (data?.status ?? null);

  return {
    status,
    plan: data?.plan ?? null,
    lastType: data?.last_type ?? null,
    expiredAt: data?.expired_at ?? null,
    loading: !!user && isLoading && !isError,
  };
}
