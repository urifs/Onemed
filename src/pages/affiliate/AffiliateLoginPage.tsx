import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Handshake, Loader2 } from 'lucide-react';
import { Seo } from '@/seo/Seo';

export default function AffiliateLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      // O login passa pelo servidor: quando o mesmo e-mail é de assinante e de
      // afiliado, a conta de afiliado pode viver num usuário interno próprio —
      // o servidor resolve isso e devolve a sessão certa.
      const { data, error } = await supabase.functions.invoke('affiliate-register', {
        body: { action: 'login', email: email.toLowerCase().trim(), password },
      });
      if (error || data?.error || !data?.access_token) {
        let msg = data?.error;
        if (!msg && error && 'context' in (error as any)) {
          try { msg = (await (error as any).context.json())?.error; } catch { /* não-json */ }
        }
        throw new Error(msg || 'E-mail ou senha incorretos.');
      }
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      navigate('/afiliado');
    } catch (err: any) {
      toast.error(err.message || 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Seo title="Login de Afiliado | OneMed" description="Acesse seu painel de afiliado OneMed." path="/afiliado/login" noindex />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mx-auto mb-4">
            <Handshake className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-secondary text-2xl font-bold text-foreground">Painel do afiliado</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Entre com o e-mail e a senha do seu cadastro de afiliado.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-background-paper border border-border rounded-2xl p-6 space-y-4">
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
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              placeholder="Sua senha"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-60 text-primary-foreground font-semibold py-3.5 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Entrando…' : 'Entrar no painel'}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Ainda não é afiliado?{' '}
            <Link to="/afiliado/registro" className="text-primary hover:underline font-medium">Cadastre-se grátis</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
