import { useState } from 'react';
import { LayoutGrid, Menu, type LucideIcon } from 'lucide-react';
import { CATEGORY_ICON } from '@/lib/courseCategories';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const handleSelect = (category: string | null) => {
    onSelect(category);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Desktop: persistent left column, grows with its content and scrolls
          together with the page — no inner scrollbar of its own. */}
      <aside className="hidden md:block w-[228px] shrink-0">
        <div className="sticky top-[84px] space-y-0.5">
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
        </div>
      </aside>

      {/* Mobile: hamburger trigger opens a drawer with the full category list */}
      <div className="md:hidden mb-5">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="inline-flex items-center gap-2 max-w-full px-3.5 py-2 rounded-lg bg-secondary border border-border text-sm font-medium text-foreground">
              <Menu className="w-4 h-4 shrink-0" />
              <span className="truncate">{active || 'Categorias'}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-xs overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Categorias</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-0.5">
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
            </div>
          </SheetContent>
        </Sheet>
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
