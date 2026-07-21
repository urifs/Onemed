import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, Logo, EndCard, FloatBadge, BadgeText, Narration } from './common';
import { PhoneFrame, TabletFrame, LaptopFrame } from './DeviceFrames';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, BODY, MONO, fade, clamp01, easeInOut } from './theme';
import timing from './timings/c04.json';

const T = timing as Timing;
const DELAY = 0.9;                         // narração entra logo após o celular subir
const FPS = 30;
export const C04_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

// beats (segundos absolutos na comp — timestamps reais do c04.json + DELAY)
const B_TABLET = DELAY + 2.56;             // "No tablet..."
const B_LAPTOP = DELAY + 5.131;            // "No notebook..."
const B_TRIO = DELAY + 7.44;               // "A plataforma da OneMed vai com você"
const B_530 = DELAY + 9.869;               // "+530 cursos completos"
const B_9000 = DELAY + 12.345;             // "9.000 livros"
const B_PLAYER = DELAY + 13.298;           // "player próprio"
const B_SYNC = DELAY + 16.964;             // "progresso sincronizado"
const B_UPDATE = DELAY + 21.595;           // "Sempre atualizado"
const B_END = DELAY + T.duration - 4.6;    // end card cobre o CTA falado

// ── geometria do trio (coordenadas do palco 1080x1920) ────────────────────
const SYNC_PATH = 'M 265 1043 C 330 850, 430 720, 540 690 C 670 725, 805 940, 865 1145';
const SYNC_NODES = [
  { cx: 540, cy: 690, ph: 0 },     // notebook
  { cx: 265, cy: 1043, ph: 1.4 },  // tablet
  { cx: 865, cy: 1145, ph: 2.8 },  // celular
];

/** micro-label do tríptico ("no ônibus" / "na biblioteca" / "em casa") */
const MicroLabel: React.FC<{ text: string; y: number; inS: number; outS: number }> = ({ text, y, inS, outS }) => {
  const frame = useCurrentFrame();
  const inF = inS * FPS;
  const outF = outS * FPS;
  if (frame < inF - 2 || frame > outF + 14) return null;
  const op = fade(frame, inF, inF + 11, outF, outF + 12);
  const rise = (1 - easeInOut(clamp01((frame - inF) / 11))) * 22;
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top: y,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
      opacity: op, transform: `translateY(${rise}px)`, pointerEvents: 'none',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: RED, boxShadow: `0 0 12px ${RED}` }} />
      <span style={{
        fontFamily: BODY, fontWeight: 600, fontSize: 32, color: W60,
        letterSpacing: 6, textTransform: 'uppercase',
      }}>{text}</span>
    </div>
  );
};

/** pill de progresso 52% que pulsa sobre cada device no beat de sincronização */
const ProgressPill: React.FC<{ x: number; y: number; w: number; delay: number }> = ({ x, y, w, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < delay - 4) return null;
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 95 } });
  const fill = s * 52;
  const pulse = 0.7 + 0.3 * Math.sin((frame - delay) * 0.17);
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w,
      opacity: s, transform: `scale(${0.8 + s * 0.2})`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(8,10,14,0.86)', border: '1.5px solid rgba(239,68,68,0.5)',
        borderRadius: 999, padding: '10px 15px',
        boxShadow: `0 0 ${18 * pulse}px rgba(239,68,68,${0.38 * pulse})`,
        backdropFilter: 'blur(6px)',
      }}>
        <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
          <div style={{ width: `${fill}%`, height: '100%', borderRadius: 999, background: RED, boxShadow: `0 0 10px ${RED}` }} />
        </div>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 19, color: WHITE }}>52%</span>
      </div>
    </div>
  );
};

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

