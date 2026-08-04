import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Megaphone, Bell, Plus, Trash2, ArrowUp, ArrowDown, Circle } from 'lucide-react';

interface AnnouncementRow {
  id: string;
  message: string | null;
  enabled: boolean;
  notifications_heading?: string | null;
}

interface NotificationItem {
  id: string;
  label: string;
  done: boolean;
  sort_order: number;
}

const DEFAULT_HEADING = 'Cursos em processo de atualização:';

export default function AnnouncementsPage() {
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── sino de notificações ────────────────────────────────────────────────
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [heading, setHeading] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDone, setNewDone] = useState(false);
  const [savingHeading, setSavingHeading] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data }, itemsRes] = await Promise.all([
        supabase.from('announcement_settings').select('*').maybeSingle(),
        supabase.from('notification_items' as never).select('*').order('sort_order'),
      ]);
      const row = data as AnnouncementRow | null;
      if (row) {
        setSettingsId(row.id);
        setMessage(row.message || '');
        setEnabled(row.enabled);
        setHeading(row.notifications_heading || '');
      }
      setItems(((itemsRes.data || []) as unknown as NotificationItem[]));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Garante a linha única de announcement_settings e devolve o id — o título
  // do sino mora nela, então salvar o título antes de existir aviso também
  // precisa criar a linha.
  const ensureSettingsRow = async (): Promise<string> => {
    if (settingsId) return settingsId;
    const { data, error } = await supabase.from('announcement_settings')
      .insert({ message: null, enabled: false })
      .select('id').single();
    if (error) throw error;
    const id = (data as { id: string }).id;
    setSettingsId(id);
    return id;
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { message: message.trim() || null, enabled };
      const id = await ensureSettingsRow();
      const { error } = await supabase.from('announcement_settings').update(payload).eq('id', id);
      if (error) throw error;
      toast.success('Aviso atualizado');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err?.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const saveHeading = async () => {
    setSavingHeading(true);
    try {
      const id = await ensureSettingsRow();
      const { error } = await supabase.from('announcement_settings')
        .update({ notifications_heading: heading.trim() || null } as never)
        .eq('id', id);
      if (error) throw error;
      toast.success('Título atualizado');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err?.message || 'desconhecido'));
    } finally {
      setSavingHeading(false);
    }
  };

  const addItem = async () => {
    const label = newLabel.trim();
    if (!label) return;
    try {
      const sort = items.length ? Math.max(...items.map(i => i.sort_order)) + 1 : 0;
      const { data, error } = await supabase.from('notification_items' as never)
        .insert({ label, done: newDone, sort_order: sort } as never)
        .select('*').single();
      if (error) throw error;
      setItems(prev => [...prev, data as unknown as NotificationItem]);
      setNewLabel('');
      setNewDone(false);
      toast.success('Notificação adicionada');
    } catch (err: any) {
      toast.error('Erro ao adicionar: ' + (err?.message || 'desconhecido'));
    }
  };

  const toggleDone = async (item: NotificationItem) => {
    const { error } = await supabase.from('notification_items' as never)
      .update({ done: !item.done } as never).eq('id', item.id);
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, done: !i.done } : i));
  };

  const renameItem = async (item: NotificationItem, label: string) => {
    if (label.trim() === item.label) return;
    const { error } = await supabase.from('notification_items' as never)
      .update({ label: label.trim() } as never).eq('id', item.id);
    if (error) { toast.error('Erro ao renomear: ' + error.message); return; }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, label: label.trim() } : i));
  };

  const removeItem = async (item: NotificationItem) => {
    const { error } = await supabase.from('notification_items' as never).delete().eq('id', item.id);
    if (error) { toast.error('Erro ao excluir: ' + error.message); return; }
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  const move = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const a = items[index], b = items[j];
    // troca os sort_order dos dois — simples e à prova de buraco na sequência
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('notification_items' as never).update({ sort_order: b.sort_order } as never).eq('id', a.id),
      supabase.from('notification_items' as never).update({ sort_order: a.sort_order } as never).eq('id', b.id),
    ]);
    if (e1 || e2) { toast.error('Erro ao reordenar'); return; }
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...b, sort_order: a.sort_order };
      next[j] = { ...a, sort_order: b.sort_order };
      return next;
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-secondary text-3xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-primary" /> Avisos
          </h1>
          <p className="text-muted-foreground mt-1">Aviso no topo da área de membros e notificações do sininho</p>
        </div>

        <Tabs defaultValue="aviso">
          <TabsList className="bg-background-paper border border-border">
            <TabsTrigger value="aviso" className="gap-1.5"><Megaphone className="w-3.5 h-3.5" /> Aviso</TabsTrigger>
            <TabsTrigger value="notificacoes" className="gap-1.5"><Bell className="w-3.5 h-3.5" /> Notificações</TabsTrigger>
          </TabsList>

          <TabsContent value="aviso">
            <Card className="bg-background-paper border-border">
              <CardHeader>
                <CardTitle className="text-base font-medium text-foreground">Mensagem do aviso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Ex: Estamos atualizando o curso X, novidades em breve!"
                  rows={4}
                  disabled={loading}
                  className="bg-secondary border-border text-foreground"
                />

                <label className="flex items-center gap-2.5 cursor-pointer w-fit">
                  <Checkbox checked={enabled} onCheckedChange={v => setEnabled(v === true)} disabled={loading} />
                  <span className="text-sm text-foreground">Exibir aviso para os membros</span>
                </label>

                {enabled && message.trim() && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Pré-visualização</p>
                    <div className="rounded-xl bg-primary px-4 py-3 flex items-start gap-2.5">
                      <Megaphone className="w-4 h-4 text-white shrink-0 mt-0.5" />
                      <p className="text-sm text-white leading-snug">{message}</p>
                    </div>
                  </div>
                )}

                <Button onClick={save} disabled={loading || saving} className="bg-primary hover:bg-primary-hover text-primary-foreground">
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notificacoes" className="space-y-4">
            <Card className="bg-background-paper border-border">
              <CardHeader>
                <CardTitle className="text-base font-medium text-foreground">Título da seção</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Input
                  value={heading}
                  onChange={e => setHeading(e.target.value)}
                  placeholder={DEFAULT_HEADING}
                  disabled={loading}
                  className="bg-secondary border-border text-foreground"
                />
                <Button onClick={saveHeading} disabled={loading || savingHeading} className="bg-primary hover:bg-primary-hover text-primary-foreground shrink-0">
                  {savingHeading ? 'Salvando...' : 'Salvar'}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-background-paper border-border">
              <CardHeader>
                <CardTitle className="text-base font-medium text-foreground">Itens da lista</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Bolinha verde = curso já atualizado · bolinha vermelha = em atualização.
                  A ordem aqui é a ordem exibida para o aluno.
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2">
                    <button
                      onClick={() => toggleDone(item)}
                      title={item.done ? 'Marcar como em atualização (bolinha vermelha)' : 'Marcar como atualizado (bolinha verde)'}
                      className="shrink-0"
                    >
                      <Circle className={`w-3 h-3 ${item.done ? 'fill-accent-success text-accent-success' : 'fill-primary text-primary'}`} />
                    </button>
                    <Input
                      defaultValue={item.label}
                      onBlur={e => renameItem(item, e.target.value)}
                      className="h-8 bg-transparent border-transparent focus:border-border text-foreground text-sm"
                    />
                    <button onClick={() => move(i, -1)} disabled={i === 0} title="Subir"
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Descer"
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeItem(item)} title="Excluir"
                      className="p-1.5 rounded text-muted-foreground hover:text-primary">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {items.length === 0 && !loading && (
                  <p className="text-sm text-muted-foreground">Nenhuma notificação — o sininho mostra só o convite do grupo.</p>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Input
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
                    placeholder="Novo item (ex: MED 2026)"
                    className="bg-secondary border-border text-foreground"
                  />
                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0 text-xs text-muted-foreground">
                    <Checkbox checked={newDone} onCheckedChange={v => setNewDone(v === true)} />
                    Atualizado
                  </label>
                  <Button onClick={addItem} disabled={!newLabel.trim()} size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
