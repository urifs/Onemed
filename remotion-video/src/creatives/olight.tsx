import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { HEAD, BODY, MONO, clamp01, easeInOut } from './theme';
import { FPS, sceneOpacity, ClipAt, Range } from './story';
import { PhoneFrame } from './DeviceFrames';

/* Kit MODO CLARO da OneMed (série C31–C40): fundo claro, marca vermelha. */
export const O_RED = '#e02d2d';
export const O_RED_SOFT = 'rgba(224,45,45,0.12)';
export const O_INK = '#16181d';
export const O_MUT = '#6b7280';
export const O_BG = '#fafafa';
export const O_CARD = '#ffffff';
export const O_GREEN = '#0e9f6e';
export const WHITE = '#ffffff';

/* ══ fundo claro com respiração vermelha ═════════════════════════════════ */
export const OLightBg: React.FC = () => {
  const frame = useCurrentFrame();
  const b1 = (Math.sin(frame * 0.015) * 0.5 + 0.5) * 0.5 + 0.5;
  const b2 = (Math.cos(frame * 0.011 + 2) * 0.5 + 0.5) * 0.5 + 0.45;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: O_BG }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(rgba(224,45,45,0.06) 1.5px, transparent 1.5px)`,
        backgroundSize: '36px 36px',
      }} />
      <div style={{
        position: 'absolute', width: 900, height: 900, borderRadius: '50%',
        left: -340, top: -280, filter: 'blur(150px)',
        background: `rgba(224,45,45,${0.10 * b1})`,
      }} />
      <div style={{
        position: 'absolute', width: 820, height: 820, borderRadius: '50%',
        right: -300, bottom: -240, filter: 'blur(150px)',
        background: `rgba(224,45,45,${0.08 * b2})`,
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 135% 115% at 50% 45%, transparent 60%, rgba(22,24,29,0.08) 100%)',
      }} />
    </>
  );
};

/* ══ logo OneMed (claro) ═════════════════════════════════════════════════ */
export const OLogo: React.FC<{ size?: number; row?: boolean }> = ({ size = 96, row = true }) => (
  <div style={{ display: 'flex', flexDirection: row ? 'row' : 'column', alignItems: 'center', gap: size * 0.22 }}>
    <div style={{
      width: size, height: size, borderRadius: size * 0.26,
      background: `linear-gradient(140deg, ${O_RED}, #b81f1f)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 18px 44px -10px rgba(224,45,45,0.5)',
    }}>
      <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 24 24" fill="none"
        stroke={WHITE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
        <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
        <circle cx="20" cy="10" r="2" />
      </svg>
    </div>
    <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size * 0.58, color: O_INK, letterSpacing: -size * 0.018, lineHeight: 1 }}>
      One<span style={{ color: O_RED }}>Med</span>
    </span>
  </div>
);

/* ══ badge flutuante clara ═══════════════════════════════════════════════ */
export const OLBadge: React.FC<{
  x: number; y: number; delay: number; from?: 'left' | 'right';
  accent?: boolean; green?: boolean;
  top: string; bottom?: string;
}> = ({ x, y, delay, from = 'left', accent, green, top, bottom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 13, stiffness: 110 }, from: 0, to: 1 });
  const drift = Math.sin((frame - delay) * 0.045) * 6;
  const dx = (from === 'left' ? -1 : 1) * (1 - s) * 160;
  const border = green ? 'rgba(14,159,110,0.5)' : accent ? O_RED : 'rgba(22,24,29,0.10)';
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transform: `translate(${dx}px, ${drift}px) scale(${0.7 + s * 0.3})`,
      opacity: s,
      background: accent ? O_RED : 'rgba(255,255,255,0.97)',
      border: `1.5px solid ${border}`,
      borderRadius: 18, padding: '16px 26px',
      boxShadow: accent ? '0 18px 44px -10px rgba(224,45,45,0.45)' : '0 18px 50px -14px rgba(22,24,29,0.25)',
    }}>
      <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 29, color: accent ? WHITE : green ? O_GREEN : O_INK, lineHeight: 1.12 }}>{top}</div>
      {bottom && <div style={{ fontFamily: BODY, fontSize: 19, color: accent ? 'rgba(255,255,255,0.88)' : O_MUT, marginTop: 4 }}>{bottom}</div>}
    </div>
  );
};

/* ══ celular central (app claro) ═════════════════════════════════════════ */
export const OLPhone: React.FC<{
  t: number; range: Range; src: string; startFrom: number; width?: number; top?: number;
  playbackRate?: number; children?: React.ReactNode;
}> = ({ t, range, src, startFrom, width = 600, top = 165, playbackRate, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, range);
  const base = Math.round(range[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 16, stiffness: 60 }, from: 0, to: 1 });
  const o = interpolate(frame - base, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const breath = 1 + easeInOut(clamp01((t - range[0]) / 4.5)) * 0.04;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: '50%', top,
        transform: `translateX(-50%) translateY(${(1 - s) * 95}px) scale(${breath})`,
        transformOrigin: '50% 20%', opacity: o,
      }}>
        <ClipAt fromSec={range[0]}>
          <PhoneFrame src={src} width={width} startFrom={startFrom} statusDark playbackRate={playbackRate} />
        </ClipAt>
      </div>
      {children}
    </div>
  );
};