export const C04_Telas: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // marca d'água / decor somem junto com o end card
  const uiOp = fade(frame, 6, 20, B_END * FPS, B_END * FPS + 14);

  // ── fase 1: celular sobe ("No celular, no ônibus") ──────────────────────
  const phoneIn = spring({ frame: frame - 2, fps, config: { damping: 15, stiffness: 60 } });
  const phoneY = interpolate(phoneIn, [0, 1], [1560, 260]);
  const phoneExit = easeInOut(clamp01((t - B_TABLET) / 0.55));
  const phoneFade = 1 - easeInOut(clamp01((t - B_TABLET - 0.15) / 0.4));
  const phoneSoloScale = 1 + easeInOut(clamp01((t - 0.4) / 3)) * 0.035;

  // ── fase 2: tablet entra da direita ("No tablet, na biblioteca") ────────
  const tabIn = spring({ frame: frame - Math.round(B_TABLET * FPS), fps, config: { damping: 15, stiffness: 62 } });
  const tabExit = easeInOut(clamp01((t - B_LAPTOP) / 0.55));
  const tabFade = 1 - easeInOut(clamp01((t - B_LAPTOP - 0.15) / 0.4));
  const tabSoloScale = 1 + easeInOut(clamp01((t - B_TABLET - 0.3) / 2.4)) * 0.03;

  // ── fase 3: notebook sobe ("No notebook, em casa") — vira fundo do trio ─
  const lapIn = spring({ frame: frame - Math.round(B_LAPTOP * FPS), fps, config: { damping: 15, stiffness: 58 } });
  const lapYIn = (1 - lapIn) * 760;
  const trioP = easeInOut(clamp01((t - B_TRIO) / 0.8));  // morph solo → trio
  const lapW = 900 - 20 * trioP;
  const lapX = 90 + 10 * trioP;
  const lapY = 560 - 130 * trioP;

  // ── fase 4: trio ("vai com você") — tablet e celular voltam em stagger ──
  const tab2In = spring({ frame: frame - Math.round((B_TRIO + 0.2) * FPS), fps, config: { damping: 14, stiffness: 80 } });
  const ph2In = spring({ frame: frame - Math.round((B_TRIO + 0.42) * FPS), fps, config: { damping: 14, stiffness: 80 } });

  // drift conjunto lento do trio
  const trioDrift = clamp01((t - B_TRIO - 1) / 2);
  const driftY = Math.sin((t - B_TRIO) * 0.55) * 8 * trioDrift;
  const driftS = 1 + easeInOut(clamp01((t - B_TRIO - 1) / 13)) * 0.035;

  // ── sincronização: linha desenha + pulso viajante ───────────────────────
  const drawP = easeInOut(clamp01((t - B_SYNC) / 0.9));
  const pulseOp = clamp01((t - (B_SYNC + 0.85)) / 0.4) * 0.9;
  const pulseOff = -(((t - B_SYNC) * 0.3) % 1);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg />

      {/* palco: devices + overlay de sync driftam juntos */}
      <div style={{
        position: 'absolute', inset: 0,
        transform: `translateY(${driftY}px) scale(${driftS})`,
        transformOrigin: '50% 44%',
      }}>
        {/* fase 1 — celular solo */}
        {t < B_TABLET + 0.8 && (
          <div style={{
            position: 'absolute', left: 270, top: phoneY,
            transform: `translateX(${-phoneExit * 1000}px) scale(${phoneSoloScale})`,
            transformOrigin: '50% 25%', opacity: phoneFade,
          }}>
            <PhoneFrame src="rec/m_dashboard.mp4" width={540} startFrom={90} />
          </div>
        )}

        {/* fase 2 — tablet solo */}
        {t >= B_TABLET && t < B_LAPTOP + 0.8 && (
          <Sequence from={Math.round(B_TABLET * FPS)} layout="none">
            <div style={{
              position: 'absolute', left: 190, top: 380,
              transform: `translateX(${(1 - tabIn) * 1020 - tabExit * 1080}px) scale(${tabSoloScale})`,
              transformOrigin: '50% 30%', opacity: tabFade,
            }}>
              <TabletFrame src="rec/t_dashboard.mp4" width={700} startFrom={0} />
            </div>
          </Sequence>
        )}

        {/* fase 3+ — notebook (solo → fundo do trio) */}
        {t >= B_LAPTOP && (
          <Sequence from={Math.round(B_LAPTOP * FPS)} layout="none">
            <div style={{
              position: 'absolute', left: lapX, top: lapY, width: lapW,
              transform: `translateY(${lapYIn}px)`,
            }}>
              <LaptopFrame src="rec/d_dashboard.mp4" width={lapW} startFrom={90} />
            </div>
          </Sequence>
        )}

        {/* fase 4 — tablet à esquerda na frente */}
        {t >= B_TRIO + 0.2 && (
          <Sequence from={Math.round((B_TRIO + 0.2) * FPS)} layout="none">
            <div style={{
              position: 'absolute', left: 55, top: 770,
              transform: `translateX(${-(1 - tab2In) * 820}px) rotate(-4deg)`,
              transformOrigin: '50% 50%',
            }}>
              <TabletFrame src="rec/t_course.mp4" width={420} startFrom={0} />
            </div>
          </Sequence>
        )}

        {/* fase 4 — celular à direita na frente (player próprio rodando) */}
        {t >= B_TRIO + 0.42 && (
          <Sequence from={Math.round((B_TRIO + 0.42) * FPS)} layout="none">
            <div style={{
              position: 'absolute', left: 700, top: 800,
              transform: `translateX(${(1 - ph2In) * 820}px) rotate(4deg)`,
              transformOrigin: '50% 50%',
            }}>
              <PhoneFrame src="rec/m_player.mp4" width={330} startFrom={0} />
            </div>
          </Sequence>
        )}

        {/* beat "progresso sincronizado": linha conectando os três devices */}
        {t >= B_SYNC && (
          <>
            <svg
              width={1080} height={1920} viewBox="0 0 1080 1920"
              style={{ position: 'absolute', left: 0, top: 0, opacity: uiOp, pointerEvents: 'none' }}
            >
              <path
                d={SYNC_PATH} pathLength={1}
                fill="none" stroke={RED} strokeWidth={4} strokeLinecap="round"
                strokeDasharray="1" strokeDashoffset={1 - drawP}
                style={{ filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.75))' }}
              />
              <path
                d={SYNC_PATH} pathLength={1}
                fill="none" stroke={WHITE} strokeWidth={5} strokeLinecap="round"
                strokeDasharray="0.06 0.94" strokeDashoffset={pulseOff}
                opacity={pulseOp}
                style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.8))' }}
              />
              {SYNC_NODES.map((n, i) => (
                <circle
                  key={i} cx={n.cx} cy={n.cy}
                  r={8 * (1 + 0.3 * Math.sin((t - B_SYNC) * 4 + n.ph))}
                  fill={RED} opacity={drawP}
                  style={{ filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.9))' }}
                />
              ))}
            </svg>
            <ProgressPill x={445} y={608} w={190} delay={Math.round((B_SYNC + 0.2) * FPS)} />
            <ProgressPill x={178} y={984} w={175} delay={Math.round((B_SYNC + 0.36) * FPS)} />
            <ProgressPill x={772} y={1088} w={175} delay={Math.round((B_SYNC + 0.52) * FPS)} />
          </>
        )}
      </div>

      {/* micro-labels do tríptico */}
      <MicroLabel text="no ônibus" y={1440} inS={DELAY + 1.062} outS={B_TABLET} />
      <MicroLabel text="na biblioteca" y={1360} inS={DELAY + 3.476} outS={B_LAPTOP} />
      <MicroLabel text="em casa" y={1230} inS={DELAY + 6.095} outS={B_TRIO} />

      {/* marca d'água + ECG decorativa */}
      <div style={{ position: 'absolute', left: 64, top: 84, opacity: uiOp * 0.92 }}>
        <Logo size={56} row />
      </div>
      <EcgLine y={1780} opacity={uiOp * 0.28} />

      {/* selos numéricos */}
      {t > B_530 && (
        <FloatBadge x={64} y={240} delay={Math.round(B_530 * FPS)} from="left" accent>
          <BadgeText top="+530 cursos" bottom="completos" />
        </FloatBadge>
      )}
      {t > B_9000 && (
        <FloatBadge x={620} y={188} delay={Math.round(B_9000 * FPS)} from="right">
          <BadgeText top="+9.000 livros" bottom="biblioteca médica" />
        </FloatBadge>
      )}
      {t > B_PLAYER && (
        <FloatBadge x={596} y={1332} delay={Math.round((B_PLAYER + 0.15) * FPS)} from="right" accent>
          <BadgeText top="Player próprio" bottom="nada externo" />
        </FloatBadge>
      )}
      {t > B_UPDATE && (
        <FloatBadge x={64} y={1352} delay={Math.round(B_UPDATE * FPS)} from="left" accent>
          <BadgeText top="Sempre atualizado" bottom="sem pagar a mais" />
        </FloatBadge>
      )}

      {/* legendas sincronizadas */}
      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={54} />

      {/* end card + narração */}
      <EndCard startFrame={Math.round(B_END * FPS)} />
      <Narration id="c04" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
