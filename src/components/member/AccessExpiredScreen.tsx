import { useNavigate } from 'react-router-dom';
import { Clock, Check, LogOut, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { formatDateTimeSP } from '@/lib/utils';

const SUPPORT_PHONE = '5563999191551';

const BENEFITS = [
  'Acervo completo de cursos, sem limite de tempo',
  'Comunidade e grupo no WhatsApp',
  'Atualizações mensais do acervo',
];

// Tela de quem está logado mas sem acesso ativo — o caso mais comum é o teste
// grátis que venceu com a sessão do navegador ainda de pé. Antes disso existir,
// a pessoa entrava numa plataforma vazia (zero cursos, plano "—") sem nenhuma
// explicação e sem caminho pra comprar.
export function AccessExpiredScreen({ lastType, expiredAt }: {
  lastType?: string | null;
  expiredAt?: string | null;
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const eraTrial = !lastType || lastType === 'trial';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="glass rounded-2xl border border-primary/25 p-7 sm:p-8 max-w-md w-full text-center shadow-xl">
        <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-5 h-5 text-primary" />
        </div>

        <h1 className="font-secondary text-xl sm:text-2xl font-bold text-foreground mb-2">
          {eraTrial ? 'Seu teste grátis expirou' : 'Seu acesso expirou'}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {eraTrial
            ? 'O período de teste da sua conta terminou. Para continuar de onde parou e liberar a plataforma completa, escolha um plano.'
            : 'Seu plano chegou ao fim. Renove para voltar a acessar todos os cursos.'}
          {expiredAt && (
            <>
              <br />
              <span className="text-xs">Expirou em {formatDateTimeSP(expiredAt)}.</span>
            </>
          )}
        </p>

        <ul className="text-left space-y-2 mb-6">
          {BENEFITS.map(b => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-foreground">
              <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {b}
            </li>
          ))}
        </ul>

        <Button className="w-full" onClick={() => navigate('/checkout')}>
          {eraTrial ? 'Adquirir acesso completo' : 'Renovar assinatura'}
        </Button>

        <div className="mt-5 pt-4 border-t border-border space-y-2">
          {user?.email && (
            <p className="text-xs text-muted-foreground">Conta: {user.email}</p>
          )}
          <div className="flex items-center justify-center gap-4 text-xs">
            <a
              href={`https://wa.me/${SUPPORT_PHONE}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" /> Falar com o suporte
            </a>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
