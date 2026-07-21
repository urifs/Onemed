import React from 'react';
import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { AmbientBg, BadgeText, EndCard, FloatBadge, Logo, Narration } from './common';
import { LaptopFrame } from './DeviceFrames';
import { CaptionTrack, Timing } from './Captions';
import { BG, BODY, MONO, RED, W60, WHITE, clamp01, easeInOut, fade } from './theme';
import timing from './timings/c06.json';

const T = timing as Timing;
const DELAY = 1.1;                            // sting curto antes de "Olha esses detalhes"
const FPS = 30;
export const C06_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

// ── beats (segundos absolutos na comp = timestamp da palavra + DELAY) ──────
const B_P1 = DELAY + 2.083;                   // "Busca instantânea"
const B_P2 = DELAY + 3.988;                   // "Capa por capa..."
const B_P3 = DELAY + 7.321;                   // "Barra de progresso..."
const B_P4 = DELAY + 10.143;                  // "Player limpo..."
const B_LAPTOP = DELAY + 12.762;              // "É assim que deveria funcionar" — zoom out
const B_530 = DELAY + 16.31;                  // "+530 cursos"
const B_9000 = DELAY + 18.44;                 // "+9.000 livros"
const B_UPDATE = DELAY + 19.988;              // "atualizações constantes"
const B_END = DELAY + T.duration - 4.6;       // end card cobre o CTA falado

const LAPTOP_F = Math.round(B_LAPTOP * FPS);
const EXIT_F = 16;                            // frames de saída/crossfade de cada painel

// geometria dos painéis macro
const PANEL_X = 45;
const PANEL_Y = 165;
const PANEL_W = 990;
const PANEL_H = 1240;

// ── especificação dos 4 closes de UI ───────────────────────────────────────
interface PanelSpec {
  src: string;
  startFrom: number;                          // frame do vídeo-fonte @30fps
  from: 'left' | 'right';
  zoom: number;                               // escala macro base
  origin: string;                             // transformOrigin apontando pra região
  objectPosition: string;                     // recorte do cover dentro do painel
  tag: string;
  label: string;
  inSec: number;
  outSec: number;
}

const PANELS: PanelSpec[] = [
  {
    // barra de busca do desktop digitando "ecg" + grid reagindo abaixo
    src: 'rec/d_search.mp4', startFrom: 95, from: 'right',
    zoom: 1.3, origin: '78% 3%', objectPosition: '92% 0%',
    tag: '01', label: 'busca instantânea',
    inSec: B_P1, outSec: B_P2,
  },
  {
    // fileiras de capas passando no celular
    src: 'rec/m_dashboard.mp4', startFrom: 320, from: 'left',
    zoom: 1.9, origin: '50% 45%', objectPosition: '50% 45%',
    tag: '02', label: 'capa por capa',
    inSec: B_P2, outSec: B_P3,
  },
  {
    // lista de aulas com a barra vermelha de progresso (ECG Parte 1)
    src: 'rec/m_course.mp4', startFrom: 75, from: 'right',
    zoom: 1.55, origin: '35% 30%', objectPosition: '50% 18%',
    tag: '03', label: 'progresso salvo',
    inSec: B_P3, outSec: B_P4,
  },
  {
    // player desktop com a vídeo-aula tocando
    src: 'rec/d_course_player.mp4', startFrom: 200, from: 'left',
    zoom: 1.45, origin: '50% 45%', objectPosition: '50% 50%',
    tag: '04', label: 'player limpo',
    inSec: B_P4, outSec: B_LAPTOP,
  },
];

