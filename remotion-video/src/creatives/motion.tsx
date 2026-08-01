import React from 'react';
import { OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from 'remotion';
import { RED, clamp01, easeInOut } from './theme';

/**
 * Toolkit de motion v2 — técnicas da pesquisa de referências 2025/26:
 * zoom punch, Ken Burns dirigido, spotlight, whip pan, tilt 3D com glare,
 * squash de aterrissagem. Tudo frame-driven, zero CSS animation.
 */

// ── 1. Zoom punch no beat ─────────────────────────────────────────────────
// scale 1→peak em ~4 frames (ease-out), volta com spring em ~10.
export function useZoomPunch(beatFrames: number[], peak = 1.16): number {
  const frame = useCurrentFrame();
  let s = 1;
  for (const b of beatFrames) {
    const lf = frame - b;
    if (lf < 0 || lf > 22) continue;
    const up = interpolate(lf, [0, 4], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
    const down = interpolate(lf, [4, 20], [1, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.quad),
    });
    s = Math.max(s, 1 + (peak - 1) * Math.min(up, down));
  }
  return s;
}

// ── 2. Ken Burns dirigido (auto-pan/zoom estilo Screen Studio) ────────────
// keyframes de atenção {f, x, y, z}: x/y = ponto de interesse em fração
// (0..1) do vídeo-fonte; z = zoom. Interpola suave entre eles.
export interface AttentionKey { f: number; x: number; y: number; z: number }

export const KenBurnsVideo: React.FC<{
  src: string;
  keys: AttentionKey[];
  startFrom?: number;
  width: number;          // do container (px)
  height: number;
  style?: React.CSSProperties;
  playbackRate?: number;
}> = ({ src, keys, startFrom = 0, width, height, style, playbackRate }) => {
  const frame = useCurrentFrame();
  const sorted = [...keys].sort((a, b) => a.f - b.f);
  let a = sorted[0], b = sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (frame >= sorted[i].f && frame <= sorted[i + 1].f) { a = sorted[i]; b = sorted[i + 1]; break; }
  }
  const p = a === b ? 1 : easeInOut(clamp01((frame - a.f) / Math.max(1, b.f - a.f)));
  const x = a.x + (b.x - a.x) * p;
  const y = a.y + (b.y - a.y) * p;
  const z = a.z + (b.z - a.z) * p;

  return (
    <div style={{ width, height, overflow: 'hidden', position: 'relative', ...style }}>
      <OffthreadVideo
        src={staticFile(src)}
        muted
        startFrom={startFrom}
        playbackRate={playbackRate}
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          transform: `scale(${z})`,
          transformOrigin: `${x * 100}% ${y * 100}%`,
        }}
      />
    </div>
  );
};

