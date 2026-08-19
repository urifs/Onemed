import { useEffect, useRef, useState } from 'react';
import { ListPlus, Check, Plus, Loader2, ListVideo } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  usePlaylists, playlistsOfItem, addToPlaylist, removeFromPlaylist, createPlaylist,
  type PlaylistItemType,
} from '@/hooks/usePlaylists';

// Botão "Salvar na playlist" — dropdown com as playlists do aluno (check nas
// que já contêm o item) + criar nova. Aparece em cursos, aulas, arquivos,
// acervo público, flashcards, bancos de questões e cronogramas.
export function SaveToPlaylistButton({
  itemType, itemId, variant = 'icon', className = '', stopPropagation = true, label = 'Salvar na playlist',
}: {
  itemType: PlaylistItemType;
  itemId: string;
  variant?: 'icon' | 'button';
  className?: string;
  stopPropagation?: boolean;
  label?: string;
}) {
  const { playlists, loading, invalidate } = usePlaylists();
  const [open, setOpen] = useState(false);
  const [contidas, setContidas] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [novo, setNovo] = useState('');
  const [criando, setCriando] = useState(false);
  // Playlist já criada numa tentativa em que só o save do item falhou — o
  // retry reaproveita o id em vez de criar uma playlist duplicada.
  const criada = useRef<{ nome: string; id: string } | null>(null);

  // Ao abrir, descobre em quais playlists o item já está.
  useEffect(() => {
    if (!open) return;
    let vivo = true;
    setCarregando(true);
    playlistsOfItem(itemType, itemId).then(set => { if (vivo) { setContidas(set); setCarregando(false); } });
    return () => { vivo = false; };
  }, [open, itemType, itemId]);

  const toggle = async (playlistId: string, nome: string) => {
    if (busy) return;
    setBusy(playlistId);
    const jaTem = contidas.has(playlistId);
    try {
      if (jaTem) {
        await removeFromPlaylist(playlistId, itemType, itemId);
        setContidas(prev => { const n = new Set(prev); n.delete(playlistId); return n; });
        toast.success(`Removido de "${nome}"`);
      } else {
        await addToPlaylist(playlistId, itemType, itemId);
        setContidas(prev => new Set(prev).add(playlistId));
        toast.success(`Salvo em "${nome}"`);
      }
      invalidate();
    } catch {
      toast.error('Não foi possível atualizar a playlist');
    } finally {
      setBusy(null);
    }
  };

  const criarESalvar = async () => {
    const nome = novo.trim();
    if (!nome || criando) return;
    setCriando(true);
    try {
      let id = criada.current?.nome === nome ? criada.current.id : null;
      if (!id) {
        id = await createPlaylist(nome);
        criada.current = { nome, id };
        invalidate();
      }
      try {
        await addToPlaylist(id, itemType, itemId);
      } catch {
        // A criação passou; o campo mantém o nome pro retry só refazer o add.
        toast.error(`A playlist "${nome}" foi criada, mas o item não foi salvo nela. Tente de novo.`);
        return;
      }
      criada.current = null;
      setContidas(prev => new Set(prev).add(id));
      setNovo('');
      invalidate();
      toast.success(`Playlist "${nome}" criada e item salvo`);
    } catch {
      toast.error('Não foi possível criar a playlist');
    } finally {
      setCriando(false);
    }
  };

  const gatilho = variant === 'button' ? (
    <button
      onClick={e => { if (stopPropagation) e.stopPropagation(); }}
      className={className || 'inline-flex items-center gap-2 text-sm font-medium rounded-lg border border-border bg-secondary hover:bg-secondary/70 text-foreground px-3 py-2 transition-colors'}
      title={label}
    >
      <ListPlus className="w-4 h-4" /> {label}
    </button>
  ) : (
    <button
      onClick={e => { if (stopPropagation) e.stopPropagation(); }}
      className={className || 'shrink-0 p-1.5 rounded-lg text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors'}
      title={label}
      aria-label={label}
    >
      <ListPlus className="w-4 h-4" />
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{gatilho}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 p-0 bg-background-paper border-border z-[90]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
          <ListVideo className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Salvar em playlist</span>
        </div>

        <div className="max-h-56 overflow-y-auto py-1">
          {(loading || carregando) ? (
            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : playlists.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">Você ainda não tem playlists. Crie a primeira abaixo.</p>
          ) : playlists.map(p => {
            const marcado = contidas.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id, p.name)}
                disabled={busy === p.id}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-secondary/60 transition-colors disabled:opacity-50"
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${marcado ? 'bg-primary border-primary' : 'border-border'}`}>
                  {busy === p.id ? <Loader2 className="w-3 h-3 animate-spin text-primary-foreground" /> : marcado && <Check className="w-3 h-3 text-primary-foreground" />}
                </span>
                <span className="text-sm text-foreground truncate flex-1">{p.name}</span>
                {p.is_default && <span className="text-[10px] text-muted-foreground shrink-0">padrão</span>}
              </button>
            );
          })}
        </div>

        <div className="border-t border-border p-2 flex items-center gap-2">
          <input
            value={novo}
            onChange={e => setNovo(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') criarESalvar(); }}
            placeholder="Nova playlist…"
            className="flex-1 min-w-0 rounded-lg bg-secondary border border-border px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          <button
            onClick={criarESalvar}
            disabled={!novo.trim() || criando}
            className="shrink-0 p-1.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground disabled:opacity-40 transition-colors"
            title="Criar e salvar"
          >
            {criando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
