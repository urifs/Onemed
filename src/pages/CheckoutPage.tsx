import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { trackInitiateCheckout, trackViewContent, trackAddToCart } from '@/lib/pixel';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import {
  Stethoscope,
  Check,
  QrCode,
  FileText,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Shield,
  Clock,
  Tag,
  Ticket,
  ExternalLink,
  Loader2,
  XCircle,
  Mail,
  Phone,
  User,
  Infinity,
  ChevronDown,
  Calendar,
  HardDrive,
  Crown,
} from 'lucide-react';
import { formatWhatsApp, extractFunctionErrorMessage } from '@/lib/utils';
import { getAffiliateRef } from '@/lib/affiliateRef';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PlanComparisonTable } from '@/components/PlanComparisonTable';

const MEDUF_URL = 'https://meduf.com.br/about';

// Deixa clicável só o trecho "Meduf" dentro do texto da feature, sem
// interromper o clique no card inteiro (que seleciona o plano).
function renderFeatureText(feature: string) {
  const idx = feature.indexOf('Meduf');
  if (idx === -1) return feature;
  return (
    <>
      {feature.slice(0, idx)}
      <a
        href={MEDUF_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="underline decoration-dotted underline-offset-2 hover:text-foreground"
      >
        Meduf
      </a>
      {feature.slice(idx + 'Meduf'.length)}
    </>
  );
}

const COUNTRIES = [
  { code: '+55', country: 'Brasil', flag: 'BR' },
  { code: '+54', country: 'Argentina', flag: 'AR' },
  { code: '+595', country: 'Paraguai', flag: 'PY' },
  { code: '+598', country: 'Uruguai', flag: 'UY' },
  { code: '+591', country: 'Bolívia', flag: 'BO' },
  { code: '+56', country: 'Chile', flag: 'CL' },
  { code: '+51', country: 'Peru', flag: 'PE' },
  { code: '+57', country: 'Colômbia', flag: 'CO' },
];

const UPSELL_PRICE = 19.90;
const UPSELL2_PRICE = 9.90;

const PLANS: Record<string, {
  name: string; originalPrice?: number; price: number; period: string;
  icon: React.ElementType; features: string[]; badge?: string;
}> = {
  monthly: {
    name: 'Plano Mensal',
    price: 99.00,
    period: '/mês',
    icon: Calendar,
    features: [
      'Acesso por 1 mês',
      '1 tela simultânea',
      'Acesso a todo o acervo atual da plataforma',
    ],
  },
  annual: {
    name: 'Plano Anual',
    originalPrice: 399,
    price: 299,
    period: '/ano',
    icon: Clock,
    features: [
      'Acesso por 1 ano',
      '2 telas simultâneas',
      'Acesso a todo o acervo atual da plataforma',
      'Ferramentas de IA (flashcards, banco de questões, cronograma e assistente): até 5 usos por dia em cada',
    ],
  },
  lifetime: {
    name: 'Plano Vitalício',
    originalPrice: 667,
    price: 499.00,
    period: ' único',
    icon: Infinity,
    features: [
      'Acesso vitalício',
      '2 telas simultâneas',
      'Atualizações anuais dos cursos básicos',
      'Download de arquivos e apostilas (PDF, Anki e mais)',
      'Ferramentas de IA (flashcards, banco de questões, cronograma e assistente): até 10 usos por dia em cada',
    ],
    badge: 'MAIS POPULAR',
  },
  lifetime_plus: {
    name: 'Plano Vitalício Plus',
    price: 798.00,
    period: ' único',
    icon: HardDrive,
    features: [
      'Acesso vitalício',
      '4 telas simultâneas',
      'Atualizações anuais dos cursos intermediários',
      'Backup de tudo da plataforma no seu próprio Google Drive',
      'Download de arquivos e apostilas (PDF, Anki e mais)',
      'Ferramentas de IA (flashcards, banco de questões, cronograma e assistente): até 20 usos por dia em cada',
    ],
  },
  lifetime_pro: {
    name: 'Plano Vitalício Pro',
    originalPrice: 2000,
    price: 1497.00,
    period: ' único',
    icon: Crown,
    features: [
      'Acesso vitalício',
      '6 telas simultâneas',
      'Atualizações mensais de 95% de todo o conteúdo + adição de novos cursos',
      'Backup de tudo da plataforma no seu próprio Google Drive',
      'Download de arquivos e apostilas (PDF, Anki e mais)',
      'Download das aulas em vídeo — exclusivo do Pro',
      'Ferramentas de IA (flashcards, banco de questões, cronograma e assistente): uso ilimitado',
      'Acesso à IA de diagnósticos Meduf (meduf.com.br)',
    ],
    badge: 'MAIS COMPLETO',
  },
};

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const initialPlan = searchParams.get('plan') || 'lifetime';
  // Cupom explícito na URL vence; sem ele, o cupom do afiliado que indicou
  // (guardado por 30 dias desde o clique no link ?ref=) é aplicado sozinho —
  // é o que garante o desconto do indicado mesmo comprando dias depois.
  const initialCoupon = searchParams.get('coupon') || getAffiliateRef() || '';

  const [selectedPlan, setSelectedPlan] = useState(initialPlan);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: plan, 2: upsell, 3: data, 4: payment

  // Upsell
  const [upsellSelected, setUpsellSelected] = useState(false);
  const [upsell2Selected, setUpsell2Selected] = useState(false);

  // Customer data
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Coupon
  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [couponApplied, setCouponApplied] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);

  // Auto-apply coupon from URL + ViewContent
  //
  // Aqui o evento certo é ViewContent: abrir a página de planos não é iniciar
  // um checkout. Enquanto o InitiateCheckout disparava neste ponto, a Meta
  // recebia ~565 "inícios de checkout" para 203 checkouts reais, todos sem
  // email (o formulário só é preenchido três passos adiante) — ou seja, a
  // campanha otimizava para quem abre a página, não para quem quer comprar.
  useEffect(() => {
    // Cupom da URL: aplicado com feedback normal. Cupom vindo só da indicação
    // de afiliado (?ref= guardado): aplicado em silêncio — se não valer mais,
    // o checkout segue limpo, sem erro na cara do comprador.
    if (initialCoupon) handleApplyCoupon(initialCoupon, { silent: !searchParams.get('coupon') });
    const plan = PLANS[selectedPlan];
    if (plan) trackViewContent(selectedPlan, plan.price);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `silent` é para o cupom auto-aplicado da indicação de afiliado: se o
  // afiliado trocou/desativou o cupom desde o clique no link, o comprador não
  // pode abrir o checkout já levando um toast de erro do nada.
  const handleApplyCoupon = async (code?: string, opts?: { silent?: boolean }) => {
    const c = (code || couponCode).trim();
    if (!c) { if (!opts?.silent) toast.error('Digite um código de cupom'); return; }
    setCouponLoading(true);
    try {
      const { data } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', c.toUpperCase())
        .eq('active', true)
        .single();
      if (data) {
        setCouponApplied(data);
        setDiscountPercent(data.discount_percent);
        const allowedPlans = data.allowed_plans || 'all';
        if (allowedPlans !== 'all' && allowedPlans !== selectedPlan) {
          setSelectedPlan(allowedPlans);
        }
        toast.success(`Cupom aplicado! ${data.discount_percent}% de desconto`);
      } else {
        setCouponApplied(null);
        setDiscountPercent(0);
        if (!opts?.silent) toast.error('Cupom inválido ou expirado');
        else setCouponCode('');
      }
    } catch {
      if (!opts?.silent) toast.error('Erro ao validar cupom');
      else { setCouponApplied(null); setDiscountPercent(0); setCouponCode(''); }
    } finally {
      setCouponLoading(false);
    }
  };

  const handleContinueFromPlan = () => {
    const allowedPlans = couponApplied?.allowed_plans;
    if (allowedPlans && allowedPlans !== 'all' && allowedPlans !== selectedPlan) {
      const planName = PLANS[allowedPlans]?.name || allowedPlans;
      toast.error(`O cupom ${couponApplied.code} é válido apenas para o ${planName}`);
      return;
    }
    // Plano escolhido = item no carrinho. Junto com o ViewContent da abertura
    // e o InitiateCheckout do clique de pagar, isso fecha o funil que a Meta
    // usa pra montar público e otimizar.
    const extras: string[] = [];
    if (upsellSelected) extras.push('upsell');
    if (upsell2Selected) extras.push('upsell2');
    trackAddToCart(selectedPlan, getTotalPrice(), extras);

    setStep(2);
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponApplied(null);
    setDiscountPercent(0);
    toast.info('Cupom removido');
  };

  const getDiscountedPrice = (originalPrice: number) => {
    if (discountPercent > 0) return originalPrice - (originalPrice * discountPercent / 100);
    return originalPrice;
  };

  const getTotalPrice = () => {
    let total = getDiscountedPrice(PLANS[selectedPlan].price);
    if (upsellSelected) total += UPSELL_PRICE;
    if (upsell2Selected) total += UPSELL2_PRICE;
    return total;
  };


  const validateCustomerData = () => {
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      toast.error('Informe um e-mail válido');
      return false;
    }
    if (!customerEmail.toLowerCase().endsWith('@gmail.com')) {
      toast.error('Use um e-mail Gmail (@gmail.com). O acesso ao Drive funciona melhor com Gmail.', { duration: 6000 });
      return false;
    }
    if (!customerWhatsapp.trim() || customerWhatsapp.replace(/\D/g, '').length < 10) {
      toast.error('Informe um WhatsApp válido');
      return false;
    }
    return true;
  };

  const handleMercadoPagoCheckout = async () => {
    if (!validateCustomerData()) return;
    // Segunda checagem, além da trava na tela de seleção de plano — evita
    // seguir com uma combinação que o servidor vai rejeitar de qualquer forma.
    const allowedPlans = couponApplied?.allowed_plans;
    if (allowedPlans && allowedPlans !== 'all' && allowedPlans !== selectedPlan) {
      const planName = PLANS[allowedPlans]?.name || allowedPlans;
      toast.error(`O cupom ${couponApplied.code} é válido apenas para o ${planName}`);
      return;
    }
    // InitiateCheckout de verdade: o usuário mandou ir pro pagamento e o
    // formulário já está preenchido, então email/telefone/nome vão junto na
    // correspondência avançada (antes esse evento saía com email em 1%).
    trackInitiateCheckout(selectedPlan, getTotalPrice(), {
      email: customerEmail,
      phone: `${selectedCountry.code}${customerWhatsapp.replace(/\D/g, '')}`,
      name: customerName,
      country: selectedCountry.flag || undefined,  // 'BR', 'AR'… é o ISO de 2 letras que a Meta espera
    });

    setLoading(true);
    try {
      const ref = `onemed_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const getCookie = (name: string) =>
        document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1] ?? null;

      const fbclid = localStorage.getItem('om_fbclid') || null;

      const { error: buyerErr } = await supabase.from('buyers').insert({
        email: customerEmail.toLowerCase().trim(),
        name: customerName.trim() || null,
        whatsapp: `${selectedCountry.code}${customerWhatsapp.replace(/\D/g, '')}`,
        plan: selectedPlan,
        amount: getTotalPrice(),
        status: 'pending',
        external_reference: ref,
        upsell_purchased: upsellSelected,
        upsell2_purchased: upsell2Selected,
        fbp: getCookie('_fbp'),
        fbc: getCookie('_fbc'),
        fbclid,
        // Afiliado que indicou este comprador (link ?ref=). Vai gravado aqui
        // porque a atribuição não pode depender do cupom: se o comprador
        // trocar ou remover o cupom no checkout, a venda continua do afiliado.
        affiliate_ref: getAffiliateRef(),
      });
      if (buyerErr) throw buyerErr;

      const { data: result, error: fnErr } = await supabase.functions.invoke('mp-create-payment', {
        body: {
          plan: selectedPlan,
          email: customerEmail.toLowerCase().trim(),
          name: customerName.trim() || '',
          whatsapp: `${selectedCountry.code}${customerWhatsapp.replace(/\D/g, '')}`,
          externalReference: ref,
          couponCode: couponApplied?.code || null,
          upsell: upsellSelected,
          upsell2: upsell2Selected,
          origin: window.location.origin,
        },
      });

      if (fnErr || result?.error) {
        throw new Error(result?.error || await extractFunctionErrorMessage(fnErr, 'Erro ao processar pagamento'));
      }

      localStorage.setItem('pending_purchase', JSON.stringify({
        external_reference: ref,
        preference_id: result.preference_id,
        plan: selectedPlan,
        amount: getTotalPrice(),
        email: customerEmail,
        upsell: upsellSelected,
        upsell2: upsell2Selected,
      }));

      window.location.href = result.init_point || result.sandbox_init_point;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar pagamento');
      setLoading(false);
    }
  };

  // ─── STEP 1: Plan Selection ───────────────────────────────────────────────
  const renderPlanSelection = () => (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 border border-accent-warning/30 text-accent-warning text-xs font-semibold uppercase tracking-wide rounded-full px-4 py-1.5">
          <Clock className="w-3.5 h-3.5" />
          Oferta por tempo limitado
        </div>
      </div>

      <div className="text-center">
        <h1 className="font-secondary text-3xl md:text-4xl font-bold text-foreground mb-3">Escolha seu Plano</h1>
        <p className="text-muted-foreground">Acesso ilimitado a todo o conteúdo médico</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(PLANS).map(([key, plan]) => {
          const lockedByCoupon = Boolean(
            couponApplied?.allowed_plans && couponApplied.allowed_plans !== 'all' && couponApplied.allowed_plans !== key
          );
          return (
          <div
            key={key}
            onClick={() => !lockedByCoupon && setSelectedPlan(key)}
            className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${
              lockedByCoupon ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            } ${
              selectedPlan === key ? 'bg-primary/10 border-primary' : 'bg-secondary/30 border-border hover:border-border'
            } ${plan.badge ? 'ring-2 ring-primary/20' : ''}`}
          >
            {lockedByCoupon && (
              <div className="absolute -top-3 right-4">
                <span className="bg-secondary border border-border text-muted-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  Indisponível com esse cupom
                </span>
              </div>
            )}
            {plan.badge && !lockedByCoupon && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">{plan.badge}</span>
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${selectedPlan === key ? 'bg-primary' : 'bg-secondary'}`}>
                <plan.icon className={`w-6 h-6 ${selectedPlan === key ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
              </div>
              <h3 className="font-secondary text-lg font-bold text-foreground">{plan.name}</h3>
            </div>
            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                {plan.originalPrice && (
                  <span className="text-lg text-muted-foreground line-through">R${plan.originalPrice.toLocaleString('pt-BR')}</span>
                )}
                <span className="text-4xl font-bold text-foreground">R${plan.price.toFixed(2).replace('.', ',')}</span>
              </div>
              <span className="text-muted-foreground text-sm">{plan.period}</span>
            </div>
            <ul className="space-y-2">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${selectedPlan === key ? 'text-primary' : 'text-accent-success'}`} />
                  <span className="text-muted-foreground">{renderFeatureText(feature)}</span>
                </li>
              ))}
            </ul>
            <div className={`w-6 h-6 rounded-full border-2 absolute top-6 right-6 flex items-center justify-center ${selectedPlan === key ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
              {selectedPlan === key && <Check className="w-4 h-4 text-primary-foreground" />}
            </div>
          </div>
          );
        })}
      </div>

      {/* Tabela comparativa dos planos */}
      <PlanComparisonTable />

      {/* Coupon */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Ticket className="w-5 h-5 text-accent-success" />
          <h3 className="text-foreground font-semibold">Tem um cupom de desconto?</h3>
        </div>
        {couponApplied ? (
          <div className="bg-accent-success/10 border border-accent-success/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-accent-success" />
                <div>
                  <p className="text-accent-success font-semibold">{couponApplied.code}</p>
                  <p className="text-accent-success/70 text-sm">{couponApplied.discount_percent}% de desconto aplicado!</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemoveCoupon} className="text-muted-foreground hover:text-foreground">
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Digite o código do cupom"
              value={couponCode}
              onChange={e => setCouponCode(e.target.value.toUpperCase())}
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
            />
            <Button onClick={() => handleApplyCoupon()} disabled={couponLoading || !couponCode.trim()} className="bg-accent-success/80 hover:bg-accent-success text-white px-6">
              {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
            </Button>
          </div>
        )}
        {discountPercent > 0 && (
          <div className="mt-4 pt-4 border-t border-border text-sm space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Preço original:</span>
              <span className="line-through">R$ {PLANS[selectedPlan].price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-accent-success">
              <span>Desconto ({discountPercent}%):</span>
              <span>- R$ {(PLANS[selectedPlan].price * discountPercent / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-foreground font-semibold">Total:</span>
              <span className="text-accent-success font-bold text-lg">R$ {getDiscountedPrice(PLANS[selectedPlan].price).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      <Button onClick={handleContinueFromPlan} className="w-full h-14 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-lg">
        Continuar <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );

  // ─── STEP 2: Upsell ───────────────────────────────────────────────────────
  const renderUpsellStep = () => (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => setStep(1)} className="text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>

      <div className="text-center">
        <h1 className="font-secondary text-3xl font-bold text-foreground mb-2">Oferta Especial</h1>
        <p className="text-muted-foreground">Potencialize ainda mais seu acesso</p>
      </div>

      {/* Upsell 1 */}
      <div
        onClick={() => setUpsellSelected(!upsellSelected)}
        className={`relative p-6 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${
          upsellSelected ? 'bg-accent-success/10 border-accent-success' : 'bg-secondary/30 border-border hover:border-muted-foreground/30'
        }`}
      >
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-accent-success text-white text-xs font-bold px-3 py-1 rounded-full">RECOMENDADO</span>
        </div>
        <div className="flex items-start gap-4">
          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-1 ${upsellSelected ? 'border-accent-success bg-accent-success' : 'border-muted-foreground/30'}`}>
            {upsellSelected && <Check className="w-4 h-4 text-white" />}
          </div>
          <div className="flex-1">
            <h3 className="font-secondary text-xl font-bold text-foreground mb-2">Atualizações Semanais + Lançamentos Instantâneos</h3>
            <p className="text-muted-foreground mb-4">Receba toda semana novos conteúdos no seu Drive e tenha acesso imediato a todos os lançamentos assim que disponibilizados, antes de qualquer pessoa!</p>
            <ul className="space-y-2 mb-4">
              {[
                'Novos cursos e materiais toda semana',
                'Acesso prioritário a lançamentos',
                'Cronogramas de estudo personalizados',
                'Acesso a flashcards exclusivos',
                'Notificações de novos conteúdos',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-accent-success flex-shrink-0" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-accent-success">+ R$ {UPSELL_PRICE.toFixed(2).replace('.', ',')}</span>
              <span className="text-muted-foreground text-sm">pagamento único</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upsell 2 */}
      <div
        onClick={() => setUpsell2Selected(!upsell2Selected)}
        className={`relative p-6 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${
          upsell2Selected ? 'bg-accent-info/10 border-accent-info' : 'bg-secondary/30 border-border hover:border-muted-foreground/30'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-1 ${upsell2Selected ? 'border-accent-info bg-accent-info' : 'border-muted-foreground/30'}`}>
            {upsell2Selected && <Check className="w-4 h-4 text-white" />}
          </div>
          <div className="flex-1">
            <h3 className="font-secondary text-xl font-bold text-foreground mb-2">Proteção Proxy + Backups Instantâneos</h3>
            <p className="text-muted-foreground mb-4">Nunca fique sem acesso! Proteção contra quedas do Drive com acesso a backups em tempo real.</p>
            <ul className="space-y-2 mb-4">
              {[
                'Acesso via proxy em caso de queda',
                'Backups automáticos diários',
                'Recuperação instantânea de arquivos',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-accent-info flex-shrink-0" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-accent-info">+ R$ {UPSELL2_PRICE.toFixed(2).replace('.', ',')}</span>
              <span className="text-muted-foreground text-sm">pagamento único</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep(3)} className="flex-1 h-12 border-border text-muted-foreground hover:text-foreground">
          Não, obrigado
        </Button>
        <Button onClick={() => setStep(3)} className="flex-1 h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold">
          {upsellSelected || upsell2Selected ? 'Adicionar ao pedido' : 'Continuar'} <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // ─── STEP 3: Customer Data ────────────────────────────────────────────────
  const renderCustomerDataForm = () => (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => setStep(2)} className="text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>

      <div className="text-center">
        <h1 className="font-secondary text-3xl font-bold text-foreground mb-2">Seus Dados</h1>
        <p className="text-muted-foreground">Informe seus dados para receber o acesso</p>
      </div>

      {/* Plan summary */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-muted-foreground text-sm">Plano selecionado</p>
            <p className="text-foreground font-semibold">{PLANS[selectedPlan].name}</p>
            {upsellSelected && <p className="text-accent-success text-sm">+ Atualizações Semanais</p>}
            {upsell2Selected && <p className="text-accent-info text-sm">+ Proteção Proxy</p>}
          </div>
          <p className="text-accent-success font-bold text-lg">R$ {getTotalPrice().toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-muted-foreground mb-2"><User className="w-4 h-4 inline mr-2" />Nome (opcional)</label>
          <Input type="text" placeholder="Seu nome" value={customerName} onChange={e => setCustomerName(e.target.value)} className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-12" />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-2"><Mail className="w-4 h-4 inline mr-2" />Email *</label>
          <Input type="email" placeholder="seu@email.com" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-12" required />
          <p className="text-muted-foreground text-xs mt-1">Use o mesmo email da sua conta Google/Drive</p>
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-2"><Phone className="w-4 h-4 inline mr-2" />WhatsApp *</label>
          <div className="flex gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                className="flex items-center gap-1.5 h-12 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground hover:border-border"
              >
                <span className="text-xs font-mono text-muted-foreground">{selectedCountry.flag}</span>
                <span>{selectedCountry.code}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {showCountryDropdown && (
                <>
                {/* Clique fora fecha — sem este véu, o painel ficava aberto
                    por cima do formulário até clicar de novo no gatilho. */}
                <div className="fixed inset-0 z-40" onClick={() => setShowCountryDropdown(false)} />
                <div className="absolute top-full left-0 mt-1 w-48 bg-background-paper border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                  {COUNTRIES.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => { setSelectedCountry(c); setShowCountryDropdown(false); setCustomerWhatsapp(''); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary text-left"
                    >
                      <span className="text-xs font-mono text-muted-foreground w-6">{c.flag}</span>
                      <span>{c.country}</span>
                      <span className="ml-auto text-muted-foreground">{c.code}</span>
                    </button>
                  ))}
                </div>
                </>
              )}
            </div>
            <Input
              type="tel"
              placeholder={selectedCountry.code === '+55' ? '(00) 00000-0000' : 'Número'}
              value={customerWhatsapp}
              onChange={e => setCustomerWhatsapp(formatWhatsApp(e.target.value, selectedCountry.code))}
              className="flex-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground h-12"
              required
            />
          </div>
          <p className="text-muted-foreground text-xs mt-1">Para suporte e novidades</p>
        </div>
      </div>

      <Button onClick={() => { if (validateCustomerData()) setStep(4); }} className="w-full h-14 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-lg">
        Continuar para Pagamento <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );

  // ─── STEP 4: Payment Method ───────────────────────────────────────────────
  const renderPaymentMethodSelection = () => (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => setStep(3)} className="text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>

      <div className="text-center">
        <h1 className="font-secondary text-3xl font-bold text-foreground mb-2">Como deseja pagar?</h1>
        <p className="text-muted-foreground">
          {PLANS[selectedPlan].name}{upsellSelected && ' + Atualizações'}{upsell2Selected && ' + Proteção'}{' '}—{' '}
          <span className="text-accent-success font-semibold">R$ {getTotalPrice().toFixed(2)}</span>
        </p>
        {couponApplied && (
          <p className="text-accent-success text-sm mt-1">
            <Tag className="w-3 h-3 inline mr-1" />
            Cupom {couponApplied.code} aplicado ({couponApplied.discount_percent}% off)
          </p>
        )}
      </div>

      {/* Customer summary */}
      <div className="bg-accent-success/10 border border-accent-success/20 rounded-lg p-4">
        <p className="text-accent-success text-sm"><Mail className="w-4 h-4 inline mr-2" />Email: <strong>{customerEmail}</strong></p>
        <p className="text-accent-success text-sm mt-1"><Phone className="w-4 h-4 inline mr-2" />WhatsApp: <strong>{customerWhatsapp}</strong></p>
      </div>

      {/* Order summary */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h4 className="text-foreground font-semibold mb-3">Resumo do Pedido</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{PLANS[selectedPlan].name}</span>
            <span className="text-foreground">R$ {getDiscountedPrice(PLANS[selectedPlan].price).toFixed(2)}</span>
          </div>
          {upsellSelected && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Atualizações Semanais + Lançamentos</span>
              <span className="text-accent-success">+ R$ {UPSELL_PRICE.toFixed(2)}</span>
            </div>
          )}
          {upsell2Selected && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Proteção Proxy + Backups</span>
              <span className="text-accent-info">+ R$ {UPSELL2_PRICE.toFixed(2)}</span>
            </div>
          )}
          {discountPercent > 0 && (
            <div className="flex justify-between text-accent-success">
              <span>Desconto ({discountPercent}%)</span>
              <span>- R$ {(PLANS[selectedPlan].price * discountPercent / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 mt-2 border-t border-border">
            <span className="text-foreground font-semibold">Total</span>
            <span className="text-accent-success font-bold text-lg">R$ {getTotalPrice().toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Available payment methods info */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-muted-foreground text-sm text-center mb-3 font-medium">Métodos de pagamento disponíveis</p>
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-lg bg-accent-success/20 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-accent-success" />
            </div>
            <span className="text-xs text-muted-foreground">PIX</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-lg bg-accent-warning/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent-warning" />
            </div>
            <span className="text-xs text-muted-foreground">Boleto</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-lg bg-accent-info/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-accent-info" />
            </div>
            <span className="text-xs text-muted-foreground">Cartão</span>
          </div>
        </div>
      </div>

      <Button
        onClick={handleMercadoPagoCheckout}
        disabled={loading}
        className="w-full h-14 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-lg"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Redirecionando para pagamento...
          </>
        ) : (
          <>
            Ir para pagamento seguro <ExternalLink className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>

      <p className="text-center text-muted-foreground text-xs flex items-center justify-center gap-1">
        <Shield className="w-3.5 h-3.5" /> Pagamento processado pelo Mercado Pago
      </p>
    </div>
  );

  // ─── Layout ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-6 py-6 border-b border-border/50">
        <nav className="shell-form flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="font-secondary text-xl font-bold text-foreground">OneMed</span>
              <span className="text-muted-foreground text-xs block">Comunidade Médica</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Compra Segura</span>
            </div>
            <ThemeToggle />
          </div>
        </nav>
      </header>

      {/* Progress Steps */}
      <div className="px-6 py-4 border-b border-border/30">
        <div className="shell-form">
          <div className="flex items-center justify-center gap-2 md:gap-4">
            {[
              { n: 1, label: 'Plano' },
              { n: 2, label: 'Oferta' },
              { n: 3, label: 'Dados' },
              { n: 4, label: 'Pagamento' },
            ].map(({ n, label }, i, arr) => (
              <div key={n} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 ${step >= n ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= n ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{n}</div>
                  <span className="hidden sm:inline text-sm">{label}</span>
                </div>
                {i < arr.length - 1 && <div className={`w-6 md:w-12 h-0.5 ${step > n ? 'bg-primary' : 'bg-border'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="px-6 py-12">
        <div className={step === 1 ? 'shell-form' : 'shell-read'}>
          {step === 1 && renderPlanSelection()}
          {step === 2 && renderUpsellStep()}
          {step === 3 && renderCustomerDataForm()}
          {step === 4 && renderPaymentMethodSelection()}
        </div>
      </main>

      <footer className="px-6 py-8 border-t border-border/30">
        <div className="shell-form text-center">
          <p className="text-muted-foreground text-sm">© 2026 OneMed - Comunidade Médica</p>
        </div>
      </footer>
    </div>
  );
}
