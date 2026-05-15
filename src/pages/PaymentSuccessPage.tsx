import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { trackPurchase } from '@/lib/pixel';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import {
  Stethoscope,
  CheckCircle,
  Mail,
  ArrowRight,
  FolderOpen,
  BookOpen,
  Sparkles,
} from 'lucide-react';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [purchaseInfo, setPurchaseInfo] = useState<any>(null);

  const paymentId = searchParams.get('payment_id');
  const externalReference = searchParams.get('external_reference');
  const status = searchParams.get('status');

  useEffect(() => {
    const pending = localStorage.getItem('pending_purchase');
    if (pending) {
      try {
        const info = JSON.parse(pending);
        setPurchaseInfo(info);
        // Track Purchase event if status is approved
        if (status === 'approved') {
          trackPurchase(
            info.plan,
            info.plan === 'lifetime' ? 299.90 : 199,
            'redirect',
            paymentId ? `purchase_${paymentId}` : undefined
          );
        }
      } catch { /* ignore */ }
    }
  }, [status]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Por favor, insira seu email'); return; }

    setLoading(true);
    try {
      const ref = externalReference || purchaseInfo?.external_reference;

      // Find buyer by external_reference or payment_id and update email + grant access
      const { data: buyer, error: fetchErr } = await supabase
        .from('buyers')
        .select('id, status, plan')
        .eq('external_reference', ref || '')
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (buyer) {
        // Update email on buyer record
        await supabase.from('buyers').update({ email: email.toLowerCase().trim() }).eq('id', buyer.id);
      }

      // Try to grant drive access via edge function
      const { error: fnErr } = await supabase.functions.invoke('drive-share-folder', {
        body: { email: email.toLowerCase().trim() },
      });
      if (fnErr) console.warn('drive-share-folder:', fnErr.message);

      // Send access email
      await supabase.functions.invoke('send-access-email', {
        body: {
          email: email.toLowerCase().trim(),
          type: 'access_granted',
          plan: buyer?.plan || purchaseInfo?.plan || 'lifetime',
        },
      });

      localStorage.removeItem('pending_purchase');
      setRegistered(true);
      toast.success('Acesso concedido! Verifique seu Google Drive.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient">
      {/* Header */}
      <header className="px-6 py-6 border-b border-border/50">
        <nav className="max-w-6xl mx-auto flex items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="font-secondary text-xl font-bold text-foreground">OneMed</span>
              <span className="text-muted-foreground text-xs block">Comunidade Médica</span>
            </div>
          </Link>
        </nav>
      </header>

      <main className="px-6 py-16">
        <div className="max-w-xl mx-auto">
          {!registered ? (
            <div className="glass rounded-2xl p-10 text-center animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-accent-success/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-accent-success" />
              </div>

              <h1 className="font-secondary text-3xl font-bold text-foreground mb-4">
                Pagamento Confirmado!
              </h1>
              <p className="text-muted-foreground mb-8">
                {purchaseInfo?.plan === 'lifetime'
                  ? 'Parabéns! Você adquiriu o Plano Vitalício.'
                  : 'Parabéns! Você adquiriu o Plano Anual.'}
              </p>

              <div className="bg-secondary/50 border border-border rounded-xl p-6 text-left">
                <h3 className="text-foreground font-semibold mb-2 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Registre seu Email
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Informe o email da sua conta Google para liberarmos seu acesso ao Drive.
                </p>
                <form onSubmit={handleRegister} className="space-y-4">
                  <Input
                    type="email"
                    placeholder="seu@gmail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-12"
                    required
                  />
                  <Button type="submit" disabled={loading} className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Processando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Liberar Acesso <ArrowRight className="w-5 h-5" />
                      </span>
                    )}
                  </Button>
                </form>
                <p className="text-muted-foreground text-xs mt-4 text-center">
                  Use o mesmo email da sua conta Google/Gmail
                </p>
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl p-10 text-center animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-accent-success/20 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-accent-success" />
              </div>

              <h1 className="font-secondary text-3xl font-bold text-foreground mb-4">Acesso Liberado!</h1>
              <p className="text-muted-foreground mb-8">
                Seu acesso foi configurado com sucesso para{' '}
                <strong className="text-foreground">{email}</strong>
              </p>

              <div className="bg-secondary/50 border border-border rounded-xl p-6 mb-6 text-left">
                <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Instruções de Acesso
                </h3>
                <ol className="space-y-3 text-muted-foreground text-sm">
                  {[
                    <>Abra o aplicativo ou site do <strong className="text-foreground">Google Drive</strong>, no email que você registrou.</>,
                    <>Vá na aba <strong className="text-foreground">"Compartilhados comigo"</strong></>,
                    <>Procure pela pasta: <strong className="text-primary">OneMed</strong></>,
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <p className="text-accent-success font-medium mt-4 text-center">Pronto, só acessar nosso conteúdo!</p>
              </div>

              <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 h-14 px-8 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg transition-colors">
                <FolderOpen className="w-5 h-5" />
                Abrir Google Drive
              </a>

              <div className="mt-6">
                <Link to="/" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  ← Voltar para a página inicial
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="px-6 py-8 border-t border-border/30">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-muted-foreground text-sm">© 2026 OneMed - Comunidade Médica</p>
        </div>
      </footer>
    </div>
  );
}
