import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText } from './common';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, MONO, GREEN, clamp01 } from './theme';
import { FPS, sceneOpacity, NumbersScene, Range } from './story';
import { OPhone, DayCard } from './oaia';
import timing from './timings/c22.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C22_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  faltam: DELAY + 0.1,
  respira: DELAY + 4.4,
  d7: DELAY + 7.2,
  d7resumo: DELAY + 10.2,
  d5: DELAY + 15.4,
  d5flash: DELAY + 17.8,
  d3: DELAY + 23.65,
  d3quest: DELAY + 25.8,
  d1: DELAY + 31.5,
  d1assist: DELAY + 34.0,
  d0: DELAY + 37.5,
  importa: DELAY + 42.3,
  n530: DELAY + 43.1,
  contagem: DELAY + 48.2,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  hook: [0, B.d7 - 0.3] as Range,
  d7: [B.d7 - 0.3, B.d5 - 0.3] as Range,
  d5: [B.d5 - 0.3, B.d3 - 0.3] as Range,
  d3: [B.d3 - 0.3, B.d1 - 0.3] as Range,
  d1: [B.d1 - 0.3, B.d0 - 0.3] as Range,
  d0: [B.d0 - 0.3, B.n530 - 0.3] as Range,
  numeros: [B.n530 - 0.3, B.contagem - 0.2] as Range,
  cta: [B.contagem - 0.2, B.end + 1.0] as Range,
};

const Hook: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const op = sceneOpacity(t, SC.hook, true);
  const big = interpolate(frame, [3, 16], [0.6, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const o = interpolate(frame, [3, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const respiraOp = interpolate(t, [B.respira, B.respira + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', opacity: o, transform: `scale(${big})` }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 210, color: WHITE, letterSpacing: -8, lineHeight: 1 }}>
          D<span style={{ color: RED }}>-7</span>
        </div>
        <div style={{ fontFamily: BODY, fontSize: 30, color: W60, letterSpacing: 4, marginTop: 10 }}>FALTAM 7 DIAS PRA PROVA</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1080, textAlign: 'center', opacity: respiraOp }}>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: WHITE }}>
          respira. <span style={{ color: RED }}>agora é contagem regressiva.</span>
        </div>
      </div>
    </div>
  );
};

/* cada dia: DayCard no topo + take real da função embaixo */
const DayScene: React.FC<{
  t: number; range: Range; day: number; atCard: number;
  src: string; startFrom: number; badgeTop: string; badgeBottom: string; badgeAt: number;
}> = ({ t, range, day, atCard, src, startFrom, badgeTop, badgeBottom, badgeAt }) => {
  const op = sceneOpacity(t, range);
  if (op <= 0) return null;
  return (
    <>
      <OPhone t={t} range={range} src={src} startFrom={startFrom} top={430}>
        <FloatBadge x={56} y={520} delay={Math.round(badgeAt * FPS)} from="left" accent>
          <BadgeText top={badgeTop} bottom={badgeBottom} />
        </FloatBadge>
      </OPhone>
      <DayCard t={t} atSec={atCard} day={day} />
    </>
  );
};

export const C22_D7: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t < B.d7 ? 0.55 : 1} />
      <Hook t={t} />

      <DayScene t={t} range={SC.d7} day={7} atCard={B.d7} src="rec/oa_resumo.mp4" startFrom={30}
        badgeTop="📝 resumo pronto" badgeBottom="o que não deu tempo, dá pra ler" badgeAt={B.d7resumo} />
      <DayScene t={t} range={SC.d5} day={5} atCard={B.d5} src="rec/oa_flash_study.mp4" startFrom={30}
        badgeTop="🃏 flashcards automáticos" badgeBottom="revisão ativa: você só responde" badgeAt={B.d5flash} />
      <DayScene t={t} range={SC.d3} day={3} atCard={B.d3} src="rec/oa_questions.mp4" startFrom={90}
        badgeTop="📋 questões comentadas" badgeBottom="errou? a explicação já tá ali" badgeAt={B.d3quest} />
      <DayScene t={t} range={SC.d1} day={1} atCard={B.d1} src="rec/oa_assistant.mp4" startFrom={210}
        badgeTop="💬 o assistente" badgeBottom="lê a sua tela e responde na hora" badgeAt={B.d1assist} />

      {/* D-0 */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.d0) }}>
        <DayCard t={t} atSec={B.d0} day={0} done />
        <div style={{ position: 'absolute', left: 60, right: 60, top: 700, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 44, color: WHITE, lineHeight: 1.3 }}>
            você não revisou tudo.<br />ninguém revisa.
          </div>
          <div style={{
            fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: GREEN, marginTop: 26,
            opacity: interpolate(t, [B.importa, B.importa + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            mas revisou o que importa. ✓
          </div>
        </div>
      </div>

      <NumbersScene t={t} range={SC.numeros}
        atFirstSec={B.n530} atSecondSec={B.n530 + 1.8} atPillSec={undefined} />

      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.cta) }}>
        <div style={{
          position: 'absolute', left: 50, right: 50, top: 780, textAlign: 'center',
          opacity: interpolate(t, [SC.cta[0], SC.cta[0] + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 64, color: WHITE, letterSpacing: -2 }}>
            sua contagem<br /><span style={{ color: RED }}>começa agora.</span>
          </div>
        </div>
      </div>

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={54} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c22.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
