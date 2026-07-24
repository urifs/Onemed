import { useEffect, useMemo, useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, LayoutGrid, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_ORDER, CATEGORY_ICON } from '@/lib/courseCategories';
import { stripYearFromTitle, matchesSearch } from '@/lib/utils';

interface CatalogCourse {
  id: string;
  title: string;
  category: string | null;
}

export const CoursesSection = () => {
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');

  // Mesma fonte que a área de membros usa (courses.category) — RPC pública
  // porque courses só é legível por membro/admin via RLS, e a landing page
  // não exige login.
  useEffect(() => {
    supabase.rpc('public_course_catalog').then(({ data, error }) => {
      if (error) { console.error('Failed to load course catalog', error); return; }
      setCourses((data || []) as CatalogCourse[]);
    });
  }, []);

  const byCategory = useMemo(() => {
    const map = new Map<string, CatalogCourse[]>();
    for (const c of courses) {
      const cat = c.category || 'Outros cursos';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(c);
    }
    return map;
  }, [courses]);

  const categories = CATEGORY_ORDER.filter(cat => byCategory.has(cat)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const displayed = showAll ? categories : categories.slice(0, 6);
  const totalCourses = courses.length;

  // Mesmo critério de busca da área de membros (matchesSearch): ignora
  // acento/caixa, cada palavra digitada só precisa aparecer em qualquer
  // lugar do título ou categoria, em qualquer ordem.
  const searching = query.trim().length > 0;
  const searchResults = useMemo(
    () => (searching ? courses.filter(c => matchesSearch(c.title, query) || matchesSearch(c.category || '', query)) : []),
    [courses, query, searching],
  );

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="font-secondary text-3xl md:text-4xl font-bold text-foreground mb-3">
            +530 cursos médicos, {categories.length} categorias
          </h2>
          <p className="text-muted-foreground text-lg">
            As melhores plataformas médicas do Brasil, todas em um só lugar — {totalCourses} cursos disponíveis agora
          </p>
        </div>

        <div className="relative max-w-md mx-auto mb-10">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar curso…"
            className="w-full h-11 pl-9 pr-3 rounded-full bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {searching ? (
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-muted-foreground mb-4">
              {searchResults.length} curso{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''} para "{query}"
            </p>
            {searchResults.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Nenhum curso encontrado com esse termo.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {searchResults.map(course => (
                  <span
                    key={course.id}
                    className="text-xs bg-secondary text-foreground border border-border px-3 py-1.5 rounded-full"
                  >
                    {stripYearFromTitle(course.title)}
                    {course.category && <span className="text-muted-foreground"> · {course.category}</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
        <>
        <div className="space-y-3 max-w-4xl mx-auto">
          {displayed.map(category => {
            const Icon = CATEGORY_ICON[category] || LayoutGrid;
            const items = byCategory.get(category) || [];
            return (
              <Collapsible
                key={category}
                open={openCategory === category}
                onOpenChange={(open) => setOpenCategory(open ? category : null)}
              >
                <CollapsibleTrigger className="w-full bg-card rounded-xl px-5 py-4 flex items-center justify-between hover:border-primary/30 transition-colors duration-200 group border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-secondary font-semibold text-foreground">{category}</span>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      {items.length} cursos
                    </span>
                  </div>
                  {openCategory === category ? (
                    <ChevronUp className="w-4 h-4 text-primary" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="bg-card/60 rounded-b-xl border border-t-0 border-border px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {items.map(course => (
                        <span
                          key={course.id}
                          className="text-xs bg-secondary text-muted-foreground border border-border px-3 py-1 rounded-full hover:text-foreground hover:border-primary/30 transition-colors"
                        >
                          {stripYearFromTitle(course.title)}
                        </span>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

        {!showAll && categories.length > 6 && (
          <div className="text-center mt-6">
            <Button
              variant="outline"
              onClick={() => setShowAll(true)}
              className="border-border text-muted-foreground hover:text-foreground hover:bg-secondary gap-2"
            >
              Ver todas as {categories.length} categorias
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        )}
        </>
        )}
      </div>
    </section>
  );
};

export default CoursesSection;
