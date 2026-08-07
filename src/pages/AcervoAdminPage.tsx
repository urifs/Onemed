import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FolderUp, ChevronDown, Loader2, Search, Eye, EyeOff, Trash2, ExternalLink,
  FolderOpen, FileText, ThumbsUp, HardDrive, Files, Users,
} from 'lucide-react';
import { formatDateTimeSP } from '@/lib/utils';

// Gerenciamento ADMIN do Acervo Público: tudo que os assinantes subiram
// (inclusive itens privados e uploads presos em "pending"), com os arquivos de
// cada item, alternância público/privado e exclusão (via archive-manage, que
// apaga a pasta no Drive junto — o delete nunca é só no banco).

interface ItemRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  kind: string;
  is_public: boolean;
  views: number;
  status: string;
  created_at: string;
}

interface FileRow {
  id: string;
  item_id: string;
  name: string;
  path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: string;
}

const fmtSize = (bytes: number | null | undefined) => {
  const b = Number(bytes || 0);
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b > 0) return `${Math.max(1, Math.round(b / 1e3))} KB`;
  return '—';
};

async function invokeArchive(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('archive-manage', { body });
  if (error || data?.error) {
    let msg = data?.error;
    if (!msg && error && 'context' in (error as any)) {
      try { msg = (await (error as any).context.json())?.error; } catch { /* não-json */ }
    }
    throw new Error(msg || 'Não foi possível completar a operação.');
  }
  return data;
}

