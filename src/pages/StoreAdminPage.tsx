import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ShoppingBag, Plus, Pencil, Trash2, Loader2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatBRL, formatDateTimeSP } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string | null;
  tagline: string | null;
  price: number;
  active: boolean;
  sort_order: number;
}

interface Order {
  id: string;
  product_name: string;
  email: string;
  price_paid: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

const VAZIO = { name: '', description: '', tagline: '', price: '', active: true, sort_order: 0 };

export default function StoreAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...VAZIO });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: prods }, { data: ords }] = await Promise.all([
      supabase.from('store_products' as never).select('*').order('sort_order').order('created_at'),
      supabase.from('store_orders' as never).select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setProducts(((prods || []) as unknown as Product[]));
    setOrders(((ords || []) as unknown as Order[]));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const abrirNovo = () => { setEditingId(null); setForm({ ...VAZIO }); setDialogOpen(true); };

  const abrirEdicao = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description || '',
      tagline: p.tagline || '',
      price: String(p.price),
      active: p.active,
      sort_order: p.sort_order,
    });
    setDialogOpen(true);
  };

  const salvar = async () => {
    // Aceita "49,90" e "49.90" — no teclado brasileiro a vírgula é o natural,
    // e Number('49,90') seria NaN, salvando produto sem preço.
    const preco = Number(String(form.price).replace(',', '.'));
    if (!form.name.trim()) return toast.error('Informe o nome do produto');
    if (!Number.isFinite(preco) || preco <= 0) return toast.error('Informe um preço válido');

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      tagline: form.tagline.trim() || null,
      price: preco,
      active: form.active,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editingId
      ? await supabase.from('store_products' as never).update(payload as never).eq('id', editingId)
      : await supabase.from('store_products' as never).insert(payload as never);
    setSaving(false);

    if (error) return toast.error(error.message);
    toast.success(editingId ? 'Produto atualizado' : 'Produto criado');
    setDialogOpen(false);
    load();
  };

  const alternarAtivo = async (p: Product) => {
    const { error } = await supabase.from('store_products' as never)
      .update({ active: !p.active } as never).eq('id', p.id);
    if (error) return toast.error(error.message);
    load();
  };

  const excluir = async (p: Product) => {
    // Vendas antigas não podem sumir junto com o produto — a FK é ON DELETE
    // SET NULL e o pedido guarda o nome e o valor pagos na época.
    if (!confirm(`Excluir "${p.name}"? As vendas já feitas continuam no histórico.`)) return;
    const { error } = await supabase.from('store_products' as never).delete().eq('id', p.id);
    if (error) return toast.error(error.message);
    toast.success('Produto excluído');
    load();
  };

  const aprovados = orders.filter(o => o.status === 'approved');
  const receita = aprovados.reduce((soma, o) => soma + Number(o.price_paid), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-primary" /> Loja
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Recursos adicionais à venda na área de membros, pelo checkout do Mercado Pago.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/membros/loja"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Ver a loja
            </a>
            <Button onClick={abrirNovo}><Plus className="w-4 h-4" /> Novo produto</Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="bg-background-paper border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Produtos ativos</p>
              <p className="text-2xl font-bold text-foreground">{products.filter(p => p.active).length}</p>
            </CardContent>
          </Card>
          <Card className="bg-background-paper border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Vendas aprovadas</p>
              <p className="text-2xl font-bold text-foreground">{aprovados.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-background-paper border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Receita da loja</p>
              <p className="text-2xl font-bold text-accent-success">{formatBRL(receita)}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-background-paper border-border">
          <CardHeader><CardTitle className="text-base font-medium text-foreground">Produtos</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-5 space-y-3">{[0, 1].map(i => <div key={i} className="h-12 bg-secondary rounded animate-pulse" />)}</div>
            ) : products.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                Nenhum produto cadastrado. Clique em "Novo produto" para criar o primeiro.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {products.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        {p.name}
                        {!p.active && (
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-secondary border border-border rounded px-1.5 py-0.5">
                            Oculto
                          </span>
                        )}
                      </p>
                      {p.tagline && <p className="text-xs text-muted-foreground truncate">{p.tagline}</p>}
                    </div>
                    <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">{formatBRL(p.price)}</span>
                    <button
                      onClick={() => alternarAtivo(p)}
                      title={p.active ? 'Ocultar da loja' : 'Mostrar na loja'}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      {p.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => abrirEdicao(p)}
                      title="Editar"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => excluir(p)}
                      title="Excluir"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-background-paper border-border">
          <CardHeader><CardTitle className="text-base font-medium text-foreground">Últimas vendas</CardTitle></CardHeader>
          <CardContent className="p-0">
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhuma venda ainda.</p>
            ) : (
              <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
                {orders.map(o => (
                  <div key={o.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground truncate">{o.product_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {o.email} · {formatDateTimeSP(o.paid_at || o.created_at)}
                      </p>
                    </div>
                    <span className="tabular-nums text-foreground shrink-0">{formatBRL(o.price_paid)}</span>
                    <span
                      className={`text-[11px] font-semibold rounded-full px-2 py-0.5 shrink-0 ${
                        o.status === 'approved'
                          ? 'text-accent-success bg-accent-success/10 border border-accent-success/25'
                          : 'text-muted-foreground bg-secondary border border-border'
                      }`}
                    >
                      {o.status === 'approved' ? 'Aprovada' : o.status === 'pending' ? 'Pendente' : o.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-background-paper border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingId ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Banco de questões comentadas" />
            </div>
            <div>
              <Label>Resumo (aparece embaixo do nome)</Label>
              <Input value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} placeholder="Ex: PDF · 320 páginas" />
            </div>
            <div>
              <Label>Descrição (abre na seta, na loja)</Label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={5}
                spellCheck
                lang="pt-BR"
                placeholder="O que o aluno recebe ao comprar…"
                className="w-full resize-none rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preço (R$)</Label>
                <Input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="49,90" inputMode="decimal" />
              </div>
              <div>
                <Label>Ordem na lista</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={e => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              Visível na loja
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
