import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Megaphone } from 'lucide-react';

interface AnnouncementRow {
  id: string;
  message: string | null;
  enabled: boolean;
}

export default function AnnouncementsPage() {
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('announcement_settings').select('*').maybeSingle();
      const row = data as AnnouncementRow | null;
      if (row) {
        setSettingsId(row.id);
        setMessage(row.message || '');
        setEnabled(row.enabled);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { message: message.trim() || null, enabled };
      if (settingsId) {
        const { error } = await supabase.from('announcement_settings').update(payload).eq('id', settingsId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('announcement_settings').insert(payload).select('id').single();
        if (error) throw error;
        setSettingsId((data as { id: string }).id);
      }
      toast.success('Aviso atualizado');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err?.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-secondary text-3xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-primary" /> Avisos
          </h1>
          <p className="text-muted-foreground mt-1">Mensagem exibida num card no topo da área de membros</p>
        </div>

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
      </div>
    </AdminLayout>
  );
}