export default function AcervoAdminPage() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [fileAgg, setFileAgg] = useState<Record<string, { count: number; size: number }>>({});
  const [likeCount, setLikeCount] = useState<Record<string, number>>({});
  const [uploaders, setUploaders] = useState<Record<string, { name: string | null; email: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filesByItem, setFilesByItem] = useState<Record<string, FileRow[]>>({});
  const [loadingFiles, setLoadingFiles] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openingFile, setOpeningFile] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Admin enxerga TODOS os itens direto pela tabela (política de admin) —
    // inclusive privados e pendentes, que o feed dos alunos nunca mostra.
    let rows: any, files: any, likes: any;
    try {
      const res = await Promise.all([
        supabase.from('archive_items' as never).select('*').order('created_at', { ascending: false }) as any,
        supabase.from('archive_files' as never).select('item_id, size_bytes, status') as any,
        supabase.from('archive_likes' as never).select('item_id') as any,
      ]);
      if (res[0].error) throw res[0].error;
      rows = res[0].data; files = res[1].data; likes = res[2].data;
      setLoadError(false);
    } catch {
      // Sem isto, uma falha de rede mostrava "Nenhum material no acervo",
      // como se tudo tivesse sido apagado.
      setLoadError(true);
      setLoading(false);
      return;
    }
    const list = (rows || []) as ItemRow[];
    setItems(list);

    const agg: Record<string, { count: number; size: number }> = {};
    for (const f of (files || []) as { item_id: string; size_bytes: number | null; status: string }[]) {
      const a = agg[f.item_id] || (agg[f.item_id] = { count: 0, size: 0 });
      a.count += 1;
      a.size += Number(f.size_bytes || 0);
    }
    setFileAgg(agg);

    const lk: Record<string, number> = {};
    for (const l of (likes || []) as { item_id: string }[]) lk[l.item_id] = (lk[l.item_id] || 0) + 1;
    setLikeCount(lk);

    const ids = [...new Set(list.map(i => i.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles' as never)
        .select('user_id, name, email').in('user_id', ids) as any;
      const map: Record<string, { name: string | null; email: string | null }> = {};
      for (const p of (profs || []) as { user_id: string; name: string | null; email: string | null }[]) {
        map[p.user_id] = { name: p.name, email: p.email };
      }
      setUploaders(map);
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!filesByItem[id]) {
      setLoadingFiles(id);
      const { data } = await supabase.from('archive_files' as never)
        .select('*').eq('item_id', id).order('path').order('name') as any;
      setFilesByItem(prev => ({ ...prev, [id]: (data || []) as FileRow[] }));
      setLoadingFiles(null);
    }
  };

  const togglePublic = async (item: ItemRow) => {
    setBusy(item.id);
    const { error } = await supabase.from('archive_items' as never)
      .update({ is_public: !item.is_public } as never).eq('id', item.id);
    if (error) toast.error('Não foi possível alterar a visibilidade.');
    else {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_public: !i.is_public } : i));
      toast.success(!item.is_public ? 'Material agora é público.' : 'Material agora é privado.');
    }
    setBusy(null);
  };

  const deleteItem = async (item: ItemRow) => {
    const who = uploaders[item.user_id]?.name || uploaders[item.user_id]?.email || 'assinante';
    if (!confirm(`Excluir "${item.title}" (enviado por ${who})? Os arquivos serão apagados de vez, inclusive do armazenamento.`)) return;
    setBusy(item.id);
    try {
      await invokeArchive({ action: 'delete', itemId: item.id });
      setItems(prev => prev.filter(i => i.id !== item.id));
      if (expanded === item.id) setExpanded(null);
      toast.success('Material excluído.');
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível excluir.');
    } finally {
      setBusy(null);
    }
  };

  // Abre o arquivo numa aba (URL assinada do worker de streaming) — o objetivo
  // aqui é conferência rápida do que foi subido.
  const openFile = async (f: FileRow) => {
    setOpeningFile(f.id);
    // A aba é aberta ANTES do await — depois de uma promise o bloqueador de
    // pop-up derrubaria o window.open por não estar mais no gesto do clique.
    const win = window.open('about:blank', '_blank');
    try {
      const { url } = await invokeArchive({ action: 'file_token', fileId: f.id });
      if (win) win.location.href = url;
      else window.open(url, '_blank', 'noopener');
    } catch (err: any) {
      win?.close();
      toast.error(err.message || 'Não foi possível abrir o arquivo.');
    } finally {
      setOpeningFile(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => {
      const up = uploaders[i.user_id];
      return i.title.toLowerCase().includes(q)
        || (i.description || '').toLowerCase().includes(q)
        || i.category.toLowerCase().includes(q)
        || (up?.name || '').toLowerCase().includes(q)
        || (up?.email || '').toLowerCase().includes(q);
    });
  }, [items, search, uploaders]);

  const totals = useMemo(() => ({
    itens: items.length,
    pendentes: items.filter(i => i.status !== 'ready').length,
    privados: items.filter(i => !i.is_public).length,
    donos: new Set(items.map(i => i.user_id)).size,
    arquivos: Object.values(fileAgg).reduce((a, f) => a + f.count, 0),
    tamanho: Object.values(fileAgg).reduce((a, f) => a + f.size, 0),
  }), [items, fileAgg]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderUp className="w-6 h-6 text-primary" /> Acervo Público
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tudo que os assinantes subiram no acervo — inclusive itens privados e uploads incompletos.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: FolderUp, label: 'Materiais', value: `${totals.itens}${totals.pendentes ? ` (${totals.pendentes} incompletos)` : ''}` },
            { icon: Users, label: 'Assinantes enviando', value: String(totals.donos) },
            { icon: Files, label: 'Arquivos', value: String(totals.arquivos) },
            { icon: HardDrive, label: 'Tamanho total', value: fmtSize(totals.tamanho) },
          ].map(c => (
            <Card key={c.label} className="bg-background-paper border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <c.icon className="w-3.5 h-3.5 text-primary" /> {c.label}
                </div>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título, categoria, nome ou email de quem enviou…"
            className="w-full rounded-lg bg-background-paper border border-border pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        <Card className="bg-background-paper border-border">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-5 space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-14 bg-secondary rounded animate-pulse" />)}</div>
            ) : loadError ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground mb-4">Não foi possível carregar o acervo.</p>
                <button onClick={load} className="text-sm font-medium text-primary hover:underline">Tentar novamente</button>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                {items.length === 0 ? 'Nenhum material no acervo ainda.' : 'Nada encontrado com essa busca.'}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map(item => {
                  const up = uploaders[item.user_id];
                  const agg = fileAgg[item.id];
                  const aberto = expanded === item.id;
                  const files = filesByItem[item.id] || [];
                  const KindIcon = item.kind === 'folder' ? FolderOpen : FileText;
                  return (
                    <div key={item.id}>
                      <div className="flex items-center gap-3 px-5 py-3">
                        <button onClick={() => toggleExpand(item.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                          <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                          <KindIcon className="w-4 h-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
                              {!item.is_public && (
                                <span className="text-[10px] uppercase font-semibold text-accent-warning bg-accent-warning/10 border border-accent-warning/30 rounded px-1.5 py-0.5">privado</span>
                              )}
                              {item.status !== 'ready' && (
                                <span className="text-[10px] uppercase font-semibold text-red-500 bg-red-500/10 border border-red-500/30 rounded px-1.5 py-0.5">incompleto</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {up?.name || up?.email || 'assinante'} · {item.category} · {agg ? `${agg.count} arquivo${agg.count !== 1 ? 's' : ''} · ${fmtSize(agg.size)}` : 'sem arquivos'}
                              {' '}· {formatDateTimeSP(item.created_at)}
                            </p>
                          </div>
                        </button>
                        <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground shrink-0 tabular-nums">
                          <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {item.views}</span>
                          <span className="inline-flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" /> {likeCount[item.id] || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm" variant="outline" className="h-8 px-2.5"
                            onClick={() => togglePublic(item)}
                            disabled={busy === item.id}
                            title={item.is_public ? 'Tornar privado' : 'Tornar público'}
                          >
                            {item.is_public ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            size="sm" variant="outline" className="h-8 px-2.5 text-red-500 hover:text-red-600"
                            onClick={() => deleteItem(item)}
                            disabled={busy === item.id}
                            title="Excluir material"
                          >
                            {busy === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>

                      {aberto && (
                        <div className="bg-secondary/40 border-t border-border px-5 py-3 space-y-2">
                          {item.description && (
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.description}</p>
                          )}
                          {loadingFiles === item.id ? (
                            <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                          ) : files.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-1">Nenhum arquivo — o upload não chegou a completar.</p>
                          ) : (
                            <div className="space-y-1">
                              {files.map(f => (
                                <div key={f.id} className="flex items-center gap-2 rounded-lg bg-background-paper border border-border px-3 py-1.5">
                                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="flex-1 min-w-0 truncate text-xs text-foreground">
                                    {f.path ? `${f.path}/` : ''}{f.name}
                                  </span>
                                  {f.status !== 'ready' && (
                                    <span className="text-[10px] uppercase font-semibold text-red-500 shrink-0">falhou</span>
                                  )}
                                  <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">{fmtSize(f.size_bytes)}</span>
                                  {f.status === 'ready' && (
                                    <button
                                      onClick={() => openFile(f)}
                                      disabled={openingFile === f.id}
                                      className="text-primary hover:text-primary-hover shrink-0"
                                      title="Abrir arquivo"
                                    >
                                      {openingFile === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
