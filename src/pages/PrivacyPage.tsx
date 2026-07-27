import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-4">
      <ThemeToggle className="fixed top-4 right-4 z-50" />
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="space-y-6">
          <h1 className="font-secondary text-4xl font-bold text-foreground">Política de Privacidade</h1>
          <p className="text-muted-foreground">Última atualização: Fevereiro de 2026</p>
          {[
            ['1. Dados Coletados', 'Coletamos endereço de e-mail, número de WhatsApp (opcional), informações de pagamento (processadas pelo Mercado Pago) e dados de uso da plataforma.'],
            ['2. Uso dos Dados', 'Utilizamos seus dados para fornecer acesso à plataforma, enviar comunicações sobre seu acesso e melhorar nossos serviços.'],
            ['3. Compartilhamento', 'Seus dados são compartilhados com Google (para acesso ao Drive) e Mercado Pago (para processamento de pagamentos). Não vendemos seus dados.'],
            ['4. Segurança', 'Utilizamos criptografia SSL e boas práticas de segurança para proteger suas informações.'],
            ['5. Seus Direitos', 'Você pode solicitar a exclusão dos seus dados a qualquer momento entrando em contato pelo WhatsApp.'],
            ['6. Contato', 'WhatsApp: (63) 99919-1551'],
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
