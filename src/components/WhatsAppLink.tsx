import { MessageCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

export function WhatsAppLink({ phone, className = '', showIcon = false }: WhatsAppLinkProps) {
  const urls = buildUrls(phone);

  const open = (url: string, fallback: string) => {
    // intent:// only works on Android Chrome; use wa.me as fallback for iOS/desktop
    const isAndroid = /Android/i.test(navigator.userAgent);
    window.open(isAndroid ? url : fallback, '_blank', 'noopener,noreferrer');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`flex items-center gap-1 text-left hover:underline focus:outline-none ${className}`}>
          {showIcon && <MessageCircle className="w-3.5 h-3.5 shrink-0" />}
          {phone}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => open(urls.personal, urls.fallback)}>
          <MessageCircle className="w-4 h-4 mr-2" />
          WhatsApp Pessoal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => open(urls.business, urls.fallback)}>
          <MessageCircle className="w-4 h-4 mr-2 text-accent-success" />
          WhatsApp Business
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