/** painel macro fullscreen: entra de lado com spring, drift interno, sai em crossfade */
const MacroPanel: React.FC<{ spec: PanelSpec; durF: number }> = ({ spec, durF }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dir = spec.from === 'right' ? 1 : -1;

  const s = spring({ frame: f, fps, config: { damping: 16, stiffness: 85 }, from: 0, to: 1 });
  const enterDx = dir * (1 - s) * 1180;
  const rot = dir * (1 - s) * 2.6;

  const exitP = easeInOut(clamp01((f - (durF - EXIT_F)) / (EXIT_F - 2)));
  const exitDx = -dir * exitP * 260;
  const op = 1 - exitP;

  // drift lento pra nunca ficar parado
  const driftZoom = spec.zoom * (1 + 0.055 * easeInOut(clamp01(f / durF)));

  const tagOp = fade(f, 7, 17, durF - EXIT_F, durF - 6);

  return (
    <div style={{
      position: 'absolute', left: PANEL_X, top: PANEL_Y, width: PANEL_W, height: PANEL_H,
      transform: `translateX(${enterDx + exitDx}px) rotate(${rot}deg)`,
      opacity: op,
      borderRadius: 40, overflow: 'hidden', background: BG,
      border: '1px solid rgba(255,255,255,0.10)',
      boxShadow: '0 60px 140px -40px rgba(0,0,0,0.9), 0 24px 60px -24px rgba(0,0,0,0.7)',
    }}>
      <OffthreadVideo
        src={staticFile(spec.src)}
        muted
        startFrom={spec.startFrom}
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: spec.objectPosition,
          transform: `scale(${driftZoom})`, transformOrigin: spec.origin,
        }}
      />
      {/* profundidade na base do painel */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, transparent 16%, transparent 68%, rgba(0,0,0,0.38) 100%)',
      }} />
      {/* etiqueta do detalhe */}
      <div style={{
        position: 'absolute', left: 30, top: 30,
        opacity: tagOp, transform: `translateY(${(1 - tagOp) * 14}px)`,
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'rgba(5,5,5,0.74)', border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 999, padding: '13px 26px', backdropFilter: 'blur(8px)',
      }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: RED, boxShadow: `0 0 12px ${RED}` }} />
        <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 21, color: W60, letterSpacing: 3 }}>
          DETALHE {spec.tag}
        </span>
        <span style={{ fontFamily: BODY, fontWeight: 700, fontSize: 25, color: WHITE, whiteSpace: 'nowrap' }}>
          {spec.label}
        </span>
      </div>
    </div>
  );
};

// ── ECG decorativo (onda realista, mesma matemática do OneMedMedical) ──────
function ecgY(t: number): number {
  const n = ((t % 1) + 1) % 1;
  if (n < 0.05) return 0;
  if (n < 0.15) return Math.sin((n - 0.05) / 0.10 * Math.PI) * 0.18;
  if (n < 0.18) return 0;
  if (n < 0.20) return -(n - 0.18) / 0.02 * 0.20;
  if (n < 0.22) return -0.20 + (n - 0.20) / 0.02 * 1.20;
  if (n < 0.24) return 1.00 - (n - 0.22) / 0.02 * 1.30;
  if (n < 0.26) return -0.30 + (n - 0.24) / 0.02 * 0.30;
  if (n < 0.37) return 0;
  if (n < 0.53) return Math.sin((n - 0.37) / 0.16 * Math.PI) * 0.36;
  return 0;
}

