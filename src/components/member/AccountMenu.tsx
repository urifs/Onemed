import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { extractFunctionErrorMessage, formatDateSP } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, LogOut, MessageCircle, RefreshCw, Loader2, Save } from 'lucide-react';

const SUPPORT_PHONE = '5563999191551';
const PLAN_LABELS: Record<string, string> = {
  lifetime: 'Vitalício', annual: 'Anual', paid: 'Pago', trial: 'Trial', admin: 'Administrador',
};

interface AccountInfo {
  email: string;
  plan: string | null;
  isLifetime: boolean;
  isAdmin: boolean;
  expiresAt: string | null;
}

export function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [renewing, setRenewing] = useState(false);

  const loadInfo = useCallback(async () => {
    if (!user) return;
    setLoadingInfo(true);
    try {
      const [{ data: accountData, error: accountErr }, { data: profile }] = await Promise.all([
        supabase.functions.invoke('member-account-info'),
        supabase.from('profiles').select('name').eq('user_id', user.id).maybeSingle(),
      ]);
      if (accountErr || accountData?.error) throw new Error(accountData?.error || accountErr?.message);
      setInfo(accountData);
      setName(profile?.name || '');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar dados da conta');
    } finally {
      setLoadingInfo(false);
    }
  }, [user]);

  useEffect(() => { if (open) loadInfo(); }, [open, loadInfo]);

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

  const handleRenew = async () => {
    if (!user?.email) return;
    setRenewing(true);
    try {
      const ref = `onemed_renew_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const { error: buyerErr } = await supabase.from('buyers').insert({
        email: user.email.toLowerCase(),
        name: name.trim() || null,
        plan: 'annual',
        amount: 199,
        status: 'pending',
        external_reference: ref,
      });
      if (buyerErr) throw buyerErr;

      const { data: result, error: fnErr } = await supabase.functions.invoke('mp-create-payment', {
        body: {
          plan: 'annual',
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

  const daysRemaining = (() => {
    if (!info?.expiresAt) return null;
    const diff = new Date(info.expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  })();

  const planLabel = info?.plan ? (PLAN_LABELS[info.plan] || info.plan) : '—';

  return (
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
                    : info?.expiresAt
                      ? (daysRemaining !== null && daysRemaining < 0
                          ? 'Expirado'
                          : `${daysRemaining}d · ${formatDateSP(info.expiresAt)}`)
                      : '—'}
                </span>
              </div>

              {!info?.isLifetime && !info?.isAdmin && (
                <Button
                  onClick={handleRenew}
                  disabled={renewing}
                  size="sm"
                  className="w-full mt-2 bg-primary hover:bg-primary-hover text-primary-foreground gap-1.5"
                >
                  {renewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {renewing ? 'Abrindo pagamento...' : 'Renovar Assinatura'}
                </Button>
              )}
            </div>

            <div className="p-2">
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
  );
}
