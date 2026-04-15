import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateTimeSP, fetchAllRows } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UserPlus, Search, Trash2, RefreshCw, XCircle, FolderOpen, Loader2 } from 'lucide-react';
import { WhatsAppLink } from '@/components/WhatsAppLink';

export default function AccessManagement() {
  const { session } = useAuth();
  const [accesses, setAccesses] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentIdToEmail, setPaymentIdToEmail] = useState<Record<string, string>>({});
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newDuration, setNewDuration] = useState('30');
  const [newType, setNewType] = useState('trial');
  const [adding, setAdding] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const fetchAccesses = useCallback(async () => {
    setLoading(true);
    try {
      const [all, { data: buyers }] = await Promise.all([
        fetchAllRows((from, to) =>
          supabase.from('accesses').select('*').order('created_at', { ascending: false }).range(from, to)
        ),
        supabase.from('buyers').select('email, payment_id').not('payment_id', 'is', null),
      ]);
      setAccesses(all);
      const map: Record<string, string> = {};
      (buyers || []).forEach((b: any) => { if (b.payment_id) map[String(b.payment_id)] = b.email; });
      setPaymentIdToEmail(map);
    } catch { toast.error('Erro ao carregar acessos'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAccesses(); }, [fetchAccesses]);

  useEffect(() => {
    let result = accesses;
    if (search) {
      const term = search.toLowerCase();
      // Check if the term matches a Mercado Pago payment_id in the buyers table
      const emailFromPaymentId = paymentIdToEmail[search.trim()];
      result = result.filter(a =>
        a.email.toLowerCase().includes(term) ||
        (a.whatsapp || '').includes(term) ||
        (emailFromPaymentId && a.email.toLowerCase() === emailFromPaymentId.toLowerCase())
      );
    }
    if (statusFilter !== 'all') result = result.filter(a => a.status === statusFilter);
    setFiltered(result);
  }, [accesses, search, statusFilter, paymentIdToEmail]);

  const addAccess = async () => {
    if (!newEmail) { toast.error('Informe um email'); return; }
    setAdding(true);
    try {
      const durationMs = parseInt(newDuration) * 60 * 1000;
      const expiresAt = new Date(Date.now() + durationMs).toISOString();
      const { data: access, error } = await supabase.from('accesses').insert({
        email: newEmail.toLowerCase(),
        whatsapp: newWhatsapp || null,
        access_type: newType,
        status: 'active',
        expires_at: expiresAt,
      }).select().single();
      if (error) throw error;

      // Auto-share Google Drive folder
      if (access) {
        const { error: shareErr } = await supabase.functions.invoke('drive-share-folder', {
          body: { email: newEmail.toLowerCase(), accessId: access.id },
        });
        if (shareErr) toast.warning('Acesso criado mas Drive não pôde ser compartilhado');
        else toast.success('Acesso criado e Drive compartilhado!');
      }

      setIsAddOpen(false);
      setNewEmail('');
      setNewWhatsapp('');
      fetchAccesses();
    } catch (err: any) { toast.error(err.message); }
    finally { setAdding(false); }
  };

  const shareWithDrive = async (access: any) => {
    setSharingId(access.id);
    try {
      const { data, error } = await supabase.functions.invoke('drive-share-folder', {
        body: { email: access.email, accessId: access.id },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success(`Drive compartilhado com ${access.email}`);
      fetchAccesses();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSharingId(null);
    }
  };

  const revokeAccess = async (id: string) => {
    const { error } = await supabase.from('accesses').update({ status: 'revoked' }).eq('id', id);
    if (error) toast.error('Erro ao revogar');
    else { toast.success('Acesso revogado'); fetchAccesses(); }
  };

  const deleteAccess = async (id: string) => {
    const { error } = await supabase.from('accesses').delete().eq('id', id);
    if (error) toast.error('Erro ao deletar');
    else { toast.success('Acesso deletado'); fetchAccesses(); }
  };

  const renewAccess = async (id: string) => {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { error } = await supabase.from('accesses').update({ status: 'active', expires_at: expiresAt }).eq('id', id);
    if (error) toast.error('Erro ao renovar');
    else { toast.success('Acesso renovado'); fetchAccesses(); }
  };

  const getRemainingTime = (access: any) => {
    if (!access.expires_at) return null;
    const diff = new Date(access.expires_at).getTime() - Date.now();
    if (diff <= 0) return null;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, [string, string]> = {
      active: ['badge-active', 'Ativo'],
      expired: ['badge-expired', 'Expirado'],
      revoked: ['badge-revoked', 'Revogado'],
    };
    const [cls, label] = map[status] || ['badge-pending', status];
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-secondary text-3xl font-bold text-foreground">Gerenciar Acessos</h1>
            <p className="text-muted-foreground mt-1">{filtered.length} acessos encontrados</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
                <UserPlus className="w-4 h-4" /> Novo Acesso
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background-paper border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Criar Novo Acesso</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Email</Label>
                  <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemplo.com" className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">WhatsApp (opcional)</Label>
                  <Input value={newWhatsapp} onChange={e => setNewWhatsapp(e.target.value)} placeholder="+55 11 99999-9999" className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Duração (minutos)</Label>
                  <Input type="number" value={newDuration} onChange={e => setNewDuration(e.target.value)} className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Tipo</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background-paper border-border">
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="annual">Anual</SelectItem>
                      <SelectItem value="lifetime">Vitalício</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addAccess} disabled={adding} className="w-full bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {adding ? 'Criando e compartilhando...' : 'Criar Acesso + Compartilhar Drive'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar email, WhatsApp ou ID da transação..." className="pl-9 bg-background-paper border-border text-foreground" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-background-paper border-border text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-background-paper border-border">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
              <SelectItem value="revoked">Revogados</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={fetchAccesses} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Table */}
        <Card className="bg-background-paper border-border">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-secondary rounded animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">Nenhum acesso encontrado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-mono uppercase text-muted-foreground">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-mono uppercase text-muted-foreground hidden md:table-cell">WhatsApp</th>
                      <th className="text-left px-4 py-3 text-xs font-mono uppercase text-muted-foreground">Tipo</th>
                      <th className="text-left px-4 py-3 text-xs font-mono uppercase text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-mono uppercase text-muted-foreground hidden lg:table-cell">Drive</th>
                      <th className="text-left px-4 py-3 text-xs font-mono uppercase text-muted-foreground hidden lg:table-cell">Tempo</th>
                      <th className="px-4 py-3 text-xs font-mono uppercase text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(access => (
                      <tr key={access.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-foreground">{access.email}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                          {access.whatsapp ? (
                            <WhatsAppLink phone={access.whatsapp} className="text-primary" />
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{access.access_type}</td>
                        <td className="px-4 py-3">{statusBadge(access.status)}</td>
                        <td className="px-4 py-3 text-sm hidden lg:table-cell">
                          {access.drive_folder_id ? (
                            <a href={`https://drive.google.com/drive/folders/${access.drive_folder_id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">{access.drive_folder_name || 'Ver pasta'}</a>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-accent-success hidden lg:table-cell font-mono">
                          {access.status === 'active' ? getRemainingTime(access) || '—' : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => shareWithDrive(access)}
                              disabled={sharingId === access.id}
                              className="p-1.5 text-muted-foreground hover:text-primary disabled:opacity-50"
                              title="Compartilhar Drive"
                            >
                              {sharingId === access.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => renewAccess(access.id)} className="p-1.5 text-muted-foreground hover:text-accent-success" title="Renovar">
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            {access.status === 'active' && (
                              <button onClick={() => revokeAccess(access.id)} className="p-1.5 text-muted-foreground hover:text-primary" title="Revogar">
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="p-1.5 text-muted-foreground hover:text-primary" title="Deletar">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-background-paper border-border">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-foreground">Deletar acesso?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-muted-foreground">Esta ação é irreversível.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-secondary border-border text-foreground">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteAccess(access.id)} className="bg-primary text-primary-foreground">Deletar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
