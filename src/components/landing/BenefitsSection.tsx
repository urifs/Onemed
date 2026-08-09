import {
  BookOpen, GraduationCap, MonitorPlay, Users, Lock, Globe,
  Smartphone, RefreshCw, MessageCircle,
} from 'lucide-react';

// As quatro que mais pesam na decisão de compra ganham destaque visual maior;
// o resto entra como lista de apoio — em vez de doze cartões idênticos com o
// mesmo peso visual, sem nenhuma hierarquia entre o que importa mais ou menos.
const featured = [
  { icon: BookOpen, title: '530+ cursos completos', description: 'Estratégia Med, MedGrupo, Medway e outras grandes plataformas, todas em um único login.' },
  { icon: GraduationCap, title: '9.000+ livros médicos', description: 'Biblioteca com as principais referências de cada especialidade, já traduzidas.' },
  { icon: MonitorPlay, title: 'Direto na plataforma', description: 'Sem apps externos, sem downloads — assiste e lê pelo navegador, em qualquer aparelho.' },
  { icon: Users, title: '10.000+ membros ativos', description: 'Uma comunidade de médicos e estudantes trocando dúvidas dentro da própria plataforma.' },
];

const supporting = [
  { icon: Lock, text: 'Acesso individual e seguro por e-mail' },
  { icon: Globe, text: 'Estude de qualquer lugar, 24 horas por dia' },
  { icon: Smartphone, text: 'Whitebook e WeMeds inclusos no plano vitalício' },
  { icon: RefreshCw, text: 'Conteúdo revisado e atualizado mensalmente' },
  { icon: MessageCircle, text: 'Suporte por WhatsApp, todos os dias' },
  { icon: GraduationCap, text: 'Trilha própria para provas de residência' },
];

export const BenefitsSection = () => {
  return (
    <section className="py-24 bg-background-paper border-y border-border/60">
      <div className="shell-page px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-[1fr_auto] gap-6 items-end mb-14">
          <h2 className="font-secondary text-3xl md:text-4xl font-bold text-foreground max-w-xl">
            Tudo que sua formação médica precisa, num só lugar
          </h2>
          <p className="text-muted-foreground text-sm max-w-sm md:text-right">
            Chega de juntar acesso avulso em meia dúzia de plataformas diferentes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {featured.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-2xl border border-border bg-card p-6 sm:p-7 flex gap-5 hover:border-primary/30 transition-colors duration-200"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <benefit.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-secondary font-semibold text-foreground mb-1.5">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card/50 px-6 py-2 sm:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 gap-x-8">
            {supporting.map((item) => (
              <div key={item.text} className="flex items-center gap-3 py-3.5 border-b border-border/60 last:border-0 sm:[&:nth-last-child(-n+1)]:border-0">
                <item.icon className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
