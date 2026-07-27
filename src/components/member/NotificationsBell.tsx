import { Bell, MessagesSquare, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCommunitySettings } from '@/hooks/useCommunitySettings';

const COURSES_UPDATING = [
  { name: 'MedReview 2026', done: true },
  { name: 'Medcurso 2026', done: false },
  { name: 'Medcel 2026', done: false },
  { name: 'Estratégia MED 2026', done: false },
  { name: 'Casal MED Resumos 2026', done: false },
  { name: 'Medcof USA 2026', done: false },
  { name: 'MEDgrupo 2026', done: false },
  { name: 'Eu Médico Residente 2026', done: false },
  { name: 'MedCards 2026', done: false },
  { name: 'MedWay 2026', done: false },
  { name: 'PS Zerado 2026', done: false },
  { name: 'HardWork Revalida 2026', done: false },
  { name: 'TEPs Medcof 2026', done: false },
];

export function NotificationsBell() {
  const { whatsappGroupUrl } = useCommunitySettings();
  const badgeCount = whatsappGroupUrl ? 2 : 1;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative w-9 h-9 shrink-0 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          title="Notificações"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
            {badgeCount}
          </span>
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
        <div>
          <p className="text-sm font-semibold text-foreground mb-2.5">Cursos em processo de atualização:</p>
          <ul className="space-y-1.5">
            {COURSES_UPDATING.map(({ name, done }) => (
              <li key={name} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className={`mt-0.5 ${done ? 'text-accent-success' : 'text-primary'}`}>•</span> {name}
              </li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
