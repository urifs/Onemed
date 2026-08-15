import { useMemo } from 'react';
import { Radar } from 'lucide-react';
import { SecLocation } from '@/hooks/useSecurityOverview';

// Radar de atividade ao vivo: cada blip é um login recente, posicionado por
// um ângulo estável (hash do e-mail+IP, pra não pular a cada atualização) e um
// raio pela recência (mais recente = mais perto da borda). Cor: vermelho =
// IP com muitas contas (suspeito), âmbar = online agora, cinza = login normal.
// A varredura é puramente visual (CSS), o dado é a posição dos blips.

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export function ThreatRadar({ locais, janelaHoras }: { locais: SecLocation[]; janelaHoras: number }) {
  const blips = useMemo(() => {
    const agora = Date.now();
    const janelaMs = janelaHoras * 3600 * 1000;
    return locais.slice(0, 60).map((l) => {
      const ang = (hash((l.email || '') + (l.ip || '')) % 360) * (Math.PI / 180);
      const idadeMs = Math.max(0, agora - new Date(l.quando).getTime());
      // recente perto da borda (raio grande), antigo perto do centro
      const rec = 1 - Math.min(1, idadeMs / janelaMs);
      const raio = 0.16 + rec * 0.78; // 0.16..0.94 do raio do radar
      const x = 50 + Math.cos(ang) * raio * 46;
      const y = 50 + Math.sin(ang) * raio * 46;
      const risco = (l.contas_no_ip ?? 1) >= 3;
      const cor = risco ? 'hsl(0,84%,60%)' : l.online ? 'hsl(38,92%,55%)' : 'hsl(150,20%,55%)';
      const r = risco ? 2.6 : l.online ? 2.1 : 1.5;
      return { x, y, cor, r, risco, online: l.online, key: (l.email || '') + (l.ip || '') + l.quando };
    });
  }, [locais, janelaHoras]);

  const aneis = [0.94, 0.66, 0.38];

  return (
    <div className="relative w-full aspect-square max-w-[340px] mx-auto">
      <style>{`@keyframes radar-sweep{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes radar-blip{0%,100%{opacity:.35}50%{opacity:1}}`}</style>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(150,30%,12%)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(150,30%,6%)" stopOpacity="0.15" />
          </radialGradient>
          <linearGradient id="sweepGrad" x1="50%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="hsl(150,84%,55%)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(150,84%,55%)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="47" fill="url(#radarBg)" stroke="hsl(150,40%,30%)" strokeWidth="0.5" />
        {aneis.map((a) => (
          <circle key={a} cx="50" cy="50" r={a * 47} fill="none" stroke="hsl(150,40%,35%)" strokeWidth="0.3" strokeOpacity="0.5" />
        ))}
        <line x1="3" y1="50" x2="97" y2="50" stroke="hsl(150,40%,35%)" strokeWidth="0.3" strokeOpacity="0.4" />
        <line x1="50" y1="3" x2="50" y2="97" stroke="hsl(150,40%,35%)" strokeWidth="0.3" strokeOpacity="0.4" />
      </svg>
      {/* varredura girando */}
      <div className="absolute inset-0 rounded-full overflow-hidden" style={{ animation: 'radar-sweep 4s linear infinite' }}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d="M50 50 L97 50 A47 47 0 0 1 73.5 90.7 Z" fill="url(#sweepGrad)" />
        </svg>
      </div>
      {/* blips */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        {blips.map((b, i) => (
          <g key={b.key + i}>
            {b.risco && <circle cx={b.x} cy={b.y} r={b.r + 2} fill="none" stroke={b.cor} strokeWidth="0.4" opacity="0.5" />}
            <circle cx={b.x} cy={b.y} r={b.r} fill={b.cor}
              style={{ animation: `radar-blip ${2 + (i % 3)}s ease-in-out infinite` }} />
          </g>
        ))}
        <circle cx="50" cy="50" r="1.6" fill="hsl(150,84%,60%)" />
      </svg>
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider">
        <Radar className="w-3 h-3" /> ao vivo
      </div>
    </div>
  );
}
