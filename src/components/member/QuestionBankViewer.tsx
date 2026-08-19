import { useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { X, Save, Check, RotateCcw, Loader2, ChevronDown, ClipboardList, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { exportQuestionBankPdf } from '@/lib/questionBankPdf';

export interface BankQuestion {
  front: string;
  back: string;
  options?: string[];
  correct?: number;
  why?: string[];
  // Figura da questão (data URI extraída do PDF de origem) — ECG, radiografia,
  // foto clínica. Exibida acima do enunciado.
  image?: string;
}

export interface QuestionBank {
  title: string;
  difficulty: string;
  questions: BankQuestion[];
}

const DIFFICULTY_LABEL: Record<string, string> = {
  basico: 'Básico', intermediario: 'Intermediário', avancado: 'Avançado',
};

const notaCor = (p: number) => p >= 70 ? 'text-accent-success' : p >= 40 ? 'text-accent-warning' : 'text-red-500';

// Prova corrida: o aluno rola a lista marcando as alternativas e corrige no
// final — diferente dos flashcards, aqui NADA é revelado durante a prova. O
// gabarito comentado (por que a certa é certa e por que cada errada é errada)
// abre por questão, num dropdown, depois da correção.
export function QuestionBankViewer({ bank, bankId, onClose, onSave, saved, saving }: {
  bank: QuestionBank;
  bankId?: string | null;
  onClose: () => void;
  onSave?: () => void;
  saved?: boolean;
  saving?: boolean;
}) {

  // Fechar um baralho/banco RECÉM-GERADO que ainda não foi salvo joga fora
  // minutos de geração e uma vaga do limite diário de IA — e o Esc é fácil de
  // apertar sem querer. Só pergunta quando há mesmo o que perder (onSave
  // existe e ainda não salvou).
  const fechar = () => {
    if (onSave && !saved && !window.confirm('Fechar sem salvar? Este material foi gerado agora e será perdido.')) return;
    onClose();
  };

  const { user } = useAuth();
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [exporting, setExporting] = useState(false);

  const baixarPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportQuestionBankPdf(bank);
    } catch {
      toast.error('Não foi possível gerar o PDF');
    } finally {
      setExporting(false);
    }
  };
  const [finished, setFinished] = useState(false);
  const [openGabarito, setOpenGabarito] = useState<Set<number>>(new Set());
  const startedAt = useRef(Date.now());
  const recorded = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const total = bank.questions.length;
  const respondidas = answers.size;
  const acertos = useMemo(
    () => [...answers.entries()].filter(([i, a]) => a === bank.questions[i].correct).length,
    [answers, bank.questions],
  );
  const nota = total > 0 ? Math.round((acertos / total) * 100) : 0;

  const marcar = (qIdx: number, opt: number) => {
    if (finished) return;
    setAnswers(prev => new Map(prev).set(qIdx, opt));
  };

  const finalizar = () => {
    if (respondidas < total && !confirm(`Você respondeu ${respondidas} de ${total} questões. Corrigir mesmo assim? As não respondidas contam como erro.`)) return;
    setFinished(true);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    if (!recorded.current && user) {
      recorded.current = true;
      // O .then é obrigatório: o builder do supabase-js é preguiçoso — com
      // `void` puro a requisição nunca era enviada e NENHUMA prova foi
      // gravada em produção até 2026-08-05.
      (supabase as any).from('question_sessions').insert({
        user_id: user.id,
        bank_id: bankId || null,
        bank_title: bank.title,
        total_questions: total,
        correct: acertos,
        duration_seconds: Math.round((Date.now() - startedAt.current) / 1000),
      }).then(({ error }: { error: unknown }) => {
        if (error) console.error('question_sessions insert', error);
      });
    }
  };

  const refazer = () => {
    setAnswers(new Map());
    setFinished(false);
    setOpenGabarito(new Set());
    startedAt.current = Date.now();
    recorded.current = false;
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const toggleGabarito = (i: number) => setOpenGabarito(prev => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  return (
    <div className="fixed inset-0 z-[90] bg-background flex flex-col">
      {/* topo */}
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

        <button
          onClick={baixarPdf}
          disabled={exporting}
          title="Baixar em PDF (questões + gabarito comentado)"
          aria-label="Baixar em PDF"
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground hover:bg-secondary/70 transition-colors"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          <span className="hidden sm:inline">PDF</span>
        </button>

        <div className="flex-1 min-w-0 text-center">
          <p className="text-sm font-semibold text-foreground truncate">{bank.title}</p>
          <p className="text-[11px] text-muted-foreground">
            {DIFFICULTY_LABEL[bank.difficulty] || bank.difficulty}
            {' '}· {finished ? `nota ${nota}%` : `${respondidas}/${total} respondidas`}
          </p>
        </div>

        <button
          onClick={fechar}
          title="Fechar"
          aria-label="Fechar banco de questões"
          className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="h-1 bg-secondary">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${total ? (respondidas / total) * 100 : 0}%` }} />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="shell-read px-4 sm:px-6 py-6 space-y-5">
          {/* resultado no topo, depois de corrigir */}
          {finished && (
            <div className="glass rounded-2xl border border-border p-6 text-center">
              <p className={`text-5xl font-bold ${notaCor(nota)}`}>{nota}%</p>
              <p className="text-sm text-muted-foreground mt-2">
                Você acertou {acertos} de {total} questõe{total !== 1 ? 's' : ''}
                {respondidas < total ? ` (${total - respondidas} em branco)` : ''}.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Abra o "Gabarito comentado" de cada questão para ver o porquê de cada alternativa.
              </p>
              <button
                onClick={refazer}
                className="mt-4 inline-flex items-center gap-2 bg-secondary border border-border hover:bg-secondary/70 text-foreground font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Refazer prova
              </button>
            </div>
          )}

          {bank.questions.map((q, qIdx) => {
            const marcada = answers.get(qIdx);
            const acertou = finished && marcada === q.correct;
            const errou = finished && marcada !== undefined && marcada !== q.correct;
            return (
              <div
                key={qIdx}
                className={`glass rounded-2xl border p-5 sm:p-6 ${
                  finished
                    ? acertou ? 'border-accent-success/40' : 'border-red-600/40'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-xs font-bold text-muted-foreground bg-secondary border border-border rounded px-1.5 py-0.5 shrink-0 mt-0.5">
                    {qIdx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {q.image && (
                      <img
                        src={q.image}
                        alt="Figura da questão"
                        draggable={false}
                        className="max-h-80 max-w-full rounded-lg border border-border bg-white mb-3"
                      />
                    )}
                    <p className="text-[15px] font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                      {q.front}
                    </p>
                  </div>
                  {finished && (
                    <span className={`ml-auto shrink-0 text-xs font-bold ${acertou ? 'text-accent-success' : 'text-red-500'}`}>
                      {acertou ? 'Acertou' : marcada === undefined ? 'Em branco' : 'Errou'}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {(q.options || []).map((opt, oIdx) => {
                    const letra = String.fromCharCode(65 + oIdx);
                    const isMarcada = marcada === oIdx;
                    const isCorreta = oIdx === q.correct;
                    let cls = 'bg-secondary border-border hover:border-primary/40 cursor-pointer';
                    if (!finished && isMarcada) cls = 'bg-primary/15 border-primary/50 text-primary cursor-pointer';
                    if (finished) {
                      cls = isCorreta
                        ? 'bg-accent-success/15 border-accent-success/50 text-accent-success'
                        : isMarcada
                          ? 'bg-red-600/15 border-red-600/50 text-red-500'
                          : 'bg-secondary border-border opacity-60';
                    }
                    return (
                      <button
                        key={oIdx}
                        onClick={() => marcar(qIdx, oIdx)}
                        disabled={finished}
                        className={`w-full flex items-start gap-3 border rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${cls}`}
                      >
                        <span className="font-bold shrink-0">{letra})</span>
                        <span className="whitespace-pre-wrap">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* gabarito comentado — só depois da correção, em dropdown */}
                {finished && (
                  <div className="mt-3">
                    <button
                      onClick={() => toggleGabarito(qIdx)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openGabarito.has(qIdx) ? 'rotate-180' : ''}`} />
                      Gabarito comentado
                    </button>
                    {openGabarito.has(qIdx) && (
                      <div className="mt-2 space-y-2">
                        <div className="rounded-lg bg-accent-success/10 border border-accent-success/25 px-3 py-2 text-sm">
                          <span className="font-bold text-accent-success mr-1">
                            {String.fromCharCode(65 + (q.correct ?? 0))}) Correta —
                          </span>
                          <span className="text-foreground/90">{q.back}</span>
                        </div>
                        {(q.options || []).map((_, oIdx) => {
                          if (oIdx === q.correct) return null;
                          return (
                            <div key={oIdx} className="rounded-lg bg-secondary border border-border px-3 py-2 text-sm">
                              <span className="font-bold text-foreground mr-1">{String.fromCharCode(65 + oIdx)})</span>
                              <span className="text-muted-foreground">{q.why?.[oIdx] || 'Sem justificativa gerada para esta alternativa.'}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!finished && (
            <div className="sticky bottom-4">
              <button
                onClick={finalizar}
                disabled={respondidas === 0}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-40 text-primary-foreground font-semibold py-3.5 rounded-xl shadow-xl transition-colors"
              >
                <ClipboardList className="w-4 h-4" />
                Corrigir prova ({respondidas}/{total})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
