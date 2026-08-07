import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { KeyRound, Loader2, Plus, Shield, Eye, Trash2, UserCog, RefreshCw } from 'lucide-react';
import { formatDateTimeSP } from '@/lib/utils';

// Gestão das contas com acesso ao painel (/admin/contas): admins e
// visualizadores. Leitura via RPC admin-only; toda mudança passa pela Edge
// Function admin-panel-accounts (service role), que também protege o painel
// de ficar sem nenhum admin.

interface Conta {
  user_id: string;
  email: string;
  role: 'admin' | 'viewer';
  account_created_at: string | null;
  last_sign_in_at: string | null;
}

async function invokeAccounts(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-panel-accounts', { body });
  if (error || data?.error) {
    let msg = data?.error;
    if (!msg && error && 'context' in (error as any)) {
      try { msg = (await (error as any).context.json())?.error; } catch { /* não-json */ }
    }
    throw new Error(msg || 'Não foi possível completar a operação.');
  }
  return data;
}

const ROLE_LABEL: Record<string, string> = { admin: 'Administrador', viewer: 'Visualizador' };

export default function PanelAccountsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'viewer'>('viewer');
  const [creating, setCreating] = useState(false);

  const [pwdFor, setPwdFor] = useState<Conta | null>(null);
  const [pwdValue, setPwdValue] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc('admin_panel_accounts');
    if (error) toast.error('Não foi possível carregar as contas.');
    setRows(((data || []) as Conta[]));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const criar = async () => {
    if (!newEmail.trim() || newPassword.length < 6) {
      toast.error('Informe o e-mail e uma senha com pelo menos 6 caracteres.');
      return;
    }
    setCreating(true);
    try {
      const r = await invokeAccounts({ action: 'create', email: newEmail.trim(), password: newPassword, role: newRole });
      toast.success(r.reaproveitado
        ? 'E-mail já tinha conta — o papel foi atribuído (a senha antiga continua valendo).'
        : 'Conta criada!');
      setCreateOpen(false); setNewEmail(''); setNewPassword(''); setNewRole('viewer');
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const trocarPapel = async (c: Conta) => {
    const novo = c.role === 'admin' ? 'viewer' : 'admin';
    if (!confirm(`Trocar ${c.email} para ${ROLE_LABEL[novo]}?`)) return;
    setBusy(c.user_id);
    try {
      await invokeAccounts({ action: 'set_role', userId: c.user_id, role: novo });
      toast.success('Papel atualizado.');
      load();
    } catch (err: any) { toast.error(err.message); } finally { setBusy(null); }
  };

  const salvarSenha = async () => {
    if (!pwdFor || pwdValue.length < 6) { toast.error('A senha precisa de pelo menos 6 caracteres.'); return; }
    setPwdSaving(true);
    try {
      await invokeAccounts({ action: 'reset_password', userId: pwdFor.user_id, password: pwdValue });
      toast.success(`Senha de ${pwdFor.email} redefinida.`);
      setPwdFor(null); setPwdValue('');
    } catch (err: any) { toast.error(err.message); } finally { setPwdSaving(false); }
  };

  const remover = async (c: Conta) => {
    if (!confirm(`Remover o acesso de ${c.email} ao painel? A conta de usuário continua existindo (se for assinante, nada do acesso aos cursos muda) — só o papel de ${ROLE_LABEL[c.role]} é retirado.`)) return;
    setBusy(c.user_id);
    try {
      await invokeAccounts({ action: 'remove', userId: c.user_id });
      toast.success('Acesso ao painel removido.');
      load();
    } catch (err: any) { toast.error(err.message); } finally { setBusy(null); }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-secondary text-3xl font-bold text-foreground flex items-center gap-2">
              <UserCog className="w-7 h-7 text-primary" /> Contas do Painel
            </h1>
            <p className="text-muted-foreground mt-1">
              Quem entra no painel admin — administradores (tudo) e visualizadores (leitura + Loja e Área de Membros)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5 bg-primary hover:bg-primary-hover text-primary-foreground">
              <Plus className="w-4 h-4" /> Nova conta
            </Button>
          </div>
        </div>

        <Card className="bg-background-paper border-border">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
            ) : rows.length === 0 ? (
              <p className="p-10 text-sm text-muted-foreground text-center">Nenhuma conta com acesso ao painel.</p>
            ) : (
              <div className="divide-y divide-border">
                {rows.map(c => (
                  <div key={`${c.user_id}-${c.role}`} className="flex items-center gap-3 px-5 py-4 flex-wrap">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${c.role === 'admin' ? 'bg-primary/15' : 'bg-accent-warning/15'}`}>
                      {c.role === 'admin'
                        ? <Shield className="w-4 h-4 text-primary" />
                        : <Eye className="w-4 h-4 text-accent-warning" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {c.email}
                        {c.user_id === user?.id && <span className="ml-2 text-[10px] uppercase font-bold text-muted-foreground">(você)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        <span className={c.role === 'admin' ? 'text-primary font-semibold' : 'text-accent-warning font-semibold'}>
                          {ROLE_LABEL[c.role]}
                        </span>
                        {c.last_sign_in_at ? ` · último login ${formatDateTimeSP(c.last_sign_in_at)}` : ' · nunca entrou'}
                        {c.account_created_at ? ` · criada ${formatDateTimeSP(c.account_created_at)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="h-8 gap-1.5"
                        onClick={() => trocarPapel(c)} disabled={busy === c.user_id}
                        title={c.role === 'admin' ? 'Rebaixar para visualizador' : 'Promover a administrador'}>
                        {c.role === 'admin' ? <Eye className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                        {c.role === 'admin' ? 'Tornar visualizador' : 'Tornar admin'}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-2.5"
                        onClick={() => { setPwdFor(c); setPwdValue(''); }} disabled={busy === c.user_id}
                        title="Redefinir senha">
                        <KeyRound className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-2.5 text-red-500 hover:text-red-600"
                        onClick={() => remover(c)} disabled={busy === c.user_id}
                        title="Remover acesso ao painel">
                        {busy === c.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* nova conta */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-background-paper border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Nova conta do painel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">E-mail</p>
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" placeholder="conta@exemplo.com"
                className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Senha</p>
              <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="text" placeholder="mínimo 6 caracteres"
                className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
              <p className="text-[11px] text-muted-foreground mt-1">
                Se o e-mail já tiver conta (ex: assinante), o papel é atribuído e a senha ANTIGA continua valendo.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Papel</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setNewRole('viewer')}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${newRole === 'viewer' ? 'bg-accent-warning/15 border-accent-warning/40' : 'bg-secondary border-border'}`}>
                  <span className={`text-sm font-medium flex items-center gap-1.5 ${newRole === 'viewer' ? 'text-accent-warning' : 'text-foreground'}`}>
                    <Eye className="w-4 h-4" /> Visualizador
                  </span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">Vê tudo; edita só Loja e Área de Membros</span>
                </button>
                <button type="button" onClick={() => setNewRole('admin')}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${newRole === 'admin' ? 'bg-primary/15 border-primary/40' : 'bg-secondary border-border'}`}>
                  <span className={`text-sm font-medium flex items-center gap-1.5 ${newRole === 'admin' ? 'text-primary' : 'text-foreground'}`}>
                    <Shield className="w-4 h-4" /> Administrador
                  </span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">Acesso e edição totais</span>
                </button>
              </div>
            </div>
            <Button onClick={criar} disabled={creating} className="w-full gap-1.5">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Criar conta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* redefinir senha */}
      <Dialog open={!!pwdFor} onOpenChange={(o) => { if (!o) setPwdFor(null); }}>
        <DialogContent className="bg-background-paper border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Redefinir senha
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Nova senha para <b className="text-foreground">{pwdFor?.email}</b>:</p>
            <input value={pwdValue} onChange={e => setPwdValue(e.target.value)} type="text" placeholder="mínimo 6 caracteres"
              className="w-full rounded-lg bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
            <Button onClick={salvarSenha} disabled={pwdSaving} className="w-full gap-1.5">
              {pwdSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Salvar senha
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
