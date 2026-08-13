import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LogOut, MessageCircle, KeyRound } from 'lucide-react';

const SUPPORT_PHONE = '5563999191551';

// Mutirão de re-login de 13/08/2026: com o login virando e-mail + senha, TODAS
// as sessões antigas foram encerradas de uma vez, para cada aluno cadastrar a
// senha dele. Nessa janela, uma desconexão forçada quase certamente veio daí —
// e não do limite de telas. Sem essa distinção, milhares de pessoas leriam
// "sua conta está em outros 2 dispositivos e alguém entrou agora", com botão
// de suporte: susto e enxurrada de chamados por uma coisa que era esperada.
//
// A data faz a mensagem voltar sozinha ao texto normal, sem depender de outro
// deploy pra desfazer.
const FIM_DO_MUTIRAO = Date.parse('2026-08-16T12:00:00Z');

export function KickedOutModal() {
  const { kickedOut, dismissKickedOut } = useAuth();
  const navigate = useNavigate();

  if (!kickedOut) return null;

  const ehMutirao = Date.now() < FIM_DO_MUTIRAO;

  const handleClose = () => {
    dismissKickedOut();
    navigate('/login');
  };

  return (
    <Dialog open={kickedOut} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="bg-background-paper border-border max-w-sm" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center mb-2">
            {ehMutirao ? <KeyRound className="w-5 h-5 text-primary" /> : <LogOut className="w-5 h-5 text-primary" />}
          </div>
          <DialogTitle className="text-foreground">
            {ehMutirao ? 'Entre novamente para continuar' : 'Sessão encerrada'}
          </DialogTitle>
        </DialogHeader>

        {ehMutirao ? (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O acesso à plataforma agora é com <strong className="text-foreground">email e senha</strong>.
              Por isso todas as sessões foram encerradas — nada foi perdido, seu acesso continua o mesmo.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              É rápido: informe seu email de sempre e cadastre a senha que você vai usar daqui em diante.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={handleClose} className="w-full bg-primary hover:bg-primary-hover text-primary-foreground">
                Cadastrar minha senha
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Esta conta já está conectada em outros 2 dispositivos, e um novo login foi feito agora —
              por isso esta sessão foi desconectada automaticamente. Cada email tem acesso limitado a
              2 dispositivos simultâneos.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Se você não fez esse login, sua conta pode estar sendo compartilhada com outra pessoa.
              Entre em contato com o suporte.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <a
                href={`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent('Olá! Minha sessão no OneMed foi encerrada por um novo login que eu não reconheço.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-semibold transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> Falar com o suporte no WhatsApp
              </a>
              <Button variant="outline" onClick={handleClose} className="w-full border-border text-foreground">
                Entendi
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
