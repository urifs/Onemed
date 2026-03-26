import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MessageCircle } from 'lucide-react';
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
const WHATSAPP_URL = 'https://wa.me/5545991220048?text=Ol%C3%A1!%20Gostaria%20de%20fazer%20o%20teste%20gr%C3%A1tis%20do%20OneMed.';

export default function Index() {
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [showWhatsappField, setShowWhatsappField] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState(false);
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

    if (!showWhatsappField) {
      setShowWhatsappField(true);
      return;
    }

    if (!whatsapp) {
      toast.error('Por favor, informe seu WhatsApp');
      return;
    }

    setLoading(true);
    setMaintenanceError(false);
    try {
      const { data, error } = await supabase.functions.invoke('create-trial-access', {
        body: {
          email: email.toLowerCase(),
          whatsapp: `${selectedCountry.code}${whatsapp}`,
        },
      });

      if (error) throw error;

      if (data?.maintenanceError) {
        setMaintenanceError(true);
        return;
      }

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
      ) : maintenanceError ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-16 text-center">
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-16 h-16 mx-auto bg-yellow-500/10 rounded-full flex items-center justify-center">
              <span className="text-3xl">🔧</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Sistema em manutenção</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nosso sistema de teste gratuito está temporariamente em manutenção.
              Para realizar seu teste grátis agora, entre em contato com nosso suporte pelo WhatsApp.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#20b858] text-white font-semibold px-6 py-3 rounded-xl transition-colors duration-200 shadow-lg"
            >
              <MessageCircle className="w-5 h-5" />
              Falar com suporte no WhatsApp
            </a>
            <button
              onClick={() => setMaintenanceError(false)}
              className="block w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
            >
              Tentar novamente
            </button>
          </div>
        </div>
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
