import { LayoutGrid, type LucideIcon } from 'lucide-react';
import { CATEGORY_ICON } from '@/lib/courseCategories';
import { cn } from '@/lib/utils';

interface CategoryEntry {
  name: string;
  count: number;
}

interface CategorySidebarProps {
  categories: CategoryEntry[];
  active: string | null;
  onSelect: (category: string | null) => void;
  totalCount: number;
}

export function CategorySidebar({ categories, active, onSelect, totalCount }: CategorySidebarProps) {
  return (
    <>
      {/* Desktop: persistent left column */}
      <aside className="hidden md:block w-[228px] shrink-0">
        <div className="sticky top-[84px] max-h-[calc(100vh-104px)] overflow-y-auto pr-1 scrollbar-thin space-y-0.5">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Categorias
          </p>
          <SidebarItem
            label="Todos os cursos"
            count={totalCount}
            icon={LayoutGrid}
            isActive={active === null}
            onClick={() => onSelect(null)}
          />
          {categories.map(cat => (
            <SidebarItem
              key={cat.name}
              label={cat.name}
              count={cat.count}
              icon={CATEGORY_ICON[cat.name] || LayoutGrid}
              isActive={active === cat.name}
              onClick={() => onSelect(cat.name)}
            />
          ))}
        </div>
      </aside>

      {/* Mobile: horizontal chip bar */}
      <div className="md:hidden -mx-4 px-4 mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <Chip label="Todos" isActive={active === null} onClick={() => onSelect(null)} />
        {categories.map(cat => (
          <Chip key={cat.name} label={cat.name} isActive={active === cat.name} onClick={() => onSelect(cat.name)} />
        ))}
      </div>
    </>
  );
}

function SidebarItem({
  label, count, icon: Icon, isActive, onClick,
}: { label: string; count: number; icon: LucideIcon; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] text-left transition-colors',
        isActive ? 'bg-primary/15 text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
      )}
    >
      <Icon className={cn('w-4 h-4 shrink-0', isActive && 'text-primary')} />
      <span className="flex-1 truncate">{label}</span>
      <span className="text-[11px] tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function Chip({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors',
        isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-muted-foreground border-border hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}