const ECGStrip: React.FC<{ y: number; opacity: number; amplitude?: number }> = ({ y, opacity, amplitude = 22 }) => {
  const frame = useCurrentFrame();
  const W = 1080, cycleW = 230, spd = 4.0;
  const off = (frame * spd) % cycleW;
  const d = Array.from({ length: Math.ceil(W / 3) + 2 }, (_, i) => {
    const x = i * 3;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y - ecgY((x + off) / cycleW) * amplitude}`;
  }).join(' ');
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity, overflow: 'hidden', pointerEvents: 'none' }}>
      <defs>
        <filter id="c06-ecg-glow">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="c06-ecg-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={RED} stopOpacity="0" />
          <stop offset="8%" stopColor={RED} stopOpacity="1" />
          <stop offset="92%" stopColor={RED} stopOpacity="1" />
          <stop offset="100%" stopColor={RED} stopOpacity="0" />
        </linearGradient>
        <mask id="c06-ecg-mask"><rect x="0" y="0" width="1080" height="1920" fill="url(#c06-ecg-fade)" /></mask>
      </defs>
      <path d={d} stroke={RED} strokeWidth="2.5" fill="none" filter="url(#c06-ecg-glow)" mask="url(#c06-ecg-mask)" />
    </svg>
  );
};

export const C06_Detalhes: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ── sting inicial: logo + risco vermelho ─────────────────────────────────
  const logoS = spring({ frame, fps, config: { damping: 13, stiffness: 100 }, from: 0.74, to: 1 });
  const logoOp = fade(frame, 2, 14, (B_P1 - 0.45) * FPS, B_P1 * FPS + 2);
  const lineW = interpolate(frame, [8, 26], [0, 300], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // ── beat 5: zoom out do close do player pra vista normal do laptop ───────
  const lapS = spring({ frame: frame - LAPTOP_F, fps, config: { damping: 16, stiffness: 70 }, from: 0, to: 1 });
  const lapScale = 1.3 - 0.3 * lapS;
  const lapY = (1 - lapS) * 64;
  const lapOp = interpolate(frame, [LAPTOP_F, LAPTOP_F + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const lapDrift = 1 + easeInOut(clamp01((t - B_LAPTOP) / 12)) * 0.04;

  // ECG entra com o laptop e sai antes do end card
  const ecgOp = fade(frame, (B_LAPTOP + 0.4) * FPS, (B_LAPTOP + 1.2) * FPS, B_END * FPS, (B_END + 0.4) * FPS) * 0.55;

  // legenda cresce na frase-tese
  const capSize = t >= B_LAPTOP - 0.05 && t < B_530 ? 62 : 56;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t > B_LAPTOP ? 1.2 : 0.9} />

      {/* sting do logo */}
      {t < B_P1 + 0.4 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 34,
          opacity: logoOp, transform: `scale(${logoS})`,
        }}>
          <Logo size={122} row={false} />
          <div style={{ width: lineW, height: 3, background: RED, borderRadius: 2, boxShadow: `0 0 18px ${RED}` }} />
          <div style={{ fontFamily: BODY, fontSize: 26, color: W60, letterSpacing: 6, textTransform: 'uppercase' }}>
            Feita nos detalhes
          </div>
        </div>
      )}

      {/* ── beats 1–4: painéis macro cortando nos timestamps das frases ── */}
      {PANELS.map(p => {
        const inF = Math.round(p.inSec * FPS);
        const durF = Math.round((p.outSec - p.inSec) * FPS) + EXIT_F;
        return (
          <Sequence key={p.tag} from={inF} durationInFrames={durF} layout="none">
            <MacroPanel spec={p} durF={durF} />
          </Sequence>
        );
      })}

      {/* ── beat 5: laptop em vista normal (continuidade do close do player) ── */}
      <Sequence from={LAPTOP_F} layout="none">
        <div style={{
          position: 'absolute', left: '50%', top: 600,
          transform: `translateX(-50%) translateY(${lapY}px) scale(${lapScale * lapDrift})`,
          transformOrigin: '50% 40%',
          opacity: lapOp,
        }}>
          {/* glow atrás do aparelho */}
          <div style={{
            position: 'absolute', left: '50%', top: '46%', width: 1080, height: 760,
            transform: 'translate(-50%, -50%)', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(239,68,68,0.20) 0%, transparent 65%)',
            filter: 'blur(30px)',
          }} />
          <LaptopFrame src="rec/d_course_player.mp4" width={920} startFrom={279} />
        </div>
      </Sequence>

      {/* linha de ECG sob o laptop */}
      {ecgOp > 0.002 && <ECGStrip y={1345} opacity={ecgOp} amplitude={22} />}

      {/* ── beat 6: números nos timestamps exatos ── */}
      {t > B_530 && (
        <>
          <FloatBadge x={36} y={500} delay={Math.round(B_530 * FPS)} from="left" accent>
            <BadgeText top="+530 cursos" bottom="completos" />
          </FloatBadge>
          <FloatBadge x={676} y={1020} delay={Math.round(B_9000 * FPS)} from="right">
            <BadgeText top="+9.000" bottom="livros médicos" />
          </FloatBadge>
        </>
      )}
      {t > B_UPDATE && (
        <FloatBadge x={296} y={1200} delay={Math.round(B_UPDATE * FPS)} from="right" accent>
          <BadgeText top="Atualizações constantes" bottom="sem custo nenhum" />
        </FloatBadge>
      )}

      {/* legendas sincronizadas (painéis terminam em y≈1405) */}
      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={capSize} />

      {/* end card + narração */}
      <EndCard startFrame={Math.round(B_END * FPS)} />
      <Narration id="c06" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
