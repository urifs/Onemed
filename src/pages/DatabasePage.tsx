import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, AlertTriangle, RefreshCw, DownloadCloud, Loader2, Activity } from 'lucide-react';
import { EgressChart } from '@/components/EgressChart';

interface BackupCursor {
  orderedTables: string[];
  tableIndex: number;
  offset: number;
}

const BACKUP_RETRY_DELAYS_MS = [2000, 4000, 8000, 15000, 30000];
const BACKUP_MAX_RETRIES = BACKUP_RETRY_DELAYS_MS.length;
const BACKUP_MAX_CHUNKS = 5000; // trava de segurança contra loop infinito por bug — ~230 mil linhas / 2000 por página cabem tranquilamente

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function DatabasePage() {
  const { session } = useAuth();
  const [tables, setTables] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState<{ table: string; tableIndex: number; totalTables: number; linesCount: number } | null>(null);

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [accesses, buyers, coupons, visits, trials] = await Promise.all([
        supabase.from('accesses').select('id', { count: 'exact', head: true }),
        supabase.from('buyers').select('id', { count: 'exact', head: true }),
        supabase.from('coupons').select('id', { count: 'exact', head: true }),
        supabase.from('visits').select('id', { count: 'exact', head: true }),
        supabase.from('accesses').select('id', { count: 'exact', head: true }).eq('access_type', 'trial'),
      ]);
      const results = [accesses, buyers, coupons, visits, trials];
      const firstError = results.find(r => r.error)?.error;
      if (firstError) throw firstError;

      setTables({
        'accesses': accesses.count || 0,
        'buyers': buyers.count || 0,
        'coupons': coupons.count || 0,
        'visits': visits.count || 0,
        'trials': trials.count || 0,
      });
    } catch {
      toast.error('Erro ao carregar estatísticas do banco');
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  // Backup paginado: cada chamada à function devolve só uma página de uma
  // tabela (até 2000 linhas) em vez de tentar exportar o banco inteiro numa
  // única resposta HTTP de longa duração — isso é o que antes estourava o
  // tempo de execução da function no meio da maior tabela e devolvia um
  // arquivo cortado. Aqui o loop e o retry por página ficam no cliente: se
  // uma página falhar (rede instável), só ela é refeita — o progresso
  // acumulado nunca se perde, então o backup final é sempre completo.
  const downloadBackup = async () => {
    if (!session?.access_token) { toast.error('Sessão expirada, faça login novamente'); return; }
    setBackingUp(true);
    setBackupProgress(null);
    try {
      const chunks: string[] = [];
      let cursor: BackupCursor | null = null;
      let done = false;
      let attempt = 0;
      let iterations = 0;

      while (!done) {
        iterations++;
        if (iterations > BACKUP_MAX_CHUNKS) throw new Error('Backup excedeu o número máximo de páginas esperado — algo está errado.');

        try {
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-database-backup`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cursor }),
          });
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(text || `Erro ${res.status}`);
          }
          const json = await res.json();
          for (const line of json.lines as string[]) chunks.push(line + '\n');
          cursor = json.cursor;
          done = json.done;
          attempt = 0;
          setBackupProgress({
            table: json.table || 'estrutura das tabelas',
            tableIndex: json.tableIndex ?? 0,
            totalTables: json.totalTables ?? 0,
            linesCount: chunks.length,
          });
        } catch (chunkErr: any) {
          attempt++;
          if (attempt > BACKUP_MAX_RETRIES) throw chunkErr;
          await sleep(BACKUP_RETRY_DELAYS_MS[attempt - 1]);
        }
      }

      // Última linha da última página é sempre o marcador "done" com
      // complete:true (o servidor garante isso) — confere mesmo assim como
      // segunda camada de defesa antes de oferecer o download.
      const lastLine = chunks[chunks.length - 1];
      let complete = false;
      try {
        const parsed = JSON.parse(lastLine);
        complete = parsed?.type === 'done' && parsed?.complete === true;
      } catch { /* linha final não é JSON válido — trata como incompleto */ }

      const blob = new Blob(chunks, { type: 'application/x-ndjson' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `onemed-backup-${new Date().toISOString().slice(0, 10)}.ndjson`;
      a.click();
      URL.revokeObjectURL(url);

      if (complete) {
        toast.success('Backup baixado com sucesso — todas as tabelas exportadas.');
      } else {
        toast.warning('Backup baixado, mas o marcador de conclusão não veio como esperado. Confira o arquivo antes de confiar nele.', { duration: 10000 });
      }
    } catch (err: any) {
      toast.error('Erro ao gerar backup: ' + (err?.message || 'desconhecido'));
    } finally {
      setBackingUp(false);
      setBackupProgress(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-secondary text-3xl font-bold text-foreground">Database</h1>
          <p className="text-muted-foreground mt-1">Visão geral do banco de dados</p>
        </div>

        {/* Backup completo */}
        <Card className="bg-background-paper border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
              <DownloadCloud className="w-4 h-4 text-primary" /> Backup Completo do Banco
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Baixa um arquivo com TODOS os dados de TODAS as tabelas (formato NDJSON — uma linha JSON por registro),
              útil caso precise migrar para outro banco no futuro. A estrutura das tabelas (RLS, triggers, funções) já
              está versionada no código-fonte em <code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">supabase/migrations/</code>;
              este arquivo cobre os dados em si.
            </p>
            <Button onClick={downloadBackup} disabled={backingUp} className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
              {backingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
              {backingUp ? 'Gerando backup...' : 'Baixar Backup Completo'}
            </Button>
            {backupProgress && (
              <p className="text-xs text-muted-foreground font-mono">
                Tabela {Math.min(backupProgress.tableIndex + 1, backupProgress.totalTables)}/{backupProgress.totalTables} — {backupProgress.table} · {backupProgress.linesCount.toLocaleString('pt-BR')} linhas exportadas
              </p>
            )}
          </CardContent>
        </Card>

        {/* Egress diário */}
        <Card className="bg-background-paper border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Egress Diário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EgressChart />
          </CardContent>
        </Card>

        {loadError && !loading ? (
          <Card className="bg-background-paper border-border">
            <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
              <AlertTriangle className="w-6 h-6 text-accent-warning" />
              <p className="text-foreground text-sm font-medium">Não foi possível carregar as estatísticas</p>
              <Button onClick={fetchCounts} size="sm" variant="outline" className="border-border text-muted-foreground hover:text-foreground gap-2">
                <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(tables).map(([table, count]) => (
              <Card key={table} className="bg-background-paper border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <Database className="w-4 h-4 text-primary" />
                    <span className="font-secondary text-2xl font-bold text-foreground">{loading ? '—' : count}</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">{table}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="bg-background-paper border-border">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">Tabelas do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {[
                { name: 'accesses', desc: 'Todos os acessos (trial e pagos)' },
                { name: 'buyers', desc: 'Compradores e pagamentos' },
                { name: 'coupons', desc: 'Cupons de desconto' },
                { name: 'visits', desc: 'Visitas ao site (analytics)' },
                { name: 'drive_config', desc: 'Configuração do Google Drive' },
                { name: 'user_roles', desc: 'Roles de administradores' },
              ].map(t => (
                <div key={t.name} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <span className="font-mono text-foreground">{t.name}</span>
                  <span className="text-muted-foreground">{t.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
