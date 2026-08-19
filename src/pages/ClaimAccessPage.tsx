import { Link, useSearchParams } from 'react-router-dom';
import { LogIn, ArrowRight, ArrowLeft, MessageCircle, Stethoscope, CheckCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const SUPPORT_PHONE = '5563999191551';

// Página do fluxo ANTIGO de ativação manual (o e-mail de compra apontava pra
// cá com ?ref=). Desde o lockdown de RLS de 15/08 o navegador não lê nem
// escreve em buyers/accesses — o que tornou o formulário antigo um beco sem
// saída: toda compra real aparecia como "Compra não encontrada". Hoje a
// liberação é 100% automática pelo webhook do Mercado Pago, então quem cai
// aqui (link de e-mail antigo) só precisa saber disso e entrar.
export default function ClaimAccessPage() {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <ThemeToggle className="fixed top-4 right-4 z-50" />
      <div className="max-w-md w-full">
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-primary" />
            </div>
            <span className="font-secondary font-bold text-2xl text-foreground">OneMed</span>
          </Link>
        </div>

        <div className="bg-card rounded-2xl p-8 border border-border text-center">
          <CheckCircle className="w-14 h-14 text-accent-success mx-auto mb-4" />
          <h1 className="font-secondary text-2xl font-bold text-foreground mb-3">
            Seu acesso é liberado automaticamente
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Assim que o pagamento é aprovado, o acesso já fica ativo no e-mail
            usado na compra — não precisa ativar nada por aqui. É só entrar:
            no primeiro acesso você cadastra sua senha na própria tela de login.
          </p>

          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 h-12 px-6 w-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg transition-colors"
          >
            <LogIn className="w-4 h-4" /> Entrar na plataforma <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href={`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(
              `Olá! Paguei e meu acesso não apareceu.${ref ? ` Referência da compra: ${ref}` : ''}`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center justify-center gap-2 h-12 px-6 w-full border border-border hover:border-primary/40 bg-secondary/50 text-foreground font-semibold rounded-lg transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-[#25D366]" /> Paguei e não consigo entrar
          </a>
        </div>

        <p className="text-center mt-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar para a página inicial
          </Link>
        </p>
      </div>
    </div>
  );
}
