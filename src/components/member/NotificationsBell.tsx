import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const COURSES_UPDATING = [
  'Medcurso 2026',
  'Medcel 2026',
  'Estratégia MED 2026',
  'Casal MED Resumos 2026',
  'Medcof USA 2026',
  'MEDgrupo 2026',
  'Eu Médico Residente 2026',
  'MedCards 2026',
  'MedWay 2026',
  'PS Zerado 2026',
  'HardWork Revalida 2026',
  'TEPs Medcof 2026',
];

export function NotificationsBell() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative w-9 h-9 shrink-0 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          title="Notificações"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
            1
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 bg-background-paper border-border">
        <p className="text-sm font-semibold text-foreground mb-2.5">Cursos em processo de atualização:</p>
        <ul className="space-y-1.5">
          {COURSES_UPDATING.map(name => (
            <li key={name} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span> {name}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
