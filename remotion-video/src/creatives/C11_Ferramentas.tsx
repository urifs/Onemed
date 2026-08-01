import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText, Narration, useCountUp } from './common';
import { LaptopFrame } from './DeviceFrames';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W80, HEAD, BODY, MONO, GREEN, clamp01, easeInOut } from './theme';
import {
  useZoomPunch, KenBurnsVideo, AttentionKey, Spotlight,
  whipProgress, WhipPane, TiltIn, useSquash, TapDot,
} from './motion';
import timing from './timings/c11.json';

const T = timing as Timing;
const FPS = 30;
const DELAY = 0.4;                          // frame 0 já dentro do app, narração entra quase junto
export const C11_DURATION = Math.round((DELAY + T.duration + 2.4) * FPS);

/** timestamp de palavra do áudio → frame absoluto da comp */
const F = (audioSec: number) => Math.round((DELAY + audioSec) * FPS);

// ── beats de zoom punch (timestamps reais do c11.json) ────────────────────
const P_PDF = F(1.157);       // "PDF"
const P_DENTRO = F(1.951);    // "dentro"
const P_MARCA = F(2.7);       // "Marca-texto"
const P_CANETA = F(3.623);    // "caneta"
const P_SALVO = F(5.06);      // "salvo"
const P_SINC = F(5.726);      // "sincronizado"
const P_CONCL = F(9.93);      // "concluída"
const P_ANOT = F(13.528);     // "anotações"
const P_PASTA = F(16.227);    // "pasta"
const P_ORDEM = F(17.746);    // "ordem"
const P_FLASH = F(19.919);    // "flashcards"

// ── cortes entre blocos (whip pan / crossfade alternados) ────────────────
const C1 = 249;               // whip: PDF anotado → checks de concluída ("Terminou a aula?")
const XF2_A = 342;            // crossfade: checks → aba de anotações ("Quer revisar depois?")
const XF2_B = 354;
const C3 = 453;               // whip: anotações → mapa do curso no laptop
const C4 = 582;               // whip: laptop → banner de flashcards ("E vem mais aí")
const XF5_A = 615;            // crossfade: banner → cena motion dos cartões
const XF5_B = 627;
const C6 = 717;               // whip: cartões → contador +530
const B_END = Math.round((DELAY + T.duration - 4.2) * FPS); // end card cobre o CTA falado

// ── Ken Burns dirigido (frames LOCAIS de cada Sequence) ───────────────────
const K_S1A: AttentionKey[] = [           // grifo amarelo surgindo ao vivo
  { f: 0, x: 0.5, y: 0.4, z: 1.1 },
  { f: 26, x: 0.5, y: 0.44, z: 1.16 },
  { f: 60, x: 0.5, y: 0.46, z: 1.14 },
  { f: 90, x: 0.5, y: 0.42, z: 1.12 },
];
const K_S1B: AttentionKey[] = [           // toolbar de anotação no topo
  { f: 0, x: 0.5, y: 0.18, z: 1.15 },
  { f: 28, x: 0.5, y: 0.2, z: 1.12 },
  { f: 54, x: 0.5, y: 0.34, z: 1.1 },
];
const K_S1C: AttentionKey[] = [           // "salvando→salvo" → caneta circulando item
  { f: 0, x: 0.55, y: 0.2, z: 1.16 },
  { f: 45, x: 0.5, y: 0.3, z: 1.1 },
  { f: 75, x: 0.5, y: 0.48, z: 1.15 },
  { f: 112, x: 0.5, y: 0.48, z: 1.17 },
];
const K_S2: AttentionKey[] = [            // lista de aulas: checks verdes + estrela
  { f: 0, x: 0.5, y: 0.34, z: 1.08 },
  { f: 30, x: 0.6, y: 0.36, z: 1.14 },
  { f: 62, x: 0.6, y: 0.42, z: 1.12 },
  { f: 111, x: 0.5, y: 0.38, z: 1.08 },
];
const K_S3: AttentionKey[] = [            // aba "Minhas anotações" + toque no Fluxograma
  { f: 0, x: 0.5, y: 0.32, z: 1.08 },
  { f: 45, x: 0.5, y: 0.4, z: 1.13 },
  { f: 80, x: 0.5, y: 0.44, z: 1.12 },
  { f: 117, x: 0.5, y: 0.4, z: 1.15 },
];
const K_S5: AttentionKey[] = [            // banner "flashcards a caminho" no topo do dashboard
  { f: 0, x: 0.5, y: 0.28, z: 1.06 },
  { f: 22, x: 0.5, y: 0.22, z: 1.22 },
  { f: 52, x: 0.5, y: 0.24, z: 1.2 },
];

