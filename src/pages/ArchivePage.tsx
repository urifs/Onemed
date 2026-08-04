import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft, FolderUp, Upload, Search, Loader2, Eye, Heart, MessageSquare,
  FileText, PlayCircle, File as FileIcon, Image as ImageIcon, FolderOpen,
  Globe, Lock, Pencil, Trash2, Send, Clock, Flame, ThumbsUp, User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMemberStatus } from '@/hooks/useMemberStatus';
import { useRequireName } from '@/hooks/useRequireName';
import { NameRequiredModal } from '@/components/member/NameRequiredModal';
import { CATEGORY_ORDER } from '@/lib/courseCategories';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LessonPlayer } from '@/components/member/LessonPlayer';
import { Seo } from '@/seo/Seo';
import type { Database } from '@/integrations/supabase/types';

type LessonRow = Database['public']['Tables']['lessons']['Row'];

// Tipo de aula a partir do mime, para o LessonPlayer escolher o visualizador
// certo (mesma lógica do member-sync-library). Exportado: a busca geral do
// dashboard usa pra escolher o ícone dos arquivos do acervo.
export function lessonTypeFromMime(mime: string | null | undefined, name: string): string {
  const m = (mime || '').toLowerCase();
  const n = name.toLowerCase();
  if (m.startsWith('video/') || /\.(mp4|mkv|avi|mov|ts|wmv|webm|flv|mpg)$/.test(n)) return 'video';
  if (m === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (m.includes('word') || /\.(doc|docx)$/.test(n)) return 'doc';
  if (m.includes('spreadsheet') || m.includes('ms-excel') || /\.(xls|xlsx)$/.test(n)) return 'sheet';
  if (m === 'text/plain' || n.endsWith('.txt')) return 'txt';
  if (m.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/.test(n)) return 'audio';
  if (m.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(n)) return 'image';
  return 'other';
}

// Monta uma "aula" sintética a partir de um arquivo do acervo, para reusar o
// LessonPlayer (vídeo com remux TS, PDF com zoom, Office, imagem…). O id é o
// do archive_file; a URL vem do archive-manage file_token via resolveUrl.
function fileToLesson(f: ArchiveFile): LessonRow {
  return {
    id: f.id,
    title: f.name,
    type: lessonTypeFromMime(f.mime_type, f.name),
    mime_type: f.mime_type,
    // sem drive_file_id/storage_path: o player usa só o resolveUrl e não tenta
    // o fallback de cota/embed (que é específico da conta de conteúdo).
    drive_file_id: null,
    storage_path: null,
    size_bytes: f.size_bytes,
    course_id: null as never,
    module_id: null,
    duration_seconds: null,
    sort_order: null,
    created_at: null as never,
    drive_path: null,
    last_seen_at: null,
    missing_since: null,
  } as unknown as LessonRow;
}

interface FeedItem {
  id: string;
  user_id: string;
  uploader_name: string;
  title: string;
  description: string | null;
  category: string;
  kind: string;
  is_public: boolean;
  views: number;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
  file_count: number;
  total_size: number;
  first_mime: string | null;
}

interface ArchiveFile {
  id: string;
  name: string;
  path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: string;
}

interface ArchiveComment {
  id: string;
  user_id: string;
  author_name: string;
  is_admin: boolean;
  body: string;
  created_at: string;
}

type SortMode = 'recent' | 'views' | 'likes' | 'mine';

const SORTS: { key: SortMode; label: string; icon: typeof Clock }[] = [
  { key: 'recent', label: 'Recentes', icon: Clock },
  { key: 'views', label: 'Mais acessados', icon: Flame },
  { key: 'likes', label: 'Mais curtidos', icon: ThumbsUp },
  { key: 'mine', label: 'Meus uploads', icon: User },
];

const fmtSize = (bytes: number | null | undefined) => {
  const b = Number(bytes || 0);
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b > 0) return `${Math.max(1, Math.round(b / 1e3))} KB`;
  return '';
};

const mimeIcon = (mime: string | null | undefined, kind?: string) => {
  if (kind === 'folder') return FolderOpen;
  const m = mime || '';
  if (m.startsWith('video/')) return PlayCircle;
  if (m === 'application/pdf') return FileText;
  if (m.startsWith('image/')) return ImageIcon;
  return FileIcon;
};

