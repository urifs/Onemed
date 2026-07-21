import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="prose prose-invert max-w-none space-y-6">
          <h1 className="font-secondary text-4xl font-bold text-foreground">Termos de Uso</h1>
          <p className="text-muted-foreground">Última atualização: Fevereiro de 2026</p>
          {[
            ['1. Aceitação dos Termos', 'Ao acessar e utilizar a plataforma OneMed, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso.'],
            ['2. Descrição do Serviço', 'A OneMed é uma plataforma educacional que oferece acesso a conteúdo médico, incluindo cursos completos em diversas especialidades médicas, livros e materiais de estudo, atualizações periódicas de conteúdo e acesso via Google Drive compartilhado.'],
            ['3. Conta de Usuário', 'Para utilizar nossos serviços, você deve fornecer um endereço de e-mail válido vinculado a uma conta Google. Você é responsável por manter a confidencialidade de sua conta.'],
            ['4. Período de Teste', 'Oferecemos um período de teste gratuito de 10 minutos para novos usuários. Cada e-mail pode utilizar o período de teste apenas uma vez.'],
            ['5. Planos e Pagamentos', 'Oferecemos Plano Anual (acesso por 12 meses) e Plano Vitalício (acesso permanente). Os pagamentos são processados através do Mercado Pago, podendo ser realizados via PIX, Boleto ou Cartão de Crédito.'],
            ['6. Política de Reembolso', 'Solicitações de reembolso devem ser feitas em até 7 dias após a compra. Entre em contato via WhatsApp.'],
            ['7. Contato', 'Para dúvidas, entre em contato pelo WhatsApp: (63) 99919-1551'],
          ].map(([title, content]) => (
            <div key={title} className="space-y-2">
              <h2 className="font-secondary text-xl font-semibold text-foreground">{title}</h2>
              <p className="text-muted-foreground leading-relaxed">{content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