// ── cena motion pura: flashcards 3D "EM BREVE" ────────────────────────────
const CardFace: React.FC<{ label: string; children: React.ReactNode; back?: boolean }> = ({ label, children, back }) => (
  <div style={{
    position: 'absolute', inset: 0, borderRadius: 30, overflow: 'hidden',
    background: '#ffffff', backfaceVisibility: 'hidden',
    transform: back ? 'rotateY(180deg)' : undefined,
    boxShadow: '0 44px 96px -30px rgba(0,0,0,0.85)',
    display: 'flex', flexDirection: 'column',
  }}>
    <div style={{
      height: 86, background: 'linear-gradient(90deg,#ef4444,#c62828)',
      display: 'flex', alignItems: 'center', padding: '0 36px', gap: 16,
    }}>
      <span style={{ fontSize: 30 }}>🃏</span>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: '#fff', letterSpacing: 3 }}>
        {label}
      </span>
    </div>
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '30px 48px', gap: 24, textAlign: 'center',
    }}>
      {children}
    </div>
  </div>
);

const FlashcardScene: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f - 3, fps, config: { damping: 14, stiffness: 80 }, from: 0, to: 1 });
  const riseY = (1 - enter) * 520;
  const squash = useSquash(14);
  const drift = Math.sin(f * 0.05) * 9;
  // flip pergunta → resposta em "do conteúdo que você estudou"
  const rotY = interpolate(f, [52, 66], [0, 180], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic),
  });
  const badgeS = spring({ frame: f - 22, fps, config: { damping: 11, stiffness: 130 }, from: 0, to: 1 });
  const badgePulse = 1 + Math.sin(f * 0.22) * 0.045;
  const subOp = interpolate(f, [64, 76], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const glow = 0.55 + 0.45 * Math.sin(f * 0.09);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* glow extra por trás dos cartões */}
      <div style={{
        position: 'absolute', left: 40, right: 40, top: 380, height: 900,
        background: `radial-gradient(ellipse 60% 55% at 50% 45%, rgba(239,68,68,${0.3 + glow * 0.22}) 0%, transparent 70%)`,
        filter: 'blur(48px)',
      }} />

      {/* selo pulsante EM BREVE */}
      <div style={{
        position: 'absolute', top: 408, left: '50%',
        transform: `translateX(-50%) scale(${badgeS * badgePulse})`,
        opacity: badgeS,
        background: 'rgba(239,68,68,0.16)', border: '2px solid rgba(239,68,68,0.62)',
        borderRadius: 999, padding: '16px 44px',
        boxShadow: '0 0 52px rgba(239,68,68,0.4)',
      }}>
        <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 36, color: WHITE, letterSpacing: 4 }}>
          EM BREVE
        </span>
      </div>

      {/* pilha de cartões com tilt 3D + squash */}
      <div style={{
        position: 'absolute', left: '50%', top: 560,
        transform: `translateX(-50%) translateY(${riseY + drift}px)`,
      }}>
        <TiltIn startFrame={4} fromDeg={-18}>
          <div style={{ transform: squash, width: 760, height: 480, position: 'relative' }}>
            {/* cartões de trás */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 30, background: '#dfe3ea',
              opacity: 0.55, transform: 'rotate(6deg) translate(30px, 36px) scale(0.94)',
            }} />
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 30, background: '#eceef3',
              opacity: 0.8, transform: 'rotate(-7deg) translate(-26px, 22px) scale(0.97)',
            }} />
            {/* cartão da frente com flip */}
            <div style={{ position: 'absolute', inset: 0, perspective: 1500 }}>
              <div style={{
                position: 'absolute', inset: 0, transformStyle: 'preserve-3d',
                transform: `rotateY(${rotY}deg)`,
              }}>
                <CardFace label="FLASHCARD · CARDIOLOGIA">
                  <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 44, color: '#0d1420', lineHeight: 1.28 }}>
                    Qual a 1ª conduta na IC aguda congestiva?
                  </span>
                  <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 22, color: '#8b93a3' }}>
                    toque para virar
                  </span>
                </CardFace>
                <CardFace label="RESPOSTA" back>
                  <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 50, color: '#0d1420', lineHeight: 1.24 }}>
                    Furosemida IV + VNI se EAP
                  </span>
                  <span style={{
                    fontFamily: BODY, fontWeight: 700, fontSize: 23, color: GREEN,
                    background: 'rgba(16,183,127,0.12)', border: `1.5px solid ${GREEN}`,
                    borderRadius: 999, padding: '8px 24px',
                  }}>
                    ✓ acertou? próximo cartão
                  </span>
                </CardFace>
              </div>
            </div>
          </div>
        </TiltIn>
      </div>

      {/* sub-selo */}
      <div style={{
        position: 'absolute', top: 1150, left: 0, right: 0, textAlign: 'center', opacity: subOp,
      }}>
        <span style={{
          fontFamily: BODY, fontWeight: 600, fontSize: 28, color: W60,
          background: 'rgba(10,12,18,0.85)', border: '1px solid rgba(255,255,255,0.16)',
          borderRadius: 999, padding: '14px 34px',
        }}>
          gerados do que você estudou
        </span>
      </div>
    </div>
  );
};