// Upload do navegador DIRETO pro Google (sessão retomável): XHR para ter
// progresso — fetch não expõe progresso de envio.
function uploadToSession(sessionUri: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', sessionUri);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300)
      ? resolve()
      : reject(new Error(`Falha no envio (HTTP ${xhr.status})`));
    xhr.onerror = () => reject(new Error('A conexão caiu durante o envio.'));
    xhr.send(file);
  });
}

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

export default function ArchivePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { status } = useMemberStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const { promptOpen, setPromptOpen, ensureName, submitName } = useRequireName();

  const [sort, setSort] = useState<SortMode>('recent');
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(searchParams.get('item'));

  const isTrial = status === 'trial';

  const load = useCallback(async () => {
    setLoading(true);
    const buscar = async () => {
      if (sort === 'mine') {
        const { data, error } = await supabase.rpc('archive_my_items' as never);
        if (error) throw error;
        return ((data || []) as any[]).map(r => ({
          ...r, user_id: user?.id, uploader_name: 'Você', liked_by_me: false, first_mime: null,
        })) as FeedItem[];
      }
      const { data, error } = await supabase.rpc('archive_feed' as never, {
        _sort: sort, _category: category, _search: query.trim() || null, _limit: 60, _offset: 0,
      } as never);
      if (error) throw error;
      return (data || []) as FeedItem[];
    };
    try {
      let resultado: FeedItem[];
      try {
        resultado = await buscar();
      } catch (e1: any) {
        // Trial nunca tem acesso — não adianta repetir. Qualquer outra falha
        // (rede/timeout passageiro) ganha uma segunda tentativa antes de avisar.
        if (/assinantes/i.test(String(e1?.message))) throw e1;
        await new Promise(r => setTimeout(r, 800));
        resultado = await buscar();
      }
      setItems(resultado);
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (!/assinantes/i.test(msg)) {
        toast.error('Não foi possível carregar o acervo agora. Verifique sua conexão e tente novamente.');
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [sort, category, query, user?.id]);

  useEffect(() => {
    const t = setTimeout(load, query ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  const openDetail = (id: string) => {
    setDetailId(id);
    setSearchParams({ item: id }, { replace: true });
  };
  const closeDetail = () => {
    setDetailId(null);
    setSearchParams({}, { replace: true });
  };

  if (isTrial) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <FolderUp className="w-10 h-10 text-primary mx-auto mb-4" />
          <h1 className="font-secondary text-2xl font-bold text-foreground mb-2">Acervo Público</h1>
          <p className="text-sm text-muted-foreground mb-6">
            O acervo é exclusivo para assinantes: materiais de estudo compartilhados entre os próprios
            alunos da plataforma. Assine para acessar e contribuir.
          </p>
          <Link to="/checkout" className="inline-flex rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-8 py-3.5 transition-colors">
            Adquirir acesso completo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Acervo Público | OneMed" description="Materiais de estudo compartilhados entre assinantes." path="/membros/acervo" noindex />

      <header className="border-b border-border bg-background-paper sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-3">
          <button onClick={() => navigate('/membros')} title="Voltar" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-secondary text-lg font-bold text-foreground flex items-center gap-2">
              <FolderUp className="w-5 h-5 text-primary" /> Acervo Público
            </h1>
            <p className="text-xs text-muted-foreground truncate">Materiais de estudo compartilhados pelos assinantes</p>
          </div>
          <button
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold px-4 py-2.5 transition-colors shrink-0"
          >
            <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Fazer upload</span><span className="sm:hidden">Upload</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* busca */}
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar no acervo…"
            className="w-full rounded-xl bg-secondary border border-border pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* ordenação */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SORTS.map(s => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                sort === s.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-muted-foreground border-border hover:border-primary/40'
              }`}
            >
              <s.icon className="w-3.5 h-3.5" /> {s.label}
            </button>
          ))}
        </div>

        {/* categorias */}
        {sort !== 'mine' && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCategory(null)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                !category ? 'bg-primary/15 text-primary border-primary/40' : 'bg-secondary text-muted-foreground border-border hover:border-primary/40'
              }`}
            >
              Todas
            </button>
            {CATEGORY_ORDER.map(c => (
              <button
                key={c}
                onClick={() => setCategory(category === c ? null : c)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  category === c ? 'bg-primary/15 text-primary border-primary/40' : 'bg-secondary text-muted-foreground border-border hover:border-primary/40'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* feed */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center">
            <FolderUp className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {sort === 'mine'
                ? 'Você ainda não subiu nenhum material. Clique em "Fazer upload" para compartilhar o primeiro.'
                : 'Nenhum material por aqui ainda. Seja o primeiro a compartilhar!'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => {
              const Icon = mimeIcon(item.first_mime, item.kind);
              return (
                <button
                  key={item.id}
                  onClick={() => openDetail(item.id)}
                  className="rounded-2xl border border-border bg-card hover:border-primary/40 p-5 text-left transition-colors flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground line-clamp-2">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        Upload feito por {item.uploader_name}
                      </p>
                    </div>
                    {!item.is_public && <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" title="Privado" />}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-auto pt-1">
                    <span className="rounded-full bg-secondary border border-border px-2 py-0.5 truncate max-w-[45%]">{item.category}</span>
                    <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {item.views}</span>
                    <span className="inline-flex items-center gap-1"><Heart className={`w-3 h-3 ${item.liked_by_me ? 'fill-primary text-primary' : ''}`} /> {item.like_count}</span>
                    <span className="inline-flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {item.comment_count}</span>
                    {item.file_count > 1 && <span>{item.file_count} arquivos</span>}
                    {Number(item.total_size) > 0 && <span>{fmtSize(item.total_size)}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {uploadOpen && (
        <UploadDialog
          onClose={() => setUploadOpen(false)}
          ensureName={ensureName}
          onDone={() => { setUploadOpen(false); setSort('mine'); load(); }}
        />
      )}

      {detailId && (
        <DetailDialog
          itemId={detailId}
          initialFileId={searchParams.get('file')}
          currentUserId={user?.id || ''}
          onClose={closeDetail}
          onChanged={load}
          ensureName={ensureName}
        />
      )}

      <NameRequiredModal open={promptOpen} onOpenChange={setPromptOpen} onSubmit={submitName} />
    </div>
  );
}

// ─── UPLOAD ──────────────────────────────────────────────────────────────────
function UploadDialog({ onClose, onDone, ensureName }: {
  onClose: () => void; onDone: () => void; ensureName: (action: () => void) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Outros cursos');
  const [isPublic, setIsPublic] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [isFolder, setIsFolder] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; pct: number; current: string }>({ done: 0, total: 0, pct: 0, current: '' });
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  const pick = (list: FileList | null, folder: boolean) => {
    const arr = Array.from(list || []);
    if (!arr.length) return;
    setFiles(arr);
    setIsFolder(folder);
    if (!title) {
      if (folder) {
        const rel = (arr[0] as any).webkitRelativePath as string | undefined;
        setTitle(rel ? rel.split('/')[0] : 'Minha pasta');
      } else {
        setTitle(arr.length === 1 ? arr[0].name.replace(/\.[^.]+$/, '') : `${arr.length} arquivos`);
      }
    }
  };

  const totalSize = useMemo(() => files.reduce((a, f) => a + f.size, 0), [files]);

  // ensureName é callback-style: com nome definido roda a ação na hora; sem
  // nome, abre o modal e roda a ação depois que a pessoa salvar o nome.
  const start = () => {
    if (!files.length) { toast.error('Escolha um arquivo ou uma pasta.'); return; }
    if (!title.trim()) { toast.error('Dê um título ao material.'); return; }
    ensureName(() => { void reallyStart(); });
  };

  const reallyStart = async () => {
    setSending(true);
    setProgress({ done: 0, total: files.length, pct: 0, current: files[0].name });
    let itemId: string | null = null;
    let enviados = 0;
    let falhados = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const rel = (f as any).webkitRelativePath as string | undefined;
        setProgress(p => ({ ...p, current: f.name, pct: 0 }));
        // Um arquivo com problema NÃO derruba a pasta inteira: registra a
        // falha e segue. Uma tentativa extra cobre queda passageira de rede.
        let feito = false;
        for (let tentativa = 0; tentativa < 2 && !feito; tentativa++) {
          try {
            const init = await invokeArchive({
              action: 'init',
              itemId,
              title: title.trim(),
              description: description.trim(),
              category,
              isPublic,
              kind: isFolder || files.length > 1 ? 'folder' : 'file',
              file: { name: f.name, mime: f.type || 'application/octet-stream', size: f.size, path: rel || null },
            });
            itemId = init.itemId;
            await uploadToSession(init.sessionUri, f, pct => setProgress(p => ({ ...p, pct })));
            feito = true;
            enviados++;
          } catch {
            if (tentativa === 1) falhados++;
          }
        }
        setProgress(p => ({ ...p, done: i + 1 }));
      }

      // finalize SEMPRE que o item foi criado — mesmo com falhas parciais ele
      // publica o que subiu (e a tentativa extra cobre um finalize passageiro).
      if (itemId && enviados > 0) {
        let finalizado = false;
        for (let tentativa = 0; tentativa < 2 && !finalizado; tentativa++) {
          try { await invokeArchive({ action: 'finalize', itemId }); finalizado = true; }
          catch { if (tentativa === 0) await new Promise(r => setTimeout(r, 1500)); }
        }
        if (!finalizado) throw new Error('Os arquivos subiram, mas a publicação falhou. Tente publicar de novo.');
      } else {
        throw new Error('Nenhum arquivo pôde ser enviado. Confira sua conexão e tente de novo.');
      }

      if (falhados > 0) {
        toast.warning(`Publicado com ${enviados} de ${files.length} arquivos — ${falhados} falharam. Você pode editar o material e reenviar os que faltaram.`);
      } else {
        toast.success('Material publicado no acervo!');
      }
      onDone();
    } catch (err: any) {
      toast.error(err.message || 'Falha no upload.');
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v && !sending) onClose(); }}>
      <DialogContent className="bg-background-paper border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> Compartilhar no acervo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => fileInput.current?.click()}
              disabled={sending}
              className="rounded-xl border border-dashed border-border hover:border-primary/50 bg-secondary/50 px-4 py-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileIcon className="w-5 h-5 mx-auto mb-1.5 text-primary" /> Arquivos
            </button>
            <button
              onClick={() => folderInput.current?.click()}
              disabled={sending}
              className="rounded-xl border border-dashed border-border hover:border-primary/50 bg-secondary/50 px-4 py-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <FolderOpen className="w-5 h-5 mx-auto mb-1.5 text-primary" /> Pasta completa
            </button>
          </div>
          <input ref={fileInput} type="file" multiple className="hidden" onChange={e => pick(e.target.files, false)} />
          {/* @ts-expect-error webkitdirectory é atributo não tipado */}
          <input ref={folderInput} type="file" webkitdirectory="" className="hidden" onChange={e => pick(e.target.files, true)} />

          {files.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {files.length} arquivo{files.length !== 1 ? 's' : ''} selecionado{files.length !== 1 ? 's' : ''} · {fmtSize(totalSize)}
            </p>
          )}

          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Título</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)} maxLength={200} disabled={sending}
              placeholder="Ex: Resumo completo de Cardiologia"
              className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Detalhes do material</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={4000} disabled={sending}
              placeholder="Conte o que é, de onde veio, pra qual prova serve…"
              className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Categoria</label>
            <select
              value={category} onChange={e => setCategory(e.target.value)} disabled={sending}
              className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50"
            >
              {CATEGORY_ORDER.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3 cursor-pointer">
            <span className="flex items-center gap-2 text-sm text-foreground">
              {isPublic ? <Globe className="w-4 h-4 text-primary" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
              {isPublic ? 'Público — visível para todos os assinantes' : 'Privado — só você vê'}
            </span>
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} disabled={sending} className="accent-[#e11d2e] w-4 h-4" />
          </label>

          {sending && (
            <div className="rounded-xl border border-border bg-secondary/50 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-2 truncate">
                Enviando {progress.done + 1}/{progress.total}: {progress.current}
              </p>
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress.pct}%` }} />
              </div>
            </div>
          )}

          <button
            onClick={start} disabled={sending || !files.length}
            className="w-full rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground font-semibold py-3.5 transition-colors flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {sending ? 'Enviando…' : 'Publicar no acervo'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── DETALHE ─────────────────────────────────────────────────────────────────
function DetailDialog({ itemId, initialFileId, currentUserId, onClose, onChanged, ensureName }: {
  itemId: string; initialFileId?: string | null; currentUserId: string; onClose: () => void; onChanged: () => void;
  ensureName: (action: () => void) => void;
}) {
  const [item, setItem] = useState<FeedItem | null>(null);
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [comments, setComments] = useState<ArchiveComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [playing, setPlaying] = useState<ArchiveFile | null>(null);
  const autoOpened = useRef(false);

  const isOwner = item?.user_id === currentUserId;

  // Abrir = tocar/visualizar DENTRO da plataforma, com o mesmo player das
  // aulas. CADA abertura de arquivo conta uma visualização (qualquer cliente,
  // toda vez) — o .then é obrigatório: o builder do supabase-js é preguiçoso
  // e descartá-lo com `void` nunca envia a requisição (foi por isso que o
  // contador ficou meses em zero).
  const openFile = useCallback((f: ArchiveFile) => {
    setPlaying(f);
    supabase.rpc('archive_register_view' as never, { _item_id: itemId } as never)
      .then(({ data }: { data: unknown }) => {
        if (typeof data === 'number') {
          setItem(prev => prev ? { ...prev, views: data } : prev);
          onChanged();
        }
      });
  }, [itemId, onChanged]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [feedRes, filesRes, commentsRes] = await Promise.all([
        supabase.rpc('archive_feed' as never, { _item_id: itemId, _limit: 1 } as never),
        supabase.from('archive_files' as never).select('*').eq('item_id', itemId).eq('status', 'ready').order('path').order('name'),
        supabase.rpc('archive_comments_feed' as never, { _item_id: itemId } as never),
      ]);
      const row = ((feedRes.data || []) as FeedItem[])[0];
      if (!row) { toast.error('Material não encontrado.'); onClose(); return; }
      setItem(row);
      const fileRows = (filesRes.data || []) as unknown as ArchiveFile[];
      setFiles(fileRows);
      setComments((commentsRes.data || []) as unknown as ArchiveComment[]);
      // Chegou da busca geral apontando um arquivo específico (?file=…):
      // abre o item já tocando/visualizando esse arquivo, uma vez só.
      if (initialFileId && !autoOpened.current) {
        autoOpened.current = true;
        const alvo = fileRows.find(f => f.id === initialFileId);
        if (alvo) openFile(alvo);
      }
    } finally {
      setLoading(false);
    }
  }, [itemId, initialFileId, onClose, openFile]);

  useEffect(() => { load(); }, [load]);

  const toggleLike = async () => {
    if (!item) return;
    const { data, error } = await supabase.rpc('toggle_archive_like' as never, { _item_id: item.id } as never);
    if (error) { toast.error('Não foi possível curtir.'); return; }
    const row = (Array.isArray(data) ? data[0] : data) as { like_count: number; liked: boolean };
    setItem(prev => prev ? { ...prev, like_count: Number(row.like_count), liked_by_me: row.liked } : prev);
    onChanged();
  };

  const sendComment = () => {
    const body = commentText.trim();
    if (!body || !item) return;
    ensureName(() => { void reallySendComment(body); });
  };

  const reallySendComment = async (body: string) => {
    setSendingComment(true);
    try {
      const { error } = await supabase.from('archive_comments' as never)
        .insert({ item_id: item.id, user_id: currentUserId, body } as never);
      if (error) throw error;
      setCommentText('');
      const { data } = await supabase.rpc('archive_comments_feed' as never, { _item_id: item.id } as never);
      setComments((data || []) as unknown as ArchiveComment[]);
      onChanged();
    } catch {
      toast.error('Não foi possível comentar.');
    } finally {
      setSendingComment(false);
    }
  };

  // Link do arquivo do acervo (worker de streaming), do mesmo jeito que a aula.
  // Usado pelo LessonPlayer (reprodução/visualização) e pelo download.
  const resolveArchiveUrl = useCallback(async (fileId: string): Promise<string> => {
    const { url } = await invokeArchive({ action: 'file_token', fileId });
    return url;
  }, []);


  const startEdit = () => {
    if (!item) return;
    setEditTitle(item.title);
    setEditDesc(item.description || '');
    setEditCategory(item.category);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!item) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase.from('archive_items' as never).update({
        title: editTitle.trim() || item.title,
        description: editDesc.trim() || null,
        category: editCategory,
      } as never).eq('id', item.id);
      if (error) throw error;
      setItem(prev => prev ? { ...prev, title: editTitle.trim() || prev.title, description: editDesc.trim() || null, category: editCategory } : prev);
      setEditing(false);
      toast.success('Material atualizado.');
      onChanged();
    } catch {
      toast.error('Não foi possível salvar.');
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleVisibility = async () => {
    if (!item) return;
    const { error } = await supabase.from('archive_items' as never)
      .update({ is_public: !item.is_public } as never).eq('id', item.id);
    if (error) { toast.error('Não foi possível alterar a visibilidade.'); return; }
    setItem(prev => prev ? { ...prev, is_public: !prev.is_public } : prev);
    toast.success(item.is_public ? 'Agora está privado — só você vê.' : 'Agora está público no acervo!');
    onChanged();
  };

  const remove = async () => {
    if (!item) return;
    if (!confirm('Excluir este material do acervo? Os arquivos serão apagados de vez.')) return;
    try {
      await invokeArchive({ action: 'delete', itemId: item.id });
      toast.success('Material excluído.');
      onClose();
      onChanged();
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível excluir.');
    }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="bg-background-paper border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {loading || !item ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            <DialogHeader>
              <DialogTitle className="text-foreground pr-8">{item.title}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Upload feito por <b className="text-foreground">{item.uploader_name}</b> · {new Date(item.created_at).toLocaleDateString('pt-BR')} ·{' '}
                <span className="rounded-full bg-secondary border border-border px-2 py-0.5">{item.category}</span>
              </p>
            </DialogHeader>

            {editing ? (
              <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-4">
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)} maxLength={200}
                  className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50" />
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} maxLength={4000}
                  placeholder="Detalhes do material"
                  className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 resize-none" />
                <select value={editCategory} onChange={e => setEditCategory(e.target.value)}
                  className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none">
                  {CATEGORY_ORDER.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={savingEdit}
                    className="rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold px-4 py-2 transition-colors">
                    {savingEdit ? 'Salvando…' : 'Salvar'}
                  </button>
                  <button onClick={() => setEditing(false)} className="rounded-lg border border-border text-sm text-muted-foreground px-4 py-2">Cancelar</button>
                </div>
              </div>
            ) : item.description ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>
            ) : null}

            {/* ações */}
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={toggleLike}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  item.liked_by_me ? 'bg-primary/15 text-primary border-primary/40' : 'bg-secondary text-muted-foreground border-border hover:border-primary/40'
                }`}>
                <Heart className={`w-4 h-4 ${item.liked_by_me ? 'fill-primary' : ''}`} /> {item.like_count}
              </button>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Eye className="w-3.5 h-3.5" /> {item.views} acessos</span>
              {isOwner && (
                <div className="ml-auto flex items-center gap-1.5">
                  <button onClick={toggleVisibility} title={item.is_public ? 'Tornar privado' : 'Tornar público'}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    {item.is_public ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                  <button onClick={startEdit} title="Editar" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={remove} title="Excluir" className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* arquivos */}
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {files.map(f => {
                const Icon = mimeIcon(f.mime_type);
                return (
                  <button key={f.id} onClick={() => openFile(f)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-secondary text-left transition-colors group">
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{f.path || f.name}</p>
                      <p className="text-[11px] text-muted-foreground">{fmtSize(f.size_bytes)}</p>
                    </div>
                    <span className="p-2 rounded-lg text-muted-foreground group-hover:text-primary transition-colors" title="Abrir na plataforma">
                      <PlayCircle className="w-4 h-4" />
                    </span>
                  </button>
                );
              })}
              {files.length === 0 && (
                <p className="px-4 py-6 text-sm text-muted-foreground text-center">Os arquivos ainda estão sendo processados.</p>
              )}
            </div>

            {/* comentários */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Comentários ({comments.length})</h3>
              <div className="space-y-3 mb-3">
                {comments.map(c => (
                  <div key={c.id} className="rounded-xl bg-secondary/50 border border-border px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      <b className="text-foreground">{c.author_name}</b>
                      {c.is_admin && <span className="ml-1.5 rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-semibold">Equipe OneMed</span>}
                      {' '}· {new Date(c.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{c.body}</p>
                  </div>
                ))}
                {comments.length === 0 && <p className="text-xs text-muted-foreground">Nenhum comentário ainda — seja o primeiro.</p>}
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  value={commentText} onChange={e => setCommentText(e.target.value)} rows={1}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                  placeholder="Comente sobre este material…"
                  className="flex-1 rounded-xl bg-secondary border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none max-h-28"
                />
                <button onClick={sendComment} disabled={sendingComment || !commentText.trim()}
                  className="shrink-0 w-10 h-10 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-40 text-primary-foreground flex items-center justify-center transition-colors">
                  {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Reprodução/visualização com o MESMO player das aulas (vídeo com remux
          TS, PDF com zoom, Office, imagem, áudio). Vai num portal no body pra
          ficar ACIMA do diálogo de detalhe (que também é portalizado). */}
      {playing && createPortal(
        <LessonPlayer
          lesson={fileToLesson(playing)}
          courseTitle={item?.title || 'Acervo Público'}
          onClose={() => setPlaying(null)}
          onProgress={() => { /* acervo não registra progresso de aula */ }}
          resolveUrl={resolveArchiveUrl}
          bypassDownloadGate
        />,
        document.body,
      )}
    </Dialog>
  );
}
