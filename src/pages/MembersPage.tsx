import { useState, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateTimeSP, fetchAllRows, extractFunctionErrorMessage } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  UserPlus, Search, XCircle, Loader2, GraduationCap, ExternalLink,
  Users, BookOpen, FolderOpen, RefreshCw, Upload, CheckCircle2, UserCheck, AlertTriangle, KeyRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BULK_CHUNK_SIZE = 300;
// Quantas linhas da tabela de membros entram no DOM por vez.
const LOTE_LINHAS = 100;
const PLAN_DURATION_DAYS: Record<string, number> = { annual: 365, monthly: 30 };
function planExpiresAt(plan: string): string | null {
  const days = PLAN_DURATION_DAYS[plan];
  return days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;
}

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
  // Senha da área de membros já cadastrada? Como não existe "esqueci minha
  // senha" por e-mail, é por aqui que o suporte enxerga e destrava.
  temSenha?: boolean;
}

const PLAN_SELECT_ITEMS = (
  <>
    <SelectItem value="lifetime">Vitalício</SelectItem>
    <SelectItem value="lifetime_plus">Vitalício Plus</SelectItem>
    <SelectItem value="lifetime_pro">Vitalício Pro</SelectItem>
    <SelectItem value="annual">Anual (365 dias)</SelectItem>
    <SelectItem value="monthly">Mensal (30 dias)</SelectItem>
  </>
);

