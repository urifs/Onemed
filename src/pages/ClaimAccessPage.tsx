import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Mail, ArrowRight, FolderOpen, Loader2, AlertCircle, Stethoscope } from 'lucide-react';

export default function ClaimAccessPage() {
  const [searchParams] = useSearchParams();
  const externalReference = searchParams.get('ref');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [purchaseInfo, setPurchaseInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      if (!externalReference) { setError('Link inválido.'); setChecking(false); return; }
      const { data } = await supabase.from('buyers').select('*').eq('external_reference', externalReference).single();
      if (!data) { setError('Compra não encontrada.'); setChecking(false); return; }
      setPurchaseInfo(data);
      if (data.access_granted) { setRegistered(true); setEmail(data.email || ''); }
      setChecking(false);
    };
    check();
  }, [externalReference]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Informe seu email'); return; }
    setLoading(true);
    try {
      const normalizedEmail = email.toLowerCase();
      await supabase.from('buyers').update({ email: normalizedEmail, access_granted: true }).eq('external_reference', externalReference!);

      // Só insere em accesses se não existir acesso ativo para este email
      const { data: existing } = await supabase
        .from('accesses')
        .select('id')
        .eq('email', normalizedEmail)
        .eq('status', 'active')
        .neq('access_type', 'trial')
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from('accesses').insert({ email: normalizedEmail, access_type: purchaseInfo?.plan || 'lifetime', status: 'active' });
      }

      setRegistered(true);
      toast.success('Acesso liberado!');
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-primary" />
            </div>
            <span className="font-secondary font-bold text-2xl text-foreground">OneMed</span>
          </Link>
        </div>

        <div className="glass-strong rounded-2xl p-8 border border-border">
          {checking ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Verificando sua compra...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-primary mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">Erro</p>
              <p className="text-muted-foreground text-sm">{error}</p>
            </div>
          ) : registered ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-accent-success mx-auto mb-4" />
              <h2 className="font-secondary text-2xl font-bold text-foreground mb-2">Acesso Confirmado!</h2>
              <p className="text-muted-foreground mb-2">Acesso liberado para:</p>
              <p className="text-primary font-medium mb-6">{email}</p>
              <a href="https://drive.google.com/drive/shared-with-me" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-6 py-3 rounded-lg transition-colors">
                <FolderOpen className="w-5 h-5" /> Abrir Google Drive <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <>
              <h2 className="font-secondary text-2xl font-bold text-foreground mb-2">Ativar seu Acesso</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Compra confirmada: <span className="text-foreground font-medium capitalize">{purchaseInfo?.plan}</span>
              </p>
              <form onSubmit={handleClaim} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email do Google Drive</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="pl-10 h-12 bg-secondary border-border text-foreground" required />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Ativar Acesso <ArrowRight className="w-4 h-4" /></>}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
