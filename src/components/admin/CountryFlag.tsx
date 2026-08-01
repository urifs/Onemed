import { useState } from 'react';

// Bandeira do país como IMAGEM, não como emoji. O emoji de bandeira
// (indicadores regionais, 🇧🇷) simplesmente não existe nas fontes do Windows
// — lá o navegador desenha as duas letras "BR" em vez da bandeira, e o painel
// é usado tanto no desktop quanto no celular. A imagem renderiza igual em
// qualquer sistema.
//
// Se o CDN não responder, cai pro emoji (que funciona no macOS/iOS/Android/
// Linux) e, se nem isso, sobra o código do país no title — nunca um ícone
// quebrado no meio da lista.
function emojiFlag(code: string): string {
  return [...code.toUpperCase()]
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

export function CountryFlag({ code, country, className = '' }: {
  code: string | null;
  country?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const valid = !!code && /^[A-Za-z]{2}$/.test(code);
  const title = country || code || 'País desconhecido';

  if (!valid) {
    return <span className={`text-sm leading-none ${className}`} title={title} aria-hidden>🌐</span>;
  }
  if (failed) {
    return <span className={`text-sm leading-none ${className}`} title={title}>{emojiFlag(code!)}</span>;
  }
  return (
    <img
      src={`https://flagcdn.com/w40/${code!.toLowerCase()}.png`}
      alt={title}
      title={title}
      loading="lazy"
      width={20}
      height={15}
      onError={() => setFailed(true)}
      className={`w-5 h-[15px] object-cover rounded-[2px] shadow-sm shrink-0 ${className}`}
    />
  );
}
