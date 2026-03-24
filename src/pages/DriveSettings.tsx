import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, CheckCircle, AlertCircle, RefreshCw, Folder, Loader2, Search, ChevronDown } from 'lucide-react';

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

function FolderConfig({ driveStatus, onRefresh }: { driveStatus: any; onRefresh: () => void }) {
  const [folderId, setFolderId] = useState(driveStatus?.folder_id || '');
  const [folderName, setFolderName] = useState(driveStatus?.folder_name || '');
  const [saving, setSaving] = useState(false);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [search, setSearch] = useState('');
  const [showList, setShowList] = useState(false);

  const loadFolders = async (q = '') => {
    setLoadingFolders(true);
    const { data, error } = await supabase.functions.invoke('drive-list-folders', { body: { query: q } });
    setLoadingFolders(false);
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao listar pastas');
    } else {
      setFolders(data.folders || []);
      setShowList(true);
    }
  };

  const selectFolder = (f: { id: string; name: string }) => {
    setFolderId(f.id);
    setFolderName(f.name);
    setShowList(false);
    setSearch('');
  };

  const save = async () => {
    if (!folderId.trim()) { toast.error('Selecione ou informe o ID da pasta'); return; }
    setSaving(true);
    try {
      if (!driveStatus?.id) {
        toast.error('Configuração do Drive não encontrada. Reconecte o Drive.');
        return;
      }
      const { error } = await supabase.from('drive_config').update({
        folder_id: folderId.trim(),
        folder_name: folderName || folderId.trim(),
        updated_at: new Date().toISOString(),
      }).eq('id', driveStatus.id);
      if (error) toast.error(error.message);
      else { toast.success('Pasta salva!'); onRefresh(); }
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
        {/* Folder browser */}
        <div>
          <label className="text-sm text-muted-foreground block mb-2">Selecionar pasta do Google Drive</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar pastas..."
                className="w-full h-10 rounded-md border border-border bg-secondary text-foreground pl-9 pr-3 text-sm placeholder:text-muted-foreground"
                onKeyDown={e => e.key === 'Enter' && loadFolders(search)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadFolders(search)}
              disabled={loadingFolders}
              className="border-border text-muted-foreground hover:text-foreground gap-2 h-10 px-4"
            >
              {loadingFolders ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
              {loadingFolders ? 'Carregando...' : 'Listar'}
            </Button>
          </div>

          {/* Folder list */}
          {showList && (
            <div className="mt-2 border border-border rounded-md bg-secondary max-h-48 overflow-y-auto">
              {folders.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3">Nenhuma pasta encontrada</p>
              ) : (
                folders.map(f => (
                  <button
                    key={f.id}
                    onClick={() => selectFolder(f)}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-background text-sm text-foreground transition-colors"
                  >
                    <Folder className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto shrink-0 font-mono">{f.id.slice(0, 8)}…</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected / manual */}
        {folderId && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-background border border-border">
            <Folder className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{folderName || 'Pasta selecionada'}</p>
              <p className="text-xs text-muted-foreground font-mono truncate">{folderId}</p>
            </div>
          </div>
        )}

        <div>
          <label className="text-sm text-muted-foreground block mb-1">Ou cole o ID manualmente</label>
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
