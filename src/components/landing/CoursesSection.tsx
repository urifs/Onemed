import { useEffect, useMemo, useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_ORDER, CATEGORY_ICON } from '@/lib/courseCategories';
import { stripYearFromTitle } from '@/lib/utils';

interface CatalogCourse {
  id: string;
  title: string;
  category: string | null;
}

export const CoursesSection = () => {
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

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

  const categories = CATEGORY_ORDER.filter(cat => byCategory.has(cat));
  const displayed = showAll ? categories : categories.slice(0, 6);
  const totalCourses = courses.length;

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="font-mono text-xs uppercase tracking-widest text-primary mb-4">Conteúdo</p>
          <h2 className="font-secondary text-4xl md:text-5xl font-bold text-foreground mb-4">
            +530 Cursos Médicos
          </h2>
          <p className="text-muted-foreground text-lg">
            As melhores plataformas médicas do Brasil em um só lugar — {categories.length} categorias, +{totalCourses} cursos
          </p>
        </div>

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
                <CollapsibleTrigger className="w-full glass rounded-xl px-5 py-4 flex items-center justify-between hover:border-primary/30 transition-colors duration-200 group border border-border">
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
                  <div className="glass rounded-b-xl border border-t-0 border-border px-5 py-4">
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
      </div>
    </section>
  );
};

export default CoursesSection;
