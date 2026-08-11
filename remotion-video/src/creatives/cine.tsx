import React from 'react';
import { useCurrentFrame } from 'remotion';
import { clamp01, easeInOut } from './theme';
import { FPS, Range } from './story';

/* ============ cine.tsx — primitivas cinematográficas da série C43–C62 ============ */

/* --- easings extras --- */
export const easeOutExpo = (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
export const easeInExpo = (p: number) => (p <= 0 ? 0 : Math.pow(2, 10 * (p - 1)));

/* progresso 0..1 dentro de uma janela */
export const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/* --- CineScene: wrapper de cena com entrada/saída cinematográfica --- */
type Move = 'none' | 'zoom-in' | 'zoom-out' | 'push-left' | 'push-right' | 'rise' | 'fall';
const enterT = (m: Move, p: number): string => {
  const q = easeOutExpo(p);
  switch (m) {
    case 'zoom-in': return `scale(${1.18 - 0.18 * q})`;
    case 'zoom-out': return `scale(${0.86 + 0.14 * q})`;
    case 'push-left': return `translateX(${(1 - q) * 140}px)`;
    case 'push-right': return `translateX(${(1 - q) * -140}px)`;
    case 'rise': return `translateY(${(1 - q) * 110}px)`;
    case 'fall': return `translateY(${(1 - q) * -110}px)`;
    default: return 'none';
  }
};
const exitT = (m: Move, p: number): string => {
  const q = easeInExpo(p);
  switch (m) {
    case 'zoom-in': return `scale(${1 + 0.16 * q})`;
    case 'zoom-out': return `scale(${1 - 0.12 * q})`;
    case 'push-left': return `translateX(${q * -140}px)`;
    case 'push-right': return `translateX(${q * 140}px)`;
    case 'rise': return `translateY(${q * -90}px)`;
    case 'fall': return `translateY(${q * 90}px)`;
    default: return 'none';
  }
};

export const CineScene: React.FC<{
  t: number; range: Range;
  enter?: Move; exit?: Move; dur?: number; first?: boolean;
  children: React.ReactNode;
}> = ({ t, range, enter = 'zoom-out', exit = 'zoom-in', dur = 0.5, first, children }) => {
  const [a, b] = range;
  if (t < a - 0.05 || t > b + dur) return null;
  const pIn = first ? 1 : win(t, a, a + dur);
  const pOut = win(t, b, b + dur);
  const op = Math.min(first ? 1 : pIn * 1.6, 1 - pOut);
  if (op <= 0) return null;
  const tr = pOut > 0 ? exitT(exit, pOut) : enterT(enter, pIn);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: Math.min(op, 1), transform: tr, transformOrigin: '50% 46%' }}>
      {children}
    </div>
  );
};

/* --- WipePanel: painel que varre a tela cobrindo o corte --- */
export const WipePanel: React.FC<{ t: number; atSec: number; color: string; dur?: number; angle?: number }> =
({ t, atSec, color, dur = 0.55, angle = -14 }) => {
  const p = win(t, atSec - dur / 2, atSec + dur / 2);
  if (p <= 0 || p >= 1) return null;
  const x = (p * 2 - 1) * 1900; // -1900 → +1900
  return (
    <div style={{
      position: 'absolute', left: -400, top: -300, width: 1900, height: 2600, zIndex: 40,
      background: color, transform: `translateX(${x}px) rotate(${angle}deg)`,
      boxShadow: `0 0 120px 40px ${color}`,
    }} />
  );
};

/* --- FlashCut: flash de 3 frames no corte --- */
export const FlashCut: React.FC<{ t: number; atSec: number; color?: string }> = ({ t, atSec, color = '#ffffff' }) => {
  const d = Math.abs(t - atSec);
  if (d > 0.1) return null;
  return <div style={{ position: 'absolute', inset: 0, zIndex: 42, background: color, opacity: (1 - d / 0.1) * 0.85 }} />;
};

