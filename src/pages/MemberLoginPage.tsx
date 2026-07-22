import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Stethoscope, Mail, ArrowRight, Sparkles, Loader2, ShieldCheck } from 'lucide-react';

const CAPTCHA_DELAY_MS = 3000;

export default function MemberLoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaChecked, setCaptchaChecked] = useState(false);
  const [captchaVerifying, setCaptchaVerifying] = useState(false);
  const [captchaReady, setCaptchaReady] = useState(false);
  const captchaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!authLoading && user) navigate('/membros', { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const prefill = searchParams.get('email');
    if (prefill) setEmail(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { if (captchaTimer.current) clearTimeout(captchaTimer.current); }, []);

  const handleCaptchaChange = (checked: boolean) => {
    setCaptchaChecked(checked);
    if (captchaTimer.current) clearTimeout(captchaTimer.current);
    if (!checked) {
      setCaptchaVerifying(false);
      setCaptchaReady(false);
      return;
    }
    setCaptchaVerifying(true);
    setCaptchaReady(false);
    captchaTimer.current = setTimeout(() => {
      setCaptchaVerifying(false);
      setCaptchaReady(true);
    }, CAPTCHA_DELAY_MS);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Informe seu email'); return; }
    if (!captchaReady) { toast.error('Confirme que você não é um robô'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('member-auth-request', { body: { email } });
      if (error || data?.error) {
        const msg = data?.error || await extractFunctionErrorMessage(error, 'Erro ao entrar');
        throw new Error(msg);
      }
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionErr) throw sessionErr;
      // Full reload instead of a router navigate — AuthContext's `user` state
      // updates off the onAuthStateChange event, which fires asynchronously
      // relative to setSession()'s own promise. Navigating client-side risked
      // landing on /membros before that event caught up, so the route saw a
      // stale `user: null` and got stuck. A reload re-inits AuthContext from
      // the session setSession() already persisted to localStorage — no race.
      window.location.href = '/membros';
    } catch (err: any) {
      toast.error(err.message || 'Não encontramos acesso ativo para este email');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-primary/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-primary/8 rounded-full blur-[110px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-primary" />
          </div>
          <span className="font-secondary font-bold text-2xl text-foreground">OneMed</span>
        </Link>

        <div className="glass-strong rounded-2xl p-8 border border-border glow-red">
          <div className="text-center mb-8">
            <h1 className="font-secondary text-2xl font-bold text-foreground mb-2">Área de Membros</h1>
            <p className="text-muted-foreground text-sm">Acesse seus cursos, aulas e materiais</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Email cadastrado</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  autoFocus
                  className="pl-10 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 px-3.5 py-3">
              <Checkbox
                id="captcha"
                checked={captchaChecked}
                onCheckedChange={(v) => handleCaptchaChange(v === true)}
                disabled={captchaVerifying}
              />
              <Label htmlFor="captcha" className="flex-1 text-sm text-foreground cursor-pointer select-none">
                Não sou um robô
              </Label>
              {captchaVerifying && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
              {captchaReady && <ShieldCheck className="w-4 h-4 text-accent-success" />}
            </div>

            <Button
              type="submit"
              disabled={loading || !captchaReady}
              className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Entrar <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Sem senha — só o email cadastrado na compra
            </p>
          </form>
        </div>

        <p className="text-center mt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Ainda não é aluno? Conheça o OneMed
          </Link>
        </p>
      </div>
    </div>
  );
}
