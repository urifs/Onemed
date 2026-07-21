import React from 'react';
import { Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { RED, BG, WHITE, W60, W40, HEAD, BODY, MONO, W12, fade, clamp01, easeInOut } from './theme';

/** Fundo padrão: preto profundo + glows vermelhos que respiram */
export const AmbientBg: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const frame = useCurrentFrame();
  const b1 = (Math.sin(frame * 0.017) * 0.5 + 0.5) * 0.5 + 0.45;
  const b2 = (Math.cos(frame * 0.013 + 2) * 0.5 + 0.5) * 0.5 + 0.4;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: BG }} />
      <div style={{
        position: 'absolute', width: 900, height: 900, borderRadius: '50%',
        left: -320, top: -260, filter: 'blur(150px)',
        background: `rgba(239,68,68,${0.14 * b1 * intensity})`,
      }} />
      <div style={{
        position: 'absolute', width: 800, height: 800, borderRadius: '50%',
        right: -300, bottom: -220, filter: 'blur(150px)',
        background: `rgba(239,68,68,${0.11 * b2 * intensity})`,
      }} />
      {/* vinheta */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 130% 110% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)',
      }} />
    </>
  );
};

/** Logo OneMed (estetoscópio no quadrado vermelho + wordmark) */
export const Logo: React.FC<{ size?: number; row?: boolean }> = ({ size = 84, row = true }) => (
  <div style={{
    display: 'flex', flexDirection: row ? 'row' : 'column',
    alignItems: 'center', gap: size * 0.22,
  }}>
    <div style={{
      width: size, height: size, borderRadius: size * 0.26,
      background: 'rgba(239,68,68,0.14)', border: '1.5px solid rgba(239,68,68,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 42px rgba(239,68,68,0.28)',
    }}>
      <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 24 24" fill="none"
        stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
        <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
        <circle cx="20" cy="10" r="2" />
      </svg>
    </div>
    <span style={{
      fontFamily: HEAD, fontWeight: 900, fontSize: size * 0.62, color: WHITE,
      letterSpacing: -size * 0.02, lineHeight: 1,
    }}>
      One<span style={{ color: RED }}>Med</span>
    </span>
  </div>
);

/** End card padrão de todos os criativos (aparece nos últimos ~4s) */
export const EndCard: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - startFrame;
  if (lf < 0) return null;
  const bgOp = interpolate(lf, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logoS = spring({ frame: lf - 4, fps, config: { damping: 13, stiffness: 90 }, from: 0.7, to: 1 });
  const logoOp = interpolate(lf, [4, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pillOp = interpolate(lf, [14, 27], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const urlOp = interpolate(lf, [22, 36], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const statsOp = interpolate(lf, [30, 44], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pulse = 1 + Math.sin(lf * 0.16) * 0.015;

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: bgOp }}>
      <div style={{ position: 'absolute', inset: 0, background: BG, opacity: 0.94 }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 800px 640px at 50% 42%, rgba(239,68,68,0.16) 0%, transparent 65%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 44, padding: '0 70px',
      }}>
        <div style={{ opacity: logoOp, transform: `scale(${logoS})` }}>
          <Logo size={110} row={false} />
        </div>
        <div style={{
          opacity: pillOp, transform: `scale(${pulse})`,
          background: 'rgba(239,68,68,0.13)', border: '2px solid rgba(239,68,68,0.5)',
          borderRadius: 999, padding: '20px 54px',
          boxShadow: '0 0 54px rgba(239,68,68,0.25)',
        }}>
          <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: WHITE }}>
            Teste <span style={{ color: RED }}>grátis</span> agora
          </span>
        </div>
        <div style={{ opacity: urlOp, textAlign: 'center' }}>
          <span style={{
            fontFamily: MONO, fontWeight: 700, fontSize: 40, color: RED,
            letterSpacing: 0.5, textShadow: '0 0 26px rgba(239,68,68,0.6)',
          }}>
            onemedcursos.com.br
          </span>
        </div>
        <div style={{
          opacity: statsOp, display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {['+530 cursos', '+9.000 livros', 'atualizações inclusas'].map(s => (
            <span key={s} style={{
              fontFamily: BODY, fontWeight: 600, fontSize: 22, color: W60,
              background: W12, border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 999, padding: '10px 24px',
            }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

/** Selo/badge flutuante com spring */
export const FloatBadge: React.FC<{
  children: React.ReactNode;
  x: number; y: number;
  delay: number;
  from?: 'left' | 'right';
  accent?: boolean;
}> = ({ children, x, y, delay, from = 'left', accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 13, stiffness: 110 }, from: 0, to: 1 });
  const drift = Math.sin((frame - delay) * 0.045) * 6;
  const dx = (from === 'left' ? -1 : 1) * (1 - s) * 160;
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transform: `translate(${dx}px, ${drift}px) scale(${0.7 + s * 0.3})`,
      opacity: s,
      background: accent ? 'rgba(239,68,68,0.16)' : 'rgba(10,12,18,0.88)',
      border: accent ? '1.5px solid rgba(239,68,68,0.55)' : '1px solid rgba(255,255,255,0.16)',
      borderRadius: 18, padding: '16px 26px',
      boxShadow: '0 18px 50px -12px rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
    }}>
      {children}
    </div>
  );
};

export const BadgeText: React.FC<{ top: string; bottom?: string }> = ({ top, bottom }) => (
  <div>
    <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: WHITE, lineHeight: 1.1 }}>{top}</div>
    {bottom && <div style={{ fontFamily: BODY, fontSize: 19, color: W60, marginTop: 4 }}>{bottom}</div>}
  </div>
);

/** Narração master (delaySec desloca o início dentro da composição) */
export const Narration: React.FC<{ id: string; delaySec?: number }> = ({ id, delaySec = 0 }) => {
  const { fps } = useVideoConfig();
  return (
    <Sequence from={Math.round(delaySec * fps)}>
      <Audio src={staticFile(`narration/${id}.mp3`)} />
    </Sequence>
  );
};

/** contador simples ease-out */
export function useCountUp(target: number, startFrame: number, durFrames = 55): string {
  const frame = useCurrentFrame();
  const p = clamp01((frame - startFrame) / durFrames);
  const v = Math.round(target * (1 - Math.pow(1 - p, 3)));
  return v.toLocaleString('pt-BR');
}

/** pan/zoom lento para dar vida a molduras paradas */
export function useDrift(scaleFrom = 1, scaleTo = 1.045, totalFrames = 900) {
  const frame = useCurrentFrame();
  const p = easeInOut(clamp01(frame / totalFrames));
  return scaleFrom + (scaleTo - scaleFrom) * p;
}
