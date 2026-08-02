import React from 'react';
import { Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { FloatBadge, BadgeText, useCountUp } from './common';
import { PhoneFrame, LaptopFrame, TabletFrame } from './DeviceFrames';
import { RED, WHITE, W60, HEAD, clamp01, easeInOut } from './theme';

/**
 * Kit das composições de HISTÓRIA (fórmula C15): cenas com crossfade de
 * 0.45s, devices em spring macio, heros tipográficos e cena de números.
 */
export const FPS = 30;
export const XF = 0.45;

export type Range = readonly [number, number];

export function sceneOpacity(t: number, [a, b]: Range, first = false): number {
  const fi = first ? 1 : clamp01((t - a) / XF);
  const fo = clamp01((b - t) / XF);
  return Math.min(fi, fo);
}

// Sequence zera o clock local — OffthreadVideo toca do startFrom quando a
// cena entra (sem isso o vídeo corre no clock global e congela no fim).
export const ClipAt: React.FC<{ fromSec: number; children: React.ReactNode }> = ({ fromSec, children }) => (
  <Sequence from={Math.max(0, Math.round(fromSec * FPS))} layout="none">
    {children}
  </Sequence>
);

export function useRise(startSec: number, dist = 120) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - Math.round(startSec * FPS);
  const s = spring({ frame: lf, fps, config: { damping: 16, stiffness: 60 }, from: 0, to: 1 });
  const op = interpolate(lf, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return { y: dist * (1 - s), op };
}

/** cena padrão: celular central com um take + badge accent opcional */
export const DemoPhone: React.FC<{
  t: number; range: Range;
  src: string; startFrom: number; width?: number;
  badgeTop?: string; badgeBottom?: string; badgeX?: number; badgeFrom?: 'left' | 'right';
  children?: React.ReactNode;
}> = ({ t, range, src, startFrom, width = 600, badgeTop, badgeBottom, badgeX = 56, badgeFrom = 'left', children }) => {
  const op = sceneOpacity(t, range);
  const rise = useRise(range[0], 95);
  const breath = 1 + easeInOut(clamp01((t - range[0]) / 4.5)) * 0.04;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: '50%', top: 165,
        transform: `translateX(-50%) translateY(${rise.y}px) scale(${breath})`,
        transformOrigin: '50% 20%',
        opacity: rise.op,
      }}>
        <ClipAt fromSec={range[0]}>
          <PhoneFrame src={src} width={width} startFrom={startFrom} />
        </ClipAt>
      </div>
      {badgeTop && (
        <FloatBadge x={badgeX} y={330} delay={Math.round((range[0] + 0.45) * FPS)} from={badgeFrom} accent>
          <BadgeText top={badgeTop} bottom={badgeBottom || ''} />
        </FloatBadge>
      )}
      {children}
    </div>
  );
};

/** hero tipográfico central de 1-2 linhas (linha 2 em vermelho) */
export const HeroLine: React.FC<{
  t: number; range: Range;
  line1: string; line2?: string;
  size?: number; top?: number;
  redAfterSec?: number;
}> = ({ t, range, line1, line2, size = 80, top = 700, redAfterSec = 1.1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, range);
  const base = Math.round(range[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 14, stiffness: 80 }, from: 0.86, to: 1 });
  const o = interpolate(frame - base, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hi = t - range[0] > redAfterSec;
  const pulse = 1 + Math.sin((t - range[0]) * 4) * 0.012;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: 50, right: 50, top, textAlign: 'center',
        opacity: o, transform: `scale(${s * pulse})`,
      }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size, color: WHITE, lineHeight: 1.16, letterSpacing: -2 }}>
          {line1}
          {line2 && (
            <>
              <br />
              <span style={{
                color: hi ? RED : WHITE,
                textShadow: hi ? '0 0 44px rgba(239,68,68,0.5)' : 'none',
              }}>{line2}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/** cena de números 530+/9.000+ com pill final */
export const NumbersScene: React.FC<{
  t: number; range: Range;
  atFirstSec: number; atSecondSec: number; atPillSec?: number;
  pillText?: React.ReactNode;
}> = ({ t, range, atFirstSec, atSecondSec, atPillSec, pillText }) => {
  const frame = useCurrentFrame();
  const op = sceneOpacity(t, range);
  const f1 = Math.round(atFirstSec * FPS);
  const f2 = Math.round(atSecondSec * FPS);
  const cursos = useCountUp(530, f1 + 2, 30);
  const livros = useCountUp(9000, f2, 34);
  const o1 = interpolate(frame - f1, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const o2 = interpolate(frame - f2, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const oP = atPillSec ? interpolate(frame - Math.round(atPillSec * FPS), [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 520, textAlign: 'center', opacity: o1 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 150, color: WHITE, letterSpacing: -5, lineHeight: 1 }}>
          {cursos}<span style={{ color: RED }}>+</span>
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 33, color: W60, marginTop: 2 }}>cursos completos</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 840, textAlign: 'center', opacity: o2 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 150, color: WHITE, letterSpacing: -5, lineHeight: 1 }}>
          {livros}<span style={{ color: RED }}>+</span>
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 33, color: W60, marginTop: 2 }}>livros médicos</div>
      </div>
      {pillText && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1120, display: 'flex', justifyContent: 'center', opacity: oP }}>
          <div style={{
            background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.4)',
            borderRadius: 999, padding: '14px 38px',
            fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 24, color: WHITE,
          }}>
            {pillText}
          </div>
        </div>
      )}
    </div>
  );
};

