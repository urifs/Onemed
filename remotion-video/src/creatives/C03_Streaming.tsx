import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, Logo, EndCard, FloatBadge, BadgeText, Narration } from './common';
import { LaptopFrame } from './DeviceFrames';
import { CaptionTrack, Timing } from './Captions';
import { RED, fade, clamp01, easeInOut } from './theme';
import timing from './timings/c03.json';

const T = timing as Timing;
const DELAY = 1.6;                        // narração entra depois do laptop subir
const FPS = 30;
export const C03_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

// beats (segundos absolutos na comp — timestamps reais do c03.json + DELAY)
const B_HERO = DELAY + 3.114;             // "Destaques girando"
const B_SIDEBAR = DELAY + 4.364;          // "categorias organizadas"
const B_CONT = DELAY + 5.944;             // "continuar assistindo"
const B_WIDE = DELAY + 8.138;             // "Só que em vez de série" → zoom out
const B_530 = DELAY + 9.707;              // "+530 cursos"
const B_PLAT = DELAY + 11.35;             // "das maiores plataformas"
const B_SEARCH = DELAY + 13.8;            // crossfade p/ busca antes de "biblioteca"
const B_9000 = DELAY + 15.071;            // "+9.000 livros"
const B_UPDATE = DELAY + 17.04;           // "atualizado constantemente"
const B_END = DELAY + T.duration - 4.6;   // end card cobre o CTA falado

// ── laptop protagonista: geometria fixa no palco ──────────────────────────
const LAPTOP_W = 1660;
const LAPTOP_X = (1080 - LAPTOP_W) / 2;   // -290 (transborda as bordas)
const LAPTOP_Y = 240;

// ── rig de câmera: keyframes (foco fx/fy em px do palco; cy = altura onde
//    o foco pousa no canvas). tx/ty derivados: foco → (540, cy). ───────────
type CamKey = { t: number; s: number; fx: number; fy: number; cy: number };
const CAM: CamKey[] = [
  { t: 0, s: 1.0, fx: 555, fy: 720, cy: 720 },                  // vista geral
  { t: B_HERO, s: 1.05, fx: 550, fy: 708, cy: 712 },            // drift lento
  { t: B_HERO + 0.95, s: 1.55, fx: 473, fy: 560, cy: 520 },     // zoom no hero
  { t: B_SIDEBAR, s: 1.56, fx: 470, fy: 558, cy: 521 },         // micro-hold
  { t: B_SIDEBAR + 0.95, s: 1.58, fx: 65, fy: 690, cy: 640 },   // pan → sidebar
  { t: B_CONT, s: 1.6, fx: 60, fy: 692, cy: 642 },              // micro-hold
  { t: B_CONT + 1.0, s: 1.48, fx: 555, fy: 855, cy: 680 },      // pan → fileiras
  { t: B_WIDE, s: 1.5, fx: 555, fy: 862, cy: 678 },             // micro-hold
  { t: B_WIDE + 1.3, s: 1.0, fx: 555, fy: 720, cy: 720 },       // zoom out geral
  { t: B_SEARCH, s: 1.02, fx: 555, fy: 714, cy: 714 },          // respiração
  { t: B_UPDATE + 1.0, s: 1.12, fx: 555, fy: 640, cy: 660 },    // push na busca
  { t: DELAY + 23.0, s: 1.145, fx: 555, fy: 632, cy: 654 },     // segue lento
];

function camAt(t: number): { s: number; tx: number; ty: number } {
  const mk = (s: number, fx: number, fy: number, cy: number) =>
    ({ s, tx: 540 - s * fx, ty: cy - s * fy });
  const first = CAM[0];
  const last = CAM[CAM.length - 1];
  if (t <= first.t) return mk(first.s, first.fx, first.fy, first.cy);
  if (t >= last.t) return mk(last.s, last.fx, last.fy, last.cy);
  let i = 0;
  while (i < CAM.length - 2 && t >= CAM[i + 1].t) i++;
  const a = CAM[i];
  const b = CAM[i + 1];
  const p = easeInOut(clamp01((t - a.t) / Math.max(0.001, b.t - a.t)));
  return mk(
    a.s + (b.s - a.s) * p,
    a.fx + (b.fx - a.fx) * p,
    a.fy + (b.fy - a.fy) * p,
    a.cy + (b.cy - a.cy) * p,
  );
}

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

export const C03_Streaming: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ── laptop entra de baixo com spring ────────────────────────────────────
  const enter = spring({ frame, fps, config: { damping: 15, stiffness: 52 }, from: 0, to: 1 });
  const enterY = (1 - enter) * 560;
  const enterOp = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // ── câmera (scale + translate, easeInOut por trecho) ────────────────────
  const cam = camAt(t);

  // ── crossfade dashboard → busca ("biblioteca 9.000 livros") ─────────────
  const searchOp = interpolate(t, [B_SEARCH, B_SEARCH + 0.65], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // marca d'água / decor somem junto com o end card
  const uiOp = fade(frame, 6, 22, B_END * FPS, B_END * FPS + 14);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg />

      {/* palco com rig de câmera */}
      <div style={{
        position: 'absolute', inset: 0,
        transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s})`,
        transformOrigin: '0 0',
      }}>
        <div style={{
          position: 'absolute', left: LAPTOP_X, top: LAPTOP_Y, width: LAPTOP_W,
          transform: `translateY(${enterY}px)`,
          opacity: enterOp,
        }}>
          <div style={{ position: 'relative' }}>
            <LaptopFrame src="rec/d_dashboard.mp4" width={LAPTOP_W} startFrom={75} />
            {searchOp > 0 && (
              <div style={{ position: 'absolute', inset: 0, opacity: searchOp }}>
                <Sequence from={Math.round(B_SEARCH * FPS)} layout="none">
                  <LaptopFrame src="rec/d_search.mp4" width={LAPTOP_W} startFrom={80} />
                </Sequence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* marca d'água no topo esquerdo */}
      <div style={{ position: 'absolute', left: 64, top: 84, opacity: uiOp * 0.92 }}>
        <Logo size={56} row />
      </div>

      {/* ECG decorativa no rodapé */}
      <EcgLine y={1764} opacity={uiOp * 0.32} />

      {/* selos: números na vista geral */}
      {t > B_530 && (
        <>
          <FloatBadge x={64} y={1282} delay={Math.round(B_530 * FPS)} from="left" accent>
            <BadgeText top="+530 cursos" bottom="completos" />
          </FloatBadge>
          <FloatBadge x={470} y={1398} delay={Math.round(B_PLAT * FPS)} from="right">
            <BadgeText top="maiores plataformas" bottom="médicas do Brasil" />
          </FloatBadge>
        </>
      )}
      {t > B_9000 && (
        <FloatBadge x={624} y={150} delay={Math.round(B_9000 * FPS)} from="right">
          <BadgeText top="+9.000 livros" bottom="biblioteca médica" />
        </FloatBadge>
      )}
      {t > B_UPDATE && (
        <FloatBadge x={72} y={480} delay={Math.round(B_UPDATE * FPS + 4)} from="left" accent>
          <BadgeText top="Atualizações" bottom="sem custo extra" />
        </FloatBadge>
      )}

      {/* legendas sincronizadas (laptop ocupa a metade superior) */}
      <CaptionTrack timing={T} delaySec={DELAY} y={1620} size={56} />

      {/* end card + narração */}
      <EndCard startFrame={Math.round(B_END * FPS)} />
      <Narration id="c03" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
