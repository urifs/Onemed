import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Handshake, Loader2 } from 'lucide-react';
import { Seo } from '@/seo/Seo';

// Cadastro de afiliado — conta própria (email+senha), separada da de
// assinante. O servidor (affiliate-register) cria o usuário já confirmado;
// na sequência o login por senha entra direto no painel.
export default function AffiliateRegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Assinante logado que veio pelo menu: preenche o e-mail da sessão — com a
  // sessão do próprio e-mail, o servidor cria o afiliado na mesma conta.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email && !email) setEmail(data.user.email);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (name.trim().length < 3) { toast.error('Informe seu nome completo.'); return; }
    if (password.length < 8) { toast.error('A senha precisa ter pelo menos 8 caracteres.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-register', {
        body: { name: name.trim(), email: email.toLowerCase().trim(), password },
      });
      if (error || data?.error) {
        let msg = data?.error;
        if (!msg && error && 'context' in (error as any)) {
          try { msg = (await (error as any).context.json())?.error; } catch { /* corpo não-json */ }
        }
        throw new Error(msg || 'Não foi possível criar a conta. Tente novamente.');
      }

      // 'self': a sessão atual já é a conta do afiliado — vai direto.
      // 'new'/'alias': o servidor resolve o usuário certo e devolve a sessão.
      if (data?.mode !== 'self') {
        const { data: loginData, error: loginErr } = await supabase.functions.invoke('affiliate-register', {
          body: { action: 'login', email: email.toLowerCase().trim(), password },
        });
        if (!loginErr && loginData?.access_token) {
          await supabase.auth.setSession({
            access_token: loginData.access_token,
            refresh_token: loginData.refresh_token,
          });
        } else {
          toast.success('Conta criada! Faça login para acessar seu painel.');
          navigate('/afiliado/login');
          return;
        }
      }
      toast.success('Conta de afiliado criada com sucesso!');
      navigate('/afiliado');
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Seo title="Cadastro de Afiliado | OneMed" description="Torne-se um afiliado OneMed: revenda e ganhe comissão em cada venda." path="/afiliado/registro" noindex />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mx-auto mb-4">
            <Handshake className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-secondary text-2xl font-bold text-foreground">Seja um afiliado OneMed</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Cadastro grátis. Você ganha comissão em toda venda feita com o seu link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-background-paper border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Nome completo</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              placeholder="Seu nome completo"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">E-mail</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              placeholder="voce@email.com"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Senha</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
              className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground font-semibold py-3.5 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Criando conta…' : 'Criar minha conta de afiliado'}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/afiliado/login" className="text-primary hover:underline font-medium">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