// ── 3. Spotlight callout ──────────────────────────────────────────────────
// escurece tudo menos um círculo no ponto de interesse + anel que se desenha.
export const Spotlight: React.FC<{
  x: number; y: number;              // px no canvas 1080x1920 (ou do container pai)
  startFrame: number;
  duration?: number;
  radius?: number;
}> = ({ x, y, startFrame, duration = 60, radius = 150 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - startFrame;
  if (lf < 0 || lf > duration) return null;

  const rIn = spring({ frame: lf, fps, config: { damping: 14, stiffness: 120 }, from: 0, to: 1 });
  const fadeOut = interpolate(lf, [duration - 12, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const r = radius * rIn;
  const circ = 2 * Math.PI * (r + 14);
  const drawn = interpolate(lf, [2, 14], [circ, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeOut, pointerEvents: 'none', zIndex: 30 }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle ${r}px at ${x}px ${y}px, transparent 96%, rgba(0,0,0,0.55) 100%)`,
      }} />
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <circle cx={x} cy={y} r={r + 14} fill="none" stroke={RED} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={drawn}
          style={{ filter: `drop-shadow(0 0 10px ${RED})` }} />
      </svg>
    </div>
  );
};

// ── 4. Whip pan entre cenas ───────────────────────────────────────────────
// Envolve DUAS camadas; o corte fica escondido por blur direcional + skew.
// progress: use whipProgress(frame, cutFrame) → 0..1 (0.5 = momento do corte)
export function whipProgress(frame: number, cutFrame: number, span = 7): number {
  return clamp01((frame - (cutFrame - span / 2)) / span);
}

export const WhipPane: React.FC<{
  progress: number;         // 0..1
  side: 'out' | 'in';       // cena que sai / cena que entra
  children: React.ReactNode;
}> = ({ progress, side, children }) => {
  const p = side === 'out'
    ? interpolate(progress, [0, 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) })
    : interpolate(progress, [0.5, 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const dir = side === 'out' ? -1 : 1;
  const x = dir * p * 1180;
  const blur = Math.sin(Math.min(1, progress) * Math.PI) * 14;
  const visible = side === 'out' ? progress < 0.5 : progress >= 0.5;
  if (!visible && (side === 'out' ? progress >= 0.55 : progress <= 0.45)) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0,
      transform: `translateX(${x}px) skewX(${-dir * p * 3}deg)`,
      filter: blur > 0.5 ? `blur(${blur}px)` : undefined,
    }}>
      {children}
    </div>
  );
};

// ── 5. Tilt 3D com glare (entrada de mockup) ─────────────────────────────
export const TiltIn: React.FC<{
  startFrame: number;
  fromDeg?: number;         // rotateY inicial
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ startFrame, fromDeg = -16, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - startFrame;
  const s = spring({ frame: lf, fps, config: { damping: 13, stiffness: 70 }, from: 0, to: 1 });
  const rot = fromDeg * (1 - s);
  const op = interpolate(lf, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // glare desliza na diagonal enquanto o tilt assenta
  const glareX = interpolate(lf, [4, 26], [-140, 140], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ perspective: 1200, ...style }}>
      <div style={{
        transform: `rotateY(${rot}deg)`,
        transformStyle: 'preserve-3d',
        opacity: op,
        position: 'relative',
      }}>
        {children}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 'inherit', overflow: 'hidden',
          pointerEvents: 'none', zIndex: 40,
        }}>
          <div style={{
            position: 'absolute', top: '-20%', bottom: '-20%',
            left: `${glareX}%`, width: '55%',
            background: 'linear-gradient(105deg, transparent, rgba(255,255,255,0.16), transparent)',
            transform: 'rotate(8deg)',
          }} />
        </div>
      </div>
    </div>
  );
};

// ── 6. Squash de aterrissagem ─────────────────────────────────────────────
export function useSquash(landFrame: number): string {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - landFrame;
  if (lf < 0) return 'scale(1,1)';
  const s = spring({ frame: lf, fps, config: { damping: 11, stiffness: 180 }, from: 0, to: 1 });
  const sy = 1 - 0.07 * Math.sin(Math.min(1, s) * Math.PI);
  const sx = 1 + 0.045 * Math.sin(Math.min(1, s) * Math.PI);
  return `scale(${sx},${sy})`;
}

// ── 7. Cursor/tap falso animado (proxy de "test drive") ──────────────────
export const TapDot: React.FC<{
  x: number; y: number; frameAt: number;
}> = ({ x, y, frameAt }) => {
  const frame = useCurrentFrame();
  const lf = frame - frameAt;
  if (lf < 0 || lf > 18) return null;
  const ringR = interpolate(lf, [0, 16], [16, 58], { extrapolateRight: 'clamp' });
  const ringOp = interpolate(lf, [0, 16], [0.65, 0], { extrapolateRight: 'clamp' });
  const dotOp = interpolate(lf, [0, 3, 10, 16], [0, 0.9, 0.9, 0], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none', zIndex: 45 }}>
      <div style={{
        position: 'absolute', width: 30, height: 30, borderRadius: '50%',
        left: -15, top: -15, background: 'rgba(255,255,255,0.85)', opacity: dotOp,
        boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
      }} />
      <div style={{
        position: 'absolute', width: ringR * 2, height: ringR * 2, borderRadius: '50%',
        left: -ringR, top: -ringR, border: '3px solid rgba(255,255,255,0.9)', opacity: ringOp,
      }} />
    </div>
  );
};
