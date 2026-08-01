import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { HardDrive, Loader2, Plus, RefreshCw, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatFileSize, extractFunctionErrorMessage } from '@/lib/utils';

/**
 * Marca no endereço que o retorno do Google é de uma conta de ARMAZENAMENTO.
 *
 * Sem isso, o código que o Google devolve cairia no fluxo da conexão de
 * conteúdo e SOBRESCREVERIA o Drive que serve as aulas hoje — que é
 * exatamente o que não pode acontecer. O `state` do OAuth existe para isso e
 * volta intacto na URL.
 */
export const STORAGE_OAUTH_STATE = 'onemed_storage_account';

export interface StorageAccount {
  id: string;
  email: string;
  label: string | null;
  connected: boolean;
  storage_limit_bytes: number | null;
  storage_usage_bytes: number | null;
  folder_id: string | null;
  folder_name: string | null;
  erro?: string;
}

/**
 * O `client_id` vem do servidor, não embutido aqui: o fluxo de armazenamento
 * pode usar um client OAuth diferente do de conteúdo, e assim trocá-lo é só
 * mexer nos secrets, sem republicar o site. (client_id é público — ele
 * aparece na própria URL de autorização do Google.)
 */
export async function startStorageOAuth() {
  const { data, error } = await supabase.functions.invoke('drive-storage-accounts', {
    body: { action: 'config' },
  });
  if (error || !data?.clientId) {
    toast.error('Não foi possível iniciar a conexão com o Google.');
    return;
  }
  const params = new URLSearchParams({
    client_id: data.clientId,
    redirect_uri: `${window.location.origin}/admin/drive`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive',
    access_type: 'offline',
    // Sem `consent` o Google não devolve refresh_token quando a conta já
    // autorizou antes — e sem refresh_token a conta para de funcionar em uma
    // hora, no meio de uma cópia.
    prompt: 'consent',
    state: STORAGE_OAUTH_STATE,
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Contas de Drive usadas só como ESPAÇO — separadas da conta que serve o
 * conteúdo. Existem porque o Google limita o download diário por arquivo em
 * arquivo que a conta não possui: copiar para uma conta nossa remove o
 * limite, mas a conta de conteúdo está sem espaço.
 */
export function StorageAccountsCard() {
  const [accounts, setAccounts] = useState<StorageAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  // Qual app do Google o botão vai usar.
  //
  // Mostrado na tela porque o NOME do app não serve para identificá-lo: os
  // dois projetos (conteúdo e armazenamento) foram nomeados
  // "onemedcursos.com.br", então a tela de permissão do Google fica idêntica
  // nos dois casos. O client_id é o único identificador confiável.
  const [clientId, setClientId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('drive-storage-accounts', {
        body: { action: 'list' },
      });
      if (error || data?.error) {
        throw new Error(data?.error || await extractFunctionErrorMessage(error, 'Falha ao carregar contas'));
      }
      setAccounts(data.accounts || []);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    supabase.functions.invoke('drive-storage-accounts', { body: { action: 'config' } })
      .then(({ data }) => { if (data?.clientId) setClientId(data.clientId); })
      .catch(() => {});
  }, []);

  const disconnect = async (acc: StorageAccount) => {
    if (!confirm(`Remover a conta ${acc.email}? Os arquivos já copiados para ela NÃO são apagados.`)) return;
    setRemoving(acc.id);
    try {
      const { data, error } = await supabase.functions.invoke('drive-storage-accounts', {
        body: { action: 'disconnect', id: acc.id },
      });
      if (error || data?.error) throw new Error(data?.error || 'Falha ao remover');
      toast.success('Conta removida');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRemoving(null);
    }
  };

  const [folderDraft, setFolderDraft] = useState<Record<string, string>>({});
  const [savingFolder, setSavingFolder] = useState<string | null>(null);

  const saveFolder = async (acc: StorageAccount) => {
    setSavingFolder(acc.id);
    try {
      const { data, error } = await supabase.functions.invoke('drive-storage-accounts', {
        body: { action: 'set_folder', id: acc.id, folder_id: folderDraft[acc.id] ?? '' },
      });
      if (error || data?.error) {
        throw new Error(data?.error || await extractFunctionErrorMessage(error, 'Falha ao salvar a pasta'));
      }
      toast.success(data.folder_name ? `Pasta definida: ${data.folder_name}` : 'Pasta removida');
      load();
    } catch (err) {
      toast.error((err as Error).message, { duration: 12000 });
    } finally {
      setSavingFolder(null);
    }
  };

  const totalLivre = accounts
    .filter(a => a.connected)
    .reduce((sum, a) => sum + (a.storage_limit_bytes == null ? 0 : a.storage_limit_bytes - (a.storage_usage_bytes || 0)), 0);

  return (
    <Card className="bg-background-paper border-border">
      <CardHeader>
        <CardTitle className="text-base font-medium text-foreground flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" />
            Contas de armazenamento
          </span>
          <Button onClick={load} size="sm" variant="ghost" className="text-muted-foreground gap-1.5" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Contas de Google Drive usadas <strong className="text-foreground">apenas como espaço</strong>, para
          copiar aulas grandes que o Google bloqueia por limite diário de download. A conexão que serve o
          conteúdo hoje não é afetada — conectar aqui não substitui nem desconecta nada.
        </p>

        {clientId && (
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-xs">
            <p className="text-muted-foreground">
              App do Google usado por este botão:{' '}
              <strong className="text-foreground font-mono">{clientId.split('-')[0]}</strong>
              <span className="text-muted-foreground">…{clientId.slice(-28)}</span>
            </p>
            <p className="text-muted-foreground mt-1.5">
              A tela do Google mostra o mesmo nome nos dois apps da conta, então ela não
              identifica qual está sendo usado — este número acima é o que vale.
            </p>
          </div>
        )}

        {loading && accounts.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando contas...
          </div>
        ) : accounts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">Nenhuma conta de armazenamento conectada.</p>
            <Button onClick={startStorageOAuth} className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
              <Plus className="w-4 h-4" /> Conectar conta de armazenamento
            </Button>
          </div>
        ) : (
          <>
            <ul className="space-y-3 list-none p-0">
              {accounts.map(acc => {
                const limite = acc.storage_limit_bytes;
                const uso = acc.storage_usage_bytes || 0;
                const ilimitado = limite == null;
                const pct = ilimitado || !limite ? 0 : Math.min(100, (uso / limite) * 100);
                const livre = ilimitado ? null : Math.max(0, (limite || 0) - uso);
                return (
                  <li key={acc.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                          {acc.connected
                            ? <CheckCircle className="w-4 h-4 text-accent-success shrink-0" />
                            : <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
                          {acc.email}
                        </p>
                        {acc.erro && <p className="text-xs text-destructive mt-1">{acc.erro}</p>}
                      </div>
                      <Button
                        onClick={() => disconnect(acc)}
                        size="sm" variant="ghost"
                        disabled={removing === acc.id}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        title="Remover conta"
                      >
                        {removing === acc.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>

                    {acc.connected && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <label className="block text-xs text-muted-foreground mb-1.5" htmlFor={`pasta-${acc.id}`}>
                          Pasta de destino no Drive desta conta
                          {acc.folder_name && (
                            <span className="text-accent-success"> · atual: {acc.folder_name}</span>
                          )}
                        </label>
                        <div className="flex gap-2">
                          <Input
                            id={`pasta-${acc.id}`}
                            value={folderDraft[acc.id] ?? acc.folder_id ?? ''}
                            onChange={e => setFolderDraft(d => ({ ...d, [acc.id]: e.target.value }))}
                            placeholder="ID da pasta (deixe vazio para usar a raiz)"
                            className="h-9 text-sm font-mono"
                          />
                          <Button
                            onClick={() => saveFolder(acc)}
                            disabled={savingFolder === acc.id}
                            size="sm"
                            variant="outline"
                            className="border-border shrink-0"
                          >
                            {savingFolder === acc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                          </Button>
                        </div>
                        {/* O ID é o trecho depois de /folders/ na URL da pasta
                            aberta no Drive — pedir a URL inteira e recortar aqui
                            esconderia erro de cópia. */}
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          Abra a pasta no Drive e copie o trecho depois de <code>/folders/</code> na URL.
                        </p>
                      </div>
                    )}

                    {acc.connected && (
                      ilimitado ? (
                        <p className="text-xs text-muted-foreground">Armazenamento ilimitado (Workspace)</p>
                      ) : (
                        <>
                          <Progress value={pct} className="h-1.5 mb-1.5" />
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {formatFileSize(uso)} de {formatFileSize(limite || 0)} usados
                            {/* `formatFileSize` devolve string vazia para zero,
                                então a conta cheia (ou acima do limite, como a
                                de conteúdo hoje) sairia como "· livres", sem
                                número. Aqui esse caso é dito com todas as
                                letras — é justamente o estado que motivou a
                                tela existir. */}
                            {livre && livre > 0
                              ? <strong className="text-foreground"> · {formatFileSize(livre)} livres</strong>
                              : <strong className="text-destructive"> · sem espaço livre</strong>}
                          </p>
                        </>
                      )
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-sm text-muted-foreground">
                Espaço livre somado: <strong className="text-foreground tabular-nums">{formatFileSize(totalLivre)}</strong>
              </p>
              <Button onClick={startStorageOAuth} variant="outline" className="border-border gap-2">
                <Plus className="w-4 h-4" /> Conectar outra conta
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default StorageAccountsCard;
