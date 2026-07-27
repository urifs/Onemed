import { Link } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export const LandingHeader = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/15 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <span className="font-secondary font-bold text-xl text-foreground">OneMed</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="flex items-center gap-2 text-sm font-semibold text-foreground px-4 py-3 rounded-lg border border-border hover:bg-secondary transition-colors duration-200"
            >
              Entrar
            </Link>
            <Link
              to="/checkout"
              className="hidden sm:flex items-center gap-2 bg-primary text-primary-foreground text-sm font-bold px-6 py-3 rounded-lg transition-colors duration-150 hover:bg-primary-hover"
            >
              Adquirir Acesso Completo
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
