import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stethoscope, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { toast.error('Preencha todos os campos'); return; }
    if (password.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return; }

    setLoading(true);
    try {
      await register(email, password, name);
      // Concede a role admin. A RLS de user_roles exige que quem insere JÁ
      // seja admin (WITH CHECK has_role admin) — então isto só funciona para
      // o PRIMEIRO admin quando ainda não há RLS bloqueando, ou falha. Antes,
      // o código ignorava o resultado e dizia "sucesso" mesmo quando o insert
      // era negado, jogando o usuário no /admin de onde o ProtectedRoute o
      // expulsava na hora. Agora é honesto.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // signUp sem sessão = confirmação de email ativada. Não dá pra
        // conceder role agora.
        toast.success('Conta criada! Confirme seu email e peça a um admin para liberar seu acesso.');
        return;
      }
      const { error: roleErr } = await supabase.from('user_roles').insert({ user_id: user.id, role: 'admin' });
      if (roleErr) {
        toast.error('Conta criada, mas o acesso admin precisa ser concedido por um administrador existente.');
        return;
      }
      toast.success('Conta criada com sucesso!');
      navigate('/admin');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="font-secondary text-2xl font-bold text-foreground mb-2">Criar Conta Admin</h1>
            <p className="text-muted-foreground text-sm">Configure sua conta para gerenciar acessos</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Seu nome" className="pl-10 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@email.com" className="pl-10 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" className="pl-10 h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <>Criar Conta <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </form>
        </div>

        <p className="text-center mt-4 text-sm text-muted-foreground">
          Já tem conta?{' '}
          <Link to="/admin/login" className="text-primary hover:underline">Fazer login</Link>
        </p>
      </div>
    </div>
  );
}
