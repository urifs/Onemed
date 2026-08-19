import { useQuery } from '@tanstack/react-query';
import { Bell, MessagesSquare, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCommunitySettings } from '@/hooks/useCommunitySettings';
import { supabase } from '@/integrations/supabase/client';

interface NotificationItem {
  id: string;
  label: string;
  done: boolean;
}

const DEFAULT_HEADING = 'Cursos em processo de atualização:';

// A lista e o título vêm do banco (notification_items + a RPC
// notifications_heading) e são editados no painel admin em /admin/announcements
// — nada de hardcode: mudar notificação não pode exigir deploy. Em cache por
// 5 min: o sino mora no header e era refeito em TODA navegação, pagando 2
// consultas por página pra reler a mesma lista.
//
// Vale para o teste grátis também (19/08): mostrar o que está sendo atualizado
// é argumento de compra justamente para quem ainda está decidindo. O AVISO do
// painel continua sendo só para assinante.
export function NotificationsBell() {
  const { whatsappGroupUrl } = useCommunitySettings();

  const { data } = useQuery({
    queryKey: ['notifications-bell'],
    queryFn: async () => {
      const [rows, head] = await Promise.all([
        supabase.from('notification_items' as never)
          .select('id, label, done')
          .order('sort_order')
          .then(res => (res.data || []) as unknown as NotificationItem[]),
        // RPC em vez de ler announcement_settings direto: a tabela guarda
        // também a MENSAGEM do aviso, que segue fora do teste grátis. A função
        // devolve só o título do sino, para quem está no trial recebê-lo sem
        // abrir o resto da tabela.
        supabase.rpc('notifications_heading' as never)
          .then(res => (res.data as unknown as string | null) || null),
      ]);
      return { items: rows, heading: head?.trim() || DEFAULT_HEADING };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const items = data?.items ?? [];
  const heading = data?.heading ?? DEFAULT_HEADING;

  const badgeCount = (whatsappGroupUrl ? 1 : 0) + (items.length > 0 ? 1 : 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative w-9 h-9 shrink-0 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          title="Notificações"
        >
          <Bell className="w-4 h-4" />
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
              {badgeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 bg-background-paper border-border space-y-4">
        {whatsappGroupUrl && (
          <a
            href={whatsappGroupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-primary/25 bg-primary/[0.06] p-3 hover:bg-primary/[0.1] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <MessagesSquare className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Entre no grupo da comunidade</p>
              <p className="text-xs text-muted-foreground">Converse com outros alunos no WhatsApp</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </a>
        )}
        {items.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-2.5">{heading}</p>
            <ul className="space-y-1.5">
              {items.map(({ id, label, done }) => (
                <li key={id} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className={`mt-0.5 ${done ? 'text-accent-success' : 'text-primary'}`}>•</span> {label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
