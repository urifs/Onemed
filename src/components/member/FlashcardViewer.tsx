import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { X, Save, Check, RotateCcw, Loader2, ChevronDown } from 'lucide-react';

export interface Flashcard {
  front: string;
  back: string;
  // Presentes só no formato de múltipla escolha.
  options?: string[];
  correct?: number;
  // Explicação por alternativa (mesma ordem de options): por que está certa/errada.
  why?: string[];
}

export interface FlashcardDeck {
  title: string;
  difficulty: string;
  cards: Flashcard[];
}

const DIFFICULTY_LABEL: Record<string, string> = {
  basico: 'Básico', intermediario: 'Intermediário', avancado: 'Avançado',
};

// A sessão é corrida: cada carta aparece UMA vez, acertando ou errando —
// a média final é acertos sobre o total de cartas. Errar não trava nem
// repete a carta; a resposta certa e as justificativas já foram mostradas
// na correção.

export function FlashcardViewer({ deck, deckId, onClose, onSave, saved, saving }: {
  deck: FlashcardDeck;
  // id do baralho salvo — liga a sessão ao baralho nas estatísticas.
  deckId?: string | null;
  onClose: () => void;
  // Ausente quando o baralho já veio da lista de salvos.
  onSave?: () => void;
  saved?: boolean;
  saving?: boolean;
}) {
  const { user } = useAuth();
  // Fila de índices em deck.cards — reenfileirar é reinserir o índice.
  const [queue, setQueue] = useState<number[]>(() => deck.cards.map((_, i) => i));
  const [revealed, setRevealed] = useState(false);
  // Múltipla escolha: alternativa marcada (null = ainda não marcou).
  const [picked, setPicked] = useState<number | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  // Resposta de cada carta (uma só por sessão) — é daqui que sai a média.
  const [firstTry, setFirstTry] = useState<Map<number, boolean>>(new Map());
  const [reviews, setReviews] = useState(0);
  const startedAt = useRef(Date.now());
  const recorded = useRef(false);

  const currentIdx = queue.length > 0 ? queue[0] : null;
  const current = currentIdx !== null ? deck.cards[currentIdx] : null;
  const total = deck.cards.length;
  const isMcq = !!current?.options?.length;

  const resolved = useMemo(() => {
    const pendentes = new Set(queue);
    return deck.cards.filter((_, i) => !pendentes.has(i)).length;
  }, [queue, deck.cards]);

  const advance = (correct: boolean) => {
    if (currentIdx === null) return;
    setReviews(r => r + 1);
    setFirstTry(prev => prev.has(currentIdx) ? prev : new Map(prev).set(currentIdx, correct));
    setRevealed(false);
    setPicked(null);
    setShowWhy(false);
    setQueue(q => q.slice(1));
  };

  const pick = (idx: number) => {
    if (!current || picked !== null) return;
    setPicked(idx);
    setRevealed(true);
  };

  const continueMcq = () => {
    if (!current || picked === null) return;
    advance(picked === current.correct);
  };

  const restart = () => {
    setQueue(deck.cards.map((_, i) => i));
    setRevealed(false);
    setPicked(null);
    setShowWhy(false);
    setFirstTry(new Map());
    setReviews(0);
    startedAt.current = Date.now();
    recorded.current = false;
  };

  // Atalhos: espaço/Enter revela; no avulso 1 Errei / 2 Acertei; na múltipla
  // escolha 1-4 marcam a alternativa e Enter continua; Esc fecha.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (!current) return;
      if (isMcq) {
        if (picked === null && /^[1-4]$/.test(e.key)) {
          const idx = Number(e.key) - 1;
          if (idx < (current.options?.length || 0)) pick(idx);
          return;
        }
        if (picked !== null && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); continueMcq(); }
        return;
      }
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setRevealed(true); return; }
      if (revealed) {
        if (e.key === '1') advance(false);
        else if (e.key === '2' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(true); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const acertosPrimeira = [...firstTry.values()].filter(Boolean).length;
  const notaFinal = total > 0 ? Math.round((acertosPrimeira / total) * 100) : 0;

  // Sessão concluída (fila vazia) → grava no histórico UMA vez. É o que
  // alimenta a média e as estatísticas da aba Flashcards. Melhor esforço:
  // falha de rede não interrompe a tela de resultado.
  useEffect(() => {
    if (current !== null || total === 0 || recorded.current || !user) return;
    recorded.current = true;
    void (supabase as any).from('flashcard_sessions').insert({
      user_id: user.id,
      deck_id: deckId || null,
      deck_title: deck.title,
      total_cards: total,
      correct_first_try: acertosPrimeira,
      reviews,
      duration_seconds: Math.round((Date.now() - startedAt.current) / 1000),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  return (
    <div className="fixed inset-0 z-[90] bg-background flex flex-col">
      {/* topo: salvar à esquerda, título no centro, fechar à direita */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-border">
        {onSave ? (
          <button
            onClick={onSave}
            disabled={saved || saving}
            className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-lg transition-colors ${
              saved
                ? 'text-accent-success bg-accent-success/10 border border-accent-success/25 cursor-default'
                : 'bg-primary hover:bg-primary-hover text-primary-foreground'
            }`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Salvo' : saving ? 'Salvando…' : 'Salvar'}
          </button>
        ) : <span className="w-[88px]" />}

        <div className="flex-1 min-w-0 text-center">
          <p className="text-sm font-semibold text-foreground truncate">{deck.title}</p>
          <p className="text-[11px] text-muted-foreground">
            {DIFFICULTY_LABEL[deck.difficulty] || deck.difficulty} · {resolved}/{total} concluídos
          </p>
        </div>

        <button
          onClick={onClose}
          title="Fechar"
          aria-label="Fechar flashcards"
          className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* barra de progresso */}
      <div className="h-1 bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${total ? (resolved / total) * 100 : 0}%` }}
        />
      </div>

      {current ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-6 overflow-y-auto">
          <div
            onClick={() => !isMcq && !revealed && setRevealed(true)}
            className={`w-full max-w-2xl glass rounded-2xl border border-border p-6 sm:p-8 text-left transition-colors ${!isMcq && !revealed ? 'hover:border-primary/40 cursor-pointer' : ''}`}
          >
            <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-3">Pergunta</p>
            <p className="text-lg sm:text-xl font-semibold text-foreground whitespace-pre-wrap leading-relaxed">
              {current.front}
            </p>

            {isMcq && (
              <div className="mt-5 space-y-2">
                {current.options!.map((opt, idx) => {
                  const letra = String.fromCharCode(65 + idx);
                  const isCorrect = idx === current.correct;
                  const isPicked = idx === picked;
                  const cls = picked === null
                    ? 'bg-secondary border-border hover:border-primary/40 cursor-pointer'
                    : isCorrect
                      ? 'bg-accent-success/15 border-accent-success/50 text-accent-success'
                      : isPicked
                        ? 'bg-red-600/15 border-red-600/50 text-red-500'
                        : 'bg-secondary border-border opacity-50';
                  return (
                    <button
                      key={idx}
                      onClick={() => pick(idx)}
                      disabled={picked !== null}
                      className={`w-full flex items-start gap-3 border rounded-xl px-4 py-3 text-left text-sm transition-colors ${cls}`}
                    >
                      <span className="font-bold shrink-0">{letra})</span>
                      <span className="whitespace-pre-wrap">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {revealed && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className={`text-[11px] uppercase tracking-wider font-bold mb-3 ${isMcq && picked !== current.correct ? 'text-red-500' : 'text-primary'}`}>
                  {isMcq
                    ? (picked === current.correct
                      ? 'Você acertou!'
                      : `Você errou — a correta é a ${String.fromCharCode(65 + (current.correct ?? 0))}`)
                    : 'Resposta'}
                </p>
                <p className="text-base sm:text-lg text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {current.back}
                </p>

                {/* Por que cada uma das OUTRAS alternativas está errada. */}
                {isMcq && current.why && current.why.length > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => setShowWhy(v => !v)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showWhy ? 'rotate-180' : ''}`} />
                      Por que as outras estão erradas?
                    </button>
                    {showWhy && (
                      <div className="mt-2 space-y-2">
                        {current.options!.map((_, idx) => {
                          if (idx === current.correct) return null;
                          return (
                            <div key={idx} className="rounded-lg bg-secondary border border-border px-3 py-2 text-sm">
                              <span className="font-bold text-foreground mr-1">{String.fromCharCode(65 + idx)})</span>
                              <span className="text-muted-foreground">{current.why![idx] || 'Sem justificativa gerada para esta alternativa.'}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 w-full max-w-2xl">
            {isMcq ? (
              picked === null ? (
                <p className="text-[11px] text-muted-foreground text-center">
                  Marque uma alternativa · teclas 1-{current.options!.length}
                </p>
              ) : (
                <button
                  onClick={continueMcq}
                  className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold py-3 rounded-xl transition-colors"
                >
                  Continuar
                </button>
              )
            ) : !revealed ? (
              <>
                <button
                  onClick={() => setRevealed(true)}
                  className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold py-3 rounded-xl transition-colors"
                >
                  Mostrar resposta
                </button>
                <p className="text-[11px] text-muted-foreground text-center mt-3">Espaço revela a resposta</p>
              </>
            ) : (
              <>
                {/* Avulso: o aluno se declara — só Errei/Acertei, é disso que
                    sai a média final. Errar faz a carta voltar pra fila. */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => advance(false)}
                    className="border font-semibold text-sm py-3 rounded-xl transition-colors bg-red-600/15 text-red-500 border-red-600/30 hover:bg-red-600/25"
                  >
                    Errei
                  </button>
                  <button
                    onClick={() => advance(true)}
                    className="border font-semibold text-sm py-3 rounded-xl transition-colors bg-accent-success/15 text-accent-success border-accent-success/30 hover:bg-accent-success/25"
                  >
                    Acertei
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground text-center mt-3">1 Errei · 2 Acertei</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-accent-success/15 border border-accent-success/30 flex items-center justify-center mb-4">
            <Check className="w-6 h-6 text-accent-success" />
          </div>
          <h2 className="font-secondary text-xl font-bold text-foreground mb-1">Sessão concluída!</h2>

          {/* Desempenho pela PRIMEIRA tentativa de cada carta. */}
          <p className={`text-4xl font-bold my-3 ${notaFinal >= 70 ? 'text-accent-success' : notaFinal >= 40 ? 'text-accent-warning' : 'text-red-500'}`}>
            {notaFinal}%
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Você acertou {acertosPrimeira} de {total} carta{total !== 1 ? 's' : ''}.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={restart}
              className="inline-flex items-center gap-2 bg-secondary border border-border hover:bg-secondary/70 text-foreground font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Estudar de novo
            </button>
            <button
              onClick={onClose}
              className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
