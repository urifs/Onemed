import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export interface MindNode {
  label: string;
  children?: MindNode[];
}

// Mapa mental em árvore horizontal: objetivo à esquerda, grandes áreas e
// subtemas expandindo à direita, com conectores. No mobile vira um outline
// recolhível (rola na horizontal quando largo). Cores por profundidade dão a
// hierarquia visual típica de mapa mental.
const LEVEL_STYLES = [
  'bg-primary text-primary-foreground border-primary font-bold',
  'bg-primary/15 text-foreground border-primary/40 font-semibold',
  'bg-secondary text-foreground border-border',
  'bg-secondary/60 text-muted-foreground border-border',
];

// O modelo pode devolver o rótulo como objeto — nunca renderiza objeto cru.
function asText(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') return String((v as any).label || (v as any).text || '');
  return v == null ? '' : String(v);
}

function Node({ node, depth }: { node: MindNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const kids = node.children || [];
  const style = LEVEL_STYLES[Math.min(depth, LEVEL_STYLES.length - 1)];
  const label = asText(node.label);

  return (
    <li className="relative pl-6 first:pt-0">
      {/* conector para o pai */}
      {depth > 0 && (
        <span className="absolute left-0 top-4 w-6 h-px bg-border" aria-hidden />
      )}
      <div className="flex items-center gap-1.5 py-1.5">
        {kids.length > 0 ? (
          <button
            onClick={() => setOpen(o => !o)}
            className="shrink-0 w-5 h-5 rounded-md border border-border bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label={open ? 'Recolher' : 'Expandir'}
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span className="shrink-0 w-5 h-5 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-border" />
          </span>
        )}
        <span className={`rounded-lg border px-3 py-1.5 text-sm ${style}`}>{label}</span>
      </div>
      {kids.length > 0 && open && (
        <ul className="relative before:absolute before:left-0 before:top-0 before:bottom-4 before:w-px before:bg-border ml-2.5">
          {kids.map((k, i) => <Node key={i} node={k} depth={depth + 1} />)}
        </ul>
      )}
    </li>
  );
}

export function MindMap({ root }: { root: MindNode }) {
  if (!root) return null;
  return (
    <div className="overflow-x-auto">
      <ul className="min-w-max">
        <Node node={root} depth={0} />
      </ul>
    </div>
  );
}
