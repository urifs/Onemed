import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMemberStatus } from '@/hooks/useMemberStatus';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Caixa flutuante mostrada UMA vez, assim que o usuário entra na área de
// membros pelo teste grátis: avisa que as versões mais atualizadas/completas
// dos cursos só saem depois da assinatura (medida contra cópia). O "Entendi"
// (ou fechar) marca como visto por conta — não reaparece.
export function TrialWelcomeModal() {
  const { user } = useAuth();
  const { status, loading } = useMemberStatus();
  const [open, setOpen] = useState(false);

  // Chave por conta: dois trials no mesmo navegador não herdam o "já viu" um
  // do outro.
  const chave = user ? `om_trial_welcome_seen_${user.id}` : null;

  useEffect(() => {
    if (loading || status !== 'trial' || !chave) return;
    if (localStorage.getItem(chave)) return;
    setOpen(true);
  }, [loading, status, chave]);

  const confirmar = () => {
    if (chave) localStorage.setItem(chave, '1');
    setOpen(false);
  };

  // Só existe para quem está em trial.
  if (status !== 'trial') return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) confirmar(); }}>
      <DialogContent className="bg-background-paper border-border max-w-md">
        <DialogHeader>
          <div className="w-11 h-11 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-1">
            <Info className="w-5 h-5 text-primary" />
          </div>
          <DialogTitle className="text-foreground text-lg">Sobre o seu teste grátis</DialogTitle>
          <DialogDescription className="text-muted-foreground leading-relaxed text-[15px]">
            Os cursos nas versões <strong className="text-foreground">mais atualizadas e totalmente
            completos</strong> ficam disponíveis apenas após a assinatura, para evitar cópias.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end pt-2">
          <Button onClick={confirmar}>Entendi</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
