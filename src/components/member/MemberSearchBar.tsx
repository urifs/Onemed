import { Search, Film, FileText, LayoutGrid } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type ContentTypeFilter = 'all' | 'videos' | 'files';

interface MemberSearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  contentTypeFilter?: ContentTypeFilter;
  onContentTypeFilterChange?: (value: ContentTypeFilter) => void;
}

export function MemberSearchBar({ 
  query, 
  onQueryChange, 
  placeholder = 'Buscar curso…',
  contentTypeFilter,
  onContentTypeFilterChange 
}: MemberSearchBarProps) {
  return (
    <div className="bg-background/60 border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
        <div className="relative w-full max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        
        {onContentTypeFilterChange && (
          <Select value={contentTypeFilter || 'all'} onValueChange={(v) => onContentTypeFilterChange(v as ContentTypeFilter)}>
            <SelectTrigger className="w-[140px] md:w-[180px] h-10 bg-secondary border-border rounded-xl">
              <SelectValue placeholder="Filtrar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  <span>Todos</span>
                </div>
              </SelectItem>
              <SelectItem value="videos">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4" />
                  <span>Vídeos</span>
                </div>
              </SelectItem>
              <SelectItem value="files">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Arquivos</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
