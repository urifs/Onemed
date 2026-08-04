import { useEffect, useMemo, useState } from 'react';
import { Layers, ChevronDown, ClipboardList, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTimeSP } from '@/lib/utils';

interface OverviewRow {
  user_id: string;
  email: string;
  name: string | null;
  count: number;      // baralhos ou bancos
  sessions: number;
  answered: number;
  correct: number;
  last_activity: string | null;
}

interface ItemRow {
  id: string;
  user_id: string;
  email: string;
  title: string;
  difficulty: string;
  item_count: number; // cartas ou questões
  is_mcq: boolean | null;
  source: { id: string | null; title: string }[];
  created_at: string;
  sessions: number;
  answered: number;
  correct: number;
  last_studied: string | null;
}

const DIFF_LABEL: Record<string, string> = {
  basico: 'Básico', intermediario: 'Intermediário', avancado: 'Avançado',
};

const pct = (ok: number, total: number) => total > 0 ? Math.round((ok / total) * 100) : null;

const notaCor = (p: number | null) =>
  p === null ? 'text-muted-foreground' : p >= 70 ? 'text-accent-success' : p >= 40 ? 'text-accent-warning' : 'text-red-500';

// As duas abas têm exatamente a mesma estrutura (aluno → itens com desempenho);
// só mudam as RPCs e os rótulos. Os mapeadores normalizam os nomes de campo
// diferentes das duas famílias de RPC pro mesmo shape.
type TabKey = 'flashcards' | 'questions';

const TABS: Record<TabKey, {
  label: string;
  icon: typeof Layers;
  itemNoun: [string, string];        // singular, plural
  unitNoun: [string, string];        // carta/questão
  emptyOverview: string;
  emptyDetail: string;
  loadOverview: () => Promise<OverviewRow[]>;
  loadItems: (userId: string) => Promise<ItemRow[]>;
}> = {
  flashcards: {
    label: 'Flashcards',
    icon: Layers,
    itemNoun: ['baralho', 'baralhos'],
    unitNoun: ['carta', 'cartas'],
    emptyOverview: 'Nenhum aluno gerou flashcards ainda.',
    emptyDetail: 'Nenhum baralho salvo — este aluno estudou baralhos sem salvar.',
    loadOverview: async () => {
      const { data } = await (supabase as any).rpc('admin_flashcard_overview');
      return ((data || []) as any[]).map(r => ({
        user_id: r.user_id, email: r.email, name: r.name,
        count: Number(r.decks), sessions: Number(r.sessions),
        answered: Number(r.cards_answered), correct: Number(r.cards_correct),
        last_activity: r.last_activity,
      }));
    },
    loadItems: async (userId) => {
      const { data } = await (supabase as any).rpc('admin_flashcard_decks', { _user_id: userId });
      return ((data || []) as any[]).map(d => ({
        id: d.id, user_id: d.user_id, email: d.email, title: d.title, difficulty: d.difficulty,
        item_count: Number(d.card_count), is_mcq: d.is_mcq, source: d.source, created_at: d.created_at,
        sessions: Number(d.sessions), answered: Number(d.cards_answered), correct: Number(d.cards_correct),
        last_studied: d.last_studied,
      }));
    },
  },
  questions: {
    label: 'Banco de Questões',
    icon: ClipboardList,
    itemNoun: ['banco', 'bancos'],
    unitNoun: ['questão', 'questões'],
    emptyOverview: 'Nenhum aluno gerou bancos de questões ainda.',
    emptyDetail: 'Nenhum banco salvo — este aluno respondeu provas sem salvar o banco.',
    loadOverview: async () => {
      const { data } = await (supabase as any).rpc('admin_question_banks_overview');
      return ((data || []) as any[]).map(r => ({
        user_id: r.user_id, email: r.email, name: r.name,
        count: Number(r.banks), sessions: Number(r.sessions),
        answered: Number(r.questions_answered), correct: Number(r.questions_correct),
        last_activity: r.last_activity,
      }));
    },
    loadItems: async (userId) => {
      const { data } = await (supabase as any).rpc('admin_question_banks', { _user_id: userId });
      return ((data || []) as any[]).map(b => ({
        id: b.id, user_id: b.user_id, email: b.email, title: b.title, difficulty: b.difficulty,
        item_count: Number(b.question_count), is_mcq: null, source: b.source, created_at: b.created_at,
        sessions: Number(b.sessions), answered: Number(b.questions_answered), correct: Number(b.questions_correct),
        last_studied: b.last_studied,
      }));
    },
  },
};

