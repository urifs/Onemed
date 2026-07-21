import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LogOut, MessageCircle } from 'lucide-react';

const SUPPORT_PHONE = '5563999191551';

export function KickedOutModal() {
  const { kickedOut, dismissKickedOut } = useAuth();
  const navigate = useNavigate();

  if (!kickedOut) return null;

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
      </DialogContent>
    </Dialog>
  );
}