// ── cena do contador +530 ─────────────────────────────────────────────────
const CounterScene: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useCountUp(530, 6, 44);
  const pop = spring({ frame: f - 4, fps, config: { damping: 12, stiffness: 90 }, from: 0.78, to: 1 });
  const squash = useSquash(6);
  const chipOp = interpolate(f, [50, 62], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const chipY = (1 - easeInOut(clamp01((f - 50) / 12))) * 40;
  const glow = 0.6 + 0.4 * Math.sin(f * 0.11);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 420, height: 900,
        background: `radial-gradient(ellipse 70% 50% at 50% 45%, rgba(239,68,68,${0.2 + glow * 0.18}) 0%, transparent 70%)`,
        filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 560,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26,
        transform: `${squash} scale(${pop})`, transformOrigin: '50% 40%',
      }}>
        <div style={{
          fontFamily: HEAD, fontWeight: 900, fontSize: 250, lineHeight: 1, color: WHITE,
          letterSpacing: -6,
          textShadow: `0 0 ${44 + glow * 40}px rgba(239,68,68,0.55), 0 0 120px rgba(239,68,68,0.3)`,
        }}>
          <span style={{ color: RED }}>+</span>{n}
        </div>
        <div style={{
          fontFamily: HEAD, fontWeight: 800, fontSize: 50, color: RED,
          letterSpacing: 8, textTransform: 'uppercase',
        }}>
          cursos
        </div>
        <div style={{
          opacity: chipOp, transform: `translateY(${chipY}px)`,
          fontFamily: BODY, fontWeight: 600, fontSize: 30, color: W80,
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)',
          borderRadius: 999, padding: '14px 36px',
        }}>
          ferramenta de verdade pra estudar
        </div>
      </div>
    </div>
  );
};

