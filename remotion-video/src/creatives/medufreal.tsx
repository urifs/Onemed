import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile } from 'remotion';
import { HEAD } from './theme';
import { M_BLUE, M_NAVY, WHITE, M_BG } from './meduf';
import metaJson from './timings/takesmeta.json';

/* ============================================================
   Kit MEDUF REAL — composição sobre GRAVAÇÕES REAIS da
   plataforma (takes .webm capturados logado, ferramentas
   respondendo de verdade). Nada de UI recriada.
   ============================================================ */

export const FPS = 30;
export const DELAY = 0.7;

type Meta = Record<string, number>; /* nome do take -> duração em s */
export const TAKES: Meta = metaJson as Meta;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const outB = (p: number) => 1 - Math.pow(1 - p, 3);
export const flashAt = (t: number, at: number): number => {
  if (t < at || t > at + 0.35) return 0;
  const p = win(t, at, at + 0.35);
  return p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7;
};

/* startFrom em frames; from = segundos do início OU fromEnd = segundos antes do fim */
export const takeFrom = (nome: string, opts: { from?: number; fromEnd?: number }): number => {
  const dur = TAKES[nome] ?? 30;
  const s = opts.fromEnd !== undefined ? Math.max(0, dur - opts.fromEnd) : (opts.from ?? 0);
  return Math.round(s * FPS);
};

/* take desktop 1512×850 dentro do notebook INTEIRO no quadro */
export const TakeNotebook: React.FC<{
  nome: string; from?: number; fromEnd?: number; width?: number; top?: number;
}> = ({ nome, from, fromEnd, width = 1000, top = 0 }) => {
  const bezel = width * 0.016;
  const scrW = width - bezel * 2;
  const scrH = scrW * (850 / 1512);
  return (
    <div style={{ position: 'relative', width, marginTop: top }}>
      <div style={{
        width, height: scrH + bezel * 2, background: 'linear-gradient(160deg,#2c2e33,#101114)',
        borderRadius: width * 0.02, position: 'relative',
        boxShadow: '0 40px 90px -26px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
      }}>
        <div style={{
          position: 'absolute', left: bezel, top: bezel, width: scrW, height: scrH,
          borderRadius: width * 0.011, overflow: 'hidden', background: '#fff',
        }}>
          <OffthreadVideo
            src={staticFile(`takes/${nome}.webm`)} muted
            startFrom={takeFrom(nome, { from, fromEnd })}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <div style={{
          position: 'absolute', top: bezel * 0.3, left: '50%', transform: 'translateX(-50%)',
          width: 5, height: 5, borderRadius: 3, background: '#0a0a0a',
        }} />
      </div>
      <div style={{
        width: width * 1.05, height: width * 0.03, marginLeft: -width * 0.025,
        background: 'linear-gradient(180deg,#3a3d43,#17191d)',
        borderRadius: `0 0 ${width * 0.032}px ${width * 0.032}px`,
        boxShadow: '0 26px 50px -18px rgba(0,0,0,0.55)',
      }} />
    </div>
  );
};

/* CLOSE na tela real: janela full-width com a região do take ampliada.
   foco: [x, y] em coordenadas do take 1512×850 que deve ficar no centro. */
export const TakeZoom: React.FC<{
  nome: string; from?: number; fromEnd?: number;
  zoom?: number; foco?: [number, number]; h?: number; radius?: number;
}> = ({ nome, from, fromEnd, zoom = 1.6, foco = [756, 425], h = 1100, radius = 26 }) => {
  const w = 1080;
  const vidW = 1512 * zoom, vidH = 850 * zoom;
  const left = w / 2 - foco[0] * zoom;
  const topv = h / 2 - foco[1] * zoom;
  return (
    <div style={{
      width: w, height: h, overflow: 'hidden', position: 'relative', borderRadius: radius,
      background: '#fff', boxShadow: '0 34px 90px rgba(14,27,51,0.35)',
    }}>
      <OffthreadVideo
        src={staticFile(`takes/${nome}.webm`)} muted
        startFrom={takeFrom(nome, { from, fromEnd })}
        style={{
          position: 'absolute', width: vidW, height: vidH,
          left: Math.min(0, Math.max(w - vidW, left)),
          top: Math.min(0, Math.max(h - vidH, topv)),
        }}
      />
    </div>
  );
};

/* take mobile (860×1864) em tela quase cheia */
export const TakeCelular: React.FC<{
  nome: string; from?: number; fromEnd?: number; width?: number;
}> = ({ nome, from, fromEnd, width = 1000 }) => {
  /* o take mobile grava o app em 430×932 no canto do canvas 860×1864:
     ampliamos 2× e recortamos só a região útil */
  const h = width * (932 / 430);
  return (
    <div style={{
      width, height: h, borderRadius: 44, overflow: 'hidden', background: '#fff',
      position: 'relative',
      boxShadow: '0 40px 100px rgba(14,27,51,0.4), 0 0 0 10px #14161a, 0 0 0 12px rgba(255,255,255,0.08)',
    }}>
      <OffthreadVideo
        src={staticFile(`takes/${nome}.webm`)} muted
        startFrom={takeFrom(nome, { from, fromEnd })}
        style={{ position: 'absolute', left: 0, top: 0, width: width * 2, height: width * 2 * (1864 / 860) }}
      />
    </div>
  );
};

/* selo "gravação real" — a prova de autenticidade */
export const SeloReal: React.FC<{ claro?: boolean }> = ({ claro }) => (
  <div style={{
    position: 'absolute', top: 54, right: 54, display: 'flex', alignItems: 'center', gap: 12,
    background: claro ? 'rgba(14,27,51,0.85)' : 'rgba(255,255,255,0.94)',
    borderRadius: 999, padding: '12px 24px', zIndex: 30,
    boxShadow: '0 12px 34px rgba(14,27,51,0.3)',
  }}>
    <span style={{
      width: 14, height: 14, borderRadius: 7, background: '#e02424',
      boxShadow: '0 0 0 4px rgba(224,36,36,0.25)',
    }} />
    <span style={{
      fontFamily: HEAD, fontWeight: 800, fontSize: 24,
      color: claro ? WHITE : M_NAVY, letterSpacing: '0.04em',
    }}>
      GRAVAÇÃO REAL DA PLATAFORMA
    </span>
  </div>
);

/* título-chip discreto que não cobre o app */
export const Rotulo: React.FC<{ t: number; at: number; children: React.ReactNode; bottom?: number }> =
  ({ t, at, children, bottom = 120 }) => {
    if (t < at) return null;
    const p = outB(win(t, at, at + 0.4));
    return (
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom, display: 'flex', justifyContent: 'center',
        opacity: p, transform: `translateY(${(1 - p) * 20}px)`, zIndex: 25,
      }}>
        <div style={{
          background: M_NAVY, color: WHITE, fontFamily: HEAD, fontWeight: 800, fontSize: 34,
          borderRadius: 999, padding: '18px 38px', boxShadow: '0 18px 50px rgba(14,27,51,0.45)',
          maxWidth: 940, textAlign: 'center',
        }}>{children}</div>
      </div>
    );
  };

export const FundoReal: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, ${M_BG}, #dfe6f2)` }}>
    <AbsoluteFill style={{
      backgroundImage: 'radial-gradient(rgba(21,96,232,0.06) 1.4px, transparent 1.4px)',
      backgroundSize: '42px 42px',
    }} />
    {children}
  </AbsoluteFill>
);
