import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UpgradePlanModal } from './UpgradePlanModal';
import { useMemberStatus } from '@/hooks/useMemberStatus';

// Convite de upgrade quando um plano sem direito às ferramentas de IA
// (hoje: Mensal) tenta gerar flashcards ou banco de questões.
export function AiUpsellModal({ open, onOpenChange, feature }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: 'flashcards' | 'questoes';
}) {
  const { user } = useAuth();
  const { plan } = useMemberStatus();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const nome = feature === 'questoes' ? 'o gerador de banco de questões' : 'o gerador de flashcards';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-background-paper border-border max-w-md">
          <DialogHeader>
            <div className="w-11 h-11 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-1">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-foreground text-lg">
              Seu plano não inclui esta ferramenta
            </DialogTitle>
            <DialogDescription>
              O Plano Mensal dá acesso a todo o conteúdo para estudar na plataforma. Para usar {nome}
              {' '}a partir de qualquer aula ou arquivo, faça upgrade de plano — você paga só a diferença.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Agora não</Button>
            <Button onClick={() => { onOpenChange(false); setUpgradeOpen(true); }}>Fazer upgrade</Button>
          </div>
        </DialogContent>
      </Dialog>

      {upgradeOpen && user?.email && plan && (
        <UpgradePlanModal
          open
          onOpenChange={setUpgradeOpen}
          currentPlan={plan}
          userEmail={user.email}
        />
      )}
    </>
  );
}