/* --- Letterbox: barras de cinema --- */
export const Letterbox: React.FC<{ t: number; inAt?: number; outAt?: number; size?: number; color?: string }> =
({ t, inAt = 0, outAt = 9999, size = 140, color = '#000' }) => {
  const p = Math.min(win(t, inAt, inAt + 0.8), 1 - win(t, outAt, outAt + 0.8));
  if (p <= 0) return null;
  const h = size * easeInOut(p);
  return (
    <>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: h, background: color, zIndex: 38 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h, background: color, zIndex: 38 }} />
    </>
  );
};

/* --- CamDrift: deriva lenta de câmera (respiração) --- */
export const CamDrift: React.FC<{ t: number; amp?: number; zoom?: number; children: React.ReactNode }> =
({ t, amp = 8, zoom = 0.02, children }) => (
  <div style={{
    position: 'absolute', inset: 0,
    transform: `translate(${Math.sin(t * 0.5) * amp}px, ${Math.cos(t * 0.37) * amp * 0.7}px) scale(${1 + zoom + Math.sin(t * 0.23) * zoom * 0.5})`,
  }}>{children}</div>
);

/* --- shake de impacto (usar no transform de quem precisar) --- */
export const shakeAt = (t: number, atSec: number, amp = 10): string => {
  const d = t - atSec;
  if (d < 0 || d > 0.45) return '';
  const decay = 1 - d / 0.45;
  return `translate(${Math.sin(d * 90) * amp * decay}px, ${Math.cos(d * 70) * amp * 0.6 * decay}px)`;
};

/* --- Grain: granulação de filme (determinística por frame) --- */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.06 }) => {
  const frame = useCurrentFrame();
  return (
    <svg style={{ position: 'absolute', inset: 0, zIndex: 44, pointerEvents: 'none', opacity }} width="1080" height="1920">
      <filter id={`gr${frame % 6}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 6} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="1080" height="1920" filter={`url(#gr${frame % 6})`} />
    </svg>
  );
};

/* --- Vignette --- */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.5 }) => (
  <div style={{
    position: 'absolute', inset: 0, zIndex: 36, pointerEvents: 'none',
    background: `radial-gradient(ellipse 88% 72% at 50% 46%, transparent 58%, rgba(0,0,0,${strength}) 100%)`,
  }} />
);

/* --- LightSweep: faixa de luz varrendo (títulos de cinema) --- */
export const LightSweep: React.FC<{ t: number; period?: number; opacity?: number }> = ({ t, period = 3.2, opacity = 0.16 }) => {
  const p = (t % period) / period;
  return (
    <div style={{
      position: 'absolute', top: -300, bottom: -300, width: 340, zIndex: 34, pointerEvents: 'none',
      left: -500 + p * 2100,
      background: `linear-gradient(100deg, transparent, rgba(255,255,255,${opacity}), transparent)`,
      transform: 'rotate(10deg)',
    }} />
  );
};

/* --- Glitch/estática de TV (para cortes de canal) --- */
export const Static: React.FC<{ t: number; atSec: number; dur?: number }> = ({ t, atSec, dur = 0.22 }) => {
  const frame = useCurrentFrame();
  if (t < atSec || t > atSec + dur) return null;
  return (
    <svg style={{ position: 'absolute', inset: 0, zIndex: 41 }} width="1080" height="1920">
      <filter id={`st${frame % 4}`}>
        <feTurbulence type="turbulence" baseFrequency="0.62 0.8" numOctaves="1" seed={frame % 4} />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer><feFuncA type="linear" slope="1" /></feComponentTransfer>
      </filter>
      <rect width="1080" height="1920" filter={`url(#st${frame % 4})`} />
    </svg>
  );
};

/* --- typewriter helper: quantos caracteres mostrar --- */
export const typed = (text: string, t: number, startSec: number, cps = 24): string => {
  const n = Math.max(0, Math.floor((t - startSec) * cps));
  return text.slice(0, n);
};

/* --- índice ativo numa montagem por beats --- */
export const beatIndex = (t: number, beats: number[]): number => {
  let i = -1;
  for (let k = 0; k < beats.length; k++) if (t >= beats[k]) i = k;
  return i;
};
