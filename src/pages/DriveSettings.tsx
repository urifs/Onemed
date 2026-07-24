import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, CheckCircle, AlertCircle, RefreshCw, Folder, Loader2, GraduationCap, Mail, Copy, Download, Search, XCircle } from 'lucide-react';
import { extractFunctionErrorMessage, withTimeout } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

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

  // Handle OAuth callback code
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    if (code) {
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
    } else {
      fetchStatus();
    }
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
    await supabase.from('drive_config').update({
      connected: false,
      access_token: null,
      refresh_token: null,
    }).eq('id', driveStatus.id);
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

        {/* Course Library Sync */}
        {driveStatus?.connected && <SyncCoursesCard />}

        {/* Extract emails with access to a folder */}
        {driveStatus?.connected && <FolderEmailsCard />}

        {/* Info */}
        <Card className="bg-background-paper border-border">
          <CardContent className="p-6">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Como funciona:</p>
              <ol className="space-y-2 list-decimal list-inside">
                <li>Clique em "Conectar Google Drive" e autorize o acesso</li>
                <li>Configure o ID da pasta que será compartilhada</li>
                <li>Quando um usuário solicitar acesso, ele receberá permissão de visualização</li>
                <li>Acesso trial expira automaticamente após 30 minutos</li>
              </ol>
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
}

interface SyncDetail {
  course: string;
  action: 'created' | 'updated' | 'skipped' | 'error';
  message?: string;
  files?: string[];
}

function SyncCoursesCard() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [logs, setLogs] = useState<SyncDetail[]>([]);
  const [barValue, setBarValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!running) {
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
  }, [running]);

  const runSync = async () => {
    cancelRef.current = false;
    setRunning(true);
    setProgress(null);
    setLogs([]);
    let cursor: string | undefined = undefined;
    const totals: SyncProgress = { coursesCreated: 0, coursesResynced: 0, lessonsImported: 0, batches: 0 };
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (cancelRef.current) {
          toast.info('Sincronização cancelada pelo usuário.');
          break;
        }
        const { data, error } = await withTimeout(supabase.functions.invoke('member-sync-library', {
          body: { cursor, batchSize: 1, forceResync: true },
        }), 300000, 'Tempo limite de sincronização excedido (5 minutos)');
        if (error || data?.error) {
          const msg = data?.error || await extractFunctionErrorMessage(error, 'Erro ao sincronizar cursos');
          throw new Error(msg);
        }
        totals.batches += 1;
        totals.coursesCreated += data.coursesCreated || 0;
        totals.coursesResynced += data.coursesResynced || 0;
        totals.lessonsImported += data.lessonsImported || 0;
        setProgress({ ...totals });
        if (data.details && Array.isArray(data.details)) {
          setLogs(prev => [...prev, ...data.details]);
        }
        cursor = data.cursor || undefined;
        if (data.done) break;
      }
      toast.success(`Sincronização concluída: ${totals.coursesCreated} cursos novos, ${totals.coursesResynced} atualizados, ${totals.lessonsImported} aulas importadas.`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao sincronizar cursos');
      setLogs(prev => [...prev, { course: 'Sistema', action: 'error', message: e.message || 'Erro inesperado durante a sincronização.' }]);
    } finally {
      setRunning(false);
    }
  };

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
          Espelha a pasta "Cursos + Livros" do Drive para a área de membros (/membros). Pode rodar quantas vezes
          quiser — cursos e aulas já importados não são duplicados, e conteúdo novo que você adicionar no Drive
          é detectado e importado.
        </p>
        {progress && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {running && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
              <span>
                {progress.coursesCreated} curso{progress.coursesCreated !== 1 ? 's' : ''} novo{progress.coursesCreated !== 1 ? 's' : ''} ·{' '}
                {progress.coursesResynced} atualizado{progress.coursesResynced !== 1 ? 's' : ''} ·{' '}
                {progress.lessonsImported} aulas · lote {progress.batches}
              </span>
            </div>
            {(running || barValue > 0) && (
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
                className="pl-9 bg-[#0a0a0a] border-border"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="bg-[#0a0a0a] border border-border rounded-md p-4 max-h-96 overflow-y-auto space-y-3 font-mono text-xs shadow-inner">
              {logs.filter(log => log.course.toLowerCase().includes(searchTerm.toLowerCase())).map((log, idx) => (
                <div key={idx} className="border-b border-border/20 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={
                        log.action === 'created' ? 'text-green-500 font-bold' :
                        log.action === 'updated' ? 'text-blue-500 font-bold' :
                        log.action === 'error' ? 'text-red-500 font-bold' :
                        'text-yellow-500 font-bold'
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

        <div className="flex gap-3">
          <Button onClick={runSync} disabled={running} className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {running ? 'Sincronizando…' : 'Sincronizar Cursos'}
          </Button>
          {running && (
            <Button onClick={() => cancelRef.current = true} variant="destructive" className="gap-2">
              <XCircle className="w-4 h-4" />
              Cancelar
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
