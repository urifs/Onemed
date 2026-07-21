import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, Logo, EndCard, FloatBadge, BadgeText, Narration } from './common';
import { LaptopFrame } from './DeviceFrames';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W40, HEAD, MONO, GREEN, fade, clamp01, easeInOut } from './theme';
import timing from './timings/c10.json';

const T = timing as Timing;
const DELAY = 0.6;                         // anos "envelhecendo" abrem o vídeo
const FPS = 30;
export const C10_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

// beats (segundos absolutos na comp — timestamps reais do c10.json + DELAY)
const B_LAPTOP = DELAY + 3.083;            // "Por isso a plataforma..." → laptop sobe
const B_PILLS = DELAY + 5.143;             // "atualização constante" → tag + chuva de pills
const B_530 = DELAY + 12.464;              // "+530 cursos completos"
const B_9000 = DELAY + 14.774;             // "e 9.000 livros"
const B_PLAYER = DELAY + 17.4;             // "plataforma própria, com player e busca"
const B_TOMORROW = DELAY + 19.988;         // "Amanhã? Ainda mais." → zoom + pulso
const B_END = DELAY + T.duration - 4.6;    // end card cobre o CTA falado

// ── laptop protagonista ───────────────────────────────────────────────────
const LAPTOP_W = 1500;
const LAPTOP_X = (1080 - LAPTOP_W) / 2;    // -210 (transborda as bordas)
const LAPTOP_Y = 300;

// ── anos que envelhecem (intro) ───────────────────────────────────────────
const OLD_YEARS: { label: string; t0: number; t1: number }[] = [
  { label: '2019', t0: 0.12, t1: 0.86 },
  { label: '2021', t0: 0.74, t1: 1.5 },
  { label: '2023', t0: 1.38, t1: 2.1 },
];
const Y2025_IN = 2.02;

/** ano antigo: surge em MONO cinza e é riscado em vermelho ao apagar */
const OldYear: React.FC<{ label: string; t0: number; t1: number }> = ({ label, t0, t1 }) => {
  const frame = useCurrentFrame();
  const f0 = t0 * FPS;
  const f1 = t1 * FPS;
  const op = fade(frame, f0, f0 + 7, f1 - 7, f1);
  if (op <= 0) return null;
  const grow = clamp01((frame - f0) / 10);
  const rise = -34 * easeInOut(clamp01((frame - f0) / (f1 - f0)));
  const strikeW = interpolate(frame, [f1 - 12, f1 - 3], [0, 108], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top: 760, textAlign: 'center',
      opacity: op, transform: `translateY(${rise}px) scale(${0.92 + grow * 0.08})`,
    }}>
      <span style={{ position: 'relative', fontFamily: MONO, fontWeight: 700, fontSize: 128, color: W40, letterSpacing: 4 }}>
        {label}
        <span style={{
          position: 'absolute', left: '50%', top: '52%', transform: 'translate(-50%, -50%) rotate(-4deg)',
          width: `${strikeW}%`, height: 7, background: RED, borderRadius: 4,
          boxShadow: '0 0 16px rgba(239,68,68,0.7)',
        }} />
      </span>
    </div>
  );
};

/** pill vermelha que entra pela direita e fica orbitando com deriva senoidal */
const RainPill: React.FC<{
  label: string; x: number; y: number; delaySec: number;
  out: number; accent?: boolean; centered?: boolean;
}> = ({ label, x, y, delaySec, out, accent, centered }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - delaySec * FPS;
  if (lf < 0 || out <= 0) return null;
  const s = spring({ frame: lf, fps, config: { damping: 14, stiffness: 95 }, from: 0, to: 1 });
  const dx = (1 - s) * 340 + Math.sin(lf * 0.05 + x * 0.13) * 7;
  const dy = Math.cos(lf * 0.041 + y * 0.11) * 8;
  const base = `translate(${dx}px, ${dy}px) scale(${0.8 + s * 0.2})`;
  return (
    <div style={{
      position: 'absolute', top: y,
      ...(centered ? { left: '50%' } : { left: x }),
      transform: centered ? `translateX(-50%) ${base}` : base,
      opacity: s * out,
      background: accent ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.11)',
      border: accent ? '2px solid rgba(239,68,68,0.7)' : '1.5px solid rgba(239,68,68,0.42)',
      borderRadius: 999, padding: accent ? '18px 42px' : '13px 30px',
      boxShadow: accent
        ? '0 0 46px rgba(239,68,68,0.35), 0 18px 44px -14px rgba(0,0,0,0.7)'
        : '0 14px 38px -12px rgba(0,0,0,0.65)',
      backdropFilter: 'blur(8px)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        fontFamily: HEAD, fontWeight: 800, fontSize: accent ? 38 : 28,
        color: WHITE, letterSpacing: 0.4,
      }}>
        {accent ? label : <><span style={{ color: RED }}>+</span> {label}</>}
      </span>
    </div>
  );
};