export default function FlashcardsAdminPage() {
  const [tab, setTab] = useState<TabKey>('flashcards');
  // Estado por aba, pra alternar sem recarregar o que já veio.
  const [overviews, setOverviews] = useState<Partial<Record<TabKey, OverviewRow[]>>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemsByUser, setItemsByUser] = useState<Record<string, ItemRow[]>>({});
  const [loadingItems, setLoadingItems] = useState<string | null>(null);

  const cfg = TABS[tab];
  const overview = overviews[tab] || [];

  useEffect(() => {
    if (overviews[tab]) { setLoading(false); return; }
    setLoading(true);
    TABS[tab].loadOverview().then(rows => {
      setOverviews(prev => ({ ...prev, [tab]: rows }));
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const toggleUser = async (row: OverviewRow) => {
    const key = `${tab}:${row.user_id}`;
    if (expanded === key) { setExpanded(null); return; }
    setExpanded(key);
    if (!itemsByUser[key]) {
      setLoadingItems(key);
      const items = await cfg.loadItems(row.user_id);
      setItemsByUser(prev => ({ ...prev, [key]: items }));
      setLoadingItems(null);
    }
  };

  const totais = useMemo(() => {
    const count = overview.reduce((t, r) => t + r.count, 0);
    const sessions = overview.reduce((t, r) => t + r.sessions, 0);
    const answered = overview.reduce((t, r) => t + r.answered, 0);
    const correct = overview.reduce((t, r) => t + r.correct, 0);
    return { count, sessions, answered, media: pct(correct, answered) };
  }, [overview]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <cfg.icon className="w-6 h-6 text-primary" /> {cfg.label}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === 'flashcards'
              ? 'Baralhos gerados pelos alunos e o desempenho de estudo de cada um.'
              : 'Bancos de questões gerados pelos alunos e o desempenho de prova de cada um.'}
          </p>
        </div>

        {/* abas */}
        <div className="flex gap-2">
          {(Object.keys(TABS) as TabKey[]).map(k => {
            const T = TABS[k];
            return (
              <button
                key={k}
                onClick={() => { setTab(k); setExpanded(null); }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  tab === k
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-background-paper border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <T.icon className="w-4 h-4" /> {T.label}
              </button>
            );
          })}
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
              <p className="text-xs text-muted-foreground">{tab === 'flashcards' ? 'Baralhos salvos' : 'Bancos salvos'}</p>
              <p className="text-2xl font-bold text-foreground">{totais.count}</p>
            </CardContent>
          </Card>
          <Card className="bg-background-paper border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{tab === 'flashcards' ? 'Sessões de estudo' : 'Provas finalizadas'}</p>
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
              <p className="text-sm text-muted-foreground text-center py-10">{cfg.emptyOverview}</p>
            ) : (
              <div className="divide-y divide-border">
                {overview.map(row => {
                  const key = `${tab}:${row.user_id}`;
                  const media = pct(row.correct, row.answered);
                  const aberto = expanded === key;
                  const items = itemsByUser[key] || [];
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
                            {row.count} {row.count !== 1 ? cfg.itemNoun[1] : cfg.itemNoun[0]}
                            {' '}· {row.sessions} {row.sessions === 1 ? (tab === 'flashcards' ? 'sessão' : 'prova') : (tab === 'flashcards' ? 'sessões' : 'provas')}
                            {row.last_activity ? ` · ativo ${formatDateTimeSP(row.last_activity)}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold tabular-nums ${notaCor(media)}`}>
                            {media === null ? 'sem estudo' : `${media}%`}
                          </p>
                          {media !== null && (
                            <p className="text-[10px] text-muted-foreground">
                              {row.correct}/{row.answered} certas
                            </p>
                          )}
                        </div>
                      </button>

                      {aberto && (
                        <div className="bg-secondary/40 border-t border-border px-5 py-3">
                          {loadingItems === key ? (
                            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                          ) : items.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">{cfg.emptyDetail}</p>
                          ) : (
                            <div className="space-y-2">
                              {items.map(d => {
                                const mediaItem = pct(d.correct, d.answered);
                                return (
                                  <div key={d.id} className="rounded-lg bg-background-paper border border-border px-3 py-2.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-medium text-foreground">{d.title}</span>
                                      {d.is_mcq !== null && (
                                        <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-secondary border border-border rounded px-1.5 py-0.5">
                                          {d.is_mcq ? 'Múltipla escolha' : 'Pergunta e resposta'}
                                        </span>
                                      )}
                                      <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-secondary border border-border rounded px-1.5 py-0.5">
                                        {DIFF_LABEL[d.difficulty] || d.difficulty}
                                      </span>
                                      <span className={`ml-auto text-sm font-bold tabular-nums ${notaCor(mediaItem)}`}>
                                        {mediaItem === null ? 'não estudado' : `${mediaItem}%`}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {d.item_count} {d.item_count !== 1 ? cfg.unitNoun[1] : cfg.unitNoun[0]}
                                      {' '}· criado {formatDateTimeSP(d.created_at)}
                                      {d.sessions > 0 && <> · {d.sessions} {d.sessions === 1 ? (tab === 'flashcards' ? 'sessão' : 'prova') : (tab === 'flashcards' ? 'sessões' : 'provas')}</>}
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
