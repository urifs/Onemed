import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, Lock, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UpgradePlanModal } from './UpgradePlanModal';
import { PLAN_LABELS } from '@/lib/plans';

export type DownloadBlockReason = 'trial' | 'upgrade';

const VANTAGENS = [
  'Baixar qualquer aula ou arquivo',
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
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);
  const [upgradeInfo, setUpgradeInfo] = useState<{ plan: string; amountPaid: number | null } | null>(null);

  // O modal de upgrade precisa do valor já pago pra mostrar só a diferença —
  // isso vive no member-account-info, e só vale a pena buscar se a pessoa
  // realmente quiser fazer upgrade.
  const abrirUpgrade = async () => {
    setLoadingUpgrade(true);
    try {
      const { data, error } = await supabase.functions.invoke('member-account-info');
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setUpgradeInfo({ plan: data.plan, amountPaid: data.amountPaid });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível carregar as opções de upgrade');
    } finally {
      setLoadingUpgrade(false);
    }
  };

  const ehTrial = reason === 'trial';
  const nomePlano = plan ? PLAN_LABELS[plan] || plan : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-background-paper border-border max-w-md">
          <DialogHeader>
            <div className="w-11 h-11 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-1">
              {ehTrial ? <Lock className="w-5 h-5 text-primary" /> : <Download className="w-5 h-5 text-primary" />}
            </div>
            <DialogTitle className="text-foreground text-lg">
              {ehTrial ? 'Downloads são exclusivos para assinantes' : 'Seu plano não inclui downloads'}
            </DialogTitle>
            <DialogDescription>
              {ehTrial
                ? 'Sua conta é de teste grátis. Para baixar aulas e arquivos, assine um plano e libere a plataforma completa.'
                : `${nomePlano ? `O ${nomePlano}` : 'Seu plano'} dá acesso a todo o conteúdo para assistir na plataforma. `
                  + 'Para baixar aulas e arquivos, faça upgrade — você paga só a diferença.'}
            </DialogDescription>
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
              <Button onClick={abrirUpgrade} disabled={loadingUpgrade}>
                {loadingUpgrade ? <><Loader2 className="w-4 h-4 animate-spin" /> Carregando…</> : 'Fazer upgrade'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {upgradeInfo && user?.email && (
        <UpgradePlanModal
          open
          onOpenChange={(o) => { if (!o) setUpgradeInfo(null); }}
          currentPlan={upgradeInfo.plan}
          amountPaid={upgradeInfo.amountPaid}
          userEmail={user.email}
        />
      )}
    </>
  );
}
