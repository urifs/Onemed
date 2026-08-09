import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Lock, Check } from 'lucide-react';
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

  const titulo = ehTrial
    ? 'Downloads são exclusivos para assinantes'
    : ehAulaPro
      ? 'Baixar aulas é exclusivo do Vitalício Pro'
      : 'Seu plano não inclui downloads';

  const descricao = ehTrial
    ? 'Sua conta é de teste grátis. Para baixar os arquivos do acervo, assine um plano e libere a plataforma completa.'
    : ehAulaPro
      // Quem chega aqui já baixa arquivo — o texto precisa deixar claro que o
      // que mudou é só a aula em vídeo, senão parece que perdeu um direito.
      ? `${nomePlano ? `O ${nomePlano}` : 'Seu plano'} baixa os arquivos e apostilas normalmente. `
        + 'O download das aulas em vídeo é exclusivo do Vitalício Pro — no seu plano elas ficam '
        + 'disponíveis para assistir na plataforma, sem limite. No upgrade você paga só a diferença.'
      : `${nomePlano ? `O ${nomePlano}` : 'Seu plano'} dá acesso a todo o conteúdo para assistir na plataforma. `
        + 'Para baixar os arquivos do acervo, faça upgrade — você paga só a diferença.';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-background-paper border-border max-w-md">
          <DialogHeader>
            <div className="w-11 h-11 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-1">
              {ehTrial || ehAulaPro ? <Lock className="w-5 h-5 text-primary" /> : <Download className="w-5 h-5 text-primary" />}
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
