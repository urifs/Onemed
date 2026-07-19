import { useState, useEffect, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  UserPlus, Search, XCircle, Loader2, GraduationCap, ExternalLink,
  Users, BookOpen, FolderOpen, RefreshCw, Upload,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BULK_CHUNK_SIZE = 300;

function extractEmails(raw: string): string[] {
  // Accepts one-per-line, comma/semicolon-separated, or a messy paste with
  // other text around each address — pull out anything email-shaped.
  const matches = raw.match(/[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/g) || [];
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const m of matches) {
    const email = m.trim().toLowerCase().replace(/[.,;]+$/, '');
    if (EMAIL_REGEX.test(email) && !seen.has(email)) {
      seen.add(email);
      emails.push(email);
    }
  }
  return emails;
}

interface MemberRow {
  email: string;
  source: 'buyer' | 'manual';
  plan: string;
  grantedAt: string;
  accessId?: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [filtered, setFiltered] = useState<MemberRow[]>([]);
  const [courseStats, setCourseStats] = useState<{ active: number; categories: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPlan, setNewPlan] = useState('lifetime');
  const [adding, setAdding] = useState(false);

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkPlan, setBulkPlan] = useState('lifetime');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkResult, setBulkResult] = useState<{ granted: number; skipped: number; invalid: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [manualAccesses, buyers, courses] = await Promise.all([
        fetchAllRows((f, t) =>
          supabase.from('accesses').select('id, email, access_type, status, granted_at')
            .eq('status', 'active').in('access_type', ['paid', 'lifetime', 'annual']).range(f, t)
        ),
        fetchAllRows((f, t) =>
          supabase.from('buyers').select('email, plan, created_at').eq('access_granted', true).range(f, t)
        ),
        fetchAllRows((f, t) => supabase.from('courses').select('category, active').range(f, t)),
      ]);

      // Buyers take priority when the same email appears in both lists —
      // a manual grant for someone who later bought is still one member, not two.
      const buyerEmails = new Set((buyers || []).map((b: any) => b.email.toLowerCase()));
      const manualOnly: MemberRow[] = (manualAccesses || [])
        .filter((a: any) => !buyerEmails.has(a.email.toLowerCase()))
        .map((a: any) => ({ email: a.email, source: 'manual' as const, plan: a.access_type, grantedAt: a.granted_at, accessId: a.id }));
      const fromBuyers: MemberRow[] = (buyers || []).map((b: any) => ({
        email: b.email, source: 'buyer' as const, plan: b.plan, grantedAt: b.created_at,
      }));

      const all = [...fromBuyers, ...manualOnly].sort((a, b) => (b.grantedAt || '').localeCompare(a.grantedAt || ''));
      setMembers(all);

      const activeCourses = (courses || []).filter((c: any) => c.active);
      setCourseStats({
        active: activeCourses.length,
        categories: new Set(activeCourses.map((c: any) => c.category)).size,
      });
    } catch {
      toast.error('Erro ao carregar membros');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(term ? members.filter(m => m.email.toLowerCase().includes(term)) : members);
  }, [members, search]);

  const grantAccess = async () => {
    if (!newEmail) { toast.error('Informe um email'); return; }
    setAdding(true);
    try {
      const expiresAt = newPlan === 'annual'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : null;
      const { error } = await supabase.from('accesses').insert({
        email: newEmail.toLowerCase(),
        access_type: newPlan,
        status: 'active',
        expires_at: expiresAt,
      });
      if (error) throw error;
      toast.success('Acesso à área de membros concedido');
      setIsAddOpen(false);
      setNewEmail('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao conceder acesso');
    } finally {
      setAdding(false);
    }
  };

  const handleBulkFile = async (file: File) => {
    const text = await file.text();
    setBulkText(prev => (prev ? `${prev}\n${text}` : text));
  };

  const bulkImport = async () => {
    const candidates = extractEmails(bulkText);
    const invalidCount = (bulkText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).length) - candidates.length;
    if (candidates.length === 0) { toast.error('Nenhum email válido encontrado no texto'); return; }

    setBulkImporting(true);
    setBulkResult(null);
    setBulkProgress({ done: 0, total: candidates.length });
    try {
      // Anyone who already has active access (any grant type, or a purchase)
      // gets skipped instead of a redundant second row.
      const [{ data: existingAccesses }, { data: existingBuyers }] = await Promise.all([
        fetchAllRows((f, t) => supabase.from('accesses').select('email').eq('status', 'active').range(f, t)),
        fetchAllRows((f, t) => supabase.from('buyers').select('email').eq('access_granted', true).range(f, t)),
      ]);
      const covered = new Set([
        ...(existingAccesses || []).map((a: any) => a.email.toLowerCase()),
        ...(existingBuyers || []).map((b: any) => b.email.toLowerCase()),
      ]);

      const toInsert = candidates.filter(e => !covered.has(e));
      const skipped = candidates.length - toInsert.length;
      const expiresAt = bulkPlan === 'annual'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      let granted = 0;
      for (let i = 0; i < toInsert.length; i += BULK_CHUNK_SIZE) {
        const chunk = toInsert.slice(i, i + BULK_CHUNK_SIZE);
        const { error } = await supabase.from('accesses').insert(
          chunk.map(email => ({ email, access_type: bulkPlan, status: 'active', expires_at: expiresAt }))
        );
        if (error) throw error;
        granted += chunk.length;
        setBulkProgress({ done: Math.min(i + BULK_CHUNK_SIZE, toInsert.length), total: toInsert.length });
      }

      setBulkResult({ granted, skipped, invalid: Math.max(invalidCount, 0) });
      toast.success(`${granted} acesso(s) concedido(s)`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar');
    } finally {
      setBulkImporting(false);
      setBulkProgress(null);
    }
  };

  const closeBulkDialog = (open: boolean) => {
    setIsBulkOpen(open);
    if (!open) { setBulkText(''); setBulkResult(null); }
  };

  const revokeAccess = async (accessId: string) => {
    try {
      const { error } = await supabase.from('accesses').update({ status: 'revoked' }).eq('id', accessId);
      if (error) throw error;
      toast.success('Acesso revogado');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao revogar');
    }
  };

  const planLabel = (plan: string) => ({ lifetime: 'Vitalício', annual: 'Anual', paid: 'Pago' }[plan] || plan);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-secondary text-3xl font-bold text-foreground">Área de Membros</h1>
            <p className="text-muted-foreground mt-1">Quem tem acesso à plataforma de cursos (/membros)</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/membros" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2 border-border text-foreground hover:bg-secondary">
                <ExternalLink className="w-4 h-4" /> Abrir Área de Membros
              </Button>
            </a>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
                  <UserPlus className="w-4 h-4" /> Conceder Acesso
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background-paper border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Conceder Acesso à Área de Membros</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-foreground">Email</Label>
                    <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemplo.com" className="bg-secondary border-border text-foreground" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Plano</Label>
                    <Select value={newPlan} onValueChange={setNewPlan}>
                      <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-background-paper border-border">
                        <SelectItem value="lifetime">Vitalício</SelectItem>
                        <SelectItem value="annual">Anual (365 dias)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={grantAccess} disabled={adding} className="w-full bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {adding ? 'Concedendo...' : 'Conceder Acesso'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isBulkOpen} onOpenChange={closeBulkDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-border text-foreground hover:bg-secondary">
                  <Upload className="w-4 h-4" /> Importar em Massa
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background-paper border-border max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Importar Acessos em Massa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-foreground">Emails (um por linha, ou cole uma lista/TXT)</Label>
                    <Textarea
                      value={bulkText}
                      onChange={e => setBulkText(e.target.value)}
                      placeholder={'aluno1@email.com\naluno2@email.com\naluno3@email.com'}
                      rows={8}
                      className="bg-secondary border-border text-foreground font-mono text-xs"
                    />
                    <label className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline cursor-pointer">
                      <Upload className="w-3 h-3" /> ou selecione um arquivo .txt
                      <input
                        type="file"
                        accept=".txt,text/plain"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleBulkFile(f); e.target.value = ''; }}
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Plano</Label>
                    <Select value={bulkPlan} onValueChange={setBulkPlan}>
                      <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-background-paper border-border">
                        <SelectItem value="lifetime">Vitalício</SelectItem>
                        <SelectItem value="annual">Anual (365 dias)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {bulkResult && (
                    <div className="rounded-lg border border-border bg-secondary/50 p-3 text-sm space-y-1">
                      <p className="text-accent-success font-medium">{bulkResult.granted} acesso(s) concedido(s)</p>
                      {bulkResult.skipped > 0 && <p className="text-muted-foreground">{bulkResult.skipped} já tinham acesso (pulados)</p>}
                      {bulkResult.invalid > 0 && <p className="text-muted-foreground">{bulkResult.invalid} linha(s) inválida(s) ignorada(s)</p>}
                    </div>
                  )}

                  <Button onClick={bulkImport} disabled={bulkImporting || !bulkText.trim()} className="w-full bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
                    {bulkImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {bulkImporting
                      ? `Importando... ${bulkProgress ? `${bulkProgress.done}/${bulkProgress.total}` : ''}`
                      : 'Importar e Conceder Acesso'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-background-paper border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Membros com acesso</p>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <p className="font-secondary text-2xl font-bold text-foreground">{loading ? '—' : members.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-background-paper border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Cursos ativos</p>
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <p className="font-secondary text-2xl font-bold text-foreground">{loading ? '—' : courseStats?.active ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-background-paper border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Categorias</p>
                <GraduationCap className="w-4 h-4 text-primary" />
              </div>
              <p className="font-secondary text-2xl font-bold text-foreground">{loading ? '—' : courseStats?.categories ?? 0}</p>
              <Link to="/admin/drive" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
                <FolderOpen className="w-3 h-3" /> Sincronizar biblioteca
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por email..." className="pl-9 bg-background-paper border-border text-foreground" />
          </div>
          <Button variant="ghost" size="icon" onClick={fetchData} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Table */}
        <Card className="bg-background-paper border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Email', 'Origem', 'Plano', 'Concedido em', 'Ação'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => (
                    <tr key={m.email} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground">{m.email}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {m.source === 'buyer' ? (
                          <Link to="/admin/buyers" className="text-primary hover:underline">Compra</Link>
                        ) : 'Manual'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{planLabel(m.plan)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDateTimeSP(m.grantedAt)}</td>
                      <td className="px-4 py-3">
                        {m.source === 'manual' && m.accessId ? (
                          <Button variant="ghost" size="sm" onClick={() => revokeAccess(m.accessId!)} className="text-red-400 hover:text-red-300 gap-1.5">
                            <XCircle className="w-3.5 h-3.5" /> Revogar
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && !loading && (
                <p className="text-muted-foreground text-center py-12">Nenhum membro encontrado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
