import { Link } from 'react-router-dom';
import { Stethoscope, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const LandingFooter = () => {
  return (
    <>
      {/* CTA Section */}
      <section className="py-24 bg-background-paper border-t border-border">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="glass rounded-2xl p-12 border border-primary/10">
            <h2 className="font-secondary text-4xl md:text-5xl font-bold text-foreground mb-4">
              Pronto para transformar sua carreira médica?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Acesse agora o maior acervo de conteúdos médicos da América Latina.
              Mais de 530 cursos e 9.000 livros em um só lugar.
            </p>
            <Link to="/checkout">
              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2 h-12 px-8 text-base font-semibold glow-red-hover">
                <ShoppingCart className="w-5 h-5" />
                Adquirir Acesso Completo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background-paper border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-primary" />
              </div>
              <span className="font-secondary font-bold text-foreground">OneMed</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/termos" className="hover:text-foreground transition-colors">Termos de Uso</Link>
              <Link to="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
              <a href="https://wa.me/5563999191551" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Suporte</a>
            </div>

            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} OneMed. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default LandingFooter;
