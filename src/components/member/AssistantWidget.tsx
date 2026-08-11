import { useEffect, useRef, useState } from 'react';
import { MessageCircleQuestion, X, Send, Loader2, Trash2, BookOpen, ListVideo } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { subscribeOpenLesson, subscribeOpenPlaylist, type OpenLessonRef, type OpenPlaylistRef } from '@/lib/assistantContext';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'onemed_assistant_chat';

const SUGESTOES = [
  'Como gero flashcards de uma aula?',
  'Qual curso você recomenda para estudar ECG?',
  'Como funcionam os downloads no meu plano?',
];

// O assistente responde sem markdown (instruído no servidor), mas se algum
// asterisco escapar, o texto é limpo aqui — nunca mostrar **asteriscos** crus.
function limparTexto(txt: string): string {
  return txt
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$|[.,;:!?])/g, '$1$2')
    .replace(/^#{1,4}\s*/gm, '')
    .replace(/^\s*[*•]\s+/gm, '- ');
}

export function AssistantWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [openLesson, setOpenLessonState] = useState<OpenLessonRef | null>(null);
  const [openPlaylist, setOpenPlaylistState] = useState<OpenPlaylistRef | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => subscribeOpenLesson(setOpenLessonState), []);
  useEffect(() => subscribeOpenPlaylist(setOpenPlaylistState), []);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-30))); } catch { /* cheio */ }
  }, [msgs]);

  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      inputRef.current?.focus();
    }
  }, [open, msgs.length, sending]);

  if (!user) return null;

  const enviar = async (texto?: string) => {
    const pergunta = (texto ?? input).trim();
    if (!pergunta || sending) return;
    setInput('');
    const novas: ChatMsg[] = [...msgs, { role: 'user', content: pergunta }];
    setMsgs(novas);
    setSending(true);
    try {
      // A localização do aluno (aula aberta) só viaja AQUI, na pergunta.
      const { data, error } = await supabase.functions.invoke('member-assistant', {
        body: {
          messages: novas.slice(-12),
          // O servidor anexa o conteúdo do material aberto automaticamente
          // (PDF/imagem inteiros; vídeo/áudio o trecho inicial) — sempre só
          // no momento da pergunta.
          currentLesson: openLesson ? { id: openLesson.id } : undefined,
          // Playlist aberta: o servidor lista os itens (títulos) pra a IA saber
          // do que o aluno está falando quando pergunta sobre "a playlist".
          currentPlaylist: openPlaylist ? { id: openPlaylist.id } : undefined,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setMsgs(prev => [...prev, { role: 'assistant', content: limparTexto(String(data.reply || '')) }]);
    } catch (err: any) {
      const cru = String(err?.message || '');
      const rede = /Failed to send a request|Failed to fetch|NetworkError|aborted/i.test(cru);
      setMsgs(prev => [...prev, {
        role: 'assistant',
        content: rede
          ? 'A conexão falhou no meio da resposta. Confira sua internet e envie de novo.'
          : (cru || 'Não consegui responder agora. Tente novamente em instantes.'),
      }]);
    } finally {
      setSending(false);
    }
  };

  const limpar = () => {
    setMsgs([]);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ok */ }
  };

  return (
    <>
      {/* botão flutuante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Assistente OneMed"
          aria-label="Abrir assistente"
          className="fixed bottom-5 right-5 z-[70] w-13 h-13 p-3.5 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:scale-105"
        >
          <MessageCircleQuestion className="w-6 h-6" />
        </button>
      )}

      {/* painel */}
      {open && (
        <div className="fixed z-[70] bottom-0 right-0 sm:bottom-5 sm:right-5 w-full sm:w-[380px] h-[85vh] sm:h-[560px] sm:max-h-[calc(100vh-40px)] bg-background border border-border sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* topo */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-background-paper">
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <MessageCircleQuestion className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Assistente OneMed</p>
              <p className="text-[11px] text-muted-foreground truncate">
                Tire dúvidas sobre a plataforma e o conteúdo
              </p>
            </div>
            {msgs.length > 0 && (
              <button
                onClick={limpar}
                title="Limpar conversa"
                aria-label="Limpar conversa"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              title="Fechar"
              aria-label="Fechar assistente"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* mensagens */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {msgs.length === 0 && (
              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Oi! Posso indicar cursos e aulas, explicar qualquer função da plataforma e
                  tirar dúvidas sobre o conteúdo que você está estudando.
                </p>
                <div className="space-y-2">
                  {SUGESTOES.map(s => (
                    <button
                      key={s}
                      onClick={() => enviar(s)}
                      className="w-full text-left text-sm text-foreground bg-secondary border border-border rounded-xl px-3.5 py-2.5 hover:border-primary/40 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary border border-border text-foreground rounded-bl-md'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-secondary border border-border rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* material / playlist abertos: o assistente usa como contexto */}
          {(openLesson || openPlaylist) && (
            <div className="px-4 pb-1.5 flex flex-wrap gap-1.5">
              {openLesson && (
                <span
                  title="O assistente lê este material para responder suas perguntas sobre ele"
                  className="inline-flex items-center gap-1.5 max-w-full text-[11px] font-medium rounded-full border px-2.5 py-1 bg-primary/15 border-primary/40 text-primary"
                >
                  <BookOpen className="w-3 h-3 shrink-0" />
                  <span className="truncate">Lendo: {openLesson.title}</span>
                </span>
              )}
              {openPlaylist && (
                <span
                  title="O assistente conhece os itens desta playlist para tirar suas dúvidas"
                  className="inline-flex items-center gap-1.5 max-w-full text-[11px] font-medium rounded-full border px-2.5 py-1 bg-secondary border-border text-muted-foreground"
                >
                  <ListVideo className="w-3 h-3 shrink-0" />
                  <span className="truncate">Playlist: {openPlaylist.name}</span>
                </span>
              )}
            </div>
          )}

          {/* composer */}
          <div className="border-t border-border p-3 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
              }}
              rows={1}
              placeholder="Escreva sua dúvida…"
              spellCheck
              lang="pt-BR"
              className="flex-1 resize-none rounded-xl bg-secondary border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 max-h-28"
            />
            <button
              onClick={() => enviar()}
              disabled={sending || !input.trim()}
              title="Enviar"
              aria-label="Enviar pergunta"
              className="shrink-0 w-10 h-10 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-40 text-primary-foreground flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
