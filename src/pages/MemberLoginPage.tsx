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
import {
  Stethoscope, Mail, ArrowRight, ArrowLeft, KeyRound, Loader2, ShieldCheck, Lock, Eye, EyeOff,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const CAPTCHA_DELAY_MS = 3000;
const SENHA_MINIMA = 8;

// A tela tem três momentos: identificar o e-mail, e então CADASTRAR a senha
// (primeira vez) ou DIGITAR a senha (já cadastrada). Quem é que decide qual dos
// dois é o servidor — o cliente nunca adivinha a partir do e-mail.
type Etapa = 'email' | 'criar' | 'senha';

export default function MemberLoginPage() {
  const [etapa, setEtapa] = useState<Etapa>('email');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaChecked, setCaptchaChecked] = useState(false);
  const [captchaVerifying, setCaptchaVerifying] = useState(false);
  const [captchaReady, setCaptchaReady] = useState(false);
  const captchaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const campoSenha = useRef<HTMLInputElement | null>(null);
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

  // O foco vai pro campo de senha assim que a etapa troca: sem isso a pessoa
  // digita o e-mail, a tela muda e o teclado fica sem destino no celular.
  useEffect(() => {
    if (etapa !== 'email') campoSenha.current?.focus();
  }, [etapa]);

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

  // "Failed to send a request to the Edge Function" = o navegador nem
  // conseguiu falar com o servidor (rede/VPN/bloqueador, ou o app aberto
  // por um domínio fora do oficial). Mensagem em português com o que fazer,
  // em vez do erro cru em inglês.
  const avisarErro = (err: unknown, padrao: string) => {
    const cru = String((err as Error)?.message || '');
    const falhaDeRede = /Failed to send a request|Failed to fetch|NetworkError|Load failed/i.test(cru);
    toast.error(
      falhaDeRede
        ? 'Não foi possível conectar ao servidor. Verifique sua internet, desative VPN ou bloqueador de anúncios e tente de novo — e confira se está acessando por onemedcursos.com.br.'
        : cru || padrao,
    );
  };

  const chamar = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('member-auth-request', { body });
    if (error || data?.error) {
      const msg = data?.error || await extractFunctionErrorMessage(error, 'Erro ao entrar');
      const e = new Error(msg) as Error & { dados?: any };
      e.dados = data;
      throw e;
    }
    return data;
  };

  // Entrar de verdade: guarda a sessão e recarrega.
  //
  // Recarregar em vez de navegar pelo router: o `user` do AuthContext vem do
  // evento onAuthStateChange, que dispara de forma assíncrona em relação à
  // promise do setSession(). Navegar pelo cliente arriscava chegar em /membros
  // antes do evento, com a rota lendo `user: null` e travando.
  const entrar = async (data: any) => {
    if (!data?.access_token || !data?.refresh_token) {
      throw new Error('Não foi possível concluir o login. Tente novamente.');
    }
    const { error: sessionErr } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (sessionErr) throw sessionErr;
    window.location.href = '/membros';
  };

  const identificarEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Informe seu email'); return; }
    if (!captchaReady) { toast.error('Confirme que você não é um robô'); return; }
    setLoading(true);
    try {
      const data = await chamar({ action: 'status', email });
      setEtapa(data?.hasPassword ? 'senha' : 'criar');
      setSenha('');
      setConfirmacao('');
    } catch (err) {
      avisarErro(err, 'Não encontramos acesso ativo para este email');
    } finally {
      setLoading(false);
    }
  };

  const cadastrarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < SENHA_MINIMA) { toast.error(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres`); return; }
    if (senha !== confirmacao) { toast.error('As senhas não são iguais'); return; }
    setLoading(true);
    try {
      const data = await chamar({ action: 'set-password', email, password: senha });
      // Senha criada mas sem sessão de volta: não trava ninguém — a pessoa
      // entra pela própria tela de senha com o que acabou de escolher.
      if (!data?.access_token) {
        toast.success('Senha cadastrada! Agora entre com ela.');
        setEtapa('senha');
        setSenha('');
        setConfirmacao('');
        return;
      }
      await entrar(data);
    } catch (err) {
      // Alguém cadastrou a senha entre a checagem e o envio (ou a pessoa abriu
      // duas abas): manda pra tela de senha em vez de repetir o erro cru.
      if (/já tem uma senha/i.test(String((err as Error)?.message || ''))) {
        setEtapa('senha');
        setSenha('');
        setConfirmacao('');
      }
      avisarErro(err, 'Não foi possível cadastrar a senha');
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  const entrarComSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senha) { toast.error('Digite sua senha'); return; }
    setLoading(true);
    try {
      const data = await chamar({ action: 'login', email, password: senha });
      await entrar(data);
    } catch (err) {
      // O suporte liberou novo cadastro no meio do caminho: leva pra tela de
      // criar em vez de deixar a pessoa batendo numa senha que não existe mais.
      if ((err as any)?.dados?.needsPassword) {
        setEtapa('criar');
        setSenha('');
        setConfirmacao('');
      }
      avisarErro(err, 'Não foi possível entrar');
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  const voltarParaEmail = () => {
    setEtapa('email');
    setSenha('');
    setConfirmacao('');
  };

  const botaoOlho = (
    <button
      type="button"
      onClick={() => setVerSenha(v => !v)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
      tabIndex={-1}
    >
      {verSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  const girando = <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <ThemeToggle className="fixed top-4 right-4 z-50" />
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-primary" />
          </div>
          <span className="font-secondary font-bold text-2xl text-foreground">OneMed</span>
        </Link>

        <div className="bg-card rounded-2xl p-8 border border-border">
          <div className="text-center mb-8">
            <h1 className="font-secondary text-2xl font-bold text-foreground mb-2">Área de Membros</h1>
            <p className="text-muted-foreground text-sm">Acesse seus cursos, aulas e materiais</p>
          </div>

          {etapa === 'email' && (
            <form onSubmit={identificarEmail} className="space-y-5">
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
                    autoComplete="email"
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
                {loading ? girando : <>Continuar <ArrowRight className="w-4 h-4" /></>}
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
                <KeyRound className="w-3.5 h-3.5" />
                Use o email cadastrado na compra
              </p>
            </form>
          )}

          {etapa !== 'email' && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/50 px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Entrando como</p>
                <p className="text-sm text-foreground truncate">{email}</p>
              </div>
              <button
                type="button"
                onClick={voltarParaEmail}
                className="shrink-0 text-xs text-primary hover:underline"
              >
                Trocar
              </button>
            </div>
          )}

          {etapa === 'criar' && (
            <form onSubmit={cadastrarSenha} className="space-y-5">
              <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
                <p className="text-sm font-medium text-foreground mb-1">O login agora é com email e senha</p>
                <p className="text-xs text-muted-foreground">
                  Você ainda não cadastrou uma senha. Escolha uma agora — nas próximas vezes,
                  entre com seu email e essa senha.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Crie sua senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={campoSenha}
                    type={verSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder={`Mínimo de ${SENHA_MINIMA} caracteres`}
                    autoComplete="new-password"
                    className="pl-10 pr-10 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50"
                  />
                  {botaoOlho}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Repita a senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={verSenha ? 'text' : 'password'}
                    value={confirmacao}
                    onChange={e => setConfirmacao(e.target.value)}
                    placeholder="Digite a senha de novo"
                    autoComplete="new-password"
                    className="pl-10 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold gap-2"
              >
                {loading ? girando : <>Cadastrar senha e entrar <ArrowRight className="w-4 h-4" /></>}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Guarde bem sua senha: ela é cadastrada uma única vez. Se esquecer,
                fale com o suporte para liberar um novo cadastro.
              </p>
            </form>
          )}

          {etapa === 'senha' && (
            <form onSubmit={entrarComSenha} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Sua senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={campoSenha}
                    type={verSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    className="pl-10 pr-10 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50"
                  />
                  {botaoOlho}
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold gap-2"
              >
                {loading ? girando : <>Entrar <ArrowRight className="w-4 h-4" /></>}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Esqueceu a senha? Fale com o suporte pelo WhatsApp para liberar um novo cadastro.
              </p>
            </form>
          )}
        </div>

        <p className="text-center mt-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Ainda não é aluno? Conheça o OneMed
          </Link>
        </p>
      </div>
    </div>
  );
}
