import { Search } from 'lucide-react';

interface MemberSearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
}

export function MemberSearchBar({ query, onQueryChange, placeholder = 'Buscar curso…' }: MemberSearchBarProps) {
  return (
    <div className="bg-background/60 border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-10 pl-9 pr-3 rounded-full bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
