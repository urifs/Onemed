import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LogOut, MessageCircle } from 'lucide-react';
import { limiteDeTelasLembrado } from '@/lib/deviceLimit';

const SUPPORT_PHONE = '5563999191551';

/**
 * Aviso de sessão encerrada.
 *
 * ⚠️ Dispara em QUALQUER desconexão forçada — não só no limite de telas. Por
 * isso o texto não pode afirmar uma causa que não temos como confirmar aqui:
 * a versão anterior dizia "esta conta já está conectada em outros 2
 * dispositivos e um novo login foi feito agora", com dois problemas graves:
 *
 * 1. O número 2 era escrito à mão. Quem paga o Vitalício Pro (6 telas) lia
 *    que seu limite era 2 e vinha reclamar — com razão. Agora o número sai do
 *    limite REAL da conta (plano + telas extras compradas), guardado em
 *    `lembrarLimiteDeTelas` enquanto havia sessão; sem esse dado, a mensagem
 *    simplesmente não cita número.
 * 2. Acusava um login de terceiro em toda desconexão — inclusive nas que
 *    vinham de aparelho parado há muito tempo ou de falha de sessão. Isso
 *    gerava chamado de gente achando que a conta tinha sido invadida.
 */
export function KickedOutModal() {
  const { kickedOut, dismissKickedOut } = useAuth();
  const navigate = useNavigate();

  if (!kickedOut) return null;

  const limite = limiteDeTelasLembrado();

  const handleClose = () => {
    dismissKickedOut();
    navigate('/login');
  };

  return (
    <Dialog open={kickedOut} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="bg-background-paper border-border max-w-sm" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center mb-2">
            <LogOut className="w-5 h-5 text-primary" />
          </div>
          <DialogTitle className="text-foreground">Sessão encerrada</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {typeof limite === 'number' ? (
            <>
              Seu plano permite <strong className="text-foreground">{limite} {limite === 1 ? 'dispositivo conectado' : 'dispositivos conectados'}</strong> ao
              mesmo tempo. Esta sessão foi encerrada — isso acontece quando um novo login passa desse
              limite, ou quando este aparelho ficou muito tempo sem uso.
            </>
          ) : (
            <>
              Esta sessão foi encerrada — isso acontece quando um novo login passa do limite de
              dispositivos do seu plano, ou quando este aparelho ficou muito tempo sem uso.
            </>
          )}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Seu acesso continua o mesmo: é só entrar de novo para continuar de onde parou. Se você não
          reconhece nenhum login recente, fale com o suporte.
        </p>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleClose} className="w-full bg-primary hover:bg-primary-hover text-primary-foreground">
            Entrar novamente
          </Button>
          <a
            href={`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent('Olá! Minha sessão no OneMed foi encerrada e eu não reconheço nenhum login recente.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-secondary transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-[#25D366]" /> Falar com o suporte
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
