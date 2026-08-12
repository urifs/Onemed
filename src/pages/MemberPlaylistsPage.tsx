import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ListVideo, Plus, Trash2, Pencil, Loader2, Play, FileText, BookOpen, ClipboardList,
  CalendarClock, FolderOpen, GraduationCap, X, Check, StickyNote,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MemberHeader } from '@/components/member/MemberHeader';
import { FlashcardViewer, type FlashcardDeck } from '@/components/member/FlashcardViewer';
import { QuestionBankViewer, type QuestionBank } from '@/components/member/QuestionBankViewer';
import { usePlaylists, type Playlist } from '@/hooks/usePlaylists';
import { setOpenPlaylist } from '@/lib/assistantContext';
import { Seo } from '@/seo/Seo';

interface ResolvedItem {
  id: string;
  item_type: string;
  item_id: string;
  title: string;
  kind: string;
  course_slug: string | null;
  lesson_type: string | null;
  added_at: string;
}

const ICON_BY_KIND: Record<string, typeof Play> = {
  Curso: GraduationCap, Aula: Play, Arquivo: FileText, Flashcards: BookOpen,
  'Banco de questões': ClipboardList, Cronograma: CalendarClock, 'Acervo Público': FolderOpen,
};

export default function MemberPlaylistsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { playlists, loading, invalidate } = usePlaylists();

  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('id'));
  const [items, setItems] = useState<ResolvedItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [criando, setCriando] = useState(false);

  // Anotações da playlist — autosave com debounce.
  const [notes, setNotes] = useState('');
  const notesTimer = useRef<number | null>(null);
  const notesDirty = useRef(false);

  // Viewers inline (flashcards / banco de questões).
  const [fcDeck, setFcDeck] = useState<FlashcardDeck | null>(null);
  const [qbBank, setQbBank] = useState<QuestionBank | null>(null);

  // Seleciona a primeira playlist quando a lista chega e nada está escolhido.
  useEffect(() => {
    if (!selectedId && playlists.length) setSelectedId(playlists[0].id);
  }, [playlists, selectedId]);

  const selected: Playlist | undefined = playlists.find(p => p.id === selectedId);

  // A playlist aberta vira contexto do assistente lateral.
  useEffect(() => {
    setOpenPlaylist(selected ? { id: selected.id, name: selected.name } : null);
    return () => setOpenPlaylist(null);
  }, [selected?.id, selected?.name]);

  const carregarItens = useCallback(async (pid: string) => {
    setItemsLoading(true);
    const { data, error } = await supabase.rpc('playlist_items_resolved' as never, { _playlist_id: pid } as never);
    setItems(error ? [] : ((data as unknown as ResolvedItem[]) || []));
    setItemsLoading(false);
  }, []);

  useEffect(() => {
    if (!selectedId) { setItems([]); return; }
    carregarItens(selectedId);
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('id', selectedId); return n; }, { replace: true });
  }, [selectedId, carregarItens, setSearchParams]);

  // Ao trocar de playlist, carrega as anotações dela.
  useEffect(() => { setNotes(selected?.notes || ''); notesDirty.current = false; }, [selected?.id]);

  const salvarNotes = useCallback(async (pid: string, texto: string) => {
    await supabase.rpc('playlist_set_notes' as never, { _playlist_id: pid, _notes: texto } as never);
    notesDirty.current = false;
  }, []);

  const onNotesChange = (v: string) => {
    setNotes(v);
    notesDirty.current = true;
    if (notesTimer.current) window.clearTimeout(notesTimer.current);
    if (selectedId) notesTimer.current = window.setTimeout(() => salvarNotes(selectedId, v), 1200);
  };
  // Salva o que faltou ao sair.
  useEffect(() => () => {
    if (notesDirty.current && selectedId) salvarNotes(selectedId, notes);
  }, [selectedId, notes, salvarNotes]);

  const criar = async () => {
    const nome = novoNome.trim();
    if (!nome || criando) return;
    setCriando(true);
    try {
      const { data, error } = await supabase.rpc('playlist_create' as never, { _name: nome } as never);
      if (error) throw error;
      setNovoNome('');
      invalidate();
      setSelectedId(data as unknown as string);
      toast.success(`Playlist "${nome}" criada`);
    } catch { toast.error('Não foi possível criar a playlist'); }
    finally { setCriando(false); }
  };

  const renomear = async () => {
    if (!selected) return;
    const nome = window.prompt('Novo nome da playlist:', selected.name)?.trim();
    if (!nome || nome === selected.name) return;
    await supabase.rpc('playlist_rename' as never, { _playlist_id: selected.id, _name: nome } as never);
    invalidate();
    toast.success('Playlist renomeada');
  };

  const excluir = async () => {
    if (!selected || selected.is_default) return;
    if (!window.confirm(`Excluir a playlist "${selected.name}"? Os itens salvos nela serão removidos da playlist (o conteúdo em si continua na plataforma).`)) return;
    await supabase.rpc('playlist_delete' as never, { _playlist_id: selected.id } as never);
    setSelectedId(null);
    invalidate();
    toast.success('Playlist excluída');
  };

  const removerItem = async (it: ResolvedItem) => {
    if (!selectedId) return;
    setItems(prev => prev.filter(x => x.id !== it.id));
    await supabase.rpc('playlist_remove' as never, { _playlist_id: selectedId, _item_type: it.item_type, _item_id: it.item_id } as never);
    invalidate();
  };

  const abrir = async (it: ResolvedItem) => {
    switch (it.item_type) {
      case 'course':
        if (it.course_slug) navigate(`/membros/curso/${it.course_slug}`);
        return;
      case 'lesson':
        // Aula E arquivo abrem na página do curso; a lista de reprodução da
        // playlist é passada para o player encadear o próximo (autoplay).
        if (it.course_slug) {
          const fila = items.filter(x => x.item_type === 'lesson').map(x => x.item_id);
          navigate(`/membros/curso/${it.course_slug}?lesson=${it.item_id}&playlist=${selectedId}&fila=${encodeURIComponent(fila.join(','))}`);
        }
        return;
      case 'archive_item':
        navigate(`/membros/acervo?item=${it.item_id}`);
        return;
      case 'study_plan':
        navigate(`/membros/cronograma?id=${it.item_id}`);
        return;
      case 'flashcard_deck': {
        const { data } = await (supabase as never as any).from('flashcard_decks')
          .select('id, title, difficulty, cards').eq('id', it.item_id).maybeSingle();
        if (data) setFcDeck(data as FlashcardDeck); else toast.error('Baralho não encontrado');
        return;
      }
      case 'question_bank': {
        const { data } = await (supabase as never as any).from('question_banks')
          .select('id, title, difficulty, questions').eq('id', it.item_id).maybeSingle();
        if (data) setQbBank(data as QuestionBank); else toast.error('Banco não encontrado');
        return;
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Minhas playlists | OneMed" description="Suas playlists de estudo na OneMed." path="/membros/playlists" noindex />
      <MemberHeader />

      <main className="shell-wide px-4 md:px-8 py-6">
        <div className="flex items-center gap-2.5 mb-6">
          <ListVideo className="w-6 h-6 text-primary" />
          <div>
            <h1 className="font-secondary text-xl font-bold text-foreground">Minhas playlists</h1>
            <p className="text-sm text-muted-foreground">Seu espaço de estudo: junte cursos, aulas, arquivos, flashcards, questões e cronogramas.</p>
          </div>
        </div>

        <div className="md:flex md:items-start md:gap-6">
          {/* Coluna das playlists */}
          <aside className="md:w-[280px] shrink-0 mb-6 md:mb-0">
            <div className="flex items-center gap-2 mb-3">
              <input
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') criar(); }}
                placeholder="Nova playlist…"
                className="flex-1 min-w-0 rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              <button onClick={criar} disabled={!novoNome.trim() || criando}
                className="shrink-0 p-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground disabled:opacity-40 transition-colors" title="Criar playlist">
                {criando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-1">
                {playlists.map(p => (
                  <button key={p.id} onClick={() => setSelectedId(p.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${selectedId === p.id ? 'bg-primary/15 text-primary' : 'hover:bg-secondary text-foreground'}`}>
                    <ListVideo className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{p.item_count}</span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          {/* Conteúdo da playlist selecionada */}
          <section className="flex-1 min-w-0">
            {!selected ? (
              <div className="text-center py-20 text-muted-foreground">
                <ListVideo className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Selecione uma playlist ou crie uma nova.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-secondary text-lg font-bold text-foreground flex-1 truncate">{selected.name}</h2>
                  <button onClick={renomear} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Renomear"><Pencil className="w-4 h-4" /></button>
                  {!selected.is_default && (
                    <button onClick={excluir} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Excluir playlist"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>

                {/* Anotações */}
                <div className="mb-5 rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                    <StickyNote className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wide">Anotações</span>
                  </div>
                  <textarea
                    value={notes}
                    onChange={e => onNotesChange(e.target.value)}
                    rows={3}
                    placeholder="Escreva suas anotações desta playlist… (salva sozinho)"
                    className="w-full resize-y rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                </div>

                {/* Itens */}
                {itemsLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : items.length === 0 ? (
                  <div className="text-center py-14 text-muted-foreground rounded-xl border border-dashed border-border">
                    <p className="text-sm">Playlist vazia.</p>
                    <p className="text-xs mt-1">Use o botão de salvar (lista) nos cursos, aulas, arquivos, flashcards, questões e cronogramas para adicionar aqui.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map(it => {
                      const Icon = ICON_BY_KIND[it.kind] || FileText;
                      return (
                        <div key={it.id} className="group flex items-center gap-3 rounded-xl border border-border bg-card hover:border-primary/40 px-3 py-2.5 transition-colors">
                          <button onClick={() => abrir(it)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                            <span className="w-9 h-9 rounded-lg bg-secondary group-hover:bg-primary/15 flex items-center justify-center shrink-0 transition-colors">
                              <Icon className="w-4 h-4 text-primary" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-foreground truncate">{it.title}</span>
                              <span className="block text-xs text-muted-foreground">{it.kind}</span>
                            </span>
                          </button>
                          <button onClick={() => removerItem(it)} className="shrink-0 p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors" title="Remover da playlist">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      {fcDeck && <FlashcardViewer deck={fcDeck} onClose={() => setFcDeck(null)} />}
      {qbBank && <QuestionBankViewer bank={qbBank} onClose={() => setQbBank(null)} />}
    </div>
  );
}
