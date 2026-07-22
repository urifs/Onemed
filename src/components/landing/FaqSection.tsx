import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

const faqs = [
  {
    question: 'Como funciona o acesso?',
    answer: 'O acesso é feito direto pela nossa plataforma própria, pelo site ou celular — sem precisar instalar nenhum app externo. Você recebe seu login por e-mail e já pode assistir às aulas, ler os livros e apostilas direto na tela.'
  },
  {
    question: 'Quanto tempo dura o acesso completo?',
    answer: 'Temos o acesso completo anual e o vitalício. Durante esse período, você recebe todas as atualizações mensais sem custo adicional.'
  },
  {
    question: 'O conteúdo está atualizado?',
    answer: 'Sim! Todos os cursos são do ano de 2025, com atualizações mensais e garantia de atualizações 2026 e 2027. Os livros também são constantemente atualizados e já estão traduzidos.'
  },
  {
    question: 'Posso acessar o conteúdo quando quiser?',
    answer: 'Sim! O acesso é direto pela plataforma, 24/7, de qualquer lugar — é só entrar no site ou no app do navegador com seu login e assistir/ler na hora, sem precisar baixar nada antes.'
  },
  {
    question: 'Como funciona o suporte?',
    answer: 'Oferecemos suporte 24/7 para resolver problemas técnicos direto pelo WhatsApp onde você pode solicitar ajuda a qualquer hora.'
  },
  {
    question: 'O conteúdo é seguro?',
    answer: 'Absolutamente! O conteúdo é armazenado no exterior, criptografado, com servidores em múltiplos países, proteção contra ataques, monitoramento 24/7 e backups semanais.'
  }
];

export const FaqSection = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section className="py-24 bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="font-mono text-xs uppercase tracking-widest text-primary mb-4">FAQ</p>
          <h2 className="font-secondary text-4xl md:text-5xl font-bold text-foreground">
            Dúvidas Frequentes
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <Collapsible
              key={index}
              open={openFaq === index}
              onOpenChange={(open) => setOpenFaq(open ? index : null)}
            >
              <CollapsibleTrigger className="w-full glass rounded-xl px-5 py-4 flex items-center justify-between hover:border-primary/20 transition-colors duration-200 text-left group">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-medium text-foreground">{faq.question}</span>
                </div>
                {openFaq === index ? (
                  <ChevronUp className="w-4 h-4 text-primary flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="glass rounded-b-xl border-t-0 px-5 pb-4">
                  <p className="text-muted-foreground text-sm leading-relaxed pt-2 pl-7">
                    {faq.answer}
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
