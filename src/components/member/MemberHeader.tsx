import { Link, useNavigate } from 'react-router-dom';
import { Search, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface MemberHeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
}

export function MemberHeader({ query, onQueryChange }: MemberHeaderProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/75 border-b border-border">
      <div className="max-w-[1400px] mx-auto flex items-center gap-3 md:gap-5 px-4 md:px-8 py-3.5">
        <Link to="/membros" className="flex items-center gap-2.5 font-secondary font-bold text-lg text-foreground shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[#7f1d1d] flex items-center justify-center shadow-[0_0_16px_rgba(239,68,68,0.35)]">
            <span className="text-white text-sm font-extrabold">+</span>
          </div>
          One<span className="text-primary">Med</span>
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

        <button
          onClick={async () => { await logout(); navigate('/login'); }}
          title="Sair"
          className="w-9 h-9 shrink-0 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
