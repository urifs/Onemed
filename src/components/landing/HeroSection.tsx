import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import {
  Clock,
  CheckCircle,
  ArrowRight,
  ShoppingCart,
  ChevronDown,
  Play,
  FileText,
  BookOpen,
} from 'lucide-react';
import { formatWhatsApp } from '@/lib/utils';

const COUNTRIES = [
  { code: '+55', country: 'Brasil', flag: 'BR' },
  { code: '+54', country: 'Argentina', flag: 'AR' },
  { code: '+595', country: 'Paraguai', flag: 'PY' },
  { code: '+598', country: 'Uruguai', flag: 'UY' },
  { code: '+591', country: 'Bolívia', flag: 'BO' },
  { code: '+56', country: 'Chile', flag: 'CL' },
  { code: '+51', country: 'Peru', flag: 'PE' },
  { code: '+57', country: 'Colômbia', flag: 'CO' },
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
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
      {/* Um único degradê contido no canto, em vez do par de blobs + grid
          repetido em praticamente todo template de IA. */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 right-0 w-[640px] h-[640px] bg-primary/[0.07] rounded-full blur-[160px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
        {/* Left: Content */}
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-mono uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            Teste grátis de 10 minutos, sem cartão
          </div>

          <h1 className="font-secondary text-[2.75rem] leading-[1.05] sm:text-6xl xl:text-[5rem] font-bold tracking-tight text-foreground mb-6">
            O maior acervo
            <br />
            médico <span className="text-primary">do Brasil</span>
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
            Mais de 530 cursos completos e 9.000 livros médicos, direto na sua tela — sem
            precisar reunir assinaturas espalhadas em uma dezena de plataformas diferentes.
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-9 text-sm text-muted-foreground">
            {['530+ cursos', '9.000+ livros', 'Acesso vitalício disponível'].map((text) => (
              <div key={text} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-accent-success flex-shrink-0" />
                {text}
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
                    <span className="text-xs font-mono text-muted-foreground">{selectedCountry.flag}</span>
                    <span>{selectedCountry.code}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  {showCountryDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                      {COUNTRIES.map(c => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => { setSelectedCountry(c); setShowCountryDropdown(false); setWhatsapp(''); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary text-left"
                        >
                          <span className="text-xs font-mono text-muted-foreground w-6">{c.flag}</span>
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
              className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors duration-150 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Acessar grátis por 10 minutos
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <Link
            to="/checkout"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Ou adquira acesso completo agora
          </Link>
        </div>

        {/* Right: a preview mockup of the actual platform UI (lesson rows,
            same shape as the real member area) instead of a card that just
            repeats the stats already stated on the left. */}
        <div className="hidden lg:block">
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-6 bg-primary/[0.04] rounded-[2rem] -z-10" />
            <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-black/40 overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-background-subtle">
                <span className="w-2.5 h-2.5 rounded-full bg-muted" />
                <span className="w-2.5 h-2.5 rounded-full bg-muted" />
                <span className="w-2.5 h-2.5 rounded-full bg-muted" />
                <span className="ml-3 text-xs text-muted-foreground font-mono">onemedcursos.com.br/membros</span>
              </div>
              <div className="p-5 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground px-1 pb-2">
                  Cardiologia & ECG
                </p>
                {[
                  { icon: Play, title: 'ECG na prática — módulo 1', meta: '48 min', done: true },
                  { icon: Play, title: 'Arritmias e bloqueios', meta: '1h 12min', done: true },
                  { icon: FileText, title: 'Mapa mental — Síndromes coronarianas', meta: 'PDF', done: false },
                  { icon: Play, title: 'Insuficiência cardíaca aguda', meta: '55 min', done: false },
                  { icon: BookOpen, title: 'Braunwald — Tratado de Cardiologia', meta: 'Livro', done: false },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-3 px-1 py-2.5 rounded-lg hover:bg-secondary/60 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${row.done ? 'bg-accent-success/15' : 'bg-secondary'}`}>
                      {row.done ? (
                        <CheckCircle className="w-4 h-4 text-accent-success" />
                      ) : (
                        <row.icon className="w-3.5 h-3.5 text-muted-foreground" fill={row.icon === Play ? 'currentColor' : 'none'} />
                      )}
                    </div>
                    <span className="flex-1 text-sm text-foreground truncate">{row.title}</span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">{row.meta}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute -bottom-5 -left-5 bg-card border border-border rounded-xl shadow-xl px-4 py-3 flex items-center gap-3">
              <Clock className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-bold text-foreground leading-none">10.000+</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">médicos e estudantes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
