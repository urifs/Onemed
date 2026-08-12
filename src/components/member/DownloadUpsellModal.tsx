import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UpgradePlanModal } from './UpgradePlanModal';
import { PLAN_LABELS } from '@/lib/plans';

// 'lesson-pro' = assinante que JÁ baixa arquivo e tentou baixar uma aula em
// vídeo; o download de aula é exclusivo do Vitalício Pro.
export type DownloadBlockReason = 'trial' | 'upgrade' | 'lesson-pro';

const VANTAGENS = [
  'Baixar os arquivos e apostilas do acervo',
  'Acervo completo, sem limite de tempo',
  'Comunidade e grupo no WhatsApp',
];

// Aparece quando quem não tem direito a download clica no botão. Duas versões:
// teste grátis (convite para assinar) e plano sem download (convite para
// upgrade, reaproveitando o fluxo que já calcula só a diferença de preço).
export function DownloadUpsellModal({ open, onOpenChange, reason, plan }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: DownloadBlockReason;
  plan?: string | null;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Não precisa buscar nada: o preço do upgrade é a diferença de tabela entre
  // os planos, e o plano atual já veio do porteiro do download.
  const abrirUpgrade = () => {
    onOpenChange(false);
    setUpgradeOpen(true);
  };

  const ehTrial = reason === 'trial';
  const ehAulaPro = reason === 'lesson-pro';
  const nomePlano = plan ? PLAN_LABELS[plan] || plan : null;

  // Regra de 11/08: arquivo baixa do Vitalício pra cima; aula em vídeo é
  // exclusiva do Pro. 'lesson-pro' é o caso de aula; 'upgrade' é o de arquivo
  // (Mensal/Anual), que aponta pro Vitalício.
  const titulo = ehTrial
    ? 'Downloads são exclusivos para assinantes'
    : ehAulaPro
      ? 'Baixar aulas é exclusivo do Vitalício Pro'
      : 'Baixar arquivos é um recurso do Vitalício';

  const descricao = ehTrial
    ? 'Sua conta é de teste grátis. O download de arquivos está disponível a partir do Plano Vitalício — assine para liberar a plataforma completa.'
    : ehAulaPro
      ? `${nomePlano ? `No ${nomePlano}` : 'No seu plano'} as aulas ficam disponíveis para assistir na plataforma, sem limite. `
        + 'O download das aulas em vídeo é exclusivo do Vitalício Pro. No upgrade você paga só a diferença.'
      : `${nomePlano ? `No ${nomePlano}` : 'No seu plano'} os arquivos ficam disponíveis para ler na plataforma. `
        + 'O download de arquivos e apostilas está disponível a partir do Plano Vitalício. No upgrade você paga só a diferença.';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-background-paper border-border max-w-md">
          <DialogHeader>
            <div className="w-11 h-11 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-1">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-foreground text-lg">{titulo}</DialogTitle>
            <DialogDescription>{descricao}</DialogDescription>
          </DialogHeader>

          {ehTrial && (
            <ul className="space-y-2 py-1">
              {VANTAGENS.map(v => (
                <li key={v} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {v}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Agora não</Button>
            {ehTrial ? (
              <Button onClick={() => navigate('/checkout')}>Adquirir acesso completo</Button>
            ) : (
              <Button onClick={abrirUpgrade}>Fazer upgrade</Button>
            )}
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
