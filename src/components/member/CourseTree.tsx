import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight, Folder, FolderOpen, Play, FileText, File, FileSpreadsheet,
  FileType, Music, Image as ImageIcon, CheckCircle2,
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Lesson = Database['public']['Tables']['lessons']['Row'];
type CourseModule = Database['public']['Tables']['course_modules']['Row'];

const TYPE_ICON: Record<string, typeof Play> = {
  video: Play, pdf: FileText, doc: File, sheet: FileSpreadsheet,
  txt: FileType, audio: Music, image: ImageIcon, other: File,
};

// Uma pasta com centenas de itens dentro não pode despejar tudo de uma vez —
// a maior da biblioteca tem 955 arquivos numa pasta só e 301 subpastas sob a
// mesma pasta-mãe. Mostra um pedaço e vai crescendo sob demanda.
const PAGE = 150;

// Recuo por nível. Para de crescer no 6º porque a biblioteca chega a 7 níveis
// de pasta: sem o teto, o nome do arquivo lá no fundo sobrava dois caracteres
// antes das reticências.
const INDENT = (depth: number) => 8 + Math.min(depth, 6) * 11;

type TreeNode = {
  id: string;
  title: string;
  children: TreeNode[];
  lessons: Lesson[];
  videos: number; // acumulado, incluindo tudo que está mais fundo
  files: number;
};

