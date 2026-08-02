import { useState } from 'react';
import { LayoutGrid, Menu, PanelsTopLeft, X, type LucideIcon } from 'lucide-react';
import { CATEGORY_ICON } from '@/lib/courseCategories';
import { cn } from '@/lib/utils';

interface CategoryEntry {
  name: string;
  count: number;
}

interface CategorySidebarProps {
  // Seção "Menu": as áreas do aluno (Favoritos, Flashcards, Banco de
  // Questões…), acima e separadas das categorias de curso.
  menuItems: CategoryEntry[];
  categories: CategoryEntry[];
  active: string | null;
  onSelect: (category: string | null) => void;
  totalCount: number;
}

export function CategorySidebar({ menuItems, categories, active, onSelect, totalCount }: CategorySidebarProps) {
  // Mobile: dois gatilhos lado a lado — "Menu" e "Categorias" — cada um abre
  // a gaveta na própria seção.
  const [mobileOpen, setMobileOpen] = useState<null | 'menu' | 'categorias'>(null);
  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const handleSelect = (category: string | null) => {
    onSelect(category);
    setMobileOpen(null);
  };

  const menuSection = (
    <>
      <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Menu
      </p>
      {menuItems.map(item => (
        <SidebarItem
          key={item.name}
          label={item.name}
          count={item.count}
          icon={CATEGORY_ICON[item.name] || LayoutGrid}
          isActive={active === item.name}
          highlight
          onClick={() => handleSelect(item.name)}
        />
      ))}
    </>
  );

  const categoriesSection = (
    <>
      <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Categorias
      </p>
      <SidebarItem
        label="Todos os cursos"
        count={totalCount}
        icon={LayoutGrid}
        isActive={active === null}
        onClick={() => handleSelect(null)}
      />
      {sorted.map(cat => (
        <SidebarItem
          key={cat.name}
          label={cat.name}
          count={cat.count}
          icon={CATEGORY_ICON[cat.name] || LayoutGrid}
          isActive={active === cat.name}
          onClick={() => handleSelect(cat.name)}
        />
      ))}
    </>
  );

  return (
    <>
      {/* Desktop: persistent left column, grows with its content and scrolls
          together with the page — no inner scrollbar of its own. */}
      <aside className="hidden md:block w-[228px] shrink-0">
        <div className="sticky top-[84px]">
          <div className="space-y-0.5 mb-6">{menuSection}</div>
          <div className="space-y-0.5">{categoriesSection}</div>
        </div>
      </aside>

      {/* Mobile: dois gatilhos lado a lado. Gaveta em overlay fixo (mesma
          receita do LessonPlayer) em vez do Sheet do Radix — um padrão
          comprovado só. */}
      <div className="md:hidden mb-5 flex items-center gap-2">
        <button
          onClick={() => setMobileOpen('menu')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-secondary border border-border text-sm font-medium text-foreground"
        >
          <PanelsTopLeft className="w-4 h-4 shrink-0" />
          Menu
        </button>
        <button
          onClick={() => setMobileOpen('categorias')}
          className="inline-flex items-center gap-2 max-w-full px-3.5 py-2 rounded-lg bg-secondary border border-border text-sm font-medium text-foreground"
        >
          <Menu className="w-4 h-4 shrink-0" />
          <span className="truncate">{active || 'Categorias'}</span>
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(null)} />
          <div className="relative w-[80vw] max-w-xs h-full bg-background border-r border-border overflow-y-auto p-5 animate-fade-in">
            <div className="flex items-center justify-end mb-2">
              <button
                onClick={() => setMobileOpen(null)}
                aria-label="Fechar"
                className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* As duas seções aparecem na gaveta; o gatilho decide qual vem
                primeiro, pra área tocada estar no topo. */}
            {mobileOpen === 'menu' ? (
              <>
                <div className="space-y-0.5 mb-6">{menuSection}</div>
                <div className="space-y-0.5">{categoriesSection}</div>
              </>
            ) : (
              <>
                <div className="space-y-0.5 mb-6">{categoriesSection}</div>
                <div className="space-y-0.5">{menuSection}</div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SidebarItem({
  label, count, icon: Icon, isActive, highlight, onClick,
}: { label: string; count: number; icon: LucideIcon; isActive: boolean; highlight?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] text-left transition-colors',
        isActive ? 'bg-primary/15 text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
        highlight && !isActive && 'text-foreground font-bold',
        highlight && isActive && 'font-bold',
      )}
    >
      <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary' : highlight && 'text-primary')} />
      <span className="flex-1 truncate">{label}</span>
      <span className="text-[11px] tabular-nums opacity-70">{count}</span>
    </button>
  );
}
