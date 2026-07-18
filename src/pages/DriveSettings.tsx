import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, CheckCircle, AlertCircle, RefreshCw, Folder, Loader2, GraduationCap } from 'lucide-react';
import { extractFunctionErrorMessage } from '@/lib/utils';

const GOOGLE_CLIENT_ID = '110017470335-2l6er8r451vj5hf3ob05rvolc2p4v9ku.apps.googleusercontent.com';

export default function DriveSettings() {
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [driveStatus, setDriveStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const REDIRECT_URI = `${window.location.origin}/admin/drive`;

  const fetchStatus = async () => {
    setLoading(true);
    const { data } = await supabase.from('drive_config').select('*').single();
    setDriveStatus(data);
    setLoading(false);
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

function SyncCoursesCard() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const runSync = async () => {
    setRunning(true);
    setProgress(null);
    let cursor: string | undefined = undefined;
    const totals: SyncProgress = { coursesCreated: 0, coursesResynced: 0, lessonsImported: 0, batches: 0 };
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase.functions.invoke('member-sync-library', {
          body: { cursor, batchSize: 4, forceResync: true },
        });
        if (error || data?.error) {
          const msg = data?.error || await extractFunctionErrorMessage(error, 'Erro ao sincronizar cursos');
          throw new Error(msg);
        }
        totals.batches += 1;
        totals.coursesCreated += data.coursesCreated || 0;
        totals.coursesResynced += data.coursesResynced || 0;
        totals.lessonsImported += data.lessonsImported || 0;
        setProgress({ ...totals });
        cursor = data.cursor || undefined;
        if (data.done) break;
      }
      toast.success(`Sincronização concluída: ${totals.coursesCreated} cursos novos, ${totals.coursesResynced} atualizados, ${totals.lessonsImported} aulas importadas.`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao sincronizar cursos');
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {running && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
            <span>
              {progress.coursesCreated} curso{progress.coursesCreated !== 1 ? 's' : ''} novo{progress.coursesCreated !== 1 ? 's' : ''} ·{' '}
              {progress.coursesResynced} atualizado{progress.coursesResynced !== 1 ? 's' : ''} ·{' '}
              {progress.lessonsImported} aulas · lote {progress.batches}
            </span>
          </div>
        )}
        <Button onClick={runSync} disabled={running} className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {running ? 'Sincronizando…' : 'Sincronizar Cursos'}
        </Button>
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
