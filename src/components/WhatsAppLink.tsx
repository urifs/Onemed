import { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';

interface WhatsAppLinkProps {
  phone: string;
  className?: string;
  showIcon?: boolean;
}

function buildUrls(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return {
    personal: `intent://send?phone=${digits}#Intent;scheme=whatsapp;package=com.whatsapp;end`,
    business: `intent://send?phone=${digits}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`,
    fallback: `https://wa.me/${digits}`,
  };
}

// Menu PRÓPRIO, sem Radix, de propósito: este componente vive DENTRO de cada
// linha das tabelas do admin (trials/compradores/acessos). Um DropdownMenu do
// Radix por linha significava centenas de menus montados (portal + focus
// scope + gestão de aria em cada um) — com 500+ linhas via "Mostrar mais",
// abrir UM menu disparava o trabalho do Radix sobre o DOM inteiro e o clique
// no número levava 15-20s para responder. Este aqui é um botão + um <div>
// position:fixed que só existe enquanto aberto: custo zero por linha fechada
// e abertura instantânea, com a mesma UX (Pessoal / Business).
export function WhatsAppLink({ phone, className = '', showIcon = false }: WhatsAppLinkProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const urls = buildUrls(phone);
  const aberto = pos !== null;

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: Event) => {
      if (e.target instanceof Node && wrapRef.current?.contains(e.target)) return;
      setPos(null);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setPos(null); };
    // Rolagem fecha o menu (posição fixa ficaria descolada do número).
    document.addEventListener('mousedown', fechar);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    return () => {
      document.removeEventListener('mousedown', fechar);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', fechar, true);
      window.removeEventListener('resize', fechar);
    };
  }, [aberto]);

  const alternar = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (aberto) { setPos(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    // Abre abaixo do número; se faltar espaço na tela, abre acima.
    const alturaMenu = 84;
    const top = r.bottom + alturaMenu > window.innerHeight ? r.top - alturaMenu - 4 : r.bottom + 4;
    setPos({ top, left: Math.min(r.left, Math.max(8, window.innerWidth - 208)) });
  };

  const open = (url: string, fallback: string) => {
    // intent:// só funciona no Chrome do Android; wa.me cobre iOS/desktop.
    const isAndroid = /Android/i.test(navigator.userAgent);
    window.open(isAndroid ? url : fallback, '_blank', 'noopener,noreferrer');
    setPos(null);
  };

  return (
    <span ref={wrapRef} className="inline-block">
      <button
        onClick={alternar}
        className={`flex items-center gap-1 text-left hover:underline focus:outline-none ${className}`}
        aria-haspopup="menu"
        aria-expanded={aberto}
      >
        {showIcon && <MessageCircle className="w-3.5 h-3.5 shrink-0" />}
        {phone}
      </button>
      {aberto && (
        <div
          role="menu"
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 60 }}
          className="min-w-[200px] rounded-md border border-border bg-background-paper py-1 shadow-lg"
        >
          <button
            role="menuitem"
            onClick={() => open(urls.personal, urls.fallback)}
            className="flex w-full items-center px-3 py-2 text-sm text-foreground hover:bg-secondary"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp Pessoal
          </button>
          <button
            role="menuitem"
            onClick={() => open(urls.business, urls.fallback)}
            className="flex w-full items-center px-3 py-2 text-sm text-foreground hover:bg-secondary"
          >
            <MessageCircle className="w-4 h-4 mr-2 text-accent-success" />
            WhatsApp Business
          </button>
        </div>
      )}
    </span>
  );
}
