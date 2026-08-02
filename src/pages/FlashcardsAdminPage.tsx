import { useEffect, useMemo, useState } from 'react';
import { Sparkles, ChevronDown, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTimeSP } from '@/lib/utils';

interface OverviewRow {
  user_id: string;
  email: string;
  name: string | null;
  decks: number;
  sessions: number;
  cards_answered: number;
  cards_correct: number;
  last_activity: string | null;
}

interface DeckRow {
  id: string;
  user_id: string;
  email: string;
  title: string;
  difficulty: string;
  card_count: number;
  is_mcq: boolean;
  source: { id: string | null; title: string }[];
  created_at: string;
  sessions: number;
  cards_answered: number;
  cards_correct: number;
  last_studied: string | null;
}

const DIFF_LABEL: Record<string, string> = {
  basico: 'Básico', intermediario: 'Intermediário', avancado: 'Avançado',
};

const pct = (ok: number, total: number) => total > 0 ? Math.round((ok / total) * 100) : null;

const notaCor = (p: number | null) =>
  p === null ? 'text-muted-foreground' : p >= 70 ? 'text-accent-success' : p >= 40 ? 'text-accent-warning' : 'text-red-500';

export default function FlashcardsAdminPage() {
  const [overview, setOverview] = useState<OverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  // Baralhos por aluno, carregados só quando a linha expande.
  const [decksByUser, setDecksByUser] = useState<Record<string, DeckRow[]>>({});
  const [loadingDecks, setLoadingDecks] = useState<string | null>(null);

  useEffect(() => {
    (supabase as any).rpc('admin_flashcard_overview').then(({ data }: { data: unknown }) => {
      setOverview(((data || []) as OverviewRow[]));
      setLoading(false);
    });
  }, []);

  const toggleUser = async (row: OverviewRow) => {
    if (expanded === row.user_id) { setExpanded(null); return; }
    setExpanded(row.user_id);
    if (!decksByUser[row.user_id]) {
      setLoadingDecks(row.user_id);
      const { data } = await (supabase as any).rpc('admin_flashcard_decks', { _user_id: row.user_id });
      setDecksByUser(prev => ({ ...prev, [row.user_id]: ((data || []) as DeckRow[]) }));
      setLoadingDecks(null);
    }
  };

  const totais = useMemo(() => {
    const decks = overview.reduce((t, r) => t + Number(r.decks), 0);
    const sessions = overview.reduce((t, r) => t + Number(r.sessions), 0);
    const answered = overview.reduce((t, r) => t + Number(r.cards_answered), 0);
    const correct = overview.reduce((t, r) => t + Number(r.cards_correct), 0);
    return { decks, sessions, answered, media: pct(correct, answered) };
  }, [overview]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" /> Flashcards
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Baralhos gerados pelos alunos e o desempenho de estudo de cada um.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-background-paper border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Alunos usando</p>
              <p className="text-2xl font-bold text-foreground">{overview.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-background-paper border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Baralhos salvos</p>
              <p className="text-2xl font-bold text-foreground">{totais.decks}</p>
            </CardContent>
          </Card>
          <Card className="bg-background-paper border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Sessões de estudo</p>
              <p className="text-2xl font-bold text-foreground">{totais.sessions}</p>
            </CardContent>
          </Card>
          <Card className="bg-background-paper border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Média geral de acerto</p>
              <p className={`text-2xl font-bold ${notaCor(totais.media)}`}>
                {totais.media === null ? '—' : `${totais.media}%`}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-background-paper border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Alunos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-5 space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-12 bg-secondary rounded animate-pulse" />)}</div>
            ) : overview.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhum aluno gerou flashcards ainda.</p>
            ) : (
              <div className="divide-y divide-border">
                {overview.map(row => {
                  const media = pct(Number(row.cards_correct), Number(row.cards_answered));
                  const aberto = expanded === row.user_id;
                  const decks = decksByUser[row.user_id] || [];
                  return (
                    <div key={row.user_id}>
                      <button
                        onClick={() => toggleUser(row)}
                        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-secondary transition-colors"
                      >
                        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {row.name || row.email}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {row.name ? `${row.email} · ` : ''}
                            {row.decks} baralho{Number(row.decks) !== 1 ? 's' : ''} · {row.sessions} sessõe{Number(row.sessions) !== 1 ? 's' : ''}{Number(row.sessions) === 1 ? ' sessão' : ''}
                            {row.last_activity ? ` · ativo ${formatDateTimeSP(row.last_activity)}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold tabular-nums ${notaCor(media)}`}>
                            {media === null ? 'sem estudo' : `${media}%`}
                          </p>
                          {media !== null && (
                            <p className="text-[10px] text-muted-foreground">
                              {row.cards_correct}/{row.cards_answered} certas
                            </p>
                          )}
                        </div>
                      </button>

                      {aberto && (
                        <div className="bg-secondary/40 border-t border-border px-5 py-3">
                          {loadingDecks === row.user_id ? (
                            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                          ) : decks.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">
                              Nenhum baralho salvo — este aluno estudou baralhos sem salvar.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {decks.map(d => {
                                const mediaDeck = pct(Number(d.cards_correct), Number(d.cards_answered));
                                return (
                                  <div key={d.id} className="rounded-lg bg-background-paper border border-border px-3 py-2.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-medium text-foreground">{d.title}</span>
                                      <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-secondary border border-border rounded px-1.5 py-0.5">
                                        {d.is_mcq ? 'Múltipla escolha' : 'Pergunta e resposta'}
                                      </span>
                                      <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-secondary border border-border rounded px-1.5 py-0.5">
                                        {DIFF_LABEL[d.difficulty] || d.difficulty}
                                      </span>
                                      <span className={`ml-auto text-sm font-bold tabular-nums ${notaCor(mediaDeck)}`}>
                                        {mediaDeck === null ? 'não estudado' : `${mediaDeck}%`}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {d.card_count} carta{d.card_count !== 1 ? 's' : ''}
                                      {' '}· criado {formatDateTimeSP(d.created_at)}
                                      {Number(d.sessions) > 0 && <> · {d.sessions} sessõe{Number(d.sessions) !== 1 ? 's' : ''}{Number(d.sessions) === 1 ? ' sessão' : ''}</>}
                                      {d.last_studied && <> · último estudo {formatDateTimeSP(d.last_studied)}</>}
                                    </p>
                                    {Array.isArray(d.source) && d.source.length > 0 && (
                                      <p className="mt-0.5 text-[11px] text-muted-foreground/80 truncate">
                                        Origem: {d.source.map(sc => sc.title).join(' · ')}
                                      </p>
                                    )}
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