const PILLS: { label: string; x: number; y: number; d: number }[] = [
  { label: 'cursos novos', x: 578, y: 1252, d: DELAY + 6.583 },
  { label: 'livros novos', x: 118, y: 1252, d: DELAY + 7.679 },
  { label: 'provas recentes', x: 548, y: 1368, d: DELAY + 8.25 },
  { label: 'resumos', x: 168, y: 1368, d: DELAY + 8.55 },
];

/** linha de ECG decorativa correndo no rodapé */
const EcgLine: React.FC<{ y: number; opacity: number }> = ({ y, opacity }) => {
  const frame = useCurrentFrame();
  const dash = 1540 - ((frame * 9) % 1540);
  return (
    <svg
      width={1080} height={90} viewBox="0 0 1080 90"
      style={{ position: 'absolute', left: 0, top: y, opacity }}
    >
      <path
        d="M0 45 H130 l12 -20 l14 46 l12 -26 H490 l12 -20 l14 46 l12 -26 H850 l12 -20 l14 46 l12 -26 H1080"
        fill="none" stroke={RED} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="250 1290" strokeDashoffset={dash}
        style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.6))' }}
      />
    </svg>
  );
};

export const C10_Atualizado: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ── intro: "2025" fica, em branco com glow ──────────────────────────────
  const y25s = spring({ frame: frame - Y2025_IN * FPS, fps, config: { damping: 12, stiffness: 110 }, from: 0.7, to: 1 });
  const y25op = fade(frame, Y2025_IN * FPS, Y2025_IN * FPS + 8, B_LAPTOP * FPS + 2, B_LAPTOP * FPS + 16);
  const y25glow = 0.55 + 0.45 * (Math.sin((t - Y2025_IN) * 3.2) * 0.5 + 0.5);

  // ── laptop sobe com spring ──────────────────────────────────────────────
  const enter = spring({ frame: frame - B_LAPTOP * FPS, fps, config: { damping: 15, stiffness: 55 }, from: 0, to: 1 });
  const enterY = (1 - enter) * 1700;
  const enterOp = interpolate(frame, [B_LAPTOP * FPS, B_LAPTOP * FPS + 10], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // drift lento + zoom sutil no "Amanhã? Ainda mais."
  const driftS = 1 + 0.045 * easeInOut(clamp01((t - B_LAPTOP) / 18));
  const zoomS = 0.07 * easeInOut(clamp01((t - B_TOMORROW) / 1.6));
  const lapScale = driftS + zoomS;

  // pulso de glow no beat "Amanhã"
  const gate = clamp01((t - B_TOMORROW) / 0.5);
  const pulse = gate * (0.5 + 0.5 * Math.sin((t - B_TOMORROW) * 6));

  // ── crossfade dashboard → player tocando aula ───────────────────────────
  const playerOp = interpolate(t, [B_PLAYER, B_PLAYER + 0.6], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // pills saem antes dos selos numéricos entrarem
  const pillsOut = interpolate(t, [B_530 - 0.75, B_530 - 0.15], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // decorativos somem junto com o end card
  const uiOp = fade(frame, 6, 22, B_END * FPS, B_END * FPS + 14);

  // legendas destacadas no "Amanhã? Ainda mais."
  const bigCaps = t >= DELAY + 19.988 && t < DELAY + 23.012;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={1 + pulse * 0.6} />

      {/* intro: anos envelhecendo */}
      {t < B_LAPTOP + 0.9 && (
        <>
          {OLD_YEARS.map(y => <OldYear key={y.label} {...y} />)}
          {frame >= Y2025_IN * FPS && (
            <div style={{
              position: 'absolute', left: 0, right: 0, top: 742, textAlign: 'center',
              opacity: y25op, transform: `scale(${y25s})`,
            }}>
              <div style={{
                fontFamily: MONO, fontWeight: 700, fontSize: 168, color: WHITE, letterSpacing: 4,
                textShadow: `0 0 ${28 + y25glow * 34}px rgba(239,68,68,${0.5 + y25glow * 0.4}), 0 0 90px rgba(239,68,68,0.35)`,
              }}>
                2025
              </div>
              <div style={{
                marginTop: 18, fontFamily: HEAD, fontWeight: 700, fontSize: 27,
                color: RED, letterSpacing: 9, textTransform: 'uppercase',
              }}>
                sempre atual
              </div>
            </div>
          )}
        </>
      )}

      {/* glow pulsante atrás do laptop (beat "Amanhã") */}
      <div style={{
        position: 'absolute', left: LAPTOP_X, top: LAPTOP_Y - 60, width: LAPTOP_W, height: 980,
        background: 'radial-gradient(ellipse 60% 55% at 50% 45%, rgba(239,68,68,0.55) 0%, transparent 70%)',
        filter: 'blur(56px)', opacity: pulse * 0.65,
      }} />

      {/* laptop central-alto com a plataforma */}
      <div style={{
        position: 'absolute', left: LAPTOP_X, top: LAPTOP_Y, width: LAPTOP_W,
        transform: `translateY(${enterY}px) scale(${lapScale})`,
        transformOrigin: '50% 30%',
        opacity: enterOp,
      }}>
        <div style={{ position: 'relative' }}>
          <LaptopFrame src="rec/d_dashboard.mp4" width={LAPTOP_W} startFrom={75} />
          {playerOp > 0 && (
            <div style={{ position: 'absolute', inset: 0, opacity: playerOp }}>
              <Sequence from={Math.round(B_PLAYER * FPS)} layout="none">
                <LaptopFrame src="rec/d_course_player.mp4" width={LAPTOP_W} startFrom={165} />
              </Sequence>
            </div>
          )}
        </div>
      </div>

      {/* marca d'água + tag de changelog */}
      <div style={{ position: 'absolute', left: 64, top: 84, opacity: uiOp * 0.92 }}>
        <Logo size={56} row />
      </div>
      {t > B_PILLS && (
        <FloatBadge x={638} y={92} delay={Math.round(B_PILLS * FPS)} from="right">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{
              width: 14, height: 14, borderRadius: '50%', background: GREEN,
              boxShadow: `0 0 ${10 + 8 * (Math.sin(t * 5) * 0.5 + 0.5)}px ${GREEN}`,
            }} />
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: WHITE, letterSpacing: 1 }}>
              atualizado hoje
            </span>
          </div>
        </FloatBadge>
      )}

      {/* chuva organizada de pills de atualização */}
      {PILLS.map(p => (
        <RainPill key={p.label} label={p.label} x={p.x} y={p.y} delaySec={p.d} out={pillsOut} />
      ))}
      <RainPill label="sem custo extra" x={0} y={1462} delaySec={DELAY + 8.821} out={pillsOut} accent centered />

      {/* selos numéricos (entram depois das pills saírem) */}
      {t > B_530 && (
        <FloatBadge x={80} y={1268} delay={Math.round(B_530 * FPS)} from="left" accent>
          <BadgeText top="+530 cursos" bottom="completos" />
        </FloatBadge>
      )}
      {t > B_9000 && (
        <FloatBadge x={588} y={1396} delay={Math.round(B_9000 * FPS)} from="right">
          <BadgeText top="+9.000 livros" bottom="biblioteca médica" />
        </FloatBadge>
      )}

      {/* ECG decorativa no rodapé */}
      <EcgLine y={1772} opacity={uiOp * 0.3} />

      {/* legendas sincronizadas (laptop ocupa o alto do quadro) */}
      <CaptionTrack timing={T} delaySec={DELAY} y={1620} size={bigCaps ? 68 : 56} />

      {/* end card + narração */}
      <EndCard startFrame={Math.round(B_END * FPS)} />
      <Narration id="c10" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
