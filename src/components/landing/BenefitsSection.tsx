import {
  BookOpen, GraduationCap, Download, Users, Lock, Globe,
  Smartphone, Server, RefreshCw, MessageCircle, Headphones
} from 'lucide-react';

const benefits = [
  { icon: BookOpen, title: '+530 Cursos', description: 'Cursos completos das maiores plataformas médicas do Brasil' },
  { icon: GraduationCap, title: '+9.000 Livros', description: 'Biblioteca completa com os principais títulos da medicina' },
  { icon: Download, title: 'Download Liberado', description: 'Baixe o conteúdo para estudar offline quando quiser' },
  { icon: Users, title: '+10.000 Membros', description: 'Comunidade ativa de médicos e estudantes' },
  { icon: Lock, title: 'Acesso Seguro', description: 'Conteúdo protegido e acesso individual por email' },
  { icon: Globe, title: 'Acesso Global', description: 'Estude de qualquer lugar do mundo, 24/7' },
  { icon: Smartphone, title: 'Apps Inclusos', description: 'Whitebook e WeMeds inclusos no plano vitalício' },
  { icon: Server, title: 'Armazenamento Cloud', description: 'Todo conteúdo no Google Drive, sem ocupar seu espaço' },
  { icon: RefreshCw, title: 'Atualizações', description: 'Conteúdo atualizado constantemente' },
  { icon: MessageCircle, title: 'Suporte WhatsApp', description: 'Atendimento rápido e personalizado' },
  { icon: Headphones, title: 'Suporte 24/7', description: 'Equipe sempre disponível para ajudar' },
  { icon: GraduationCap, title: 'Residência', description: 'Preparação completa para provas de residência' },
];

export const BenefitsSection = () => {
  return (
    <section className="py-24 bg-background-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="font-mono text-xs uppercase tracking-widest text-primary mb-4">Benefícios</p>
          <h2 className="font-secondary text-4xl md:text-5xl font-bold text-foreground mb-4">
            Por que escolher a OneMed?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tudo que você precisa para sua formação médica em um só lugar
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="glass rounded-xl p-5 hover:border-primary/20 hover:bg-primary/3 transition-colors duration-200 group"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors duration-200">
                <benefit.icon className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-secondary font-semibold text-foreground mb-1">{benefit.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
