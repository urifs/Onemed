import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SecAlert {
  severidade: 'alta' | 'media' | 'baixa';
  tipo: string;
  titulo: string;
  detalhe: string;
  valor: number;
}
export interface SecLocation {
  email: string; ip: string | null;
  lat: number; lng: number;
  city: string | null; region: string | null; country: string | null; cc: string | null;
  quando: string; online: boolean; contas_no_ip: number;
}
export interface SecIp {
  ip: string; contas: number; ultimo: string;
  city: string | null; country: string | null; cc: string | null;
}
export interface SecSignup {
  email: string; quando: string; confirmado: boolean;
  ultimo_login: string | null; suspeito: boolean;
}
export interface SecBuyer {
  email: string; plan: string | null; amount: number | null;
  status: string; granted: boolean; tem_pagamento: boolean;
  quando: string; ip: string | null; suspeito: boolean;
}
export interface SecRate {
  identifier: string; action: string; attempts: number; desde: string;
}
export interface SecRole { email: string; role: string; criado: string; ultimo_login: string | null; }
export interface SecSeriePonto { hora: string; signups: number; trials: number; buyers: number; }

export interface SecMetricas {
  trials_1h: number; trials_24h: number;
  buyers_pending_1h: number; buyers_pending_24h: number; buyers_approved_24h: number;
  receita_24h: number;
  signups_1h: number; signups_24h: number;
  sessoes_ativas: number; sessoes_total: number;
  credenciais_1h: number; logins_falhos_1h: number;
  cupons_ativos: number; afiliados_24h: number;
  ips_multi_conta: number; admins_total: number; viewers_total: number;
}

export interface SecurityOverview {
  gerado_em: string;
  janela_horas: number;
  metricas: SecMetricas;
  alertas: SecAlert[];
  ips_suspeitos: SecIp[];
  localizacoes: SecLocation[];
  signups_recentes: SecSignup[];
  compras_recentes: SecBuyer[];
  rate_limits: SecRate[];
  papeis: SecRole[];
  serie: SecSeriePonto[];
}

// Nível de ameaça 0..100 derivado dos alertas + assinatura de ataque.
// alta pesa muito (25), média 8, baixa 3; presença de qualquer alerta de
// assinatura de pentest (domínio de teste / venda fake / trial eterno /
// novo papel) crava no mínimo "alto".
export function computeThreat(o: SecurityOverview | undefined) {
  if (!o) return { score: 0, nivel: 'ok' as const };
  let score = 0;
  let assinatura = false;
  for (const a of o.alertas) {
    score += a.severidade === 'alta' ? 25 : a.severidade === 'media' ? 8 : 3;
    if (['dominio_teste', 'venda_fake', 'trial_eterno', 'novo_papel'].includes(a.tipo)) assinatura = true;
  }
  score = Math.min(100, score);
  if (assinatura) score = Math.max(score, 70);
  const nivel = score >= 70 ? 'critico' : score >= 40 ? 'alto' : score >= 15 ? 'medio' : score > 0 ? 'baixo' : 'ok';
  return { score, nivel } as const;
}

export function useSecurityOverview(hours = 24, enabled = true) {
  return useQuery({
    queryKey: ['security-overview', hours],
    enabled,
    queryFn: async (): Promise<SecurityOverview> => {
      const { data, error } = await supabase.rpc('admin_security_overview' as never, { _hours: hours } as never);
      if (error) throw error;
      return data as unknown as SecurityOverview;
    },
    // "ao vivo": atualiza sozinho a cada 20s enquanto a aba está aberta.
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });
}
