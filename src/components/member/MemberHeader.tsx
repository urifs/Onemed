import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, MessageCircle, ShoppingBag } from 'lucide-react';
import { AccountMenu } from './AccountMenu';
import { useIsTrial } from '@/hooks/useIsTrial';
import { NotificationsBell } from './NotificationsBell';
import { AssistantWidget } from './AssistantWidget';
import { TrialCountdownBar } from './TrialCountdownBar';
import { MemberPWAHead } from './MemberPWAHead';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Presença em tempo real pro quadro "Quem está online" do admin — sem PII
// no payload (só a chave anônima da conexão, o user_id), o admin resolve
// email a partir do roster (RPC admin-only), nunca lendo direto do canal.
// Monta uma vez por sessão (MemberHeader está em toda página de membro).
function useMemberPresence() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel('online-members', { config: { presence: { key: user.id } } });
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() });
    });
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);
}

// Geolocaliza por IP pro mapa de usuários do dashboard admin. Roda uma vez
// por aba/sessão (não em todo login) — cobre também quem já estava logado
// antes dessa feature existir e cujo token de sessão nunca mais passa por
// member-auth-request/create-trial-access.
function useLocationCapture() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    const flagKey = `om_loc_captured_${user.id}`;
    if (sessionStorage.getItem(flagKey)) return;
    sessionStorage.setItem(flagKey, '1');
    supabase.functions.invoke('member-capture-location').catch(() => {});
  }, [user?.id]);
}

export function MemberHeader() {
  useMemberPresence();
  useLocationCapture();
  const { isTrial } = useIsTrial();
  return (
    <>
      <MemberPWAHead />
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/75 border-b border-border">
        {/* Em tela estreita (ou com a fonte do celular ampliada), a soma
            logo + texto + 5 ícones passa da largura e o flex CORTA o último
            item — o ícone de usuário, que é justamente a saída da conta.
            Regra: os ícones são shrink-0 (nunca somem); quem cede é o texto
            "OneMed" (trunca via min-w-0 e some abaixo de 360px) e os gaps. */}
        <div className="shell-wide flex items-center gap-1.5 sm:gap-3 md:gap-5 px-3 sm:px-4 md:px-8 py-3.5">
          <Link to="/membros" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 bg-primary/15 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <span className="hidden min-[360px]:inline truncate font-secondary font-bold text-lg text-foreground">OneMed</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-1">
            <Link to="/membros" className="text-sm font-medium px-3 py-1.5 rounded-full bg-secondary text-foreground">
              Início
            </Link>
          </nav>

          <div className="flex-1" />

          <Link
            to="/membros/comunidade"
            className="w-9 h-9 shrink-0 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            title="Comunidade"
          >
            <MessageCircle className="w-4 h-4" />
          </Link>
          {/* Loja e notificações são para assinante: no teste grátis nem o
              ícone aparece. */}
          {!isTrial && (
            <>
              <Link
                to="/membros/loja"
                className="w-9 h-9 shrink-0 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                title="Loja"
              >
                <ShoppingBag className="w-4 h-4" />
              </Link>
              <NotificationsBell />
            </>
          )}
          <ThemeToggle />
          <AccountMenu />
        </div>
      </header>
      <TrialCountdownBar />
      <AssistantWidget />
    </>
  );
}
