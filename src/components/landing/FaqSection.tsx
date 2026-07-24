import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus } from 'lucide-react';

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
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section className="py-24 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-12">
          <div>
            <h2 className="font-secondary text-3xl md:text-4xl font-bold text-foreground mb-4">
              Dúvidas frequentes
            </h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Não encontrou o que procurava? Fale com a gente pelo WhatsApp e respondemos na hora.
            </p>
          </div>

          <div className="divide-y divide-border border-t border-b border-border">
            {faqs.map((faq, index) => (
              <Collapsible
                key={index}
                open={openFaq === index}
                onOpenChange={(open) => setOpenFaq(open ? index : null)}
              >
                <CollapsibleTrigger className="w-full py-5 flex items-center justify-between gap-4 text-left group">
                  <span className="font-medium text-foreground">{faq.question}</span>
                  <Plus className={`w-4 h-4 text-primary shrink-0 transition-transform duration-200 ${openFaq === index ? 'rotate-45' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="text-muted-foreground text-sm leading-relaxed pb-5 pr-8">
                    {faq.answer}
                  </p>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
