import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatDateTimeSP, fetchAllRows } from '@/lib/utils';
import { AlertTriangle, RefreshCw, Search, Trash2, MessageCircle, MessagesSquare, BadgeCheck, Link2, Pin, PinOff, PauseCircle, UserX, ShieldAlert } from 'lucide-react';

interface CommunitySettingsRow {
  id: string;
  whatsapp_group_url: string | null;
}

function WhatsAppGroupSettingsCard() {
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [groupUrl, setGroupUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('community_settings').select('*').maybeSingle();
      const row = data as CommunitySettingsRow | null;
      if (row) {
        setSettingsId(row.id);
        setGroupUrl(row.whatsapp_group_url || '');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const save = async () => {
    setSaving(true);
    try {
      const url = groupUrl.trim();
      if (settingsId) {
        const { error } = await supabase.from('community_settings').update({ whatsapp_group_url: url || null }).eq('id', settingsId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('community_settings').insert({ whatsapp_group_url: url || null }).select('id').single();
        if (error) throw error;
        setSettingsId((data as { id: string }).id);
      }
      toast.success('Link do grupo atualizado');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err?.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-background-paper border-border">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <p className="font-secondary text-base font-semibold text-foreground">Grupo do WhatsApp da comunidade</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Link exibido no card da aba Comunidade e na notificação fixa do sininho, pra todos os membros. Pode trocar aqui a qualquer momento.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Input
            value={groupUrl}
            onChange={e => setGroupUrl(e.target.value)}
            placeholder="https://chat.whatsapp.com/..."
            disabled={loading}
            className="flex-1 bg-secondary border-border text-foreground"
          />
          <Button onClick={save} disabled={loading || saving} className="bg-primary hover:bg-primary-hover text-primary-foreground shrink-0">
            {saving ? 'Salvando...' : 'Salvar link'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Gerenciamento da comunidade: pausa global + restrições por usuário ─────
// A regra de verdade mora no BANCO (policy de INSERT em course_comments):
// este card só liga/desliga o que o servidor aplica. Admin nunca é bloqueado.

interface RestrictionRow {
  user_id: string;
  restricted_until: string | null;
  reason: string | null;
  created_at: string;
  profile?: { name: string | null; email: string | null };
}

const DURACOES = [
  { value: '1h', label: '1 hora', ms: 3600e3 },
  { value: '6h', label: '6 horas', ms: 6 * 3600e3 },
  { value: '24h', label: '24 horas', ms: 24 * 3600e3 },
  { value: '3d', label: '3 dias', ms: 3 * 86400e3 },
  { value: '7d', label: '7 dias', ms: 7 * 86400e3 },
  { value: '30d', label: '30 dias', ms: 30 * 86400e3 },
  { value: 'permanente', label: 'Permanente (até remover)', ms: null as number | null },
];

function restricaoAtiva(r: RestrictionRow) {
  return r.restricted_until === null || new Date(r.restricted_until) > new Date();
}

function RestrictUserDialog({ open, onOpenChange, prefill, onDone }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  prefill: { user_id: string; label: string } | null;
  onDone: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; name: string | null; email: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<{ user_id: string; label: string } | null>(null);
  const [duracao, setDuracao] = useState('24h');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setSelected(prefill); setQuery(''); setResults([]); setDuracao('24h'); setReason(''); }
  }, [open, prefill]);

  const buscar = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const { data } = await (supabase as any)
      .from('profiles')
      .select('id, name, email')
      .or(`email.ilike.%${q.trim().replace(/[,()]/g, '')}%,name.ilike.%${q.trim().replace(/[,()]/g, '')}%`)
      .limit(8);
    setSearching(false);
    setResults(data || []);
  };

  const salvar = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const d = DURACOES.find(x => x.value === duracao)!;
      const until = d.ms === null ? null : new Date(Date.now() + d.ms).toISOString();
      const { data: me } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from('community_restrictions').upsert({
        user_id: selected.user_id,
        restricted_until: until,
        reason: reason.trim() || null,
        created_by: me?.user?.id || null,
      }, { onConflict: 'user_id' });
      if (error) throw error;
      toast.success(`${selected.label} restringido ${d.ms === null ? 'permanentemente' : `por ${d.label.toLowerCase()}`}`);
      onOpenChange(false);
      onDone();
    } catch (err: any) {
      toast.error('Erro ao restringir: ' + (err?.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background-paper border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <UserX className="w-4 h-4 text-destructive" /> Restringir usuário
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            O usuário não conseguirá publicar nem responder na comunidade durante o período. Ele continua vendo tudo normalmente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {selected ? (
            <div className="flex items-center justify-between rounded-lg bg-secondary border border-border px-3 py-2">
              <p className="text-sm text-foreground truncate">{selected.label}</p>
              {!prefill && (
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="text-muted-foreground shrink-0">trocar</Button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Input
                value={query}
                onChange={e => buscar(e.target.value)}
                placeholder="Buscar por e-mail ou nome…"
                className="bg-secondary border-border text-foreground"
              />
              {searching && <p className="text-xs text-muted-foreground">Buscando…</p>}
              {results.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelected({ user_id: r.id, label: r.name || r.email || r.id })}
                  className="w-full text-left rounded-lg border border-border bg-secondary/60 hover:bg-secondary px-3 py-2"
                >
                  <p className="text-sm text-foreground">{r.name || 'Sem nome'}</p>
                  <p className="text-xs text-muted-foreground">{r.email}</p>
                </button>
              ))}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum usuário encontrado.</p>
              )}
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Duração da restrição</p>
            <Select value={duracao} onValueChange={setDuracao}>
              <SelectTrigger className="bg-secondary border-border text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURACOES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Motivo (opcional, só a equipe vê)</p>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex.: spam, ofensas…" className="bg-secondary border-border text-foreground" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border text-foreground">Cancelar</Button>
          <Button onClick={salvar} disabled={!selected || saving} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            {saving ? 'Salvando…' : 'Restringir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommunityManagementCard({ refreshKey, onRestrictClick }: { refreshKey: number; onRestrictClick: () => void }) {
  const [paused, setPaused] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [restr, setRestr] = useState<RestrictionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingPause, setTogglingPause] = useState(false);
  const [confirmPause, setConfirmPause] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: st }, { data: rows }] = await Promise.all([
        (supabase as any).from('community_settings').select('id, posting_paused').maybeSingle(),
        (supabase as any).from('community_restrictions').select('user_id, restricted_until, reason, created_at').order('created_at', { ascending: false }),
      ]);
      setPaused(!!st?.posting_paused);
      setSettingsId(st?.id || null);
      const lista: RestrictionRow[] = rows || [];
      if (lista.length) {
        const { data: profs } = await (supabase as any).from('profiles').select('id, name, email').in('id', lista.map(r => r.user_id));
        const byId = new Map<string, { name: string | null; email: string | null }>((profs || []).map((p: any) => [p.id, { name: p.name, email: p.email }]));
        for (const r of lista) r.profile = byId.get(r.user_id);
      }
      setRestr(lista);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const aplicarPausa = async (novo: boolean) => {
    setTogglingPause(true);
    try {
      if (settingsId) {
        const { error } = await (supabase as any).from('community_settings').update({ posting_paused: novo }).eq('id', settingsId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any).from('community_settings').insert({ posting_paused: novo }).select('id').single();
        if (error) throw error;
        setSettingsId(data?.id || null);
      }
      setPaused(novo);
      toast.success(novo ? 'Novas publicações PAUSADAS para todos os alunos' : 'Publicações liberadas novamente');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err?.message || 'desconhecido'));
    } finally {
      setTogglingPause(false);
      setConfirmPause(false);
    }
  };

  const removerRestricao = async (r: RestrictionRow) => {
    setRemovingId(r.user_id);
    try {
      const { error } = await (supabase as any).from('community_restrictions').delete().eq('user_id', r.user_id);
      if (error) throw error;
      setRestr(prev => prev.filter(x => x.user_id !== r.user_id));
      toast.success('Restrição removida');
    } catch (err: any) {
      toast.error('Erro ao remover: ' + (err?.message || 'desconhecido'));
    } finally {
      setRemovingId(null);
    }
  };

  const ativas = restr.filter(restricaoAtiva);
  const expiradas = restr.filter(r => !restricaoAtiva(r));

  return (
    <Card className="bg-background-paper border-border">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-primary" />
          <p className="font-secondary text-base font-semibold text-foreground">Gerenciamento da comunidade</p>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-secondary/40 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <PauseCircle className="w-4 h-4 text-accent-warning" /> Pausar novas publicações
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Com a pausa ativa, nenhum aluno consegue publicar nem responder — as publicações existentes continuam visíveis. A equipe (admin) continua podendo publicar.
            </p>
            {paused && <p className="text-xs font-semibold text-accent-warning mt-1">Pausa ATIVA agora — alunos estão vendo o aviso na comunidade.</p>}
          </div>
          <Switch
            checked={paused}
            disabled={loading || togglingPause}
            onCheckedChange={(v) => { if (v) setConfirmPause(true); else aplicarPausa(false); }}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Usuários restritos {loading ? '' : `(${ativas.length})`}</p>
            <Button size="sm" variant="outline" onClick={onRestrictClick} className="border-border text-foreground gap-1.5">
              <UserX className="w-3.5 h-3.5" /> Restringir usuário
            </Button>
          </div>
          {!loading && ativas.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum usuário restrito no momento.</p>
          )}
          {ativas.map(r => (
            <div key={r.user_id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">{r.profile?.name || r.profile?.email || r.user_id}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {r.restricted_until ? `Até ${formatDateTimeSP(r.restricted_until)}` : 'Permanente (até remover)'}
                  {r.reason ? ` · ${r.reason}` : ''}
                </p>
              </div>
              <Button
                size="sm" variant="ghost"
                onClick={() => removerRestricao(r)}
                disabled={removingId === r.user_id}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                {removingId === r.user_id ? 'Removendo…' : 'Liberar'}
              </Button>
            </div>
          ))}
          {expiradas.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {expiradas.length} restrição(ões) já expirada(s) —{' '}
              <button className="underline hover:text-foreground" onClick={() => expiradas.forEach(removerRestricao)}>limpar</button>
            </p>
          )}
        </div>

        <AlertDialog open={confirmPause} onOpenChange={setConfirmPause}>
          <AlertDialogContent className="bg-background-paper border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Pausar a comunidade inteira?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Nenhum aluno vai conseguir publicar ou responder até você desativar a pausa. As publicações existentes continuam visíveis, e a equipe continua podendo publicar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border text-foreground">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => aplicarPausa(true)} disabled={togglingPause} className="bg-accent-warning hover:bg-accent-warning/90 text-background">
                {togglingPause ? 'Pausando…' : 'Pausar publicações'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

interface CommentRow {
  id: string;
  body: string;
  title: string | null;
  category: string | null;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  course_id: string | null;
  lesson_id: string | null;
  pinned: boolean;
  profiles: { name: string | null; email: string | null } | null;
  courses: { title: string | null } | null;
  lessons: { title: string | null } | null;
}

// Fixar só faz sentido pra tópico de verdade (sem parent, sem curso) — o
// mesmo critério já usado no card de estatística "Tópicos" logo abaixo.
const isTopic = (c: CommentRow) => !c.parent_id && !c.course_id;

export default function AdminCommunityPage() {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [filtered, setFiltered] = useState<CommentRow[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CommentRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingPinId, setTogglingPinId] = useState<string | null>(null);
  const [restrictOpen, setRestrictOpen] = useState(false);
  const [restrictPrefill, setRestrictPrefill] = useState<{ user_id: string; label: string } | null>(null);
  const [mgmtRefresh, setMgmtRefresh] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [data, roles] = await Promise.all([
        fetchAllRows<CommentRow>((f, t) =>
          supabase
            .from('course_comments')
            .select('id, body, title, category, created_at, user_id, parent_id, course_id, lesson_id, pinned, profiles(name, email), courses(title), lessons(title)')
            .order('created_at', { ascending: false })
            .range(f, t) as any,
        ),
        supabase.from('user_roles').select('user_id').eq('role', 'admin'),
      ]);
      setComments(data);
      setAdminIds(new Set((roles.data || []).map((r: any) => r.user_id)));
    } catch {
      toast.error('Erro ao carregar comentários');
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let result = comments;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.body.toLowerCase().includes(q) ||
        (c.title || '').toLowerCase().includes(q) ||
        (c.profiles?.name || '').toLowerCase().includes(q) ||
        (c.profiles?.email || '').toLowerCase().includes(q) ||
        (c.courses?.title || '').toLowerCase().includes(q) ||
        (c.lessons?.title || '').toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [comments, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('course_comments').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Comentário excluído');
      setComments(prev => prev.filter(c => c.id !== deleteTarget.id && c.parent_id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err?.message || 'desconhecido'));
    } finally {
      setDeleting(false);
    }
  };

  const handleTogglePin = async (c: CommentRow) => {
    setTogglingPinId(c.id);
    try {
      const { error } = await supabase.rpc('set_topic_pinned', { _topic_id: c.id, _pinned: !c.pinned });
      if (error) throw error;
      setComments(prev => prev.map(row => row.id === c.id ? { ...row, pinned: !c.pinned } : row));
      toast.success(c.pinned ? 'Tópico desafixado' : 'Tópico fixado no topo');
    } catch (err: any) {
      toast.error('Erro ao fixar: ' + (err?.message || 'desconhecido'));
    } finally {
      setTogglingPinId(null);
    }
  };

  const typeLabel = (c: CommentRow) => {
    if (c.parent_id) return 'Resposta';
    if (c.lessons?.title) return 'Aula';
    if (c.courses?.title) return 'Curso';
    return 'Tópico';
  };

  const contextLabel = (c: CommentRow) => c.lessons?.title || c.courses?.title || c.category || '—';

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-secondary text-3xl font-bold text-foreground flex items-center gap-2">
              <MessagesSquare className="w-7 h-7 text-primary" /> Comunidade
            </h1>
            <p className="text-muted-foreground mt-1">Gerenciar comentários, respostas e tópicos de todos os cursos</p>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchData} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <WhatsAppGroupSettingsCard />

        <CommunityManagementCard
          refreshKey={mgmtRefresh}
          onRestrictClick={() => { setRestrictPrefill(null); setRestrictOpen(true); }}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 3xl:max-w-[1400px]">
          {[
            { label: 'Total', value: comments.length },
            { label: 'Tópicos', value: comments.filter(c => !c.parent_id && !c.course_id).length },
            { label: 'Comentários (curso/aula)', value: comments.filter(c => !c.parent_id && c.course_id).length },
            { label: 'Respostas', value: comments.filter(c => c.parent_id).length },
          ].map((s, i) => (
            <Card key={i} className="bg-background-paper border-border">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
                <p className="font-secondary text-2xl font-bold text-foreground">{loading ? '—' : s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por autor, curso, aula ou texto..." className="pl-9 bg-background-paper border-border text-foreground" />
        </div>

        <Card className="bg-background-paper border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Autor', 'Tipo', 'Contexto', 'Conteúdo', 'Data', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {c.profiles?.name || c.profiles?.email?.split('@')[0] || 'Aluno'}
                          {adminIds.has(c.user_id) && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/25 rounded-full px-1.5 py-0.5">
                              <BadgeCheck className="w-2.5 h-2.5" /> Admin
                            </span>
                          )}
                        </div>
                        {c.profiles?.email && (
                          <p className="text-xs text-muted-foreground font-normal">{c.profiles.email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-foreground">
                            {typeLabel(c)}
                          </span>
                          {c.pinned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent-warning bg-accent-warning/10 border border-accent-warning/25 rounded-full px-1.5 py-0.5">
                              <Pin className="w-2.5 h-2.5" /> Fixado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{contextLabel(c)}</td>
                      <td className="px-4 py-3 text-sm text-foreground max-w-[320px]">
                        <p className="truncate">{c.title ? <span className="font-semibold">{c.title}: </span> : null}{c.body}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDateTimeSP(c.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {isTopic(c) && (
                            <Button
                              variant="ghost" size="icon" onClick={() => handleTogglePin(c)} disabled={togglingPinId === c.id}
                              className={c.pinned ? 'text-accent-warning hover:text-accent-warning/80' : 'text-muted-foreground hover:text-foreground'}
                              title={c.pinned ? 'Desafixar tópico' : 'Fixar tópico no topo'}
                            >
                              {c.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                            </Button>
                          )}
                          {!adminIds.has(c.user_id) && (
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => {
                                setRestrictPrefill({ user_id: c.user_id, label: c.profiles?.name || c.profiles?.email || 'este usuário' });
                                setRestrictOpen(true);
                              }}
                              className="text-muted-foreground hover:text-accent-warning"
                              title="Restringir este usuário de postar/responder"
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {loadError && !loading && (
                <div className="flex flex-col items-center gap-3 py-12 text-center px-4">
                  <AlertTriangle className="w-6 h-6 text-accent-warning" />
                  <p className="text-foreground text-sm font-medium">Não foi possível carregar os comentários</p>
                  <Button onClick={fetchData} size="sm" variant="outline" className="border-border text-muted-foreground hover:text-foreground gap-2">
                    <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                  </Button>
                </div>
              )}
              {!loadError && !loading && filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p>Nenhum comentário encontrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <RestrictUserDialog
        open={restrictOpen}
        onOpenChange={setRestrictOpen}
        prefill={restrictPrefill}
        onDone={() => setMgmtRefresh(k => k + 1)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-background-paper border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir comentário?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Isso também exclui todas as respostas desse comentário. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
