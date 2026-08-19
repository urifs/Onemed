import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { trackLead } from '@/lib/pixel';
import {
  LandingHeader,
  HeroSection,
  BenefitsSection,
  CoursesSection,
  BooksSection,
  FaqSection,
  LandingFooter,
  AffiliateSection,
  LANDING_FAQS,
} from '@/components/landing';
import { Seo } from '@/seo/Seo';
import { BOOK_COUNT, COURSE_COUNT } from '@/seo/siteConfig';
import { educationalOrganization, faqPage, website } from '@/seo/structuredData';
import { PillarLinks } from '@/components/seo/InternalLinks';

const DEFAULT_COUNTRY = { code: '+55', country: 'Brasil', flag: 'BR' };

export default function Index() {
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [showWhatsappField, setShowWhatsappField] = useState(false);
  const [loading, setLoading] = useState(false);

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

      if (!data?.access_token || !data?.refresh_token) {
        throw new Error('Não foi possível iniciar a sessão. Tente novamente.');
      }

      // Import dinâmico de propósito: criar o cliente do Supabase exige as
      // variáveis de ambiente já no import do módulo, e o prerender do build
      // roda em Node sem elas. Como a sessão só é usada aqui, depois do
      // envio do formulário, carregar sob demanda mantém a landing
      // renderizável no servidor (e tira o cliente do bundle inicial).
      const { supabase } = await import('@/integrations/supabase/client');
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionErr) throw sessionErr;

      if (!data.alreadyActive) trackLead(email);
      toast.success('Acesso liberado! Redirecionando...');
      // Full reload instead of a router navigate — see MemberLoginPage for
      // why: AuthContext's `user` state updates off an async auth event that
      // races a client-side navigate, so a fresh reload is what reliably
      // picks up the session setSession() just persisted.
      window.location.href = '/membros';
    } catch (err: any) {
      console.error(err);
      const msg = err.message || '';
      if (msg.includes('já utilizou') || msg.includes('já possui acesso')) {
        toast.error(msg, { duration: 6000 });
      } else if (/Failed to send a request|Failed to fetch|NetworkError|Load failed/i.test(msg)) {
        // Erro de rede do navegador vaza em inglês — troca por uma orientação
        // de verdade (mesma mensagem da tela de login).
        toast.error('Não foi possível conectar ao servidor. Verifique sua internet, desative VPN ou bloqueador de anúncios e tente de novo.');
      } else {
        toast.error(msg || 'Erro ao solicitar acesso. Tente novamente.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="OneMed | O Maior Acervo de Cursos Médicos do Brasil"
        description={`Mais de ${COURSE_COUNT} cursos médicos e ${BOOK_COUNT} livros para residência, Revalida e graduação. Teste grátis, sem cartão.`}
        path="/"
        jsonLd={[website(), educationalOrganization(), faqPage(LANDING_FAQS)]}
      />
      <LandingHeader />
      {/* <main> delimita o conteúdo principal: é o que leitor de tela e
          crawler usam para separar conteúdo de navegação e rodapé. */}
      <main>
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
      {/* Porta de entrada do silo: leva a home para os hubs de maior
          intenção de busca, distribuindo autoridade a partir da página
          mais forte do domínio. */}
      <div className="shell-page px-4 sm:px-6 lg:px-8">
        <PillarLinks />
      </div>
      {/* Última seção antes do rodapé: recrutamento de afiliados. */}
      <AffiliateSection />
      </main>
      <LandingFooter />
    </div>
  );
}
