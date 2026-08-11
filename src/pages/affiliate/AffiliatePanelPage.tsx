import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Handshake, Copy, Link2, Tag, Megaphone, Banknote, Loader2, LogOut,
  TrendingUp, CalendarDays, Trophy, ExternalLink, CheckCircle2, Clock,
} from 'lucide-react';
import { PLAN_LABELS } from '@/lib/plans';
import { Seo } from '@/seo/Seo';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const SITE_URL = 'https://onemedcursos.com.br';
const MATERIAL_URL = 'https://drive.google.com/drive/folders/1N0ZYuF7yts5l_ZtfQR17PqY5DefAMN5O?usp=sharing';
const SUPPORT_PHONE = '5563999191551';

interface Affiliate {
  id: string;
  name: string;
  email: string;
  coupon_code: string | null;
  ref_code: string | null;
  pix_key: string | null;
  pix_name: string | null;
  pix_bank: string | null;
}

interface Sale {
  id: string;
  buyer_name: string | null;
  buyer_email: string;
  plan: string;
  amount: number;
  commission_amount: number;
  status: string;
  created_at: string;
}

// Padrão da moeda real: milhar com ponto e centavos com vírgula (R$ 4.469,00).
const brl = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AffiliatePanelPage() {
  const navigate = useNavigate();
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [pixOpen, setPixOpen] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [pixName, setPixName] = useState('');
  const [pixBank, setPixBank] = useState('');
  const [savingPix, setSavingPix] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) { navigate('/afiliado/login'); return; }
      const { data: aff } = await supabase.from('affiliates' as never)
        .select('*').eq('user_id', userData.user.id).maybeSingle();
      // Logado (ex: assinante vindo do menu da plataforma) mas ainda sem conta
      // de afiliado → direto pro cadastro, não pra tela de login.
      if (!aff) { navigate('/afiliado/registro'); return; }
      const a = aff as unknown as Affiliate;
      setAffiliate(a);
      setCouponInput(a.coupon_code || '');
      setPixKey(a.pix_key || '');
      setPixName(a.pix_name || a.name || '');
      setPixBank(a.pix_bank || '');
      const { data: rows } = await supabase.from('affiliate_sales' as never)
        .select('*').eq('affiliate_id', a.id).order('created_at', { ascending: false });
      setSales(((rows || []) as unknown as Sale[]));
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const now = Date.now();
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const hoje = sales.filter(s => new Date(s.created_at) >= dayStart);
    const semana = sales.filter(s => new Date(s.created_at).getTime() >= weekAgo);
    const soma = (arr: Sale[]) => arr.reduce((acc, s) => acc + Number(s.commission_amount), 0);
    return {
      hoje: hoje.length, hojeValor: soma(hoje),
      semana: semana.length, semanaValor: soma(semana),
      total: sales.length, totalValor: soma(sales),
      pendente: soma(sales.filter(s => s.status === 'pending')),
      recebido: soma(sales.filter(s => s.status === 'paid')),
    };
  }, [sales]);

  // O link leva pra LANDING, não pro checkout: o indicado conhece o produto,
  // pode fazer o teste grátis e comprar depois — a referência fica guardada
  // por 30 dias no navegador dele e a venda continua sendo do afiliado.
  // Link de indicação usa o ref_code IMUTÁVEL, não o cupom: trocar o cupom
  // não quebra mais a atribuição de quem já clicou no link. Fallback pro
  // cupom em contas antigas cujo ref_code ainda não foi preenchido.
  const shareToken = affiliate?.ref_code || affiliate?.coupon_code || null;
  const shareLink = shareToken ? `${SITE_URL}/?ref=${shareToken}` : null;

  const copy = (text: string, what: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${what} copiado!`))
      .catch(() => toast.error('Não foi possível copiar.'));
  };

  const saveCoupon = async () => {
    if (savingCoupon) return;
    setSavingCoupon(true);
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-coupon', {
        body: { code: couponInput },
      });
      if (error || data?.error) {
        let msg = data?.error;
        if (!msg && error && 'context' in (error as any)) {
          try { msg = (await (error as any).context.json())?.error; } catch { /* não-json */ }
        }
        throw new Error(msg || 'Não foi possível salvar o cupom.');
      }
      setAffiliate(prev => prev ? { ...prev, coupon_code: data.couponCode } : prev);
      setCouponInput(data.couponCode);
      toast.success(`Cupom ${data.couponCode} ativo! Seu link já usa o novo código.`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingCoupon(false);
    }
  };

  const savePix = async () => {
    if (!pixKey.trim() || !pixName.trim() || !pixBank.trim()) {
      toast.error('Preencha a chave PIX, o nome completo e o banco.');
      return;
    }
    setSavingPix(true);
    try {
      const { error } = await supabase.from('affiliates' as never)
        .update({ pix_key: pixKey.trim(), pix_name: pixName.trim(), pix_bank: pixBank.trim() } as never)
        .eq('id', affiliate!.id);
      if (error) throw error;
      setAffiliate(prev => prev ? { ...prev, pix_key: pixKey.trim(), pix_name: pixName.trim(), pix_bank: pixBank.trim() } : prev);
      toast.success('Dados de recebimento salvos!');
      setPixOpen(false);
      const msg = `Olá! Sou afiliado OneMed (${affiliate?.email}) e quero receber minha comissão pendente de ${brl(stats.pendente)}. Chave PIX: ${pixKey.trim()} (${pixBank.trim()}, ${pixName.trim()}).`;
      window.open(`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err?.message || 'desconhecido'));
    } finally {
      setSavingPix(false);
    }
  };

  const sair = async () => {
    await supabase.auth.signOut();
    navigate('/afiliado/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }
  if (!affiliate) return null;

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Painel do Afiliado | OneMed" description="Acompanhe suas vendas e comissões." path="/afiliado" noindex />

      {/* topo */}
      <header className="border-b border-border bg-background-paper">
        <div className="shell-form px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
            <Handshake className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">Painel do afiliado</p>
            <p className="text-xs text-muted-foreground truncate">{affiliate.name}</p>
          </div>
          <button
            onClick={() => setPixOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold px-4 py-2.5 transition-colors"
          >
            <Banknote className="w-4 h-4" /> Receber comissão
          </button>
          <button onClick={sair} title="Sair" className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="shell-form px-4 sm:px-6 py-8 space-y-6">
        {/* badges de vendas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: TrendingUp, label: 'Vendas hoje', count: stats.hoje, valor: stats.hojeValor },
            { icon: CalendarDays, label: 'Últimos 7 dias', count: stats.semana, valor: stats.semanaValor },
            { icon: Trophy, label: 'Desde o início', count: stats.total, valor: stats.totalValor },
          ].map(b => (
            <div key={b.label} className="rounded-2xl border border-border bg-background-paper p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-2">
                <b.icon className="w-3.5 h-3.5 text-primary" /> {b.label}
              </div>
              <p className="text-3xl font-bold text-foreground">{b.count}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{brl(b.valor)} em comissões</p>
            </div>
          ))}
        </div>

        {/* comissões pendente/recebida */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-background-paper p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" /> Comissão pendente
            </div>
            <p className="text-2xl font-bold text-foreground">{brl(stats.pendente)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background-paper p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent-success" /> Comissão recebida
            </div>
            <p className="text-2xl font-bold text-foreground">{brl(stats.recebido)}</p>
          </div>
        </div>

        {/* link + cupom */}
        <div className="rounded-2xl border border-border bg-background-paper p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Seu link de divulgação</h2>
            </div>
            {shareLink ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <code className="flex-1 rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground break-all">
                  {shareLink}
                </code>
                <button
                  onClick={() => copy(shareLink, 'Link')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold px-5 py-3 transition-colors shrink-0"
                >
                  <Copy className="w-4 h-4" /> Copiar link
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Gere seu cupom abaixo para liberar o link.</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Quem abrir por este link cai na página inicial e fica marcado como indicado seu por 30
              dias: no checkout o cupom de 10% entra sozinho, e mesmo que a pessoa faça o teste grátis
              e compre dias depois, a venda é sua.
            </p>
          </div>

          <div className="border-t border-border pt-5">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Seu cupom (10% de desconto)</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={couponInput}
                onChange={e => setCouponInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                maxLength={20}
                placeholder="SEUCUPOM10"
                className="flex-1 rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground tracking-widest font-semibold placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              <button
                onClick={saveCoupon}
                disabled={savingCoupon || !couponInput.trim() || couponInput === affiliate.coupon_code}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary hover:border-primary/40 disabled:opacity-50 text-foreground text-sm font-semibold px-5 py-3 transition-colors shrink-0"
              >
                {savingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                {affiliate.coupon_code ? 'Trocar cupom' : 'Gerar cupom'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              De 4 a 20 letras e números. Trocar o cupom desativa o anterior — links antigos param de dar desconto.
            </p>
          </div>
        </div>

        {/* material de divulgação */}
        <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">Material de divulgação</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Vídeos e artes prontos para divulgar nas suas redes — é só baixar e postar com o seu link.
            </p>
          </div>
          <a
            href={MATERIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold px-5 py-3 transition-colors shrink-0"
          >
            <ExternalLink className="w-4 h-4" /> Acessar material de divulgação
          </a>
        </div>

        {/* vendas */}
        <div className="rounded-2xl border border-border bg-background-paper overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Suas vendas</h2>
          </div>
          {sales.length === 0 ? (
            <p className="px-6 py-10 text-sm text-muted-foreground text-center">
              Nenhuma venda ainda. Compartilhe seu link e as vendas aparecem aqui em tempo real.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                    <th className="px-6 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Comprador</th>
                    <th className="px-4 py-3 font-medium">Plano</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium">Você ganhou</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(s => (
                    <tr key={s.id} className="border-b border-border/60 last:border-0">
                      <td className="px-6 py-3.5 text-muted-foreground whitespace-nowrap">
                        {new Date(s.created_at).toLocaleDateString('pt-BR')}{' '}
                        <span className="text-xs">{new Date(s.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-4 py-3.5 text-foreground">{s.buyer_name || s.buyer_email}</td>
                      <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{PLAN_LABELS[s.plan] || s.plan}</td>
                      <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{brl(s.amount)}</td>
                      <td className="px-4 py-3.5 font-semibold text-accent-success whitespace-nowrap">{brl(s.commission_amount)}</td>
                      <td className="px-6 py-3.5">
                        {s.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-success">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Pago
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" /> Pendente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* modal PIX */}
      <Dialog open={pixOpen} onOpenChange={setPixOpen}>
        <DialogContent className="bg-background-paper border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Banknote className="w-5 h-5 text-primary" /> Receber comissão
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Comissão pendente: <b className="text-foreground">{brl(stats.pendente)}</b>. Cadastre seus
              dados de recebimento — ao salvar, você será direcionado ao WhatsApp do suporte para
              solicitar o pagamento.
            </p>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Chave PIX</label>
              <input
                value={pixKey} onChange={e => setPixKey(e.target.value)}
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Nome completo do titular</label>
              <input
                value={pixName} onChange={e => setPixName(e.target.value)}
                placeholder="Nome como está no banco"
                className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Banco da chave PIX</label>
              <input
                value={pixBank} onChange={e => setPixBank(e.target.value)}
                placeholder="Ex: Nubank, Itaú, Caixa…"
                className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <button
              onClick={savePix} disabled={savingPix}
              className="w-full rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground font-semibold py-3.5 transition-colors flex items-center justify-center gap-2"
            >
              {savingPix ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
              Salvar e falar com o suporte
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
