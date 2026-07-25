import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';

export default function PaymentPendingPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-card rounded-2xl p-10 border border-border">
        <div className="w-20 h-20 bg-accent-warning/15 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-accent-warning" />
        </div>
        <h1 className="font-secondary text-3xl font-bold text-foreground mb-3">Pagamento Pendente</h1>
        <p className="text-muted-foreground mb-4">Seu pagamento está sendo processado. Para boleto bancário, o prazo é de até 3 dias úteis.</p>
        <p className="text-sm text-muted-foreground mb-8">Você receberá um email de confirmação assim que o pagamento for aprovado.</p>
        <Link to="/" className="inline-flex items-center gap-2 bg-secondary hover:bg-muted text-foreground font-semibold px-6 py-3 rounded-lg transition-colors border border-border">
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
}
