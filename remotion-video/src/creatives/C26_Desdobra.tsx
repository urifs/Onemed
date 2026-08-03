import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText } from './common';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, GREEN, clamp01 } from './theme';
import { FPS, sceneOpacity, HeroLine, NumbersScene, Range } from './story';
import { OPhone, ClickPulse } from './oaia';
import timing from './timings/c26.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C26_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  quanto: DELAY + 0.1,
  errado: DELAY + 2.63,      // "errado, dura até a prova"
  desdobra: DELAY + 9.58,    // "se desdobra em três"
  c1: DELAY + 10.95,         // clique → resumo
  c2: DELAY + 13.0,          // → deck flashcards
  c3: DELAY + 18.5,          // → banco questões
  travou: DELAY + 22.15,     // assistente
  assiste: DELAY + 28.6,     // "você assiste uma vez"
  sempre: DELAY + 30.1,      // "vira revisão pra sempre"
  vale: DELAY + 32.0,
  n530: DELAY + 33.8,
  desdobraCta: DELAY + 36.4,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  hook: [0, B.desdobra - 0.3] as Range,
  pipeline: [B.desdobra - 0.3, B.travou - 0.2] as Range,
  assist: [B.travou - 0.2, B.assiste - 0.2] as Range,
  mote: [B.assiste - 0.2, B.n530 - 0.3] as Range,
  numeros: [B.n530 - 0.3, B.desdobraCta - 0.2] as Range,
  cta: [B.desdobraCta - 0.2, B.end + 1.0] as Range,
};

const Hook: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.hook, true);
  const q = interpolate(t, [0.3, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const err = interpolate(t, [B.errado, B.errado + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 50, right: 50, top: 560, textAlign: 'center', opacity: q }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: WHITE, letterSpacing: -1.5 }}>
          quanto tempo<br />dura uma aula?
        </div>
        <div style={{ fontFamily: BODY, fontSize: 28, color: W40, marginTop: 20 }}>uma hora?</div>
      </div>
      <div style={{ position: 'absolute', left: 50, right: 50, top: 1000, textAlign: 'center', opacity: err }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 46, color: RED }}>errado.</div>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: WHITE, marginTop: 12 }}>dura até o dia da prova.</div>
      </div>
    </div>
  );
};

/* pipeline: a aula (central) se desdobra em 3 cards que descem */
const Pipeline: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.pipeline);
  if (op <= 0) return null;
  const STAGES = [
    ['📝', 'RESUMO', B.c1, '#e0574a'],
    ['🃏', 'FLASHCARDS', B.c2, '#e08a3a'],
    ['📋', 'QUESTÕES ✏', B.c3, '#3aa0e0'],
  ] as const;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      {/* aula fonte */}
      <div style={{ position: 'absolute', left: '50%', top: 300, transform: 'translateX(-50%)' }}>
        <div style={{ background: 'rgba(14,16,22,0.95)', border: `2px solid ${RED}`, borderRadius: 18, padding: '20px 40px', fontFamily: HEAD, fontWeight: 900, fontSize: 38, color: WHITE, boxShadow: '0 0 40px rgba(239,68,68,0.25)' }}>
          ▶ 1 aula
        </div>
      </div>
      {STAGES.map(([ic, lb, at, col], i) => {
        const o = interpolate(t, [at, at + 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const y = 540 + i * 210;
        return (
          <div key={lb}>
            {/* linha conectora */}
            <svg width={8} height={210} style={{ position: 'absolute', left: '50%', top: y - 200, transform: 'translateX(-50%)', overflow: 'visible' }}>
              <line x1={4} y1={0} x2={4} y2={200 * o} stroke={col as string} strokeWidth={4} strokeDasharray="8 6" />
            </svg>
            <div style={{ position: 'absolute', left: '50%', top: y, transform: `translateX(-50%) translateY(${(1 - o) * 30}px)`, opacity: o }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(14,16,22,0.95)', border: `1.5px solid ${col}`, borderRadius: 16, padding: '18px 34px' }}>
                <span style={{ fontSize: 34 }}>{ic}</span>
                <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 38, color: WHITE }}>{lb}</span>
              </div>
            </div>
            <ClickPulse t={t} atSec={at as number} x={390} y={y - 40} />
          </div>
        );
      })}
    </div>
  );
};

export const C26_Desdobra: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t < B.desdobra ? 0.6 : 1} />
      <Hook t={t} />
      <Pipeline t={t} />

      <OPhone t={t} range={SC.assist} src="rec/oa_assistant.mp4" startFrom={210}>
        <FloatBadge x={56} y={330} delay={Math.round((SC.assist[0] + 0.4) * FPS)} from="left" accent>
          <BadgeText top="💬 travou no meio?" bottom="o assistente lê a tela e responde" />
        </FloatBadge>
      </OPhone>

      <HeroLine t={t} range={SC.mote} line1="você assiste uma vez." line2="ela vira revisão pra sempre." size={60} redAfterSec={B.sempre - SC.mote[0]} />

      <NumbersScene t={t} range={SC.numeros}
        atFirstSec={B.n530} atSecondSec={B.n530 + 1.9} atPillSec={undefined} />

      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.cta) }}>
        <div style={{
          position: 'absolute', left: 50, right: 50, top: 760, textAlign: 'center',
          opacity: interpolate(t, [SC.cta[0], SC.cta[0] + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 58, color: WHITE, letterSpacing: -1.5, lineHeight: 1.2 }}>
            assiste uma aula qualquer...<br /><span style={{ color: RED }}>e desdobra ela.</span>
          </div>
        </div>
      </div>

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={54} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c26.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
