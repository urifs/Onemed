import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { trackLead } from '@/lib/pixel';
import {
  LandingHeader,
  HeroSection,
  TrialSuccessSection,
  BenefitsSection,
  CoursesSection,
  BooksSection,
  FaqSection,
  LandingFooter
} from '@/components/landing';

const DEFAULT_COUNTRY = { code: '+55', country: 'Brasil', flag: 'BR' };
const TRIAL_DURATION_MINUTES = 30;

export default function Index() {
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [showWhatsappField, setShowWhatsappField] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [accessData, setAccessData] = useState<{ email: string } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState({ minutes: TRIAL_DURATION_MINUTES, seconds: 0, expired: false });

  // Registrar visita na página principal usando keepalive para garantir que
  // a requisição seja enviada mesmo quando o usuário sai rapidamente da página
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    fetch(`${url}/rest/v1/visits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ page: '/' }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!success) return;
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev.expired) return prev;
        if (prev.minutes === 0 && prev.seconds === 0) {
          return { ...prev, expired: true };
        }
        if (prev.seconds === 0) {
          return { minutes: prev.minutes - 1, seconds: 59, expired: false };
        }
        return { ...prev, seconds: prev.seconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      toast.error('Use um e-mail Gmail (@gmail.com). O acesso ao Drive funciona melhor com Gmail.', { duration: 6000 });
      return;
    }

    if (!showWhatsappField) {
      setShowWhatsappField(true);
      return;
    }

    if (!whatsapp) {
      toast.error('Por favor, informe seu WhatsApp');
      return;
    }

    setLoading(true);
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/create-trial-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          whatsapp: `${selectedCountry.code}${whatsapp}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || `Erro HTTP ${res.status}`);
      if (data?.error) throw new Error(data.error);

      if (data?.alreadyActive) {
        setTimeRemaining({ minutes: data.minutesRemaining, seconds: data.secondsRemaining, expired: false });
        setAccessData({ email: data.email });
        setSuccess(true);
        toast.info('Acesso já concedido para este email');
        return;
      }

      setAccessData({ email: data.email });
      setTimeRemaining({ minutes: TRIAL_DURATION_MINUTES, seconds: 0, expired: false });
      setSuccess(true);
      trackLead(email);
      toast.success('Acesso liberado! Verifique seu Google Drive.');
    } catch (err: any) {
      console.error(err);
      const msg = err.message || '';
      if (msg.includes('já utilizou') || msg.includes('já possui acesso')) {
        toast.error(msg, { duration: 6000 });
      } else {
        toast.error(msg || 'Erro ao solicitar acesso. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      {success ? (
        <TrialSuccessSection accessData={accessData} timeRemaining={timeRemaining} />
      ) : (
        <>
          <HeroSection
            email={email}
            setEmail={setEmail}
            whatsapp={whatsapp}
            setWhatsapp={setWhatsapp}
            showWhatsappField={showWhatsappField}
            loading={loading}
            onSubmit={handleSubmit}
            selectedCountry={selectedCountry}
            setSelectedCountry={setSelectedCountry}
          />
          <BenefitsSection />
          <CoursesSection />
          <BooksSection />
          <FaqSection />
          <LandingFooter />
        </>
      )}
    </div>
  );
}
