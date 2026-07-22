import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FolderOpen,
  Clock,
  Shield,
  CheckCircle,
  ArrowRight,
  ShoppingCart,
  ChevronDown
} from 'lucide-react';
import { formatWhatsApp } from '@/lib/utils';

const COUNTRIES = [
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+595', country: 'Paraguai', flag: '🇵🇾' },
  { code: '+598', country: 'Uruguai', flag: '🇺🇾' },
  { code: '+591', country: 'Bolívia', flag: '🇧🇴' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+51', country: 'Peru', flag: '🇵🇪' },
  { code: '+57', country: 'Colômbia', flag: '🇨🇴' },
];

interface HeroSectionProps {
  email: string;
  setEmail: (v: string) => void;
  whatsapp: string;
  setWhatsapp: (v: string) => void;
  showWhatsappField: boolean;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  selectedCountry: { code: string; country: string; flag: string };
  setSelectedCountry: (c: { code: string; country: string; flag: string }) => void;
}

export const HeroSection = ({
  email, setEmail, whatsapp, setWhatsapp, showWhatsappField,
  loading, onSubmit, selectedCountry, setSelectedCountry
}: HeroSectionProps) => {
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatWhatsApp(e.target.value, selectedCountry.code));
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-hero-gradient">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-[100px]" />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left: Content */}
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-sm font-mono px-4 py-1.5 rounded-full mb-8">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            ACESSO GRATUITO DE 10 MIN
          </div>

          <h1 className="font-secondary text-5xl md:text-6xl xl:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]">
            O Maior Acervo
            <br />
            <span className="text-primary">Médico</span> do Brasil
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
            +530 cursos completos e +9.000 livros médicos. Acesse agora gratuitamente
            por 10 minutos e descubra por que mais de 10.000 médicos escolheram a OneMed.
          </p>

          <div className="flex flex-wrap gap-4 mb-10">
            {[
              { icon: FolderOpen, text: '530+ Cursos' },
              { icon: Shield, text: '9.000+ Livros' },
              { icon: Clock, text: '10 min grátis' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-accent-success flex-shrink-0" />
                {item.text}
              </div>
            ))}
          </div>

          {/* Trial form */}
          <form onSubmit={onSubmit} className="space-y-3 max-w-md">
            <Input
              type="email"
              placeholder="Seu melhor email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50"
              required
            />

            {showWhatsappField && (
              <div className="flex gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    className="flex items-center gap-1.5 h-12 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground hover:border-border"
                  >
                    <span>{selectedCountry.flag}</span>
                    <span>{selectedCountry.code}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  {showCountryDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 glass-strong rounded-lg shadow-xl z-50 overflow-hidden">
                      {COUNTRIES.map(c => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => { setSelectedCountry(c); setShowCountryDropdown(false); setWhatsapp(''); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary text-left"
                        >
                          <span>{c.flag}</span>
                          <span>{c.country}</span>
                          <span className="ml-auto text-muted-foreground">{c.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Input
                  type="tel"
                  placeholder="WhatsApp"
                  value={whatsapp}
                  onChange={handleWhatsAppChange}
                  className="flex-1 h-12 bg-secondary border-border text-foreground"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 glow-red-hover disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Acessar Grátis por 10 Minutos
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-3 max-w-md">
            <Link
              to="/checkout"
              className="w-full h-11 flex items-center justify-center gap-2 text-sm font-medium text-white rounded-lg transition-colors duration-200 bg-green-600 hover:bg-green-500"
            >
              <ShoppingCart className="w-4 h-4" />
              Ou adquira acesso completo →
            </Link>
          </div>
        </div>

        {/* Right: Stats card */}
        <div className="hidden lg:block">
          <div className="glass rounded-2xl p-8 space-y-6">
            <h3 className="font-secondary text-xl font-semibold text-foreground">O que você terá acesso:</h3>
            {[
              { label: 'Cursos Médicos', value: '530+', desc: 'Estratégia Med, MedGrupo, Medway e mais' },
              { label: 'Livros', value: '9.000+', desc: 'Todas as especialidades, traduzidos' },
              { label: 'Membros Ativos', value: '10.000+', desc: 'Comunidade de médicos e estudantes' },
              { label: 'Armazenamento', value: 'Cloud', desc: 'Plataforma própria, sem ocupar seu espaço' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{stat.label}</p>
                  <p className="text-xs text-muted-foreground">{stat.desc}</p>
                </div>
                <span className="text-2xl font-secondary font-bold text-primary">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
