import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { HEAD, BODY, MONO, clamp01, easeInOut } from './theme';
import { FPS, sceneOpacity, ClipAt, Range } from './story';
import { PhoneFrame } from './DeviceFrames';

/* ══ Paleta MEDUF (extraída do app em produção) ══════════════════════════ */
export const M_BLUE = '#1560e8';
export const M_DEEP = '#0a3d99';
export const M_NAVY = '#0e1b33';
export const M_MUT = '#5b6b85';
export const M_BG = '#f6f8fc';
export const M_LIGHT = '#e8f0fe';
export const M_GREEN = '#0e9f6e';
export const M_RED = '#e02424';
export const WHITE = '#ffffff';

/* ══ Fundo claro da MEDUF: azul respirando + pontilhado ══════════════════ */
export const MedufBg: React.FC = () => {
  const frame = useCurrentFrame();
  const b1 = (Math.sin(frame * 0.015) * 0.5 + 0.5) * 0.5 + 0.5;
  const b2 = (Math.cos(frame * 0.011 + 2) * 0.5 + 0.5) * 0.5 + 0.45;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: M_BG }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(rgba(21,96,232,0.07) 1.5px, transparent 1.5px)`,
        backgroundSize: '34px 34px',
      }} />
      <div style={{
        position: 'absolute', width: 900, height: 900, borderRadius: '50%',
        left: -340, top: -280, filter: 'blur(150px)',
        background: `rgba(21,96,232,${0.13 * b1})`,
      }} />
      <div style={{
        position: 'absolute', width: 820, height: 820, borderRadius: '50%',
        right: -300, bottom: -240, filter: 'blur(150px)',
        background: `rgba(10,61,153,${0.10 * b2})`,
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 135% 115% at 50% 45%, transparent 60%, rgba(14,27,51,0.10) 100%)',
      }} />
    </>
  );
};

/* ══ Logo MEDUF AI ═══════════════════════════════════════════════════════ */
export const MLogo: React.FC<{ size?: number; row?: boolean }> = ({ size = 96, row = true }) => (
  <div style={{ display: 'flex', flexDirection: row ? 'row' : 'column', alignItems: 'center', gap: size * 0.24 }}>
    <div style={{
      width: size, height: size, borderRadius: size * 0.30,
      background: `linear-gradient(140deg, ${M_BLUE}, ${M_DEEP})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 18px 44px -10px rgba(21,96,232,0.55)',
    }}>
      <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size * 0.52, color: WHITE }}>M</span>
    </div>
    <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size * 0.56, color: M_NAVY, letterSpacing: -size * 0.015, lineHeight: 1 }}>
      MEDUF <span style={{ color: M_BLUE }}>AI</span>
    </span>
  </div>
);

/* ══ Badge flutuante clara ═══════════════════════════════════════════════ */
export const MBadge: React.FC<{
  x: number; y: number; delay: number; from?: 'left' | 'right';
  accent?: boolean; green?: boolean;
  top: string; bottom?: string;
}> = ({ x, y, delay, from = 'left', accent, green, top, bottom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 13, stiffness: 110 }, from: 0, to: 1 });
  const drift = Math.sin((frame - delay) * 0.045) * 6;
  const dx = (from === 'left' ? -1 : 1) * (1 - s) * 160;
  const border = green ? 'rgba(14,159,110,0.5)' : accent ? M_BLUE : 'rgba(14,27,51,0.10)';
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transform: `translate(${dx}px, ${drift}px) scale(${0.7 + s * 0.3})`,
      opacity: s,
      background: accent ? M_BLUE : 'rgba(255,255,255,0.96)',
      border: `1.5px solid ${border}`,
      borderRadius: 18, padding: '16px 26px',
      boxShadow: accent ? '0 18px 44px -10px rgba(21,96,232,0.5)' : '0 18px 50px -14px rgba(14,27,51,0.28)',
    }}>
      <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 29, color: accent ? WHITE : green ? M_GREEN : M_NAVY, lineHeight: 1.12 }}>{top}</div>
      {bottom && <div style={{ fontFamily: BODY, fontSize: 19, color: accent ? 'rgba(255,255,255,0.85)' : M_MUT, marginTop: 4 }}>{bottom}</div>}
    </div>
  );
};