/** trio celular + notebook + tablet (assinatura C04/C15) */
export const TrioDevices: React.FC<{
  t: number; range: Range;
  badgeTop?: string; badgeBottom?: string;
}> = ({ t, range, badgeTop = 'Progresso sincronizado', badgeBottom = 'celular · notebook · tablet' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, range);
  const base = Math.round(range[0] * FPS);
  const enter = (delayF: number, dist: number) => {
    const s = spring({ frame: frame - base - delayF, fps, config: { damping: 16, stiffness: 58 }, from: 0, to: 1 });
    return { y: dist * (1 - s), op: interpolate(frame - base - delayF, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) };
  };
  const lap = enter(0, 120);
  const tab = enter(6, 150);
  const pho = enter(12, 170);
  const drift = 1 + easeInOut(clamp01((t - range[0]) / 4.5)) * 0.035;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${drift})`, transformOrigin: '50% 45%' }}>
        <div style={{ position: 'absolute', left: '50%', top: 330, transform: `translateX(-50%) translateY(${lap.y}px)`, opacity: lap.op }}>
          <ClipAt fromSec={range[0]}>
            <LaptopFrame src="rec/nd_community.mp4" width={940} startFrom={95} />
          </ClipAt>
        </div>
        <div style={{ position: 'absolute', left: 60, top: 620, transform: `translateY(${tab.y}px) rotate(-4deg)`, opacity: tab.op }}>
          <ClipAt fromSec={range[0] + 0.2}>
            <TabletFrame src="rec/t_dashboard.mp4" width={400} startFrom={30} />
          </ClipAt>
        </div>
        <div style={{ position: 'absolute', right: 70, top: 660, transform: `translateY(${pho.y}px) rotate(4deg)`, opacity: pho.op }}>
          <ClipAt fromSec={range[0] + 0.4}>
            <PhoneFrame src="rec/m_dashboard.mp4" width={310} startFrom={215} />
          </ClipAt>
        </div>
      </div>
      <FloatBadge x={330} y={260} delay={base + 18} from="right" accent>
        <BadgeText top={badgeTop} bottom={badgeBottom} />
      </FloatBadge>
    </div>
  );
};

/** tríade "baixou/favoritou/concluiu" com swaps suaves */
export interface Swap { src: string; startFrom: number; from: number }
export const SwapPhone: React.FC<{
  t: number; range: Range; swaps: Swap[];
  children?: React.ReactNode;
}> = ({ t, range, swaps, children }) => {
  const op = sceneOpacity(t, range);
  const rise = useRise(range[0], 80);
  if (op <= 0) return null;
  const XFC = 0.38;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: '50%', top: 165,
        transform: `translateX(-50%) translateY(${rise.y}px)`,
        opacity: rise.op,
      }}>
        <div style={{ position: 'relative' }}>
          {swaps.map((sw, i) => {
            const next = swaps[i + 1];
            const fi = i === 0 ? 1 : clamp01((t - sw.from) / XFC);
            const fo = next ? clamp01(1 - (t - next.from) / XFC) : 1;
            const swOp = Math.min(fi, fo);
            if (swOp <= 0) return null;
            return (
              <div key={i} style={{ position: i === 0 ? 'relative' : 'absolute', inset: 0, opacity: swOp }}>
                <ClipAt fromSec={sw.from - 0.4}>
                  <PhoneFrame src={sw.src} width={600} startFrom={sw.startFrom} />
                </ClipAt>
              </div>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
};
