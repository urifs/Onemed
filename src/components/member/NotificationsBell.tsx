import { useEffect, useState } from 'react';
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

// A lista e o título vêm do banco (notification_items +
// announcement_settings.notifications_heading) e são editados no painel admin
// em /admin/announcements — nada de hardcode: mudar notificação não pode
// exigir deploy.
export function NotificationsBell() {
  const { whatsappGroupUrl } = useCommunitySettings();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [heading, setHeading] = useState(DEFAULT_HEADING);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from('notification_items' as never)
        .select('id, label, done')
        .order('sort_order')
        .then(res => (res.data || []) as unknown as NotificationItem[]),
      supabase.from('announcement_settings')
        .select('notifications_heading')
        .maybeSingle()
        .then(res => (res.data as { notifications_heading?: string | null } | null)?.notifications_heading || null),
    ]).then(([rows, head]) => {
      if (cancelled) return;
      setItems(rows);
      if (head?.trim()) setHeading(head);
    });
    return () => { cancelled = true; };
  }, []);

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
