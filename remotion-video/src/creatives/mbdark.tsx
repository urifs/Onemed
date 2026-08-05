import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { HEAD, BODY, MONO } from './theme';
import { FPS, sceneOpacity, Range } from './story';

/* Drive MedBrasil — tema do site: fundo quase preto, azul primário, verde de acento */
export const MB_BLUE = '#3b82f6';
export const MB_GREEN = '#22c55e';
export const MB_BG = '#060709';
export const MB_CARD = '#10141c';
export const MB_INK = '#f2f5f9';
export const MB_MUT = '#93a0b4';
export const MB_LINE = 'rgba(255,255,255,0.12)';
export const WHITE = '#ffffff';

export const MBDarkBg: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: MB_BG }}>
    <div style={{
      position: 'absolute', width: 1100, height: 1100, borderRadius: 999,
      background: 'radial-gradient(circle, rgba(59,130,246,0.16), transparent 65%)',
      top: -320, left: -260,
    }} />
    <div style={{
      position: 'absolute', width: 1000, height: 1000, borderRadius: 999,
      background: 'radial-gradient(circle, rgba(59,130,246,0.10), transparent 65%)',
      bottom: -300, right: -260,
    }} />
    <div style={{
      position: 'absolute', inset: 0, opacity: 0.5,
      backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1.4px, transparent 1.4px)',
      backgroundSize: '46px 46px',
    }} />
  </div>
);

/* nuvem + cruz: “Drive” + médico, sem imitar logo de terceiros */
export const MBLogo: React.FC<{ size?: number; row?: boolean }> = ({ size = 96, row = true }) => (
  <div style={{
    display: 'flex', flexDirection: row ? 'row' : 'column',
    alignItems: 'center', justifyContent: 'center', gap: row ? 22 : 16,
  }}>
    <div style={{
      width: size, height: size, borderRadius: size * 0.24,
      background: `linear-gradient(135deg, ${MB_BLUE}, #2563eb)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 18px 50px -12px rgba(59,130,246,0.55)',
    }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 48 48" fill="none">
        <path d="M14 34a8 8 0 0 1-1.5-15.9A11 11 0 0 1 34 15a9 9 0 0 1 2.4 17.7" stroke={WHITE} strokeWidth={3.4} strokeLinecap="round" fill="none" />
        <path d="M24 24v12M18 30h12" stroke={WHITE} strokeWidth={3.6} strokeLinecap="round" />
      </svg>
    </div>
    <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size * 0.5, letterSpacing: -1.5, lineHeight: 1 }}>
      <span style={{ color: MB_MUT, fontWeight: 700 }}>Drive </span>
      <span style={{ color: MB_INK }}>Med</span><span style={{ color: MB_BLUE }}>Brasil</span>
    </div>
  </div>
);

export const MBHero: React.FC<{
  t: number; range: Range;
  line1: string; line2?: string;
  size?: number; top?: number; blueAfterSec?: number;
}> = ({ t, range, line1, line2, size = 66, top = 760, blueAfterSec = 1.3 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, range);
  const base = Math.round(range[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 14, stiffness: 80 }, from: 0.9, to: 1 });
  const o = interpolate(frame - base, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hi = t - range[0] > blueAfterSec;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: 60, right: 60, top, textAlign: 'center',
        transform: `scale(${s})`, opacity: o,
      }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size, color: MB_INK, letterSpacing: -1.8, lineHeight: 1.22 }}>
          {line1}
          {line2 && (
            <>
              <br />
              <span style={{ color: MB_BLUE, opacity: hi ? 1 : 0, transition: 'none' }}>{line2}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export function useMBCount(target: number, startFrame: number, durFrames = 32): string {
  const frame = useCurrentFrame();
  const p = interpolate(frame - startFrame, [0, durFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const eased = 1 - Math.pow(1 - p, 3);
  return Math.round(target * eased).toLocaleString('pt-BR');
}

export const MBEndCard: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < startFrame - 14) return null;
  const o = interpolate(frame - startFrame, [-14, 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const s = spring({ frame: frame - startFrame, fps, config: { damping: 13, stiffness: 90 }, from: 0.94, to: 1 });
  const pillO = interpolate(frame - startFrame, [10, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const chipsO = interpolate(frame - startFrame, [20, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <div style={{ position: 'absolute', inset: 0, background: MB_BG }} />
      <div style={{
        position: 'absolute', width: 1200, height: 1200, borderRadius: 999, left: -60, top: 260,
        background: 'radial-gradient(circle, rgba(59,130,246,0.20), transparent 62%)',
      }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 690, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34, transform: `scale(${s})` }}>
        <MBLogo size={130} row={false} />
        <div style={{
          opacity: pillO, background: MB_BLUE, borderRadius: 999, padding: '20px 52px',
          boxShadow: '0 20px 60px -14px rgba(59,130,246,0.6)',
          fontFamily: HEAD, fontWeight: 900, fontSize: 34, color: WHITE,
        }}>
          Teste grátis — sem cartão
        </div>
        <div style={{ opacity: pillO, fontFamily: MONO, fontWeight: 700, fontSize: 33, color: MB_BLUE }}>
          medbrasilcursos.com.br
        </div>
        <div style={{ opacity: chipsO, display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 900 }}>
          {['+530 cursos', '+9.000 livros', 'na nuvem · atualizações garantidas'].map(c => (
            <div key={c} style={{
              background: MB_CARD, border: `1.5px solid ${MB_LINE}`, borderRadius: 999,
              padding: '12px 26px', fontFamily: HEAD, fontWeight: 700, fontSize: 23, color: MB_INK,
            }}>{c}</div>
          ))}
        </div>
      </div>
    </div>
  );
};
