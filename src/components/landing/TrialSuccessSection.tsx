import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, FolderOpen, ArrowRight, ShoppingCart } from 'lucide-react';

interface TrialSuccessSectionProps {
  accessData: { email: string; drive_folder_id?: string } | null;
  timeRemaining: { minutes: number; seconds: number; expired?: boolean };
}

export const TrialSuccessSection = ({ accessData, timeRemaining }: TrialSuccessSectionProps) => {
  const isExpired = timeRemaining.expired || (timeRemaining.minutes === 0 && timeRemaining.seconds === 0);

  return (
    <section className="min-h-screen flex items-center justify-center pt-20 bg-hero-gradient">
      <div className="max-w-2xl mx-auto px-4 text-center animate-fade-in">
        {/* Success icon */}
        <div className="w-20 h-20 bg-accent-success/15 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle className="w-10 h-10 text-accent-success" />
        </div>

        <h2 className="font-secondary text-4xl font-bold text-foreground mb-4">Acesso Liberado!</h2>
        <p className="text-muted-foreground mb-2">Seu acesso de teste foi concedido para:</p>
        <p className="text-primary font-medium text-lg mb-8">{accessData?.email}</p>

        {/* Timer */}
        <div className={`glass rounded-2xl p-8 mb-8 ${isExpired ? 'border-primary/20' : 'border-accent-success/20'} border`}>
          <p className="text-sm text-muted-foreground font-mono uppercase tracking-widest mb-2">
            {isExpired ? 'Acesso Expirado' : 'Tempo Restante'}
          </p>
          <p className={`font-secondary text-6xl font-bold ${isExpired ? 'text-primary' : 'text-accent-success animate-countdown'}`}>
            {isExpired ? '00:00' : `${String(timeRemaining.minutes).padStart(2, '0')}:${String(timeRemaining.seconds).padStart(2, '0')}`}
          </p>
        </div>

        {/* Instructions */}
        <div className="glass rounded-xl p-6 text-left mb-8">
          <h3 className="font-secondary font-semibold text-foreground mb-4 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            Como acessar o conteúdo:
          </h3>
          <ol className="space-y-3">
            {[
              'Abra o Google Drive com o email informado',
              'Vá na aba "Compartilhados comigo"',
              'Procure pela pasta: OneMed',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="w-6 h-6 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  {i + 1}
                </span>
                <span dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>').replace(/"(.*?)"/g, '<strong class="text-foreground">"$1"</strong>') }} />
              </li>
            ))}
          </ol>
        </div>

        <a
          href="https://drive.google.com/drive/shared-with-me"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-8 py-3 rounded-lg transition-colors duration-200 mb-6 glow-red-hover"
        >
          <FolderOpen className="w-5 h-5" />
          Abrir Google Drive
          <ArrowRight className="w-4 h-4" />
        </a>

        <div className="mt-8 glass rounded-xl p-6 border border-primary/20">
          <p className="text-foreground font-medium mb-1">Gostou do conteúdo?</p>
          <p className="text-sm text-muted-foreground mb-4">Garanta seu acesso completo e vitalício!</p>
          <Link to="/checkout">
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2">
              <ShoppingCart className="w-4 h-4" />
              Comprar Acesso Completo
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-3">Acesso vitalício a partir de R$ 199</p>
        </div>
      </div>
    </section>
  );
};

export default TrialSuccessSection;
