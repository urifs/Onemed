import { Link } from 'react-router-dom';
import { Search, Stethoscope } from 'lucide-react';
import { AccountMenu } from './AccountMenu';

interface MemberHeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
}

export function MemberHeader({ query, onQueryChange }: MemberHeaderProps) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/75 border-b border-border">
      <div className="max-w-[1400px] mx-auto flex items-center gap-3 md:gap-5 px-4 md:px-8 py-3.5">
        <Link to="/membros" className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 bg-primary/15 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
          <span className="font-secondary font-bold text-lg text-foreground">OneMed</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-1">
          <Link to="/membros" className="text-sm font-medium px-3 py-1.5 rounded-full bg-secondary text-foreground">
            Início
          </Link>
        </nav>

        <div className="flex-1" />

        <div className="relative w-full max-w-[150px] sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder="Buscar curso…"
            className="w-full h-9 pl-9 pr-3 rounded-full bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <AccountMenu />
      </div>
    </header>
  );
}
