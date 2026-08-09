import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { trackPurchase } from '@/lib/pixel';
import {
  Stethoscope,
  CheckCircle,
  LogIn,
  Mail,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PLAN_LABELS, PLAN_PRICES } from '@/lib/plans';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const [purchaseInfo, setPurchaseInfo] = useState<any>(null);

  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');

  useEffect(() => {
    const pending = localStorage.getItem('pending_purchase');
    if (pending) {
      try {
        const info = JSON.parse(pending);
        setPurchaseInfo(info);
        // O pending_purchase NÃO é removido aqui de propósito: apagar na
        // primeira passada fazia um simples F5 nesta página perder o nome do
        // plano e o prefill de email do botão de login. A trava anti-duplo
        // disparo é a chave abaixo por payment_id (e a Meta ainda deduplica
        // pelo event_id de qualquer forma); o checkout sobrescreve o
        // pending_purchase na próxima compra.
        const trackedKey = paymentId ? `om_purchase_tracked_${paymentId}` : 'om_purchase_tracked';
        if (status === 'approved' && !localStorage.getItem(trackedKey)) {
          localStorage.setItem(trackedKey, '1');
          // O email vai junto pra correspondência avançada: nesta página não
          // existe formulário, então sem isso o Purchase chegava só com IP,
          // user-agent e fbp (EMQ 6.1, contra 8.7 do Lead).
          trackPurchase(
            info.plan,
            info.amount ?? PLAN_PRICES[info.plan] ?? 0,
            'redirect',
            paymentId ? `purchase_${paymentId}` : undefined,
            { email: info.email ?? null }
          );
        }
      } catch { /* ignore */ }
    }
  }, [status, paymentId]);

  const email = purchaseInfo?.email;
  const loginHref = email ? `/login?email=${encodeURIComponent(email)}` : '/login';

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-6 border-b border-border/50">
        <nav className="shell-list flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="font-secondary text-xl font-bold text-foreground">OneMed</span>
              <span className="text-muted-foreground text-xs block">Comunidade Médica</span>
            </div>
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className="px-6 py-16">
        <div className="max-w-xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-accent-success/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-accent-success" />
            </div>

            <h1 className="font-secondary text-3xl font-bold text-foreground mb-4">
              Pagamento Confirmado!
            </h1>
            <p className="text-muted-foreground mb-8">
              {purchaseInfo?.plan && PLAN_LABELS[purchaseInfo.plan]
                ? `Parabéns! Você adquiriu o ${PLAN_LABELS[purchaseInfo.plan]}.`
                : 'Parabéns! Sua compra foi aprovada.'}
              {' '}Seu acesso já está liberado na plataforma.
            </p>

            <div className="bg-secondary/50 border border-border rounded-xl p-6 text-left mb-6">
              <h3 className="text-foreground font-semibold mb-2 flex items-center gap-2">
                <LogIn className="w-5 h-5 text-primary" />
                Como acessar
              </h3>
              <p className="text-muted-foreground text-sm mb-2">
                É só fazer login com o e-mail que você usou na compra — sem senha, você recebe um link de acesso por e-mail.
              </p>
              {email && (
                <p className="text-sm flex items-center gap-2 mt-3 text-foreground">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span>E-mail cadastrado: <strong>{email}</strong></span>
                </p>
              )}
            </div>

            <Link
              to={loginHref}
              className="inline-flex items-center justify-center gap-2 h-14 px-8 w-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg transition-colors"
            >
              <LogIn className="w-5 h-5" />
              Fazer login e começar a estudar
              <ArrowRight className="w-5 h-5" />
            </Link>

            <div className="mt-6">
              <Link to="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar para a página inicial
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-8 border-t border-border/30">
        <div className="shell-list text-center">
          <p className="text-muted-foreground text-sm">© 2026 OneMed - Comunidade Médica</p>
        </div>
      </footer>
    </div>
  );
}
