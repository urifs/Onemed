import { useCallback, useEffect, useMemo, useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, ChevronUp, LayoutGrid, Loader2, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATEGORY_ORDER, CATEGORY_ICON } from '@/lib/courseCategories';
import { matchesSearch } from '@/lib/utils';

interface CatalogCourse {
  id: string;
  title: string;
  category: string | null;
}

export const CoursesSection = () => {
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando');
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tentativa, setTentativa] = useState(0);

  // Mesma fonte que a área de membros usa (courses.category) — RPC pública
  // porque courses só é legível por membro/admin via RLS, e a landing page
  // não exige login. O catálogo é o mesmo, sincronizado todo dia pelo cron
  // da biblioteca: curso novo no Drive aparece aqui sozinho.
  // Import dinâmico: o cliente do Supabase exige as variáveis de ambiente já
  // no import do módulo, e o prerender do build renderiza a landing em Node,
  // sem elas. Carregar dentro do efeito (que não roda no servidor) mantém a
  // página renderizável no build sem mudar nada no navegador.
  useEffect(() => {
    let alive = true;
    setEstado('carregando');
    import('@/integrations/supabase/client')
      .then(({ supabase }) => supabase.rpc('public_course_catalog' as never))
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) throw error;
        setCourses((data || []) as CatalogCourse[]);
        setEstado('pronto');
      })
      .catch(err => {
        if (!alive) return;
        console.error('Failed to load course catalog', err);
        setEstado('erro');
      });
    return () => { alive = false; };
  }, [tentativa]);

  const recarregar = useCallback(() => setTentativa(n => n + 1), []);

  const byCategory = useMemo(() => {
    const map = new Map<string, CatalogCourse[]>();
    for (const c of courses) {
      const cat = c.category || 'Outros cursos';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(c);
    }
    return map;
  }, [courses]);

  // Ordem alfabética, e uma categoria que ainda não existe no mapa fixo (uma
  // taxonomia nova criada no painel) entra no fim em vez de sumir da página.
  const categories = useMemo(() => {
    const conhecidas = CATEGORY_ORDER.filter(cat => byCategory.has(cat));
    const novas = [...byCategory.keys()].filter(cat => !CATEGORY_ORDER.includes(cat));
    return [...conhecidas, ...novas].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [byCategory]);

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
      <div className="shell-page px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          {/* Enquanto o catálogo carrega (ou se a RPC falhar), os números
              dinâmicos ficam de fora — "0 categorias" e "0 cursos disponíveis"
              numa página de venda são piores que nenhum número. */}
          <h2 className="font-secondary text-3xl md:text-4xl font-bold text-foreground mb-3">
            +530 cursos médicos{categories.length > 0 ? `, ${categories.length} categorias` : ''}
          </h2>
          <p className="text-muted-foreground text-lg">
            As melhores plataformas médicas do Brasil, todas em um só lugar
            {totalCourses > 0 ? ` — ${totalCourses} cursos disponíveis agora` : ''}
          </p>
        </div>

        <div className="relative max-w-md mx-auto mb-10">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar curso…"
            disabled={estado !== 'pronto'}
            className="w-full h-11 pl-9 pr-3 rounded-full bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-60"
          />
        </div>

        {estado === 'carregando' && (
          <div className="space-y-3 max-w-4xl 3xl:max-w-5xl mx-auto" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[68px] rounded-xl bg-card border border-border animate-pulse" />
            ))}
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando o acervo…
            </p>
          </div>
        )}

        {estado === 'erro' && (
          <div className="max-w-md mx-auto text-center rounded-xl border border-border bg-card px-6 py-10">
            <AlertTriangle className="w-6 h-6 text-accent-warning mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">Não foi possível carregar a lista de cursos</p>
            <p className="text-sm text-muted-foreground mb-5">
              O acervo continua no ar — foi só esta listagem que não veio.
            </p>
            <Button onClick={recarregar} variant="outline" className="border-border text-muted-foreground hover:text-foreground gap-2">
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </Button>
          </div>
        )}

        {estado === 'pronto' && (searching ? (
          <div className="max-w-4xl 3xl:max-w-5xl mx-auto">
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
                    {course.title}
                    {course.category && <span className="text-muted-foreground"> · {course.category}</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* TODAS as categorias, sempre. Antes só as 6 primeiras em ordem
             alfabética apareciam, e as outras 12 ficavam atrás de um botão —
             "Extensivo & Intensivo · Residência", a maior e a que mais vende,
             era uma das escondidas. As linhas nascem fechadas, então mostrar
             as 18 custa 18 linhas de altura, não a página inteira. */
          <div className="space-y-3 max-w-4xl 3xl:max-w-5xl mx-auto">
            {categories.map(category => {
              const Icon = CATEGORY_ICON[category] || LayoutGrid;
              const items = byCategory.get(category) || [];
              const aberta = openCategory === category;
              return (
                <Collapsible
                  key={category}
                  open={aberta}
                  onOpenChange={(open) => setOpenCategory(open ? category : null)}
                >
                  <CollapsibleTrigger className="w-full bg-card rounded-xl px-5 py-4 flex items-center justify-between hover:border-primary/30 transition-colors duration-200 group border border-border">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 shrink-0 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-secondary font-semibold text-foreground text-left">{category}</span>
                      <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">
                        {items.length} {items.length === 1 ? 'curso' : 'cursos'}
                      </span>
                    </div>
                    {aberta ? (
                      <ChevronUp className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
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
                            {course.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
};

export default CoursesSection;
