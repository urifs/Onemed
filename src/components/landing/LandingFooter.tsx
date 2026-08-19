import { Link, useLocation } from 'react-router-dom';
import { Stethoscope, ArrowRight } from 'lucide-react';
import { PLAN_PRICES } from '@/lib/plans';
import { formatBRL } from '@/lib/utils';

export const LandingFooter = () => {
  const location = useLocation();
  // O formulário do teste grátis fica no topo da landing. Este rodapé também
  // aparece nas páginas de SEO, então: fora da landing, o link navega até ela;
  // NA landing, clicar navegaria para a mesma rota e nada aconteceria na tela
  // — aí a página rola de volta ao formulário.
  const naLanding = location.pathname === '/';
  const irParaOTeste = (e: React.MouseEvent) => {
    if (!naLanding) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Foca o campo de e-mail: sem isso, quem rolou até o rodapé volta ao topo
    // sem saber que precisa preencher algo.
    setTimeout(() => {
      document.querySelector<HTMLInputElement>('input[type="email"]')?.focus({ preventScroll: true });
    }, 600);
  };

  return (
    <>
      {/* CTA Section — faixa cheia com o vermelho da marca, em vez de mais
          um card de vidro flutuando dentro de uma seção escura.

          A pergunta motivacional que estava aqui ("Pronto para transformar sua
          carreira médica?") não dizia nada que o visitante já não soubesse. No
          fim da página quem chegou até aqui quer saber o que custa e como
          começa — então o bloco fala disso, com o preço vindo de PLAN_PRICES
          (nunca escrito à mão: preço já vive em fontes demais neste projeto). */}
      <section className="bg-primary">
        <div className="shell-form px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <h2 className="font-secondary text-3xl md:text-5xl font-bold text-primary-foreground mb-4 text-balance">
            Conheça o acervo antes de assinar
          </h2>
          <p className="text-primary-foreground/85 text-lg mb-8 max-w-xl mx-auto">
            São 10 minutos de acesso livre a tudo, sem cartão. Se fizer sentido para
            você, o acesso vitalício sai por {formatBRL(PLAN_PRICES.lifetime)}, uma vez só.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              onClick={irParaOTeste}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-background text-foreground hover:bg-background/90 font-semibold h-12 px-8 rounded-lg transition-colors duration-150"
            >
              Começar o teste grátis
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/checkout"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto border border-primary-foreground/35 text-primary-foreground hover:bg-primary-foreground/10 font-semibold h-12 px-8 rounded-lg transition-colors duration-150"
            >
              Ver planos
            </Link>
          </div>
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
