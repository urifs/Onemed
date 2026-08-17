import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';

/* ============================================================
   Kit MANIFESTO — tipografia cinética brutalista.
   A palavra falada É a tela: lajes de cor chapada, cortes
   secos no ritmo da voz, tipo gigante, faixas-carimbo.
   Sem cards, sem legenda inferior, sem end card padrão.
   ============================================================ */

export const FPS = 30;
export const DELAY = 0.7;

export const RED = '#e8302a';
export const BLK = '#0d0d0d';
export const OFF = '#f5f2ec';

export const BRUT = "'Archivo Black', 'Inter', 'Helvetica Neue', Arial, sans-serif";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const outExpo = (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));

/* tamanho que enche a laje: sangra de propósito nas palavras longas */
export const fit = (chars: number, max = 330, avail = 1170) => Math.min(max, avail / (0.58 * chars));

/* palavra-marretada: aparece dura, assenta de 1.26x pra 1 em ~5 frames */
export const Slam: React.FC<{
  t: number; at: number; children: React.ReactNode;
  size: number; color: string; rot?: number; style?: React.CSSProperties;
}> = ({ t, at, children, size, color, rot = 0, style }) => {
  if (t < at) return null;
  const p = outExpo(win(t, at, at + 0.16));
  return (
    <div style={{
      fontFamily: BRUT, fontWeight: 900, textTransform: 'uppercase',
      fontSize: size, color, lineHeight: 0.92, letterSpacing: '-0.02em',
      transform: `scale(${1.26 - 0.26 * p}) rotate(${rot * (0.6 + 0.4 * p)}deg)`,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {children}
    </div>
  );
};

/* faixa-carimbo: banda de cor atrás/embaixo de uma linha */
export const Band: React.FC<{
  t: number; at: number; bg: string; fg: string; size?: number;
  children: React.ReactNode; rot?: number;
}> = ({ t, at, bg, fg, size = 54, children, rot = 0 }) => {
  if (t < at) return null;
  const p = outExpo(win(t, at, at + 0.2));
  return (
    <div style={{
      display: 'inline-block', background: bg, color: fg, padding: '18px 34px',
      fontFamily: BRUT, fontWeight: 900, textTransform: 'uppercase', fontSize: size,
      letterSpacing: '0.02em', lineHeight: 1,
      transform: `rotate(${rot}deg) scaleX(${0.9 + 0.1 * p})`, transformOrigin: 'left center',
      opacity: p > 0 ? 1 : 0,
    }}>
      {children}
    </div>
  );
};

export const Center: React.CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
};

export type Beat = { at: number; bg: string; render: (t: number) => React.ReactNode };

/* carimbo final em diagonal — o encerramento próprio do sistema */
export const StampFinal: React.FC<{
  t: number; at: number; extraAt: number; topLabel: string;
  bottomLeft: string; bottomRight: string;
}> = ({ t, at, extraAt, topLabel, bottomLeft, bottomRight }) => {
  const p = outExpo(win(t, at + 0.02, at + 0.4));
  const q = outExpo(win(t, extraAt, extraAt + 0.5));
  return (
    <div style={Center}>
      <div style={{
        position: 'absolute', left: -160, right: -160, top: '38%', height: 300,
        background: RED, transform: `rotate(-8deg) scaleX(${p})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 30px 80px rgba(13,13,13,0.28)',
      }}>
        <div style={{
          fontFamily: BRUT, fontWeight: 900, fontSize: 88, color: OFF,
          letterSpacing: '-0.01em',
          transform: `scale(${1.35 - 0.35 * outExpo(win(t, at + 0.17, at + 0.47))})`,
          opacity: t > at + 0.17 ? 1 : 0,
        }}>
          onemedcursos.com.br
        </div>
      </div>
      <div style={{
        position: 'absolute', top: 120, left: 70, opacity: q,
        fontFamily: BRUT, fontWeight: 900, textTransform: 'uppercase',
        fontSize: 40, color: BLK, letterSpacing: '0.12em',
      }}>
        {topLabel}
      </div>
      <div style={{
        position: 'absolute', bottom: 130, left: 70, right: 70, opacity: q,
        display: 'flex', justifyContent: 'space-between',
        fontFamily: BRUT, fontWeight: 900, textTransform: 'uppercase',
        fontSize: 34, color: BLK, letterSpacing: '0.08em',
      }}>
        <span>{bottomLeft}</span>
        <span style={{ color: RED }}>{bottomRight}</span>
      </div>
    </div>
  );
};

/* letreiro correndo no rodapé */
export const Ticker: React.FC<{ t: number; from: number; to: number; items: string[] }> =
  ({ t, from, to, items }) => {
    if (t < from || t > to) return null;
    const fita = items.concat(items, items).join('  •  ');
    const x = -((t - from) * 320) % 2400;
    return (
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 92,
        background: BLK, display: 'flex', alignItems: 'center', overflow: 'hidden',
        borderTop: `10px solid ${RED}`,
      }}>
        <div style={{
          fontFamily: BRUT, fontWeight: 900, textTransform: 'uppercase', fontSize: 44,
          color: OFF, whiteSpace: 'nowrap', transform: `translateX(${x}px)`, letterSpacing: '0.04em',
        }}>
          {fita} • {fita}
        </div>
      </div>
    );
  };

/* montagem: só a laje ativa existe; micro-impacto de 1.02x no corte */
export const ManifestoVideo: React.FC<{
  beats: Beat[]; audio: string; overlay?: (t: number) => React.ReactNode;
}> = ({ beats, audio, overlay }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  let idx = 0;
  for (let i = 0; i < beats.length; i++) if (t >= beats[i].at) idx = i;
  const beat = beats[idx];
  const settle = 1.02 - 0.02 * outExpo(win(t, beat.at, beat.at + 0.2));

  return (
    <AbsoluteFill style={{ background: beat.bg }}>
      <AbsoluteFill style={{ transform: `scale(${settle})`, overflow: 'hidden' }}>
        {beat.render(t)}
      </AbsoluteFill>
      {overlay?.(t)}
      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile(audio)} />
      </Sequence>
    </AbsoluteFill>
  );
};