function buildTree(modules: CourseModule[], lessons: Lesson[]) {
  const byId = new Map<string, TreeNode>();
  for (const m of modules) {
    byId.set(m.id, { id: m.id, title: m.title, children: [], lessons: [], videos: 0, files: 0 });
  }

  const roots: TreeNode[] = [];
  for (const m of modules) {
    const node = byId.get(m.id)!;
    const parentId = (m as CourseModule & { parent_module_id?: string | null }).parent_module_id;
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const rootLessons: Lesson[] = [];
  for (const l of lessons) {
    const node = l.module_id ? byId.get(l.module_id) : undefined;
    if (node) node.lessons.push(l);
    else rootLessons.push(l);
  }

  // Contagem acumulada: uma pasta fechada precisa dizer quanta coisa tem lá
  // dentro somando todos os níveis abaixo, senão o aluno não sabe se vale
  // abrir. Profundidade máxima na biblioteca é 7, recursão dá conta.
  const tally = (n: TreeNode) => {
    let v = 0, f = 0;
    for (const l of n.lessons) { if (l.type === 'video') v++; else f++; }
    for (const c of n.children) { tally(c); v += c.videos; f += c.files; }
    n.videos = v; n.files = f;
  };
  for (const r of roots) tally(r);

  return { roots, rootLessons, byId };
}

function CountLabel({ videos, files }: { videos: number; files: number }) {
  if (!videos && !files) return <span className="text-[10.5px] opacity-60">vazia</span>;
  return (
    <span className="text-[10.5px] opacity-70 tabular-nums whitespace-nowrap">
      {videos > 0 && `${videos} aula${videos !== 1 ? 's' : ''}`}
      {videos > 0 && files > 0 && ' · '}
      {files > 0 && `${files} arq.`}
    </span>
  );
}

function LessonRow({
  lesson, depth, isActive, completed, onSelect,
}: {
  lesson: Lesson; depth: number; isActive: boolean; completed: boolean; onSelect: (l: Lesson) => void;
}) {
  const Icon = TYPE_ICON[lesson.type] || File;
  return (
    <button
      onClick={() => onSelect(lesson)}
      title={lesson.title}
      style={{ paddingLeft: INDENT(depth) }}
      className={`w-full flex items-center gap-2 pr-2 py-1.5 rounded-md text-left transition-colors ${
        isActive ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
    >
      <span className="w-4 shrink-0" />
      {completed
        ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-accent-success" />
        : <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" fill={lesson.type === 'video' ? 'currentColor' : 'none'} />}
      <span className="flex-1 min-w-0 truncate text-[12.5px]">{lesson.title}</span>
    </button>
  );
}

function FolderRow({
  node, depth, expanded, onToggle, activeLessonId, completedIds, onSelectLesson,
}: {
  node: TreeNode; depth: number;
  expanded: Set<string>; onToggle: (id: string) => void;
  activeLessonId?: string | null; completedIds: Set<string>;
  onSelectLesson: (l: Lesson) => void;
}) {
  const isOpen = expanded.has(node.id);
  const [shownChildren, setShownChildren] = useState(PAGE);
  const [shownLessons, setShownLessons] = useState(PAGE);

  return (
    <>
      <button
        onClick={() => onToggle(node.id)}
        title={node.title}
        style={{ paddingLeft: INDENT(depth) }}
        className="w-full flex items-center gap-2 pr-2 py-1.5 rounded-md text-left text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        {isOpen
          ? <FolderOpen className="w-3.5 h-3.5 shrink-0 text-primary" />
          : <Folder className="w-3.5 h-3.5 shrink-0 opacity-70" />}
        <span className="flex-1 min-w-0 truncate text-[12.5px] font-medium">{node.title}</span>
        <CountLabel videos={node.videos} files={node.files} />
      </button>

      {isOpen && (
        <>
          {node.children.slice(0, shownChildren).map(child => (
            <FolderRow
              key={child.id} node={child} depth={depth + 1}
              expanded={expanded} onToggle={onToggle}
              activeLessonId={activeLessonId} completedIds={completedIds}
              onSelectLesson={onSelectLesson}
            />
          ))}
          {node.children.length > shownChildren && (
            <button
              onClick={() => setShownChildren(c => c + PAGE)}
              style={{ paddingLeft: INDENT(depth + 1) + 22 }}
              className="w-full py-1.5 text-left text-[11.5px] text-primary hover:underline"
            >
              + {node.children.length - shownChildren} pastas
            </button>
          )}

          {node.lessons.slice(0, shownLessons).map(lesson => (
            <LessonRow
              key={lesson.id} lesson={lesson} depth={depth + 1}
              isActive={lesson.id === activeLessonId}
              completed={completedIds.has(lesson.id)}
              onSelect={onSelectLesson}
            />
          ))}
          {node.lessons.length > shownLessons && (
            <button
              onClick={() => setShownLessons(c => c + PAGE)}
              style={{ paddingLeft: INDENT(depth + 1) + 22 }}
              className="w-full py-1.5 text-left text-[11.5px] text-primary hover:underline"
            >
              + {node.lessons.length - shownLessons} arquivos
            </button>
          )}
        </>
      )}
    </>
  );
}

/**
 * Mapa do curso: a mesma árvore de pastas e arquivos que existe no Drive, em
 * qualquer profundidade, com cada pasta abrindo e fechando no clique. Só o que
 * está aberto é renderizado — um curso da biblioteca tem 2.408 pastas e 12.234
 * arquivos, e montar isso tudo de uma vez travaria a página.
 */
export function CourseTree({
  modules, lessons, activeLessonId, completedIds, onSelectLesson,
}: {
  modules: CourseModule[];
  lessons: Lesson[];
  activeLessonId?: string | null;
  completedIds: Set<string>;
  onSelectLesson: (lesson: Lesson) => void;
}) {
  const { roots, rootLessons } = useMemo(() => buildTree(modules, lessons), [modules, lessons]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const parentOf = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const mod of modules) {
      m.set(mod.id, (mod as CourseModule & { parent_module_id?: string | null }).parent_module_id ?? null);
    }
    return m;
  }, [modules]);

  // Abrir uma aula (pela busca, pelo link direto ou pelo "próxima aula") deve
  // revelar onde ela mora na árvore — senão o mapa fica mostrando uma parte do
  // curso e o player, outra.
  useEffect(() => {
    if (!activeLessonId) return;
    const lesson = lessons.find(l => l.id === activeLessonId);
    if (!lesson?.module_id) return;
    const chain: string[] = [];
    let cur: string | null = lesson.module_id;
    // `seen` é cinto de segurança: os dados vêm de uma árvore, mas um ciclo
    // aqui congelaria a aba do aluno.
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) { seen.add(cur); chain.push(cur); cur = parentOf.get(cur) ?? null; }
    setExpanded(prev => {
      if (chain.every(id => prev.has(id))) return prev;
      const next = new Set(prev);
      for (const id of chain) next.add(id);
      return next;
    });
  }, [activeLessonId, lessons, parentOf]);

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const allTopIds = useMemo(() => roots.map(r => r.id), [roots]);
  const allTopOpen = allTopIds.length > 0 && allTopIds.every(id => expanded.has(id));

  if (roots.length === 0 && rootLessons.length === 0) return null;

  return (
    <div>
      {roots.length > 0 && (
        <div className="flex items-center justify-between px-2 pb-1.5">
          <span className="text-[10.5px] text-muted-foreground opacity-70 tabular-nums">
            {roots.length} pasta{roots.length !== 1 ? 's' : ''} na raiz
          </span>
          <button
            onClick={() => setExpanded(allTopOpen ? new Set() : new Set(allTopIds))}
            className="text-[11px] text-primary hover:underline"
          >
            {allTopOpen ? 'Recolher tudo' : 'Expandir raiz'}
          </button>
        </div>
      )}

      <div className="space-y-0.5">
        {rootLessons.map(lesson => (
          <LessonRow
            key={lesson.id} lesson={lesson} depth={0}
            isActive={lesson.id === activeLessonId}
            completed={completedIds.has(lesson.id)}
            onSelect={onSelectLesson}
          />
        ))}
        {roots.map(node => (
          <FolderRow
            key={node.id} node={node} depth={0}
            expanded={expanded} onToggle={toggle}
            activeLessonId={activeLessonId} completedIds={completedIds}
            onSelectLesson={onSelectLesson}
          />
        ))}
      </div>
    </div>
  );
}
