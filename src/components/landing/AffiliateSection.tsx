import { Link } from 'react-router-dom';
import { Handshake, Percent, Crown, LineChart, Megaphone, LogIn } from 'lucide-react';

// Card de recrutamento de afiliados, no fim da landing — depois do FAQ, antes
// do rodapé: quem chega até aqui já conheceu o produto; revender é o próximo
// passo natural pra quem não vai comprar pra si.
const beneficios = [
  { icon: Percent, text: '15% de comissão nas assinaturas do plano Mensal' },
  { icon: Percent, text: '20% nas do Anual e do Vitalício' },
  { icon: Percent, text: '25% nas do Vitalício Plus e 30% nas do Vitalício Pro' },
  { icon: Crown, text: 'Conta Vitalício Pro grátis a partir de 5 vendas' },
  { icon: Megaphone, text: 'Cupom exclusivo de 10% + material de divulgação pronto' },
  { icon: LineChart, text: 'Painel com cada venda sua e a comissão em tempo real' },
];

const AffiliateSection = () => {
  return (
    <section className="py-24 bg-background-paper border-y border-border/60">
      <div className="shell-form px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-primary/25 bg-card overflow-hidden">
          <div className="p-8 sm:p-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Handshake className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Programa de afiliados</span>
            </div>

            <h2 className="font-secondary text-3xl md:text-4xl font-bold text-foreground mb-3 max-w-2xl">
              Seja um afiliado: revenda e ganhe dinheiro com cada venda sua
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              Cadastre-se grátis, receba seu link com cupom de desconto exclusivo e o material de
              divulgação pronto — a cada assinatura vendida, a comissão é sua.
            </p>

            <div className="grid sm:grid-cols-2 gap-x-8 mb-10">
              {beneficios.map(b => (
                <div key={b.text} className="flex items-center gap-3 py-3 border-b border-border/60">
                  <b.icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-muted-foreground">{b.text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/afiliado/registro"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-8 py-3.5 transition-colors"
              >
                <Handshake className="w-4 h-4" /> Quero ser afiliado
              </Link>
              <Link
                to="/afiliado/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary hover:border-primary/40 text-foreground font-semibold px-8 py-3.5 transition-colors"
              >
                <LogIn className="w-4 h-4" /> Já sou afiliado — Entrar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AffiliateSection;
