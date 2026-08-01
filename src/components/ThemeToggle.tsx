import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

// useTheme() só reflete o tema real depois da hidratação (next-themes lê o
// localStorage num efeito) — sem isso, o ícone piscaria trocado por um
// instante em toda navegação/refresh.
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className={cn(
        'w-9 h-9 shrink-0 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors',
        className,
      )}
    >
      {mounted && (isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />)}
    </button>
  );
}
