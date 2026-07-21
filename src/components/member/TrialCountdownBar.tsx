import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Clock, ShoppingCart } from 'lucide-react';

// Floating countdown for trial members — /membros itself doesn't otherwise
// show whether the visitor is on a 30-minute trial or has real access, so
// without this a trial user has no idea their time is running out until
// they're suddenly locked out.
export function TrialCountdownBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    supabase.functions.invoke('member-account-info').then(({ data }) => {
      if (!alive) return;
      if (data?.plan === 'trial' && !data.isLifetime && !data.isAdmin && data.expiresAt) {
        setExpiresAt(data.expiresAt);
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, [user]);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setRemainingMs(diff);
      if (diff <= 0 && !redirectedRef.current) {
        redirectedRef.current = true;
        toast.error('Seu teste gratuito expirou. Adquira acesso completo para continuar.');
        navigate('/checkout');
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, navigate]);

  if (!expiresAt || remainingMs === null || remainingMs <= 0) return null;

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-background-paper border border-primary/30 shadow-[0_10px_40px_-10px_rgba(239,68,68,0.5)] rounded-full pl-4 pr-1.5 py-1.5">
      <div className="flex items-center gap-1.5 text-sm">
        <Clock className="w-4 h-4 text-primary" />
        <span className="text-muted-foreground hidden sm:inline">Teste grátis:</span>
        <span className="font-mono font-bold text-foreground tabular-nums">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
      <button
        onClick={() => navigate('/checkout')}
        className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold px-3.5 py-2 rounded-full transition-colors whitespace-nowrap"
      >
        <ShoppingCart className="w-3.5 h-3.5" /> Adquirir Acesso
      </button>
    </div>
  );
}