/* ══ hero tipográfico claro ══════════════════════════════════════════════ */
export const OLHero: React.FC<{
  t: number; range: Range;
  line1: string; line2?: string;
  size?: number; top?: number; redAfterSec?: number;
}> = ({ t, range, line1, line2, size = 74, top = 720, redAfterSec = 1.3 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, range);
  const base = Math.round(range[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 14, stiffness: 80 }, from: 0.88, to: 1 });
  const o = interpolate(frame - base, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hi = t - range[0] > redAfterSec;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: 50, right: 50, top, textAlign: 'center',
        opacity: o, transform: `scale(${s})`,
      }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size, color: O_INK, lineHeight: 1.18, letterSpacing: -2 }}>
          {line1}
          {line2 && (
            <>
              <br />
              <span style={{ color: hi ? O_RED : O_INK, textShadow: hi ? '0 0 44px rgba(224,45,45,0.3)' : 'none' }}>{line2}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══ números 530/9.000 (claro) ═══════════════════════════════════════════ */
export function useOLCount(target: number, startFrame: number, durFrames = 32): string {
  const frame = useCurrentFrame();
  const p = clamp01((frame - startFrame) / durFrames);
  return Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString('pt-BR');
}

export const OLNumbers: React.FC<{
  t: number; range: Range;
  atFirstSec: number; atSecondSec: number; atPillSec?: number;
  pillText?: React.ReactNode;
}> = ({ t, range, atFirstSec, atSecondSec, atPillSec, pillText }) => {
  const frame = useCurrentFrame();
  const op = sceneOpacity(t, range);
  const f1 = Math.round(atFirstSec * FPS);
  const f2 = Math.round(atSecondSec * FPS);
  const cursos = useOLCount(530, f1 + 2, 30);
  const livros = useOLCount(9000, f2, 34);
  const o1 = interpolate(frame - f1, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const o2 = interpolate(frame - f2, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const oP = atPillSec ? interpolate(t, [atPillSec, atPillSec + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 520, textAlign: 'center', opacity: o1 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 150, color: O_INK, letterSpacing: -5, lineHeight: 1 }}>
          {cursos}<span style={{ color: O_RED }}>+</span>
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 33, color: O_MUT, marginTop: 2 }}>cursos completos</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 840, textAlign: 'center', opacity: o2 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 150, color: O_INK, letterSpacing: -5, lineHeight: 1 }}>
          {livros}<span style={{ color: O_RED }}>+</span>
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 33, color: O_MUT, marginTop: 2 }}>livros médicos</div>
      </div>
      {pillText && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1120, display: 'flex', justifyContent: 'center', opacity: oP }}>
          <div style={{
            background: O_RED, borderRadius: 999, padding: '15px 38px',
            boxShadow: '0 18px 50px -12px rgba(224,45,45,0.5)',
            fontFamily: HEAD, fontWeight: 800, fontSize: 25, color: WHITE,
          }}>
            {pillText}
          </div>
        </div>
      )}
    </div>
  );
};

/* ══ end card claro ══════════════════════════════════════════════════════ */
export const OLEndCard: React.FC<{ startFrame: number }> = ({ startFrame }) => {
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
      <div style={{ position: 'absolute', inset: 0, background: O_BG, opacity: 0.97 }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 800px 640px at 50% 42%, rgba(224,45,45,0.10) 0%, transparent 65%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 44, padding: '0 70px',
      }}>
        <div style={{ opacity: logoOp, transform: `scale(${logoS})` }}>
          <OLogo size={112} row={false} />
        </div>
        <div style={{
          opacity: pillOp, transform: `scale(${pulse})`,
          background: O_RED, borderRadius: 999, padding: '20px 54px',
          boxShadow: '0 22px 60px -14px rgba(224,45,45,0.55)',
        }}>
          <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: WHITE }}>
            Teste grátis agora
          </span>
        </div>
        <div style={{ opacity: urlOp, textAlign: 'center' }}>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 40, color: O_RED, letterSpacing: 0.5 }}>
            onemedcursos.com.br
          </span>
        </div>
        <div style={{ opacity: statsOp, display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['+530 cursos', '+9.000 livros', 'IA de estudo · mapa mental · acervo'].map(s2 => (
            <span key={s2} style={{
              fontFamily: BODY, fontWeight: 600, fontSize: 21, color: O_INK,
              background: WHITE, border: '1px solid rgba(22,24,29,0.12)',
              borderRadius: 999, padding: '10px 22px',
              boxShadow: '0 8px 24px -8px rgba(22,24,29,0.16)',
            }}>{s2}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
