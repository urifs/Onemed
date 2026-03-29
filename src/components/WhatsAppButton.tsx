import { MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const WhatsAppButton = () => {
  const location = useLocation();

  if (location.pathname !== '/') return null;

  const phoneNumber = '5545991220048';
  const message = 'Olá! Tenho interesse no OneMed.';
  const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 group"
    >
      <span className="opacity-0 group-hover:opacity-100 bg-background-paper border border-border text-foreground text-sm px-3 py-1.5 rounded-lg mr-1 transition-opacity duration-200 whitespace-nowrap shadow-lg">
        Fale conosco
      </span>
      <div className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200">
        <MessageCircle className="w-7 h-7 text-white" />
      </div>
    </a>
  );
};

export default WhatsAppButton;