// ── composição ────────────────────────────────────────────────────────────
export const C11_Ferramentas: React.FC = () => {
  const frame = useCurrentFrame();

  // zoom punches nos beats das palavras (peak 1.13–1.16)
  const punchS1 = useZoomPunch([P_PDF, P_DENTRO, P_MARCA, P_CANETA, P_SALVO, P_SINC], 1.15);
  const punchS2 = useZoomPunch([P_CONCL], 1.15);
  const punchS3 = useZoomPunch([P_ANOT], 1.14);
  const punchS4 = useZoomPunch([P_PASTA, P_ORDEM], 1.13);
  const punchS5 = useZoomPunch([P_FLASH], 1.16);

  // deriva lenta do laptop na cena do mapa do curso
  const driftS4 = 1 + 0.05 * easeInOut(clamp01((frame - 447) / 140));

  // crossfades
  const s2Op = interpolate(frame, [XF2_A, XF2_B], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const s3Op = interpolate(frame, [XF2_A, XF2_A + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const s5Op = interpolate(frame, [XF5_A, XF5_B], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const s6Op = interpolate(frame, [612, 624], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#050505' }}>
      <AmbientBg intensity={frame > 600 ? 1.5 : 1} />

      {/* ── S1a · FRAME 0: PDF já sendo grifado AO VIVO (payoff antes do processo) ── */}
      {frame < 90 && (
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${punchS1})`, transformOrigin: '50% 45%' }}>
          <KenBurnsVideo src="rec/n_annot.mp4" startFrom={170} width={1080} height={1920} keys={K_S1A} />
        </div>
      )}

      {/* ── S1b · jump cut: seleção do marca-texto na toolbar ── */}
      {frame >= 90 && frame < 144 && (
        <Sequence from={90} layout="none">
          <div style={{ position: 'absolute', inset: 0, transform: `scale(${punchS1})`, transformOrigin: '50% 35%' }}>
            <KenBurnsVideo src="rec/n_annot.mp4" startFrom={150} width={1080} height={1920} keys={K_S1B} />
          </div>
        </Sequence>
      )}

      {/* ── S1c · jump cut: "salvando→salvo" + caneta circulando ── */}
      {frame >= 144 && frame < C1 + 7 && (
        <Sequence from={144} layout="none">
          <WhipPane progress={whipProgress(frame, C1)} side="out">
            <div style={{ position: 'absolute', inset: 0, transform: `scale(${punchS1})`, transformOrigin: '50% 40%' }}>
              <KenBurnsVideo src="rec/n_annot.mp4" startFrom={300} width={1080} height={1920} keys={K_S1C} />
            </div>
            <FloatBadge x={110} y={1140} delay={42} from="left" accent>
              <BadgeText top="Sincronizado" bottom="salvo em todos os aparelhos" />
            </FloatBadge>
          </WhipPane>
        </Sequence>
      )}

      {/* ── S2 · whip in: marca aula como concluída + favorito ── */}
      {frame >= C1 - 6 && frame < XF2_B && (
        <Sequence from={C1 - 6} layout="none">
          <div style={{ position: 'absolute', inset: 0, opacity: s2Op }}>
            <WhipPane progress={whipProgress(frame, C1)} side="in">
              <div style={{ position: 'absolute', inset: 0, transform: `scale(${punchS2})`, transformOrigin: '55% 40%' }}>
                <KenBurnsVideo src="rec/n_tools.mp4" startFrom={66} width={1080} height={1920} keys={K_S2} />
              </div>
            </WhipPane>
          </div>
        </Sequence>
      )}

      {/* ── S3 · crossfade: aba "Minhas anotações" ── */}
      {frame >= XF2_A && frame < C3 + 7 && (
        <Sequence from={XF2_A} layout="none">
          <div style={{ position: 'absolute', inset: 0, opacity: s3Op }}>
            <WhipPane progress={whipProgress(frame, C3)} side="out">
              <div style={{ position: 'absolute', inset: 0, transform: `scale(${punchS3})`, transformOrigin: '50% 42%' }}>
                <KenBurnsVideo src="rec/n_annot_tab.mp4" startFrom={152} width={1080} height={1920} keys={K_S3} />
              </div>
            </WhipPane>
          </div>
        </Sequence>
      )}

      {/* ── S4 · whip in: mapa do curso no laptop (árvore expandindo) ── */}
      {frame >= C3 - 6 && frame < C4 + 7 && (
        <Sequence from={C3 - 6} layout="none">
          <WhipPane progress={whipProgress(frame, C3)} side="in">
            <WhipPane progress={whipProgress(frame, C4)} side="out">
              <div style={{
                position: 'absolute', left: -210, top: 480, width: 1500,
                transform: `scale(${punchS4 * driftS4})`, transformOrigin: '50% 35%',
              }}>
                <TiltIn startFrame={6} fromDeg={-14}>
                  <LaptopFrame src="rec/nd_tree.mp4" width={1500} startFrom={99} />
                </TiltIn>
              </div>
              <FloatBadge x={300} y={280} delay={12} from="left" accent>
                <BadgeText top="Mapa do curso" bottom="cada aula na ordem certa" />
              </FloatBadge>
            </WhipPane>
          </WhipPane>
        </Sequence>
      )}

      {/* ── S5 · whip in: banner real de flashcards no app ── */}
      {frame >= C4 - 6 && frame < XF5_B && (
        <Sequence from={C4 - 6} layout="none">
          <div style={{ position: 'absolute', inset: 0, opacity: s5Op }}>
            <WhipPane progress={whipProgress(frame, C4)} side="in">
              <div style={{ position: 'absolute', inset: 0, transform: `scale(${punchS5})`, transformOrigin: '50% 25%' }}>
                <KenBurnsVideo src="rec/n_banner.mp4" startFrom={24} width={1080} height={1920} keys={K_S5} />
              </div>
            </WhipPane>
          </div>
        </Sequence>
      )}

      {/* ── S6 · cena motion pura: flashcards 3D EM BREVE ── */}
      {frame >= 612 && frame < C6 + 7 && (
        <Sequence from={612} layout="none">
          <div style={{ position: 'absolute', inset: 0, opacity: s6Op }}>
            <WhipPane progress={whipProgress(frame, C6)} side="out">
              <FlashcardScene />
            </WhipPane>
          </div>
        </Sequence>
      )}

      {/* ── S7 · whip in: contador +530 cursos ── */}
      {frame >= C6 - 6 && (
        <Sequence from={C6 - 6} layout="none">
          <WhipPane progress={whipProgress(frame, C6)} side="in">
            <CounterScene />
          </WhipPane>
        </Sequence>
      )}

      {/* ── spotlights nos elementos que a voz cita ── */}
      <Spotlight x={540} y={250} startFrame={P_MARCA} duration={42} radius={210} />
      <Spotlight x={925} y={895} startFrame={291} duration={36} radius={140} />
      <Spotlight x={540} y={390} startFrame={588} duration={30} radius={250} />

      {/* ── taps nos momentos exatos dos toques dos takes ── */}
      <TapDot x={400} y={255} frameAt={108} />   {/* seleciona marca-texto */}
      <TapDot x={310} y={180} frameAt={216} />   {/* seleciona caneta */}
      <TapDot x={925} y={640} frameAt={252} />   {/* check aula 1 */}
      <TapDot x={925} y={895} frameAt={291} />   {/* check aula 2 */}
      <TapDot x={850} y={655} frameAt={333} />   {/* estrela de favorito */}
      <TapDot x={540} y={820} frameAt={445} />   {/* abre "Fluxograma — Dor Torácica" */}
      <TapDot x={870} y={640} frameAt={465} />   {/* expandir raiz */}
      <TapDot x={850} y={730} frameAt={519} />   {/* sub-pasta ECG */}
      <TapDot x={830} y={810} frameAt={573} />   {/* clica aula */}

      {/* legendas sincronizadas (zona segura) */}
      <CaptionTrack timing={T} delaySec={DELAY} y={1380} size={58} />

      {/* end card + narração */}
      <EndCard startFrame={B_END} />
      <Narration id="c11" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
