import { useEffect, useMemo, useState } from 'react';
import { X, Save, Check, RotateCcw, Loader2 } from 'lucide-react';

export interface Flashcard {
  front: string;
  back: string;
}

export interface FlashcardDeck {
  title: string;
  difficulty: string;
  cards: Flashcard[];
}

const DIFFICULTY_LABEL: Record<string, string> = {
  basico: 'Básico', intermediario: 'Intermediário', avancado: 'Avançado',
};

// Sessão de estudo no modelo do Anki: a carta mostra a frente, o aluno pensa,
// revela o verso e se autoavalia. "Errei" e "Difícil" reenfileiram a carta
// para reaparecer logo adiante NA MESMA sessão; "Bom" e "Fácil" a dão por
// vista. A sessão termina quando a fila esvazia.
const REQUEUE_AHEAD = { errei: 2, dificil: 5 } as const;

export function FlashcardViewer({ deck, onClose, onSave, saved, saving }: {
  deck: FlashcardDeck;
  onClose: () => void;
  // Ausente quando o baralho já veio da lista de salvos.
  onSave?: () => void;
  saved?: boolean;
  saving?: boolean;
}) {
  // Fila de índices em deck.cards — reenfileirar é reinserir o índice.
  const [queue, setQueue] = useState<number[]>(() => deck.cards.map((_, i) => i));
  const [revealed, setRevealed] = useState(false);
  const [seen, setSeen] = useState(0);
  const [misses, setMisses] = useState(0);

  const current = queue.length > 0 ? deck.cards[queue[0]] : null;
  const total = deck.cards.length;
  // Progresso pelo nº de cartas distintas já resolvidas (fila pode crescer).
  const resolved = useMemo(() => {
    const pendentes = new Set(queue);
    return deck.cards.filter((_, i) => !pendentes.has(i)).length;
  }, [queue, deck.cards]);

  const answer = (kind: 'errei' | 'dificil' | 'bom' | 'facil') => {
    if (!current) return;
    setRevealed(false);
    setSeen(s => s + 1);
    if (kind === 'errei') setMisses(m => m + 1);
    setQueue(q => {
      const [head, ...rest] = q;
      if (kind === 'bom' || kind === 'facil') return rest;
      const pos = Math.min(REQUEUE_AHEAD[kind], rest.length);
      return [...rest.slice(0, pos), head, ...rest.slice(pos)];
    });
  };

  const restart = () => {
    setQueue(deck.cards.map((_, i) => i));
    setRevealed(false);
    setSeen(0);
    setMisses(0);
  };

  // Atalhos do Anki: espaço/Enter revela; 1-4 respondem; Esc fecha.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (!current) return;
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setRevealed(true); return; }
      if (revealed) {
        if (e.key === '1') answer('errei');
        else if (e.key === '2') answer('dificil');
        else if (e.key === '3' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); answer('bom'); }
        else if (e.key === '4') answer('facil');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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
          <button
            onClick={() => !revealed && setRevealed(true)}
            className={`w-full max-w-2xl glass rounded-2xl border border-border p-6 sm:p-10 text-left transition-colors ${revealed ? 'cursor-default' : 'hover:border-primary/40 cursor-pointer'}`}
          >
            <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-3">Pergunta</p>
            <p className="text-lg sm:text-xl font-semibold text-foreground whitespace-pre-wrap leading-relaxed">
              {current.front}
            </p>

            {revealed && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-[11px] uppercase tracking-wider font-bold text-primary mb-3">Resposta</p>
                <p className="text-base sm:text-lg text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {current.back}
                </p>
              </div>
            )}
          </button>

          <div className="mt-6 w-full max-w-2xl">
            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold py-3 rounded-xl transition-colors"
              >
                Mostrar resposta
              </button>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {([
                  ['errei', 'Errei', 'bg-red-600/15 text-red-500 border-red-600/30 hover:bg-red-600/25'],
                  ['dificil', 'Difícil', 'bg-orange-500/15 text-orange-500 border-orange-500/30 hover:bg-orange-500/25'],
                  ['bom', 'Bom', 'bg-accent-success/15 text-accent-success border-accent-success/30 hover:bg-accent-success/25'],
                  ['facil', 'Fácil', 'bg-sky-500/15 text-sky-500 border-sky-500/30 hover:bg-sky-500/25'],
                ] as const).map(([kind, label, cls]) => (
                  <button
                    key={kind}
                    onClick={() => answer(kind)}
                    className={`border font-semibold text-sm py-2.5 rounded-xl transition-colors ${cls}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground text-center mt-3">
              Espaço revela · 1 Errei · 2 Difícil · 3 Bom · 4 Fácil
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-accent-success/15 border border-accent-success/30 flex items-center justify-center mb-4">
            <Check className="w-6 h-6 text-accent-success" />
          </div>
          <h2 className="font-secondary text-xl font-bold text-foreground mb-1">Sessão concluída!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {total} carta{total !== 1 ? 's' : ''} estudada{total !== 1 ? 's' : ''} em {seen} revisão{seen !== 1 ? 'ões' : ''}
            {misses > 0 ? ` · ${misses} erro${misses !== 1 ? 's' : ''} refeito${misses !== 1 ? 's' : ''} até acertar` : ' · nenhum erro'}
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
