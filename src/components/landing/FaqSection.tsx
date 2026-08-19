import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus } from 'lucide-react';

// Exportado para o JSON-LD (FAQPage) usar exatamente este texto. O Google só
// valida a marcação de FAQ se pergunta e resposta estiverem VISÍVEIS na
// página — manter duas cópias do texto é como elas divergem e a marcação
// passa a descrever algo que não está na tela.
export const LANDING_FAQS = [
  {
    question: 'Como funciona o acesso?',
    answer: 'O acesso é feito direto pela nossa plataforma própria, pelo site ou celular — sem precisar instalar nenhum app externo. Você recebe seu login por e-mail e já pode assistir às aulas, ler os livros e apostilas direto na tela.'
  },
  {
    question: 'Quanto tempo dura o acesso completo?',
    // Sem prometer "todas as atualizações mensais" a todo plano: a frequência
    // de atualização incluída varia por plano (só o Vitalício Pro tem as
    // mensais) — o texto tem que bater com os cards e a tabela do checkout.
    answer: 'Temos o plano mensal, o anual e três níveis de acesso vitalício. Cada plano inclui um nível de atualização do acervo — no Vitalício Pro, praticamente todo o conteúdo recebe atualizações mensais. O comparativo completo está na página de planos.'
  },
  {
    question: 'O conteúdo está atualizado?',
    answer: 'Sim! As turmas mais recentes (2026) já estão no acervo e novos materiais entram toda semana. A frequência das atualizações incluídas varia por plano — veja o comparativo no checkout. Os livros também são atualizados e já chegam traduzidos.'
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
      <div className="shell-list px-4 sm:px-6 lg:px-8">
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
            {LANDING_FAQS.map((faq, index) => (
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
