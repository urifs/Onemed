import { useNavigate } from 'react-router-dom';
import { Lock, MessagesSquare, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Comunidade bloqueada para quem está no teste grátis.
//
// O fundo embaçado é um ESQUELETO decorativo, não o conteúdo real com um
// filtro por cima: desfoque é só pintura, e conteúdo real embaçado continua
// legível no inspetor do navegador. O servidor também não entrega nada
// (is_trial_member barra os feeds), então aqui não há o que esconder — só o
// desenho de "tem algo acontecendo atrás disto".
function SkeletonFeed() {
  return (
    <div aria-hidden className="space-y-4 select-none pointer-events-none">
      {[0, 1, 2].map(i => (
        <div key={i} className="glass rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-secondary" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 rounded bg-secondary" />
              <div className="h-2.5 w-20 rounded bg-secondary/70" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 rounded bg-secondary" style={{ width: `${92 - i * 9}%` }} />
            <div className="h-3 rounded bg-secondary" style={{ width: `${78 - i * 6}%` }} />
            <div className="h-3 rounded bg-secondary" style={{ width: `${60 + i * 7}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const BENEFITS = [
  'Tire dúvidas com outros alunos e com a equipe',
  'Grupo da comunidade no WhatsApp',
  'Acervo completo, sem limite de tempo',
];

export function CommunityLocked({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();

  return (
    <div className={`relative ${compact ? 'min-h-[380px]' : 'min-h-[460px]'}`}>
      <div className="blur-[7px] opacity-60">
        <SkeletonFeed />
      </div>

      <div className="absolute inset-0 flex items-start justify-center px-4 pt-6 sm:pt-10">
        <div className="glass rounded-2xl border border-primary/25 p-6 sm:p-7 max-w-md w-full text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-secondary text-lg sm:text-xl font-bold text-foreground mb-2">
            A comunidade é exclusiva para assinantes
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            Seu teste grátis dá acesso ao acervo de cursos. Para participar da comunidade e entrar
            no grupo, assine um plano e libere a plataforma completa.
          </p>

          <ul className="text-left space-y-2 mb-6">
            {BENEFITS.map(b => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-foreground">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {b}
              </li>
            ))}
          </ul>

          <Button className="w-full" onClick={() => navigate('/checkout')}>
            <MessagesSquare className="w-4 h-4" /> Assinar e liberar a comunidade
          </Button>
        </div>
      </div>
    </div>
  );
}