/* ══ Cena de celular (tema claro) ════════════════════════════════════════ */
export const MPhone: React.FC<{
  t: number; range: Range; src: string; startFrom: number;
  playbackRate?: number;
  children?: React.ReactNode;
}> = ({ t, range, src, startFrom, playbackRate, children }) => {
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
        position: 'absolute', left: '50%', top: 165,
        transform: `translateX(-50%) translateY(${(1 - s) * 95}px) scale(${breath})`,
        transformOrigin: '50% 20%',
        opacity: o,
      }}>
        <ClipAt fromSec={range[0]}>
          <PhoneFrame src={src} width={600} startFrom={startFrom} statusDark playbackRate={playbackRate} />
        </ClipAt>
      </div>
      {children}
    </div>
  );
};

/* ══ Hero tipográfico navy/azul ══════════════════════════════════════════ */
export const MHero: React.FC<{
  t: number; range: Range;
  line1: string; line2?: string;
  size?: number; top?: number; blueAfterSec?: number;
}> = ({ t, range, line1, line2, size = 78, top = 720, blueAfterSec = 1.3 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, range);
  const base = Math.round(range[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 14, stiffness: 80 }, from: 0.88, to: 1 });
  const o = interpolate(frame - base, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hi = t - range[0] > blueAfterSec;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: 50, right: 50, top, textAlign: 'center',
        opacity: o, transform: `scale(${s})`,
      }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size, color: M_NAVY, lineHeight: 1.16, letterSpacing: -2 }}>
          {line1}
          {line2 && (
            <>
              <br />
              <span style={{ color: hi ? M_BLUE : M_NAVY, textShadow: hi ? '0 0 44px rgba(21,96,232,0.35)' : 'none' }}>{line2}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══ contador ════════════════════════════════════════════════════════════ */
export function useCount(target: number, startFrame: number, durFrames = 32): string {
  const frame = useCurrentFrame();
  const p = clamp01((frame - startFrame) / durFrames);
  const v = Math.round(target * (1 - Math.pow(1 - p, 3)));
  return v.toLocaleString('pt-BR');
}

/* ══ Cena de números padrão da série (10.000+ / 27 estados / pill) ═══════ */
export const MNumbers: React.FC<{
  t: number; range: Range;
  atFirstSec: number; atSecondSec: number; atPillSec?: number;
  pillText?: React.ReactNode;
}> = ({ t, range, atFirstSec, atSecondSec, atPillSec, pillText }) => {
  const frame = useCurrentFrame();
  const op = sceneOpacity(t, range);
  const f1 = Math.round(atFirstSec * FPS);
  const f2 = Math.round(atSecondSec * FPS);
  const medicos = useCount(10000, f1 + 2, 30);
  const estados = useCount(27, f2, 22);
  const o1 = interpolate(frame - f1, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const o2 = interpolate(frame - f2, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const oP = atPillSec ? interpolate(t, [atPillSec, atPillSec + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 520, textAlign: 'center', opacity: o1 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 150, color: M_NAVY, letterSpacing: -5, lineHeight: 1 }}>
          {medicos}<span style={{ color: M_BLUE }}>+</span>
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 33, color: M_MUT, marginTop: 4 }}>médicos e profissionais</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 850, textAlign: 'center', opacity: o2 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 150, color: M_NAVY, letterSpacing: -5, lineHeight: 1 }}>
          {estados}<span style={{ color: M_BLUE }}> estados</span>
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 33, color: M_MUT, marginTop: 4 }}>do Brasil inteiro</div>
      </div>
      {pillText && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1110, display: 'flex', justifyContent: 'center', opacity: oP }}>
          <div style={{
            background: M_BLUE, borderRadius: 999, padding: '16px 40px',
            boxShadow: '0 18px 50px -12px rgba(21,96,232,0.55)',
            fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: WHITE,
          }}>
            {pillText}
          </div>
        </div>
      )}
    </div>
  );
};

