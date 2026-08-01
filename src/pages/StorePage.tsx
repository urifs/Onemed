import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ShoppingBag, ChevronDown, Loader2, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MemberHeader } from '@/components/member/MemberHeader';
import { Button } from '@/components/ui/button';
import { formatBRL } from '@/lib/utils';

interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  tagline: string | null;
  price: number;
}

// Mensagem de volta do Mercado Pago (back_urls apontam pra cá com ?compra=).
const RETORNO: Record<string, { texto: string; tom: 'ok' | 'aviso' }> = {
  aprovada: { texto: 'Pagamento aprovado! Em instantes você recebe o acesso ao recurso por e-mail.', tom: 'ok' },
  pendente: { texto: 'Pagamento em análise. Assim que for aprovado, o recurso é liberado.', tom: 'aviso' },
  recusada: { texto: 'O pagamento não foi concluído. Você pode tentar novamente.', tom: 'aviso' },
};

export default function StorePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  const retorno = RETORNO[searchParams.get('compra') || ''];

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: prods }, { data: orders }] = await Promise.all([
        supabase.from('store_products' as never)
          .select('id, name, description, tagline, price')
          .eq('active', true)
          .order('sort_order')
          .order('created_at'),
        user
          ? supabase.from('store_orders' as never)
            .select('product_id, status')
            .eq('user_id', user.id)
            .eq('status', 'approved')
          : Promise.resolve({ data: [] }),
      ]);
      if (!alive) return;
      setProducts(((prods || []) as unknown as StoreProduct[]));
      setPurchased(new Set(((orders || []) as { product_id: string }[]).map(o => o.product_id)));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const comprar = async (product: StoreProduct) => {
    if (buying) return;
    setBuying(product.id);
    try {
      const { data, error } = await supabase.functions.invoke('store-create-payment', {
        body: { productId: product.id },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      // O checkout do Mercado Pago é o mesmo das assinaturas.
      window.location.href = data.init_point || data.sandbox_init_point;
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível abrir o checkout');
      setBuying(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MemberHeader />
      <div className="max-w-2xl mx-auto px-4 md:px-0 py-8 space-y-6">
        <div>
          <h1 className="font-secondary text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" /> Loja
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Recursos adicionais para complementar seus estudos.
          </p>
        </div>

        {retorno && (
          <div
            className={`rounded-xl border p-4 flex items-start gap-3 text-sm ${
              retorno.tom === 'ok'
                ? 'border-accent-success/30 bg-accent-success/10 text-foreground'
                : 'border-accent-warning/30 bg-accent-warning/10 text-foreground'
            }`}
          >
            {retorno.tom === 'ok'
              ? <Check className="w-4 h-4 text-accent-success shrink-0 mt-0.5" />
              : <AlertTriangle className="w-4 h-4 text-accent-warning shrink-0 mt-0.5" />}
            <p className="flex-1">{retorno.texto}</p>
            <button
              onClick={() => setSearchParams({}, { replace: true })}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Fechar
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-secondary animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <ShoppingBag className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum recurso disponível no momento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map(p => {
              const aberto = expanded === p.id;
              const jaComprado = purchased.has(p.id);
              return (
                <div key={p.id} className="glass rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 p-4">
                    {/* A seta só aparece quando existe descrição pra mostrar. */}
                    {p.description ? (
                      <button
                        onClick={() => setExpanded(aberto ? null : p.id)}
                        aria-expanded={aberto}
                        aria-label={aberto ? 'Ocultar descrição' : 'Ver descrição'}
                        className="shrink-0 p-1 -m-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                      </button>
                    ) : <span className="w-4 shrink-0" />}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{p.name}</p>
                      {p.tagline && <p className="text-xs text-muted-foreground mt-0.5">{p.tagline}</p>}
                    </div>

                    <span className="text-sm font-bold text-foreground tabular-nums shrink-0">
                      {formatBRL(p.price)}
                    </span>

                    {jaComprado ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-success shrink-0 px-2">
                        <Check className="w-3.5 h-3.5" /> Comprado
                      </span>
                    ) : (
                      <Button size="sm" className="shrink-0" onClick={() => comprar(p)} disabled={buying === p.id}>
                        {buying === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Comprar'}
                      </Button>
                    )}
                  </div>

                  {aberto && p.description && (
                    <div className="px-4 pb-4 pt-0 pl-11">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed border-t border-border pt-3">
                        {p.description}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
