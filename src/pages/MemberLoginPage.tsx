import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Mail, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

export default function MemberLoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) navigate('/membros', { replace: true });
  }, [authLoading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Informe seu email'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('member-auth-request', { body: { email } });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Erro ao enviar o link');
      setSent(true);
    } catch (err: any) {
      toast.error(err.message || 'Não encontramos acesso ativo para este email');
    } finally {
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
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <span className="font-secondary font-bold text-2xl text-foreground">OneMed</span>
        </Link>

        <div className="glass-strong rounded-2xl p-8 border border-border glow-red">
          {!sent ? (
            <>
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

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Enviar link de acesso <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>

                <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Sem senha — só o link direto no seu email
                </p>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-accent-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-accent-success" />
              </div>
              <h2 className="font-secondary text-xl font-bold text-foreground mb-2">Verifique seu email</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-1">
                Enviamos um link de acesso para
              </p>
              <p className="text-foreground font-medium mb-6">{email}</p>
              <button
                onClick={() => setSent(false)}
                className="text-sm text-primary hover:text-primary-hover transition-colors"
              >
                Usar outro email
              </button>
            </div>
          )}
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