/* ══ Carta do consenso: 3 IAs lado a lado + concordam/divergem + refs ════ */
export const ConsensusCard: React.FC<{
  t: number; range: Range;
  atConcordamSec: number; atDivergemSec: number;
  atPubmedSec?: number; atSusSec?: number;
}> = ({ t, range, atConcordamSec, atDivergemSec, atPubmedSec, atSusSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, range);
  const base = Math.round(range[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 15, stiffness: 70 }, from: 0, to: 1 });
  const IAS = [['GPT', 'OpenAI'], ['Claude', 'Anthropic'], ['Gemini', 'Google']];
  const cOp = interpolate(t, [atConcordamSec, atConcordamSec + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dOp = interpolate(t, [atDivergemSec, atDivergemSec + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pOp = atPubmedSec ? interpolate(t, [atPubmedSec, atPubmedSec + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const sOp = atSusSec ? interpolate(t, [atSusSec, atSusSec + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: 70, right: 70, top: 480,
        transform: `translateY(${(1 - s) * 80}px)`, opacity: s,
        background: WHITE, borderRadius: 26, padding: '40px 44px',
        boxShadow: '0 40px 100px -28px rgba(14,27,51,0.4)',
      }}>
        <div style={{ fontFamily: BODY, fontSize: 20, color: M_MUT, letterSpacing: 4, textTransform: 'uppercase', textAlign: 'center' }}>
          consenso meduf
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 28 }}>
          {IAS.map(([n, org], i) => {
            const io = interpolate(frame - base - 6 - i * 5, [0, 9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const pulse = 0.5 + 0.5 * Math.sin((t - range[0]) * 4 + i * 2.1);
            return (
              <div key={n} style={{
                flex: 1, textAlign: 'center', opacity: io,
                background: M_BG, borderRadius: 18, padding: '22px 10px',
                border: `1.5px solid rgba(21,96,232,${0.15 + pulse * 0.25})`,
              }}>
                <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 32, color: M_NAVY }}>{n}</div>
                <div style={{ fontFamily: BODY, fontSize: 17, color: M_MUT, marginTop: 4 }}>{org}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 26, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span style={{
            opacity: cOp, fontFamily: HEAD, fontWeight: 800, fontSize: 25, color: M_GREEN,
            background: 'rgba(14,159,110,0.09)', border: '1.5px solid rgba(14,159,110,0.4)',
            borderRadius: 999, padding: '12px 26px',
          }}>✓ onde concordam</span>
          <span style={{
            opacity: dOp, fontFamily: HEAD, fontWeight: 800, fontSize: 25, color: '#b45309',
            background: 'rgba(180,83,9,0.08)', border: '1.5px solid rgba(180,83,9,0.4)',
            borderRadius: 999, padding: '12px 26px',
          }}>⚠ onde divergem</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1100, display: 'flex', gap: 14, justifyContent: 'center' }}>
        <span style={{
          opacity: pOp, fontFamily: HEAD, fontWeight: 800, fontSize: 24, color: WHITE,
          background: M_BLUE, borderRadius: 999, padding: '13px 30px',
          boxShadow: '0 14px 40px -10px rgba(21,96,232,0.5)',
        }}>PubMed · +35 milhões</span>
        <span style={{
          opacity: sOp, fontFamily: HEAD, fontWeight: 800, fontSize: 24, color: M_NAVY,
          background: WHITE, border: '1.5px solid rgba(14,27,51,0.12)', borderRadius: 999, padding: '13px 30px',
          boxShadow: '0 12px 34px -12px rgba(14,27,51,0.25)',
        }}>Protocolos do SUS</span>
      </div>
    </div>
  );
};

/* ══ End card MEDUF ══════════════════════════════════════════════════════ */
export const MEndCard: React.FC<{ startFrame: number }> = ({ startFrame }) => {
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
      <div style={{ position: 'absolute', inset: 0, background: M_BG, opacity: 0.97 }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 800px 640px at 50% 42%, rgba(21,96,232,0.14) 0%, transparent 65%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 44, padding: '0 70px',
      }}>
        <div style={{ opacity: logoOp, transform: `scale(${logoS})` }}>
          <MLogo size={116} row={false} />
        </div>
        <div style={{
          opacity: pillOp, transform: `scale(${pulse})`,
          background: M_BLUE, borderRadius: 999, padding: '20px 54px',
          boxShadow: '0 22px 60px -14px rgba(21,96,232,0.6)',
        }}>
          <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 38, color: WHITE }}>
            Testa grátis · 30 min · sem cartão
          </span>
        </div>
        <div style={{ opacity: urlOp, textAlign: 'center' }}>
          <span style={{
            fontFamily: MONO, fontWeight: 700, fontSize: 42, color: M_BLUE, letterSpacing: 0.5,
          }}>
            meduf.com.br
          </span>
        </div>
        <div style={{ opacity: statsOp, display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['17 ferramentas', 'consenso de 3 IAs', 'PubMed + SUS'].map(s2 => (
            <span key={s2} style={{
              fontFamily: BODY, fontWeight: 600, fontSize: 22, color: M_NAVY,
              background: WHITE, border: '1px solid rgba(14,27,51,0.12)',
              borderRadius: 999, padding: '10px 24px',
              boxShadow: '0 8px 24px -8px rgba(14,27,51,0.18)',
            }}>{s2}</span>
          ))}
        </div>
        <div style={{
          opacity: statsOp, fontFamily: BODY, fontSize: 17, color: M_MUT, marginTop: -14,
        }}>
          apoio à decisão clínica — não substitui o julgamento médico
        </div>
      </div>
    </div>
  );
};
