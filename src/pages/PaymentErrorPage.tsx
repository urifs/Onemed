import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function PaymentErrorPage() {
  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center glass-strong rounded-2xl p-10 border border-border animate-fade-in">
        <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-primary" />
        </div>
        <h1 className="font-secondary text-3xl font-bold text-foreground mb-3">Pagamento Recusado</h1>
        <p className="text-muted-foreground mb-8">Houve um problema ao processar seu pagamento. Por favor, tente novamente ou entre em contato conosco.</p>
        <div className="flex flex-col gap-3">
          <Link to="/checkout" className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-6 py-3 rounded-lg transition-colors">
            Tentar Novamente
          </Link>
          <Link to="/" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
            Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  );
}