// Estado do formulário (email/plano digitados) isolado num componente
// próprio — antes vivia direto em MembersPage, então cada tecla digitada
// no email (ou troca de plano) re-renderizava a página inteira, incluindo
// a tabela de membros (centenas/milhares de linhas), travando a digitação.
function GrantAccessDialog({ open, onOpenChange, onGranted }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGranted: () => void;
}) {
  const [newEmail, setNewEmail] = useState('');
  const [newPlan, setNewPlan] = useState('lifetime');
  const [adding, setAdding] = useState(false);

  const grantAccess = async () => {
    if (!newEmail) { toast.error('Informe um email'); return; }
    setAdding(true);
    try {
      const email = newEmail.toLowerCase();
      const expiresAt = planExpiresAt(newPlan);

      // Atualiza a linha ativa já existente em vez de sempre inserir uma
      // nova — sem isso, conceder/trocar o plano de quem já tinha acesso
      // deixava duas linhas "active" pro mesmo email (uma antiga e uma
      // nova), e as telas que leem "o acesso ativo" podiam pegar a errada
      // (plano errado no perfil, limite de telas errado).
      const { data: existing } = await supabase
        .from('accesses')
        .select('id')
        .eq('email', email)
        .eq('status', 'active')
        .neq('access_type', 'trial')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { error } = existing
        ? await supabase.from('accesses').update({ access_type: newPlan, status: 'active', expires_at: expiresAt }).eq('id', existing.id)
        : await supabase.from('accesses').insert({ email, access_type: newPlan, status: 'active', expires_at: expiresAt });
      if (error) throw error;
      toast.success(existing ? 'Plano do membro atualizado' : 'Acesso à área de membros concedido');
      onOpenChange(false);
      setNewEmail('');
      onGranted();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao conceder acesso');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                {PLAN_SELECT_ITEMS}
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
  );
}

// Mesmo motivo do GrantAccessDialog acima — bulkText é um texto grande
// (potencialmente milhares de emails colados), então cada tecla digitada
// no textarea não pode re-renderizar a tabela de membros da página.
function BulkImportDialog({ open, onOpenChange, onImported }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) {
  const [bulkText, setBulkText] = useState('');
  const [bulkPlan, setBulkPlan] = useState('lifetime');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [bulkResult, setBulkResult] = useState<{ granted: number; replaced: number; invalid: number } | null>(null);

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
      // Quem já tem uma linha de acesso ativa (não-trial) tem ela SUBSTITUÍDA
      // pelo plano selecionado aqui, em vez de pular ou duplicar — mesmo
      // comportamento do "Conceder Acesso" individual. fetchAllRows já
      // devolve o array pronto (não {data: [...]}).
      const existingAccesses = await fetchAllRows<{ email: string }>((f, t) =>
        supabase.from('accesses').select('email').eq('status', 'active').neq('access_type', 'trial').range(f, t)
      );
      const hasAccessRow = new Set(existingAccesses.map(a => a.email.toLowerCase()));

      const toReplace = candidates.filter(e => hasAccessRow.has(e));
      const toInsert = candidates.filter(e => !hasAccessRow.has(e));
      const expiresAt = planExpiresAt(bulkPlan);

      let replaced = 0;
      for (let i = 0; i < toReplace.length; i += BULK_CHUNK_SIZE) {
        const chunk = toReplace.slice(i, i + BULK_CHUNK_SIZE);
        const { error } = await supabase.from('accesses')
          .update({ access_type: bulkPlan, status: 'active', expires_at: expiresAt })
          .in('email', chunk)
          .eq('status', 'active')
          .neq('access_type', 'trial');
        if (error) throw error;
        replaced += chunk.length;
        setBulkProgress({ done: Math.min(i + BULK_CHUNK_SIZE, toReplace.length), total: candidates.length });
      }

      let granted = 0;
      for (let i = 0; i < toInsert.length; i += BULK_CHUNK_SIZE) {
        const chunk = toInsert.slice(i, i + BULK_CHUNK_SIZE);
        const { error } = await supabase.from('accesses').insert(
          chunk.map(email => ({ email, access_type: bulkPlan, status: 'active', expires_at: expiresAt }))
        );
        if (error) throw error;
        granted += chunk.length;
        setBulkProgress({ done: toReplace.length + Math.min(i + BULK_CHUNK_SIZE, toInsert.length), total: candidates.length });
      }

      setBulkResult({ granted, replaced, invalid: Math.max(invalidCount, 0) });
      toast.success(`${granted + replaced} acesso(s) processado(s)`);
      onImported();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar');
    } finally {
      setBulkImporting(false);
      setBulkProgress(null);
    }
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) { setBulkText(''); setBulkResult(null); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                {PLAN_SELECT_ITEMS}
              </SelectContent>
            </Select>
          </div>

          {bulkResult && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resultado da importação</p>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-accent-success shrink-0" />
                <span className="text-sm text-foreground">
                  <span className="font-bold text-accent-success text-base">{bulkResult.granted}</span> acesso(s) concedido(s)
                </span>
              </div>
              {bulkResult.replaced > 0 && (
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-5 h-5 text-blue-400 shrink-0" />
                  <span className="text-sm text-foreground">
                    <span className="font-bold text-blue-400 text-base">{bulkResult.replaced}</span> já tinham acesso — plano substituído pelo novo
                  </span>
                </div>
              )}
              {bulkResult.invalid > 0 && (
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <span className="text-sm text-foreground">
                    <span className="font-bold text-amber-400 text-base">{bulkResult.invalid}</span> linha(s) inválida(s) ignorada(s)
                  </span>
                </div>
              )}
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
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [courseStats, setCourseStats] = useState<{ active: number; categories: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [liberando, setLiberando] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const buscarTudo = () => Promise.all([
        fetchAllRows((f, t) =>
          supabase.from('accesses').select('id, email, access_type, status, granted_at')
            .eq('status', 'active').in('access_type', ['paid', 'lifetime', 'lifetime_plus', 'lifetime_pro', 'annual', 'monthly']).range(f, t)
        ),
        fetchAllRows((f, t) =>
          supabase.from('buyers').select('email, plan, created_at').eq('access_granted', true).range(f, t)
        ),
        fetchAllRows((f, t) => supabase.from('courses').select('category, active').range(f, t)),
        fetchAllRows((f, t) => supabase.from('member_credentials').select('email').range(f, t)),
      ]);

      // Leitura NEGADA pela RLS volta como lista VAZIA com HTTP 200 — não como
      // erro. Sem esta checagem a tela mostrava "0 membros / 0 cursos" como se
      // a base estivesse vazia, sem nenhum aviso (visto uma vez com a conta
      // visualizadora). `courses` é o sentinela honesto: a plataforma tem
      // centenas de cursos e todo perfil do painel enxerga a tabela, então
      // zero ali significa consulta não autorizada — sessão ainda não
      // aplicada, papel não reconhecido —, nunca base vazia.
      let [manualAccesses, buyers, courses, credenciais] = await buscarTudo();
      if ((courses || []).length === 0) {
        await new Promise(r => setTimeout(r, 1200));
        [manualAccesses, buyers, courses, credenciais] = await buscarTudo();
        if ((courses || []).length === 0) {
          throw new Error('A consulta não foi autorizada — sua sessão pode ter expirado.');
        }
      }
      const comSenha = new Set((credenciais || []).map((c: any) => String(c.email).toLowerCase()));

      // Buyers take priority when the same email appears in both lists —
      // a manual grant for someone who later bought is still one member, not two.
      const buyerEmails = new Set((buyers || []).map((b: any) => b.email.toLowerCase()));
      const manualOnly: MemberRow[] = (manualAccesses || [])
        .filter((a: any) => !buyerEmails.has(a.email.toLowerCase()))
        .map((a: any) => ({ email: a.email, source: 'manual' as const, plan: a.access_type, grantedAt: a.granted_at, accessId: a.id }));
      const fromBuyers: MemberRow[] = (buyers || []).map((b: any) => ({
        email: b.email, source: 'buyer' as const, plan: b.plan, grantedAt: b.created_at,
      }));

      const todas = [...fromBuyers, ...manualOnly]
        .map(m => ({ ...m, temSenha: comSenha.has(m.email.toLowerCase()) }))
        .sort((a, b) => (b.grantedAt || '').localeCompare(a.grantedAt || ''));

      // Um MEMBRO é uma pessoa, não uma linha de compra: renovação e upgrade
      // deixam várias linhas aprovadas em `buyers` para o mesmo e-mail (618
      // casos hoje, 3.742 linhas para 3.108 pessoas). Sem juntar, a pessoa
      // aparecia repetida, o contador do topo inflava e — o pior — a chave do
      // React na tabela (o e-mail) ficava DUPLICADA: ao filtrar a busca, a
      // reconciliação errava e sobravam na tela linhas de quem não casava com
      // o termo. Como a lista já vem da mais recente para a mais antiga, o
      // primeiro de cada e-mail é o acesso que vale.
      const porEmail = new Map<string, MemberRow>();
      for (const m of todas) {
        const chave = m.email.toLowerCase();
        if (!porEmail.has(chave)) porEmail.set(chave, m);
      }
      setMembers([...porEmail.values()]);

      const activeCourses = (courses || []).filter((c: any) => c.active);
      setCourseStats({
        active: activeCourses.length,
        categories: new Set(activeCourses.map((c: any) => c.category)).size,
      });
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar membros');
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // A busca roda em valor DEFERIDO: com milhares de linhas, filtrar a cada
  // tecla no mesmo render travava a digitação. O campo responde na hora e a
  // tabela alcança logo depois.
  const buscaAdiada = useDeferredValue(search);

  // Derivado com useMemo — o useEffect anterior espelhava a lista inteira
  // num segundo estado (memória em dobro + dois renders por tecla digitada).
  const filtered = useMemo(() => {
    const term = buscaAdiada.toLowerCase();
    return term ? members.filter(m => m.email.toLowerCase().includes(term)) : members;
  }, [members, buscaAdiada]);

  // A tabela renderizava as ~3.700 linhas de uma vez: 40 mil nós no DOM e
  // ~2.600 botões, com TODA interação da página (abrir o diálogo, digitar,
  // escolher plano) pagando o custo de reconciliar isso. Renderiza em lotes.
  const [visiveis, setVisiveis] = useState(LOTE_LINHAS);
  useEffect(() => { setVisiveis(LOTE_LINHAS); }, [buscaAdiada, members]);
  const naTela = useMemo(() => filtered.slice(0, visiveis), [filtered, visiveis]);

  // Sem "esqueci minha senha" por e-mail, é este botão que destrava quem
  // perdeu a senha: apaga a senha atual e devolve a conta pro estado "ainda
  // não cadastrou", pra pessoa escolher outra no próximo login. Pede
  // confirmação porque, enquanto o aluno não cadastrar a nova, ele fica sem
  // conseguir entrar.
  const liberarSenha = async (email: string) => {
    if (!window.confirm(
      `Resetar a senha de ${email}?\n\n`
      + 'A senha atual deixa de funcionar na hora. No próximo login, essa pessoa vai cadastrar uma nova senha.',
    )) return;
    setLiberando(email);
    try {
      const { data, error } = await supabase.functions.invoke('member-auth-request', {
        body: { action: 'admin-reset', email },
      });
      if (error || data?.error) {
        throw new Error(data?.error || await extractFunctionErrorMessage(error, 'Erro ao resetar a senha'));
      }
      toast.success('Senha resetada. No próximo login o aluno cadastra uma nova.');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao resetar a senha');
    } finally {
      setLiberando(null);
    }
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

  const planLabel = (plan: string) => ({
    lifetime: 'Vitalício', lifetime_plus: 'Vitalício Plus', lifetime_pro: 'Vitalício Pro',
    annual: 'Anual', monthly: 'Mensal', paid: 'Pago',
  }[plan] || plan);

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
            <GrantAccessDialog open={isAddOpen} onOpenChange={setIsAddOpen} onGranted={fetchData} />
            <BulkImportDialog open={isBulkOpen} onOpenChange={setIsBulkOpen} onImported={fetchData} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 3xl:max-w-[1400px]">
          <Card className="bg-background-paper border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Membros com acesso</p>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <p className="font-secondary text-2xl font-bold text-foreground">{loading || loadError ? '—' : members.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-background-paper border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Cursos ativos</p>
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <p className="font-secondary text-2xl font-bold text-foreground">{loading || loadError ? '—' : courseStats?.active ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-background-paper border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Categorias</p>
                <GraduationCap className="w-4 h-4 text-primary" />
              </div>
              <p className="font-secondary text-2xl font-bold text-foreground">{loading || loadError ? '—' : courseStats?.categories ?? 0}</p>
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
                    {['Email', 'Origem', 'Plano', 'Concedido em', 'Senha', 'Ação'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {naTela.map(m => (
                    <tr key={m.email.toLowerCase()} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground">{m.email}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {m.source === 'buyer' ? (
                          <Link to="/admin/buyers" className="text-primary hover:underline">Compra</Link>
                        ) : 'Manual'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{planLabel(m.plan)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDateTimeSP(m.grantedAt)}</td>
                      {/* Status e AÇÃO separados de propósito: com um botão só
                          escrito "Cadastrada", a coluna parecia um rótulo e
                          ninguém percebia que clicar ali reseta a senha. */}
                      <td className="px-4 py-3">
                        {m.temSenha ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-success/15 px-2 py-0.5 text-xs text-accent-success">
                              <CheckCircle2 className="w-3 h-3" /> Cadastrada
                            </span>
                            <Button
                              variant="outline" size="sm" onClick={() => liberarSenha(m.email)}
                              disabled={liberando === m.email}
                              title="Apaga a senha atual para o aluno cadastrar outra no próximo login"
                              className="h-7 gap-1.5 border-border text-accent-warning hover:text-accent-warning hover:bg-accent-warning/10"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              {liberando === m.email ? 'Resetando...' : 'Resetar senha'}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Não cadastrada</span>
                        )}
                      </td>
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
              {loadError && !loading && (
                <div className="flex flex-col items-center gap-3 py-12 text-center px-4">
                  <AlertTriangle className="w-6 h-6 text-accent-warning" />
                  <p className="text-foreground text-sm font-medium">Não foi possível carregar os membros</p>
                  <Button onClick={fetchData} size="sm" variant="outline" className="border-border text-muted-foreground hover:text-foreground gap-2">
                    <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                  </Button>
                </div>
              )}
              {!loadError && filtered.length > naTela.length && (
                <div className="flex flex-col items-center gap-2 py-6 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {naTela.length} de {filtered.length} membros
                  </p>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setVisiveis(v => v + LOTE_LINHAS * 5)}
                    className="border-border text-foreground"
                  >
                    Mostrar mais
                  </Button>
                </div>
              )}
              {!loadError && filtered.length === 0 && !loading && (
                <p className="text-muted-foreground text-center py-12">Nenhum membro encontrado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
