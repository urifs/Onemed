import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText } from './common';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, MONO, GREEN, clamp01 } from './theme';
import { FPS, sceneOpacity, NumbersScene, Range } from './story';
import { OPhone } from './oaia';
import timing from './timings/c30.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C30_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  salva: DELAY + 0.1,
  p1: DELAY + 4.94,          // passo 1: 0-5 resumo
  p1toca: DELAY + 8.7,
  p2: DELAY + 14.03,         // passo 2: 5-12 flashcards
  p3: DELAY + 21.77,         // passo 3: 12-18 questões
  p4: DELAY + 28.16,         // passo 4: 18-20 assistente
  fechada: DELAY + 36.4,     // "uma revisão fechada"
  n530: DELAY + 38.8,
  testa: DELAY + 43.7,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  hook: [0, B.p1 - 0.3] as Range,
  p1: [B.p1 - 0.3, B.p2 - 0.3] as Range,
  p2: [B.p2 - 0.3, B.p3 - 0.3] as Range,
  p3: [B.p3 - 0.3, B.p4 - 0.3] as Range,
  p4: [B.p4 - 0.3, B.fechada - 0.2] as Range,
  fechada: [B.fechada - 0.2, B.n530 - 0.3] as Range,
  numeros: [B.n530 - 0.3, B.testa - 0.2] as Range,
  cta: [B.testa - 0.2, B.end + 1.0] as Range,
};

const Hook: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.hook, true);
  const o = interpolate(t, [0.3, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const save = interpolate(t, [B.salva + 0.3, B.salva + 0.9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 470, display: 'flex', justifyContent: 'center', opacity: save }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(239,68,68,0.16)', border: `1.5px solid ${RED}`, borderRadius: 999, padding: '12px 28px' }}>
          <span style={{ fontSize: 26 }}>🔖</span>
          <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 24, color: WHITE }}>SALVA ESSE VÍDEO</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 50, right: 50, top: 640, textAlign: 'center', opacity: o }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 72, color: WHITE, letterSpacing: -2, lineHeight: 1.1 }}>
          a revisão de <span style={{ color: RED }}>20 min</span><br />que cabe em<br />qualquer plantão
        </div>
      </div>
    </div>
  );
};

/* HUD de passo: número + faixa de minutos, sempre no topo */
const StepHud: React.FC<{ n: number; mins: string }> = ({ n, mins }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: 90, display: 'flex', justifyContent: 'center', zIndex: 8 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(14,16,22,0.95)', border: `1.5px solid ${RED}`, borderRadius: 999, padding: '10px 26px' }}>
      <div style={{ width: 40, height: 40, borderRadius: 999, background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: 24, color: WHITE }}>{n}</div>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: WHITE }}>min {mins}</span>
    </div>
  </div>
);

const Step: React.FC<{ t: number; range: Range; n: number; mins: string; src: string; startFrom: number; badgeTop: string; badgeBottom: string }> =
({ t, range, n, mins, src, startFrom, badgeTop, badgeBottom }) => {
  const op = sceneOpacity(t, range);
  if (op <= 0) return null;
  return (
    <>
      <OPhone t={t} range={range} src={src} startFrom={startFrom} top={280}>
        <FloatBadge x={56} y={370} delay={Math.round((range[0] + 0.4) * FPS)} from="left" accent>
          <BadgeText top={badgeTop} bottom={badgeBottom} />
        </FloatBadge>
      </OPhone>
      <div style={{ opacity: op }}><StepHud n={n} mins={mins} /></div>
    </>
  );
};

export const C30_Rotina: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t < B.p1 ? 0.6 : 1} />
      <Hook t={t} />

      <Step t={t} range={SC.p1} n={1} mins="0–5" src="rec/oa_resumo.mp4" startFrom={30}
        badgeTop="📝 gerar resumo" badgeBottom="a plataforma resume, você só lê" />
      <Step t={t} range={SC.p2} n={2} mins="5–12" src="rec/oa_flash_study.mp4" startFrom={30}
        badgeTop="🃏 flashcards automáticos" badgeBottom="card por card, sem montar nada" />
      <Step t={t} range={SC.p3} n={3} mins="12–18" src="rec/oa_questions.mp4" startFrom={90}
        badgeTop="📋 questões comentadas" badgeBottom="errou, o comentário explica ali" />
      <Step t={t} range={SC.p4} n={4} mins="18–20" src="rec/oa_assistant.mp4" startFrom={210}
        badgeTop="💬 o que sobrou, pergunta" badgeBottom="o assistente lê a tela e responde" />

      {/* revisão fechada — checklist */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.fechada) }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 460, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 60, color: WHITE, letterSpacing: -1.5 }}>
            4 passos.<br /><span style={{ color: GREEN }}>uma revisão fechada. ✓</span>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 120, right: 120, top: 820 }}>
          {['📝 resumo', '🃏 flashcards', '📋 questões', '💬 dúvidas'].map((s, i) => {
            const o = interpolate(t, [SC.fechada[0] + 0.4 + i * 0.25, SC.fechada[0] + 0.7 + i * 0.25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div key={s} style={{ opacity: o, transform: `translateX(${(1 - o) * 30}px)`, display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(16,183,127,0.1)', border: '1.5px solid rgba(16,183,127,0.4)', borderRadius: 14, padding: '16px 24px', marginBottom: 14 }}>
                <span style={{ color: GREEN, fontFamily: HEAD, fontWeight: 900, fontSize: 28 }}>✓</span>
                <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 30, color: WHITE }}>{s}</span>
              </div>
            );
          })}
        </div>
      </div>

      <NumbersScene t={t} range={SC.numeros}
        atFirstSec={B.n530} atSecondSec={B.n530 + 1.9} atPillSec={undefined} />

      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.cta) }}>
        <div style={{
          position: 'absolute', left: 50, right: 50, top: 780, textAlign: 'center',
          opacity: interpolate(t, [SC.cta[0], SC.cta[0] + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: WHITE, letterSpacing: -2 }}>
            testa grátis...<br /><span style={{ color: RED }}>e cronometra. ⏱</span>
          </div>
        </div>
      </div>

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={54} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c30.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
