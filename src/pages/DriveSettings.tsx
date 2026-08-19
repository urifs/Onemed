import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, CheckCircle, AlertCircle, RefreshCw, Folder, Loader2, GraduationCap, Mail, Copy, Download, Search, XCircle, Play } from 'lucide-react';
import { extractFunctionErrorMessage, withTimeout, formatDateTimeSP } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { StorageAccountsCard, STORAGE_OAUTH_STATE } from '@/components/admin/StorageAccountsCard';

const GOOGLE_CLIENT_ID = '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com';

export default function DriveSettings() {
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [driveStatus, setDriveStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const REDIRECT_URI = `${window.location.origin}/admin/drive`;

  const fetchStatus = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase.from('drive_config').select('*').single();
      if (error) throw error;
      setDriveStatus(data);
    } catch {
      toast.error('Erro ao carregar status do Drive');
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  // Retorno do OAuth do Google.
  //
  // Duas conexões diferentes voltam para esta MESMA URL: a do Drive de
  // conteúdo (que serve as aulas) e a de uma conta extra só de armazenamento.
  // O `state` é o que as separa — sem essa checagem, conectar uma conta de
  // armazenamento sobrescreveria o Drive de conteúdo e derrubaria o acervo
  // inteiro para os alunos.
  const [storageReloadKey, setStorageReloadKey] = useState(0);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code) { fetchStatus(); return; }

    if (state === STORAGE_OAUTH_STATE) {
      setConnecting(true);
      supabase.functions.invoke('drive-storage-accounts', {
        body: { action: 'connect', code, redirect_uri: REDIRECT_URI },
      }).then(async ({ data, error }) => {
        setConnecting(false);
        navigate('/admin/drive', { replace: true });
        if (error || data?.error) {
          // `functions.invoke` devolve "non-2xx status code" e joga o corpo
          // real em error.context — sem ler dali, o motivo (API do Drive
          // desativada, escopo faltando) nunca aparece na tela.
          const msg = data?.error
            || await extractFunctionErrorMessage(error, 'Erro ao conectar a conta de armazenamento');
          toast.error(msg, { duration: 12000 });
        } else {
          toast.success(`Conta ${data.email} conectada como armazenamento`);
          setStorageReloadKey(k => k + 1);
        }
        fetchStatus();
      });
      return;
    }

    setConnecting(true);
    supabase.functions.invoke('drive-oauth-callback', {
      body: { code, redirect_uri: REDIRECT_URI },
    }).then(({ data, error }) => {
      setConnecting(false);
      navigate('/admin/drive', { replace: true });
      if (error || data?.error) {
        toast.error(data?.error || 'Erro ao conectar Drive');
      } else {
        toast.success('Google Drive conectado com sucesso!');
        fetchStatus();
      }
    });
  }, []);

  const connectDrive = () => {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive',
      access_type: 'offline',
      prompt: 'consent',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  const disconnectDrive = async () => {
    if (!driveStatus?.id) return;
    // Este é o Drive de CONTEÚDO — desconectar apaga os tokens e derruba o
    // streaming de TODAS as aulas para TODOS os alunos, e o Google só devolve
    // o refresh_token numa nova autorização completa. Nunca pode ser um
    // clique só.
    if (!confirm('Desconectar o Google Drive vai DERRUBAR o acervo para TODOS os alunos (nenhuma aula abre até reconectar). Tem certeza?')) return;
    const { error } = await supabase.from('drive_config').update({
      connected: false,
      access_token: null,
      refresh_token: null,
    }).eq('id', driveStatus.id);
    if (error) { toast.error('Erro ao desconectar: ' + error.message); return; }
    toast.success('Drive desconectado');
    fetchStatus();
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-secondary text-3xl font-bold text-foreground">Google Drive</h1>
          <p className="text-muted-foreground mt-1">Configure o acesso ao Google Drive para compartilhar conteúdo</p>
        </div>

        {connecting && (
          <Card className="bg-background-paper border-border">
            <CardContent className="p-6 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-muted-foreground">Conectando ao Google Drive...</span>
            </CardContent>
          </Card>
        )}

        <StorageAccountsCard key={storageReloadKey} />

        {/* Status Card */}
        <Card className="bg-background-paper border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              Status da Conexão
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-destructive text-sm">Não foi possível carregar o status do Drive.</p>
                <Button onClick={fetchStatus} size="sm" variant="outline" className="border-border text-muted-foreground hover:text-foreground gap-2">
                  <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                </Button>
              </div>
            ) : driveStatus?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-accent-success">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Google Drive Conectado</span>
                </div>
                {driveStatus.folder_name && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Folder className="w-4 h-4" />
                    Pasta configurada: <span className="text-foreground font-medium">{driveStatus.folder_name}</span>
                  </div>
                )}
                {!driveStatus.folder_name && (
                  <p className="text-sm text-muted-foreground">Nenhuma pasta configurada. Configure o ID da pasta para compartilhar com usuários.</p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={connectDrive} className="border-border text-muted-foreground hover:text-foreground gap-2">
                    <RefreshCw className="w-4 h-4" /> Reconectar
                  </Button>
                  <Button variant="outline" size="sm" onClick={disconnectDrive} className="border-border text-muted-foreground hover:text-foreground">
                    Desconectar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Drive não conectado</span>
                </div>
                <p className="text-sm text-muted-foreground">Conecte ao Google Drive para compartilhar pastas automaticamente com usuários trial e compradores.</p>
                <Button onClick={connectDrive} disabled={connecting} className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
                  {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
                  Conectar Google Drive
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Folder Config */}
        {driveStatus?.connected && (
          <FolderConfig driveStatus={driveStatus} onRefresh={fetchStatus} />
        )}

        {/* Backup Folder Config (planos Vitalício Plus/Pro) */}
        {driveStatus?.connected && (
          <BackupFolderConfig driveStatus={driveStatus} onRefresh={fetchStatus} />
        )}

        {/* Course Library Sync */}
        {driveStatus?.connected && <SyncCoursesCard />}

        {driveStatus?.connected && <AutoSyncCard />}
        {driveStatus?.connected && <LibraryAuditCard />}

        {/* Backfill missing lesson durations */}
        {driveStatus?.connected && <DurationBackfillCard />}

        {/* Extract emails with access to a folder */}
        {driveStatus?.connected && <FolderEmailsCard />}

        {/* Info */}
        <Card className="bg-background-paper border-border">
          <CardContent className="p-6">
            <div className="space-y-3 text-sm text-muted-foreground">
              {/* Texto atualizado: o trial não compartilha mais pasta do Drive
                  desde 19/07/2026 — hoje o Drive é só o armazenamento da
                  biblioteca, e o aluno assiste dentro da plataforma. */}
              <p className="font-medium text-foreground">Como funciona:</p>
              <ol className="space-y-2 list-decimal list-inside">
                <li>Conecte a conta Google que guarda a biblioteca de cursos</li>
                <li>Escolha a pasta raiz onde os cursos estão organizados</li>
                <li>Use "Sincronizar biblioteca" para importar cursos, módulos e aulas</li>
                <li>O aluno assiste dentro da plataforma — nada é compartilhado com ele no Drive</li>
              </ol>
              <p className="pt-1">
                O teste grátis dá 10 minutos de acesso à área de membros e expira sozinho.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

interface SyncProgress {
  coursesCreated: number;
  coursesResynced: number;
  lessonsImported: number;
  batches: number;
  // Quantas pastas ainda faltam varrer. Vem da fila durável no banco, então é
  // um número real de trabalho restante — não uma estimativa.
  foldersRemaining?: number;
}

interface SyncDetail {
  course: string;
  action: 'created' | 'updated' | 'skipped' | 'error';
  message?: string;
  files?: string[];
}

// Pausa entre chamadas do loop — sem isso ele martela a Edge Function (e o
// Postgres por trás) de volta a volta sem nenhum respiro, o que no plano
// free do Supabase é o suficiente pra derrubar o PostgREST/Auth junto com
// tráfego normal de aluno (ex: lesson_progress) rodando ao mesmo tempo.
const LOOP_DELAY_MS = 2000;
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Uma reimportação completa gera centenas de entradas de log (uma por lote
// processado) — sem limite, isso vira um payload de centenas de KB que chega
// inteiro a cada atualização em tempo real, e a lista renderizada (com os
// "Ver N arquivos" expansíveis) fica cada vez mais pesada de re-renderizar.
// Na prática isso deixou a aba lenta o bastante pra parecer travada num
// curso específico, mesmo com a sincronização de verdade continuando por
// trás sem problema. Mantém só as entradas mais recentes.
const MAX_DISPLAYED_LOGS = 60;

// ─── Conferência da biblioteca ───────────────────────────────────────────────
// A sincronização registra cada pasta varrida e o tamanho de cada arquivo, o
// que permite responder com números a pergunta que importa: "faltou alguma
// coisa?". Um curso só conta como confiável quando não sobrou nenhuma pasta
// pendente nem nenhuma pasta que o Drive recusou a listar.
type LibraryTotals = {
  courses: number; courses_complete: number; courses_incomplete: number;
  courses_crawling: number; courses_pending: number;
  modules: number; folders_done: number; folders_pending: number; folders_error: number;
  lessons: number; lessons_missing: number; total_size_bytes: number;
};

type CourseAudit = {
  course_id: string; title: string; sync_status: string;
  folders_done: number; folders_pending: number; folders_error: number;
  lessons: number; lessons_missing: number; total_size_bytes: number; deep_synced_at: string | null;
};

function formatTB(bytes: number | null | undefined): string {
  const b = Number(bytes || 0);
  if (b >= 1e12) return `${(b / 1e12).toFixed(2)} TB`;
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  return `${(b / 1e6).toFixed(0)} MB`;
}

/**
 * Sincronização automática — o que o cron fez, e quando.
 *
 * Antes de existir, a biblioteca só era varrida quando alguém abria esta
 * página e clicava no botão. Agora o cron cuida disso de madrugada; este card
 * é como se sabe que ele está cuidando. Sem ele, uma sincronização que parasse
 * de funcionar só apareceria quando um aluno reclamasse de um curso faltando.
 */
function AutoSyncCard() {
  const [dados, setDados] = useState<any>(null);
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando');

  const load = async () => {
    setEstado('carregando');
    const { data, error } = await supabase.rpc('library_sync_status' as never);
    if (error || !data) {
      console.error('Estado da sincronização automática indisponível', error);
      setEstado('erro');
      return;
    }
    setDados(data);
    setEstado('pronto');
  };

  useEffect(() => { load(); }, []);

  const st = dados?.state;
  const rodando = st?.status === 'running';
  const ultima = st?.finished_at ? new Date(st.finished_at) : null;
  const resultado = st?.last_result;
  // Uma rodada por dia: passou de 36h sem fechar, alguma coisa não está indo.
  const atrasada = !rodando && (!ultima || Date.now() - ultima.getTime() > 36 * 60 * 60 * 1000);

  return (
    <Card className="bg-background-paper border-border">
      <CardHeader>
        <CardTitle className="text-base font-medium text-foreground flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <RefreshCw className={`w-5 h-5 ${rodando ? 'animate-spin text-primary' : atrasada ? 'text-yellow-500' : 'text-green-500'}`} />
            Sincronização automática
          </span>
          <Button onClick={load} size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground h-8">
            Atualizar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Roda sozinha todo dia de madrugada e importa os cursos novos. O botão
          &quot;Sincronizar biblioteca&quot; acima continua valendo para quando você não quiser esperar.
        </p>

        {estado === 'carregando' && <p className="text-sm text-muted-foreground">Carregando…</p>}

        {estado === 'erro' && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <p className="text-sm text-foreground">Não foi possível ler o estado da sincronização.</p>
            <Button onClick={load} size="sm" variant="outline" className="border-border text-muted-foreground hover:text-foreground">
              Tentar novamente
            </Button>
          </div>
        )}

        {estado === 'pronto' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: 'Estado',
                  value: rodando ? 'Varrendo agora' : atrasada ? 'Atrasada' : 'Em dia',
                  sub: rodando ? `${st?.slices || 0} etapas nesta rodada` : ultima ? formatDateTimeSP(st.finished_at) : 'nunca rodou',
                },
                { label: 'Cursos ativos', value: String(dados.courses_active ?? '—'), sub: `${dados.courses_total ?? '—'} no total` },
                {
                  label: 'Última rodada',
                  value: resultado ? `+${resultado.courses_created || 0}` : '—',
                  sub: resultado ? `${(resultado.lessons_imported || 0).toLocaleString('pt-BR')} arquivos novos` : 'sem rodada concluída',
                },
                {
                  label: 'Fila',
                  value: String(dados.queue_pending ?? 0),
                  sub: (dados.queue_error ?? 0) > 0 ? `${dados.queue_error} pasta(s) com erro` : 'nenhuma pasta com erro',
                },
              ].map(m => (
                <div key={m.label} className="rounded-lg bg-secondary/50 border border-border px-3 py-2">
                  <p className="text-xs text-muted-foreground truncate">{m.label}</p>
                  <p className="font-secondary text-lg font-bold text-foreground">{m.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.sub}</p>
                </div>
              ))}
            </div>

            {st?.last_error && (
              <p className="text-sm text-yellow-500 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Última falha: {st.last_error}</span>
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LibraryAuditCard() {
  const [totals, setTotals] = useState<LibraryTotals | null>(null);
  const [problems, setProblems] = useState<CourseAudit[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [totalsRes, reportRes] = await Promise.all([
        supabase.rpc('get_library_totals' as never),
        supabase.rpc('get_library_sync_report' as never),
      ]);
      if (totalsRes.error) throw totalsRes.error;
      setTotals(totalsRes.data as unknown as LibraryTotals);
      const rows = ((reportRes.data || []) as unknown as CourseAudit[])
        .filter(r => r.sync_status !== 'complete' || r.folders_error > 0);
      setProblems(rows);
    } catch {
      toast.error('Erro ao carregar a conferência da biblioteca');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const allGood = !!totals && totals.folders_pending === 0 && totals.folders_error === 0 && problems.length === 0;

  return (
    <Card className="bg-background-paper border-border">
      <CardHeader>
        <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
          <CheckCircle className={`w-5 h-5 ${allGood ? 'text-green-500' : 'text-yellow-500'}`} />
          Conferência da Biblioteca
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Prova de que nada ficou de fora: a varredura registra cada pasta visitada e o tamanho de cada arquivo.
          Compare os números abaixo com os do Google Drive — precisam bater.
        </p>

        {totals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Cursos', value: `${totals.courses}`, sub: `${totals.courses_complete} conferidos` },
              { label: 'Pastas varridas', value: totals.folders_done.toLocaleString('pt-BR'), sub: totals.folders_pending ? `${totals.folders_pending} na fila` : 'nenhuma pendente' },
              { label: 'Arquivos', value: totals.lessons.toLocaleString('pt-BR'), sub: totals.lessons_missing ? `${totals.lessons_missing} sumiram do Drive` : 'todos presentes' },
              { label: 'Tamanho total', value: formatTB(totals.total_size_bytes), sub: `${totals.modules.toLocaleString('pt-BR')} módulos` },
            ].map(s => (
              <div key={s.label} className="bg-secondary border border-border rounded-md p-3">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-lg font-semibold text-foreground">{s.value}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {totals && (
          allGood ? (
            <div className="flex items-start gap-2 text-sm text-green-600 dark:text-green-500 bg-green-500/10 border border-green-500/25 rounded-md p-3">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Nenhuma pasta ficou pendente ou com erro — todos os {totals.courses} cursos foram varridos até o último nível.</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm text-yellow-700 dark:text-yellow-500 bg-yellow-500/10 border border-yellow-500/25 rounded-md p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {totals.folders_pending > 0 && `${totals.folders_pending} pasta(s) ainda na fila de varredura. `}
                {totals.folders_error > 0 && `${totals.folders_error} pasta(s) que o Drive recusou a listar. `}
                Rode a sincronização com "Reimportar tudo" para fechar o que falta.
              </span>
            </div>
          )
        )}

        {problems.length > 0 && (
          <div className="bg-secondary border border-border rounded-md p-3 max-h-72 overflow-y-auto space-y-2 text-xs font-mono">
            {problems.map(p => (
              <div key={p.course_id} className="border-b border-border/20 pb-2 last:border-0 last:pb-0">
                <div className="text-foreground font-medium truncate" title={p.title}>{p.title}</div>
                <div className="text-muted-foreground">
                  {p.lessons.toLocaleString('pt-BR')} arquivos · {p.folders_done.toLocaleString('pt-BR')} pastas
                  {p.folders_pending > 0 && ` · ${p.folders_pending} na fila`}
                  {p.folders_error > 0 && ` · ${p.folders_error} com erro`}
                  {p.lessons_missing > 0 && ` · ${p.lessons_missing} sumiram do Drive`}
                </div>
              </div>
            ))}
          </div>
        )}

        <Button onClick={load} disabled={loading} variant="outline" className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Atualizar conferência
        </Button>
      </CardContent>
    </Card>
  );
}

function SyncCoursesCard() {
  const [activeJob, setActiveJob] = useState<any>(null);
  const [logs, setLogs] = useState<SyncDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barValue, setBarValue] = useState(0);
  const [forceResync, setForceResync] = useState(false);

  // We use refs to keep track of the loop state without triggering re-renders in the loop itself
  const cancelRef = useRef(false);
  const isRunningLoopRef = useRef(false);
  const activeJobIdRef = useRef<string | null>(null);

  // 1. Initial fetch & Realtime subscription
  useEffect(() => {
    const fetchLatestJob = async () => {
      const { data, error } = await supabase
        .from('sync_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching sync_jobs:', error);
      } else if (data) {
        setActiveJob(data);
        if (data.logs) setLogs(data.logs.slice(-MAX_DISPLAYED_LOGS));
        activeJobIdRef.current = data.id;
        cancelRef.current = data.cancel_requested;
      }
    };

    fetchLatestJob();

    const channel = supabase.channel('sync_jobs_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sync_jobs' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedJob = payload.new as any;
            if (!activeJobIdRef.current || updatedJob.id === activeJobIdRef.current || updatedJob.created_at > (activeJob?.created_at || '')) {
              setActiveJob(updatedJob);
              if (updatedJob.logs) setLogs(updatedJob.logs.slice(-MAX_DISPLAYED_LOGS));
              activeJobIdRef.current = updatedJob.id;
              cancelRef.current = updatedJob.cancel_requested;
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 2. Progress bar animation
  useEffect(() => {
    if (activeJob?.status !== 'running') {
      if (barValue > 0 && barValue < 100) {
        setBarValue(100);
        setTimeout(() => setBarValue(0), 1000);
      }
      return;
    }
    setBarValue(5);
    const interval = setInterval(() => {
      setBarValue(v => (v >= 90 ? v : v + (90 - v) * 0.1));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeJob?.status]);

  // 3. The Sync Loop
  const startSyncLoop = async (jobId: string, doForceResync: boolean, initialCursor?: string, initialProgress?: SyncProgress, initialLogs?: SyncDetail[]) => {
    if (isRunningLoopRef.current) return;
    isRunningLoopRef.current = true;
    cancelRef.current = false;

    let cursor = initialCursor;
    let currentProgress: SyncProgress = initialProgress || { coursesCreated: 0, coursesResynced: 0, lessonsImported: 0, batches: 0 };
    let currentLogs: SyncDetail[] = initialLogs || [];

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (cancelRef.current) {
          await supabase.from('sync_jobs').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', jobId);
          toast.info('Sincronização cancelada pelo usuário.');
          break;
        }

        // Invoke edge function — com retry automático pra blips passageiros
        // de rede (ex: "Failed to send a request to the Edge Function"),
        // que não deveriam exigir intervenção manual pra continuar.
        let data: any, error: any;
        const RETRY_DELAYS_MS = [2000, 5000, 10000];
        for (let attempt = 0; ; attempt++) {
          ({ data, error } = await withTimeout(supabase.functions.invoke('member-sync-library', {
            body: { cursor, batchSize: 25, forceResync: doForceResync },
          }), 300000, 'Tempo limite de sincronização excedido (5 minutos)'));
          if (!error && !data?.error) break;
          if (attempt >= RETRY_DELAYS_MS.length || cancelRef.current) break;
          await sleep(RETRY_DELAYS_MS[attempt]);
        }

        if (error || data?.error) {
          const msg = data?.error || await extractFunctionErrorMessage(error, 'Erro ao sincronizar cursos');
          currentLogs = [...currentLogs, { course: 'Sistema', action: 'error', message: msg }].slice(-MAX_DISPLAYED_LOGS);
          await supabase.from('sync_jobs').update({
            status: 'failed',
            progress: { ...currentProgress, cursor },
            logs: currentLogs,
            updated_at: new Date().toISOString()
          }).eq('id', jobId);
          throw new Error(msg);
        }

        // Update progress
        currentProgress.batches += 1;
        currentProgress.coursesCreated += data.coursesCreated || 0;
        currentProgress.coursesResynced += data.coursesResynced || 0;
        currentProgress.lessonsImported += data.lessonsImported || 0;
        currentProgress.foldersRemaining = data.foldersRemaining;
        cursor = data.cursor || undefined;

        if (data.details && Array.isArray(data.details)) {
          // Só mantém as entradas mais recentes — ver comentário em
          // MAX_DISPLAYED_LOGS. O histórico completo de uma reimportação
          // completa não cabe (nem precisa) trafegar inteiro a cada
          // atualização em tempo real.
          currentLogs = [...currentLogs, ...data.details].slice(-MAX_DISPLAYED_LOGS);
        }

        if (data.done) {
          await supabase.from('sync_jobs').update({
            status: 'completed',
            progress: { ...currentProgress, cursor },
            logs: currentLogs,
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          }).eq('id', jobId);
          toast.success(`Sincronização concluída: ${currentProgress.coursesCreated} cursos novos, ${currentProgress.coursesResynced} atualizados.`);
          break;
        } else {
          // Update DB with intermediate progress
          await supabase.from('sync_jobs').update({
            progress: { ...currentProgress, cursor },
            logs: currentLogs,
            updated_at: new Date().toISOString()
          }).eq('id', jobId);
          // Respira antes da próxima chamada — ver comentário em LOOP_DELAY_MS.
          await sleep(LOOP_DELAY_MS);
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao sincronizar cursos');
    } finally {
      isRunningLoopRef.current = false;
    }
  };

  const runSyncNew = async () => {
    // Duas sincronizações rodando ao mesmo tempo (ex: duas abas abertas)
    // dobram a carga no banco à toa — bloqueia se já existir uma ativa.
    const { data: existingRunning } = await supabase
      .from('sync_jobs')
      .select('id, updated_at')
      .eq('status', 'running')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingRunning && (Date.now() - new Date(existingRunning.updated_at).getTime()) < 90000) {
      toast.error('Já existe uma sincronização em andamento (em outra aba ou dispositivo). Aguarde ela terminar ou cancele antes de iniciar uma nova.');
      return;
    }

    // Existe progresso retomável (job travado/com erro que ainda pode ser
    // continuado) — começar do zero descartaria esse progresso, então
    // confirma antes.
    if (canResume && !window.confirm('Já existe uma sincronização interrompida com progresso salvo. Iniciar uma nova vai IGNORAR esse progresso (ele fica perdido, não retomável depois). Prefira "Retomar Sincronização". Iniciar mesmo assim uma nova?')) {
      return;
    }

    // Create new job
    const { data, error } = await supabase.from('sync_jobs').insert({
      status: 'running',
      progress: { coursesCreated: 0, coursesResynced: 0, lessonsImported: 0, batches: 0, cursor: null },
      logs: [],
      force_resync: forceResync,
    }).select().single();

    if (error || !data) {
      toast.error('Erro ao iniciar sincronização');
      return;
    }

    setActiveJob(data);
    activeJobIdRef.current = data.id;
    setLogs([]);
    startSyncLoop(data.id, forceResync);
  };

  const resumeSync = async () => {
    if (!activeJob) return;
    const initialCursor = activeJob.progress?.cursor;
    const initialProgress = activeJob.progress;
    const initialLogs = (activeJob.logs || []).slice(-MAX_DISPLAYED_LOGS);
    // O job "lembra" com que modo foi iniciado — não usar o estado local do
    // checkbox aqui, que volta pro padrão (desmarcado) a cada carregamento
    // de página e faria "Retomar" silenciosamente parar de forçar reimportação.
    const jobForceResync = !!activeJob.force_resync;

    // Mark as running again
    await supabase.from('sync_jobs').update({ status: 'running', cancel_requested: false, updated_at: new Date().toISOString() }).eq('id', activeJob.id);
    startSyncLoop(activeJob.id, jobForceResync, initialCursor, initialProgress, initialLogs);
  };

  const requestCancel = async () => {
    if (!activeJob) return;
    cancelRef.current = true; // For local abort if we are the ones running it

    // Se o loop não está rodando NESTA aba (ex: quem estava sincronizando
    // fechou/recarregou a aba, ou você está vendo de outro dispositivo),
    // só sinalizar cancel_requested não resolve nada — não existe mais
    // ninguém rodando o loop pra perceber o pedido e finalizar o job, e
    // ele fica preso em "Cancelando..." pra sempre. Nesse caso, cancela
    // direto.
    if (!isRunningLoopRef.current) {
      await supabase.from('sync_jobs').update({
        status: 'cancelled',
        cancel_requested: true,
        updated_at: new Date().toISOString(),
      }).eq('id', activeJob.id);
      toast.info('Sincronização cancelada.');
      return;
    }

    await supabase.from('sync_jobs').update({ cancel_requested: true }).eq('id', activeJob.id);
    toast.info('Solicitando cancelamento...');
  };

  const isRunning = activeJob?.status === 'running';
  const progress = activeJob?.progress;

  // Check if job is likely interrupted (no updates for 90 seconds)
  const isInterrupted = isRunning && activeJob?.updated_at && (new Date().getTime() - new Date(activeJob.updated_at).getTime() > 90000);

  // "Retomar" sempre deve existir enquanto houver progresso salvo pra
  // continuar de onde parou — não importa se parou por travar (running
  // parado há muito tempo) ou por erro explícito (failed, ex: blip de rede
  // que esgotou as tentativas automáticas). Sem isso, qualquer falha força
  // recomeçar do zero uma reimportação que pode levar horas.
  const canResume = !!activeJob && (activeJob.status === 'failed' || isInterrupted) && !!activeJob.progress?.cursor;

  return (
    <Card className="bg-background-paper border-border">
      <CardHeader>
        <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          Biblioteca de Cursos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Espelha a pasta "Cursos + Livros" do Drive para a área de membros (/membros). Por padrão, só importa
          pastas/cursos que ainda não existem no banco — muito mais rápido e leve. Cursos e aulas já importados
          não são duplicados. O progresso é salvo para que você possa acompanhar de qualquer dispositivo.
        </p>

        {!isRunning && (
          <label className="flex items-start gap-2.5 text-sm text-muted-foreground cursor-pointer select-none">
            <Checkbox checked={forceResync} onCheckedChange={(v) => setForceResync(!!v)} className="mt-0.5" />
            <span>
              Reimportar tudo (verifica cursos já importados em busca de arquivos novos/atualizados) — deixa a
              sincronização bem mais pesada e demorada, use só quando adicionar conteúdo dentro de um curso que já existe.
            </span>
          </label>
        )}

        {activeJob && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isRunning && !isInterrupted && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
              {activeJob.status === 'completed' && <GraduationCap className="w-4 h-4 text-green-500 shrink-0" />}
              {activeJob.status === 'failed' && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
              {activeJob.status === 'cancelled' && <XCircle className="w-4 h-4 text-yellow-500 shrink-0" />}
              
              <span>
                {activeJob.status === 'completed' ? 'Sincronização Finalizada' : 
                 activeJob.status === 'failed' ? 'Falha na Sincronização' :
                 activeJob.status === 'cancelled' ? 'Sincronização Cancelada' :
                 isInterrupted ? 'Sincronização Interrompida' :
                 'Sincronizando...'} 
                {' '}
                {progress ? `(${progress.coursesCreated || 0} novos · ${progress.coursesResynced || 0} atualizados · ${progress.lessonsImported || 0} aulas${
                  progress.foldersRemaining ? ` · ${progress.foldersRemaining.toLocaleString('pt-BR')} pastas na fila` : ''
                })` : ''}
                {activeJob.force_resync && (isRunning || isInterrupted) && (
                  <span className="ml-2 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/25 rounded-full px-2 py-0.5">
                    Reimportação completa
                  </span>
                )}
              </span>
            </div>
            {(isRunning || barValue > 0) && !isInterrupted && (
              <Progress value={barValue} className="h-2" />
            )}
          </div>
        )}

        {logs.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar em cursos sincronizados..."
                className="pl-9 bg-secondary border-border"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="bg-secondary border border-border rounded-md p-4 max-h-96 overflow-y-auto space-y-3 font-mono text-xs shadow-inner">
              {logs.filter(log => log.course.toLowerCase().includes(searchTerm.toLowerCase())).map((log, idx) => (
                <div key={idx} className="border-b border-border/20 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={
                        log.action === 'created' ? 'text-green-600 dark:text-green-500 font-bold' :
                        log.action === 'updated' ? 'text-blue-600 dark:text-blue-500 font-bold' :
                        log.action === 'error' ? 'text-red-600 dark:text-red-500 font-bold' :
                        'text-yellow-600 dark:text-yellow-500 font-bold'
                      }>
                        [{log.action.toUpperCase()}]
                      </span>
                      <span className="text-foreground ml-2 font-medium">{log.course}</span>
                    </div>
                  </div>
                  {log.message && <div className="text-muted-foreground mt-1 ml-1">{log.message}</div>}
                  {log.files && log.files.length > 0 && (
                    <details className="mt-2 ml-1">
                      <summary className="text-muted-foreground cursor-pointer hover:text-foreground inline-flex items-center select-none">
                        <Folder className="w-3.5 h-3.5 mr-1.5 inline" />
                        Ver {log.files.length} arquivos
                      </summary>
                      <div className="mt-2 pl-4 border-l border-border/50 max-h-32 overflow-y-auto space-y-1">
                        {log.files.slice(0, 100).map((f, i) => (
                          <div key={i} className="text-muted-foreground truncate" title={f}>- {f}</div>
                        ))}
                        {log.files.length > 100 && (
                          <div className="text-muted-foreground italic mt-1">+ {log.files.length - 100} outros arquivos ocultados...</div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-4">
          <Button onClick={runSyncNew} disabled={isRunning && !isInterrupted} className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
            {isRunning && !isInterrupted ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {activeJob ? 'Iniciar Nova Sincronização' : 'Sincronizar Cursos'}
          </Button>
          
          {canResume && (
            <Button onClick={resumeSync} variant="outline" className="gap-2">
              <Play className="w-4 h-4" />
              Retomar Sincronização
            </Button>
          )}

          {isRunning && !activeJob?.cancel_requested && (
            <Button onClick={requestCancel} variant="destructive" className="gap-2">
              <XCircle className="w-4 h-4" />
              Cancelar
            </Button>
          )}
          
          {isRunning && activeJob?.cancel_requested && (
             <Button disabled variant="secondary" className="gap-2 opacity-70">
               <Loader2 className="w-4 h-4 animate-spin" />
               Cancelando...
             </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Sem cursor/offset — cada chamada devolve só as aulas ainda não checadas, e
// o próprio ato de checá-las (mesmo sem sucesso) as tira do lote seguinte, ver
// admin-backfill-lesson-durations. Isso também torna o "retomar depois de
// fechar a aba" trivial: não há estado nenhum pra restaurar, só clicar nesse
// botão de novo continua exatamente de onde parou.
function DurationBackfillCard() {
  const [running, setRunning] = useState(false);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [totalUpdated, setTotalUpdated] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const cancelRef = useRef(false);

  const fetchRemaining = async () => {
    const { count } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'video')
      .is('duration_seconds', null)
      .is('duration_checked_at', null);
    setRemaining(count ?? 0);
  };

  useEffect(() => { fetchRemaining(); }, []);

  const run = async () => {
    setRunning(true);
    cancelRef.current = false;
    setTotalProcessed(0);
    setTotalUpdated(0);
    const RETRY_DELAYS_MS = [2000, 5000, 10000];
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (cancelRef.current) { toast.info('Preenchimento interrompido.'); break; }

        let data: any, error: any;
        for (let attempt = 0; ; attempt++) {
          ({ data, error } = await withTimeout(supabase.functions.invoke('admin-backfill-lesson-durations', { body: {} }), 60000, 'preenchimento de durações'));
          if (!error && !data?.error) break;
          if (attempt >= RETRY_DELAYS_MS.length || cancelRef.current) break;
          await sleep(RETRY_DELAYS_MS[attempt]);
        }

        if (error || data?.error) {
          toast.error('Erro ao preencher durações: ' + (data?.error || await extractFunctionErrorMessage(error, 'desconhecido')));
          break;
        }

        setTotalProcessed(p => p + data.processed);
        setTotalUpdated(u => u + data.updated);

        if (data.done) {
          toast.success('Durações preenchidas — todas as aulas foram checadas.');
          break;
        }
        await sleep(500);
      }
    } finally {
      setRunning(false);
      fetchRemaining();
    }
  };

  return (
    <Card className="bg-background-paper border-border">
      <CardHeader>
        <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-primary" />
          Preencher Duração das Aulas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          O Google Drive às vezes ainda não tinha terminado de processar o vídeo no momento da sincronização, e a
          aula fica sem o tempo de duração exibido pro aluno. Isso consulta o Drive de novo pra cada aula sem duração
          e preenche o que estiver disponível agora.
        </p>
        {remaining !== null && (
          <p className="text-sm text-foreground">
            {remaining === 0 ? 'Nenhuma aula pendente.' : <>Aulas ainda sem duração: <span className="font-semibold">{remaining}</span></>}
          </p>
        )}
        {running && (
          <p className="text-sm text-muted-foreground">
            Processadas: {totalProcessed} — Atualizadas com sucesso: {totalUpdated}
          </p>
        )}
        <div className="flex gap-2">
          {!running ? (
            <Button onClick={run} disabled={remaining === 0} className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
              <Play className="w-4 h-4" /> Preencher durações faltando
            </Button>
          ) : (
            <Button onClick={() => { cancelRef.current = true; }} variant="outline" className="border-border text-muted-foreground hover:text-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Parar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FolderEmailsCard() {
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [emails, setEmails] = useState<string[]>([]);

  const extract = async () => {
    if (!link.trim()) { toast.error('Cole o link (ou ID) da pasta'); return; }
    setLoading(true);
    setFolderName(null);
    setEmails([]);
    try {
      const { data, error } = await supabase.functions.invoke('drive-folder-permissions', { body: { link: link.trim() } });
      if (error || data?.error) {
        const msg = data?.error || await extractFunctionErrorMessage(error, 'Erro ao extrair emails');
        throw new Error(msg);
      }
      setFolderName(data.folderName);
      setEmails(data.emails || []);
      if ((data.emails || []).length === 0) toast.warning('Nenhum email com acesso encontrado nessa pasta');
      else toast.success(`${data.emails.length} email(s) encontrado(s)`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao extrair emails');
    } finally {
      setLoading(false);
    }
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(emails.join('\n'));
    toast.success('Emails copiados para a área de transferência');
  };

  const downloadTxt = () => {
    const blob = new Blob([emails.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emails-${(folderName || 'pasta').replace(/[^\w-]+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="bg-background-paper border-border">
      <CardHeader>
        <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Extrair Emails de uma Pasta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Cole o link (ou ID) de qualquer pasta do Drive conectado e liste todos os emails que têm acesso a ela —
          útil pra recuperar quem foi compartilhado manualmente antes da plataforma existir.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Input
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/..."
            className="flex-1 min-w-64 bg-secondary border-border text-foreground"
          />
          <Button onClick={extract} disabled={loading} className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {loading ? 'Extraindo...' : 'Extrair Emails'}
          </Button>
        </div>

        {folderName && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-foreground">
                <span className="font-medium">{folderName}</span>
                <span className="text-muted-foreground"> · {emails.length} email{emails.length !== 1 ? 's' : ''}</span>
              </p>
              {emails.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyAll} className="border-border text-foreground hover:bg-secondary gap-1.5">
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadTxt} className="border-border text-foreground hover:bg-secondary gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Baixar .txt
                  </Button>
                </div>
              )}
            </div>
            {emails.length > 0 && (
              <Textarea
                readOnly
                value={emails.join('\n')}
                rows={10}
                className="bg-secondary border-border text-foreground font-mono text-xs"
                onFocus={e => e.currentTarget.select()}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function FolderConfig({ driveStatus, onRefresh }: { driveStatus: any; onRefresh: () => void }) {
  const [folderId, setFolderId] = useState(driveStatus?.folder_id || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!folderId.trim()) { toast.error('Informe o ID da pasta'); return; }
    if (!driveStatus?.id) { toast.error('Drive não conectado. Reconecte o Drive.'); return; }
    setSaving(true);
    try {
      // Lê token da sessão diretamente do localStorage para evitar hang do cliente Supabase
      const storageKey = `sb-${SUPABASE_URL.match(/\/\/([^.]+)/)?.[1]}-auth-token`;
      const raw = localStorage.getItem(storageKey);
      const token = raw ? (JSON.parse(raw)?.access_token ?? SUPABASE_KEY) : SUPABASE_KEY;

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/drive_config?id=eq.${driveStatus.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ folder_id: folderId.trim(), folder_name: folderId.trim() }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message || `Erro ${res.status}`);
      } else {
        toast.success('Pasta salva!');
        onRefresh();
      }
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar pasta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-background-paper border-border">
      <CardHeader>
        <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
          <Folder className="w-5 h-5 text-primary" />
          Configurar Pasta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground block mb-1">ID da pasta do Google Drive</label>
          <input
            value={folderId}
            onChange={e => setFolderId(e.target.value)}
            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
            className="w-full h-10 rounded-md border border-border bg-secondary text-foreground px-3 text-sm placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground mt-1">URL: drive.google.com/drive/folders/<strong>ID</strong></p>
        </div>

        <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Salvar Pasta
        </Button>
      </CardContent>
    </Card>
  );
}

// Pasta separada da principal — compartilhada só com quem tem plano
// Vitalício Plus/Pro, via drive-share-folder com folderType: 'backup'.
// Precisa conter uma cópia de tudo que a plataforma oferece (o compartilhar
// em si é automático no momento da compra; manter o CONTEÚDO da pasta em
// dia é responsabilidade manual do admin, igual à pasta principal).
function BackupFolderConfig({ driveStatus, onRefresh }: { driveStatus: any; onRefresh: () => void }) {
  const [folderId, setFolderId] = useState(driveStatus?.backup_folder_id || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!folderId.trim()) { toast.error('Informe o ID da pasta'); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('drive-save-folder', {
        body: { folder_id: folderId.trim(), target: 'backup' },
      });
      if (error || data?.error) {
        const msg = data?.error || await extractFunctionErrorMessage(error, 'Erro ao salvar pasta de backup');
        throw new Error(msg);
      }
      toast.success('Pasta de backup salva!');
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar pasta de backup');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-background-paper border-border">
      <CardHeader>
        <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
          <Folder className="w-5 h-5 text-primary" />
          Pasta de Backup (Vitalício Plus/Pro)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Pasta separada da pasta principal — é compartilhada automaticamente (permissão de leitura) com quem
          compra o plano Vitalício Plus ou Pro, pra servir de backup de tudo com download liberado. Mantenha o
          conteúdo dela atualizado manualmente.
        </p>
        {driveStatus?.backup_folder_name && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Folder className="w-4 h-4" />
            Pasta atual: <span className="text-foreground font-medium">{driveStatus.backup_folder_name}</span>
          </div>
        )}
        <div>
          <label className="text-sm text-muted-foreground block mb-1">ID da pasta de backup do Google Drive</label>
          <input
            value={folderId}
            onChange={e => setFolderId(e.target.value)}
            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
            className="w-full h-10 rounded-md border border-border bg-secondary text-foreground px-3 text-sm placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground mt-1">URL: drive.google.com/drive/folders/<strong>ID</strong></p>
        </div>

        <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Salvar Pasta de Backup
        </Button>
      </CardContent>
    </Card>
  );
}
