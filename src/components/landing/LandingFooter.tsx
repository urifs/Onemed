import { Link } from 'react-router-dom';
import { Stethoscope, ArrowRight } from 'lucide-react';

export const LandingFooter = () => {
  return (
    <>
      {/* CTA Section — faixa cheia com o vermelho da marca, em vez de mais
          um card de vidro flutuando dentro de uma seção escura. */}
      <section className="bg-primary">
        <div className="shell-form px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <h2 className="font-secondary text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
            Pronto para transformar sua carreira médica?
          </h2>
          <p className="text-primary-foreground/85 text-lg mb-8 max-w-xl mx-auto">
            530+ cursos e 9.000+ livros médicos em um só lugar, com acesso vitalício disponível.
          </p>
          <Link
            to="/checkout"
            className="inline-flex items-center gap-2 bg-background text-foreground hover:bg-background/90 font-semibold h-12 px-8 rounded-lg transition-colors duration-150"
          >
            Adquirir acesso completo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background-paper py-12">
        <div className="shell-page px-4 sm:px-6 lg:px-8">
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
