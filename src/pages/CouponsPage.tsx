import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateSP } from '@/lib/utils';
import { Tag, Plus, Pencil, Trash2, X, AlertTriangle, RefreshCw } from 'lucide-react';

const PLAN_LABELS: Record<string, string> = {
  all:           'Todos os planos',
  monthly:       'Só Mensal',
  annual:        'Só Anual',
  lifetime:      'Só Vitalício',
  lifetime_plus: 'Só Vitalício Plus',
  lifetime_pro:  'Só Vitalício Pro',
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ code: '', discount_percent: '', description: '', active: true, max_uses: '', allowed_plans: 'all' });
  const [submitting, setSubmitting] = useState(false);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCoupons(data || []);
    } catch {
      toast.error('Erro ao carregar cupons');
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', discount_percent: '', description: '', active: true, max_uses: '', allowed_plans: 'all' });
    setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      code: c.code,
      discount_percent: String(c.discount_percent),
      description: c.description || '',
      active: c.active,
      max_uses: c.max_uses ? String(c.max_uses) : '',
      allowed_plans: c.allowed_plans || 'all',
    });
    setShowModal(true);
  };

  const submit = async () => {
    if (!form.code || !form.discount_percent) { toast.error('Preencha os campos obrigatórios'); return; }
    setSubmitting(true);
    try {
      const payload = {
        code: form.code.toUpperCase(),
        discount_percent: parseInt(form.discount_percent),
        description: form.description || null,
        active: form.active,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        allowed_plans: form.allowed_plans,
      };
      if (editing) {
        await supabase.from('coupons').update(payload).eq('id', editing.id);
        toast.success('Cupom atualizado!');
      } else {
        await supabase.from('coupons').insert(payload);
        toast.success('Cupom criado!');
      }
      setShowModal(false);
      fetchCoupons();
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  // Cupom de AFILIADO nunca pode ser apagado por aqui: o link de divulgação
  // (?ref=CUPOM) e a atribuição de comissão dependem dele — apagar quebra o
  // checkout de todo indicado ("Cupom inválido ou expirado"). Foi exatamente
  // o que derrubou 18 cupons de afiliados em 04/08. Pra tirar de circulação,
  // desative — o afiliado troca o código pelo painel dele.
  const deleteCoupon = async (id: string) => {
    const alvo = coupons.find(c => c.id === id);
    if (alvo) {
      const { data: dono, error: donoErr } = await supabase.from('affiliates' as never)
        .select('email').eq('coupon_code', alvo.code).maybeSingle() as any;
      // FAIL-CLOSED: se a checagem de afiliado FALHAR (rede/RLS), não dá pra
      // afirmar que o cupom é seguro pra apagar — bloqueia. Sem isto, um erro
      // transitório pulava a guarda e deixava apagar o cupom de um afiliado
      // (foi o que derrubou 18 cupons em 04/08).
      if (donoErr) {
        toast.error('Não foi possível verificar se este cupom é de afiliado. Tente de novo antes de excluir.');
        return;
      }
      if (dono) {
        toast.error(`Este é o cupom do afiliado ${dono.email} — apagar quebraria o link de divulgação dele. Desative em vez de excluir.`);
        return;
      }
    }
    if (!confirm('Excluir este cupom de vez? Quem tentar usá-lo verá "cupom inválido". Para só tirar de circulação, prefira desativar.')) return;
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir: ' + error.message); return; }
    toast.success('Cupom deletado');
    fetchCoupons();
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from('coupons').update({ active: !active }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar: ' + error.message); return; }
    fetchCoupons();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-secondary text-3xl font-bold text-foreground">Cupons</h1>
            <p className="text-muted-foreground mt-1">Gerencie os cupons de desconto</p>
          </div>
          <Button onClick={openCreate} className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
            <Plus className="w-4 h-4" /> Novo Cupom
          </Button>
        </div>

        <Card className="bg-background-paper border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Código', 'Desconto', 'Planos', 'Descrição', 'Usos', 'Ativo', 'Expira', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-mono uppercase text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {coupons.map(c => (
                    <tr key={c.id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-bold text-foreground">{c.code}</td>
                      <td className="px-4 py-3 text-sm text-primary font-semibold">{c.discount_percent}%</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{PLAN_LABELS[c.allowed_plans || 'all']}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{c.description || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{c.times_used || 0}{c.max_uses ? `/${c.max_uses}` : ''}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive(c.id, c.active)} className={`w-8 h-5 rounded-full transition-colors duration-200 ${c.active ? 'bg-accent-success' : 'bg-border'}`}>
                          <div className={`w-4 h-4 bg-white rounded-full mx-0.5 transition-transform duration-200 ${c.active ? 'translate-x-3' : 'translate-x-0'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{c.expires_at ? formatDateSP(c.expires_at) : '∞'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(c)} className="p-1.5 text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteCoupon(c.id)} className="p-1.5 text-muted-foreground hover:text-primary"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {loadError && !loading && (
                <div className="flex flex-col items-center gap-3 py-12 text-center px-4">
                  <AlertTriangle className="w-6 h-6 text-accent-warning" />
                  <p className="text-foreground text-sm font-medium">Não foi possível carregar os cupons</p>
                  <Button onClick={fetchCoupons} size="sm" variant="outline" className="border-border text-muted-foreground hover:text-foreground gap-2">
                    <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                  </Button>
                </div>
              )}
              {!loadError && coupons.length === 0 && !loading && <p className="text-muted-foreground text-center py-12">Nenhum cupom criado</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-background-paper rounded-2xl p-6 w-full max-w-md border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-secondary text-xl font-bold text-foreground">{editing ? 'Editar' : 'Novo'} Cupom</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Código *</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="DESCONTO20" className="bg-secondary border-border text-foreground font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Desconto (%) *</Label>
                <Input type="number" min="1" max="100" value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))} className="bg-secondary border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Válido para</Label>
                <Select value={form.allowed_plans} onValueChange={v => setForm(f => ({ ...f, allowed_plans: v }))}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background-paper border-border">
                    <SelectItem value="all">Todos os planos</SelectItem>
                    <SelectItem value="monthly">Só Plano Mensal (R$ 49)</SelectItem>
                    <SelectItem value="annual">Só Plano Anual (R$ 199)</SelectItem>
                    <SelectItem value="lifetime">Só Plano Vitalício (R$ 299,90)</SelectItem>
                    <SelectItem value="lifetime_plus">Só Plano Vitalício Plus (R$ 599)</SelectItem>
                    <SelectItem value="lifetime_pro">Só Plano Vitalício Pro (R$ 997)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Descrição</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-secondary border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Máximo de usos (vazio = ilimitado)</Label>
                <Input type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} className="bg-secondary border-border text-foreground" />
              </div>
              <Button onClick={submit} disabled={submitting} className="w-full bg-primary hover:bg-primary-hover text-primary-foreground">
                {submitting ? 'Salvando...' : editing ? 'Atualizar' : 'Criar Cupom'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
