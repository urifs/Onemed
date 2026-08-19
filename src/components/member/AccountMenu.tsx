import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { extractFunctionErrorMessage, formatDateSP, formatBRL } from '@/lib/utils';
import { PLAN_PRICES } from '@/lib/plans';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, LogOut, MessageCircle, RefreshCw, Loader2, Save, Smartphone, Crown, FileText, MonitorSmartphone } from 'lucide-react';
import { useAccountInfo } from '@/hooks/useAccountInfo';
import { AddToHomeScreenModal } from './AddToHomeScreenModal';
import { UpgradePlanModal, upgradeTargetsFor } from './UpgradePlanModal';
import { BuyScreensModal } from './BuyScreensModal';
import { PlanDetailsModal } from './PlanDetailsModal';

const SUPPORT_PHONE = '5563999191551';
const PLAN_LABELS: Record<string, string> = {
  lifetime: 'Vitalício', lifetime_plus: 'Vitalício Plus', lifetime_pro: 'Vitalício Pro',
  annual: 'Anual', monthly: 'Mensal', paid: 'Pago', trial: 'Teste Grátis (10 min)', admin: 'Administrador',
};

export function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  // Cache compartilhado com o TrialCountdownBar (useAccountInfo): abrir e
  // fechar o menu não refaz a chamada nem pisca o spinner — só busca de novo
  // quando o cache de 1 min vence.
  const { info, loading: loadingInfo, error: infoError, refetch: loadInfo } = useAccountInfo(open);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [screensOpen, setScreensOpen] = useState(false);
  const [planDetailsOpen, setPlanDetailsOpen] = useState(false);

  useEffect(() => {
    if (infoError && open) toast.error(infoError.message || 'Erro ao carregar dados da conta');
  }, [infoError, open]);

  useEffect(() => {
    if (!open || !user) return;
    let alive = true;
    supabase.from('profiles').select('name').eq('user_id', user.id).maybeSingle()
      .then(({ data: profile }) => { if (alive) setName(profile?.name || ''); });
    return () => { alive = false; };
  }, [open, user?.id]);

  useEffect(() => {
    if (!open || info?.plan !== 'trial') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [open, info?.plan]);

  const saveName = async () => {
    if (!user) return;
    setSavingName(true);
    try {
      const { error } = await supabase.from('profiles').upsert(
        { user_id: user.id, email: user.email, name: name.trim() || null },
        { onConflict: 'user_id' },
      );
      if (error) throw error;
      toast.success('Nome atualizado');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar nome');
    } finally {
      setSavingName(false);
    }
  };

  // Renovação cobra o PLANO ATUAL do aluno. Antes era 'annual' fixo: um aluno
  // do Mensal clicava em "Renovar Assinatura" esperando os R$99 e caía num
  // pagamento de R$299 do Anual, sem ver valor nenhum antes do redirect.
  // Plano legado sem preço de tabela (ex.: 'paid' antigo) cai no Anual, que
  // era o comportamento de sempre.
  const renewPlan = info?.plan && PLAN_PRICES[info.plan] ? info.plan : 'annual';

  const handleRenew = async () => {
    if (!user?.email) return;
    setRenewing(true);
    try {
      const ref = `onemed_renew_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const { error: buyerErr } = await supabase.from('buyers').insert({
        email: user.email.toLowerCase(),
        name: name.trim() || null,
        plan: renewPlan,
        amount: PLAN_PRICES[renewPlan],
        status: 'pending',
        external_reference: ref,
      });
      if (buyerErr) throw buyerErr;

      const { data: result, error: fnErr } = await supabase.functions.invoke('mp-create-payment', {
        body: {
          plan: renewPlan,
          email: user.email.toLowerCase(),
          name: name.trim() || '',
          externalReference: ref,
          origin: window.location.origin,
        },
      });
      if (fnErr || result?.error) {
        const msg = result?.error || await extractFunctionErrorMessage(fnErr, 'Erro ao gerar pagamento');
        throw new Error(msg);
      }
      window.location.href = result.init_point || result.sandbox_init_point;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar renovação');
      setRenewing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isTrial = info?.plan === 'trial';

  const daysRemaining = (() => {
    if (!info?.expiresAt) return null;
    const diff = new Date(info.expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  })();

  const trialRemaining = (() => {
    if (!isTrial || !info?.expiresAt) return null;
    const diffMs = new Date(info.expiresAt).getTime() - now;
    if (diffMs <= 0) return 'Expirado';
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} restantes`;
  })();

  const planLabel = info?.plan ? (PLAN_LABELS[info.plan] || info.plan) : '—';
  const hasUpgradeTarget = upgradeTargetsFor(info?.plan).length > 0;

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-9 h-9 shrink-0 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          title="Minha conta"
        >
          <User className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 bg-background-paper border-border p-0 overflow-hidden">
        {loadingInfo ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Conta</p>
                <p className="text-sm text-foreground font-medium mt-0.5 truncate">{info?.email || user?.email}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <div className="flex gap-2">
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="h-8 text-sm bg-secondary border-border text-foreground"
                  />
                  <Button size="sm" variant="outline" onClick={saveName} disabled={savingName} className="h-8 px-2.5 border-border shrink-0">
                    {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Plano</span>
                <span className="text-foreground font-medium">{planLabel}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Acesso</span>
                <span className="text-foreground font-medium">
                  {info?.isLifetime
                    ? 'Vitalício'
                    : isTrial
                      ? trialRemaining
                      : info?.expiresAt
                        ? (daysRemaining !== null && daysRemaining < 0
                            ? 'Expirado'
                            : `${daysRemaining}d · ${formatDateSP(info.expiresAt)}`)
                        : '—'}
                </span>
              </div>

              {!info?.isAdmin && info?.plan && (
                <Button
                  onClick={() => { setOpen(false); setPlanDetailsOpen(true); }}
                  size="sm"
                  variant="outline"
                  className="w-full mt-2 border-border text-foreground hover:bg-secondary gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" /> Detalhes do Plano
                </Button>
              )}

              {!info?.isAdmin && isTrial && (
                <Button
                  onClick={() => navigate('/checkout')}
                  size="sm"
                  className="w-full mt-2 bg-primary hover:bg-primary-hover text-primary-foreground gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Adquirir Acesso Completo
                </Button>
              )}

              {!info?.isAdmin && !isTrial && hasUpgradeTarget && (
                <Button
                  onClick={() => { setOpen(false); setUpgradeOpen(true); }}
                  size="sm"
                  className="w-full mt-2 bg-primary hover:bg-primary-hover text-primary-foreground gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5" /> Fazer Upgrade de Plano
                </Button>
              )}

              {!info?.isAdmin && !isTrial && info?.plan && (
                <Button
                  onClick={() => { setOpen(false); setScreensOpen(true); }}
                  size="sm"
                  variant="outline"
                  className="w-full mt-2 border-border text-foreground hover:bg-secondary gap-1.5"
                >
                  <MonitorSmartphone className="w-3.5 h-3.5" /> Comprar Telas Simultâneas
                </Button>
              )}

              {!info?.isAdmin && !info?.isLifetime && !isTrial && (
                <Button
                  onClick={handleRenew}
                  disabled={renewing}
                  size="sm"
                  variant={hasUpgradeTarget ? 'outline' : 'default'}
                  className={hasUpgradeTarget ? 'w-full mt-2 border-border text-foreground hover:bg-secondary gap-1.5' : 'w-full mt-2 bg-primary hover:bg-primary-hover text-primary-foreground gap-1.5'}
                >
                  {renewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {renewing
                    ? 'Abrindo pagamento...'
                    : `Renovar Plano ${PLAN_LABELS[renewPlan] || 'Anual'} — ${formatBRL(PLAN_PRICES[renewPlan])}`}
                </Button>
              )}
            </div>

            <div className="p-2">
              <AddToHomeScreenModal trigger={
                <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors">
                  <Smartphone className="w-4 h-4 text-primary" /> Instalar App
                </button>
              } />
              <a
                href={`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent('Olá! Preciso de suporte com minha conta no OneMed.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" /> Suporte via WhatsApp
              </a>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-red-400 hover:bg-secondary transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
    {info?.plan && (
      <UpgradePlanModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentPlan={info.plan}
        amountPaid={info.amountPaid ?? 0}
        userEmail={info.email}
        userName={name}
      />
    )}
    {info?.plan && (
      <BuyScreensModal
        open={screensOpen}
        onOpenChange={setScreensOpen}
        userEmail={info.email}
        userName={name}
        currentLimit={info.deviceLimit ?? null}
      />
    )}
    {info?.plan && (
      <PlanDetailsModal
        open={planDetailsOpen}
        onOpenChange={setPlanDetailsOpen}
        plan={info.plan}
        email={info.email}
        whatsapp={info.whatsapp}
        amountPaid={info.amountPaid ?? 0}
        expiresAt={info.expiresAt}
        isLifetime={info.isLifetime}
        grantedAt={info.grantedAt}
      />
    )}
    </>
  );
}
