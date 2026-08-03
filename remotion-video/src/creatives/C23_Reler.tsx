import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText } from './common';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, GREEN, clamp01 } from './theme';
import { FPS, sceneOpacity, HeroLine, NumbersScene, Range } from './story';
import { OPhone, AiChip } from './oaia';
import timing from './timings/c23.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C23_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  reler: DELAY + 0.1,
  familiar: DELAY + 11.8,
  testar: DELAY + 14.3,      // "revisar é se testar"
  onemed: DELAY + 23.3,
  flash: DELAY + 27.6,       // "gera flashcards"
  questoes: DELAY + 31.8,
  assist: DELAY + 37.5,
  resumo: DELAY + 43.4,
  acervo: DELAY + 45.8,
  n530: DELAY + 47.2,
  grifar: DELAY + 51.3,      // "grifar acalma, se testar prepara"
  faz: DELAY + 55.1,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  hook: [0, B.testar - 0.3] as Range,
  testar: [B.testar - 0.3, B.onemed - 0.3] as Range,
  demoFlash: [B.onemed - 0.3, B.questoes + 0.3] as Range,
  demoQuest: [B.questoes + 0.3, B.assist - 0.2] as Range,
  demoAssist: [B.assist - 0.2, B.acervo - 0.2] as Range,
  numeros: [B.acervo - 0.2, B.grifar - 0.2] as Range,
  punch: [B.grifar - 0.2, B.faz - 0.2] as Range,
  cta: [B.faz - 0.2, B.end + 1.0] as Range,
};

/* hook: apostila com grifo amarelo que o cérebro "carimba: já vi" */
const Hook: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const op = sceneOpacity(t, SC.hook, true);
  const o = interpolate(frame, [3, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hiW = interpolate(t, [B.reler + 4.5, B.reler + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const stamp = interpolate(t, [B.reler + 9, B.reler + 9.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const familiar = interpolate(t, [B.familiar, B.familiar + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 350, textAlign: 'center', opacity: o }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 78, color: WHITE, letterSpacing: -2 }}>
          reler <span style={{ color: RED }}>não é</span> revisar.
        </div>
      </div>
      {/* apostila com grifo */}
      <div style={{ position: 'absolute', left: '50%', top: 580, transform: 'translateX(-50%) rotate(-1.5deg)', width: 620, borderRadius: 12, background: '#f3efe2', padding: '38px 42px', boxShadow: '0 34px 90px -26px rgba(0,0,0,0.7)', opacity: o }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ position: 'relative', height: 20, marginBottom: 22 }}>
            <div style={{ position: 'absolute', inset: 0, width: `${88 - (i * 9) % 34}%`, background: '#d9d2bd', borderRadius: 5 }} />
            {i === 2 && <div style={{ position: 'absolute', top: -4, left: 0, width: `${68 * hiW}%`, height: 28, background: 'rgba(245,205,60,0.7)', borderRadius: 3 }} />}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: '50%', top: 780, transform: `translateX(-50%) rotate(-8deg) scale(${0.6 + stamp * 0.4})`, opacity: stamp * 0.95, border: `5px solid ${W40}`, borderRadius: 12, padding: '10px 26px', fontFamily: HEAD, fontWeight: 900, fontSize: 34, color: W60 }}>
        &quot;ISSO EU JÁ VI&quot;
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1180, textAlign: 'center', opacity: familiar }}>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: WHITE }}>
          familiaridade <span style={{ color: RED }}>não é memória.</span>
        </div>
      </div>
    </div>
  );
};

/* "revisar é se testar" — 3 chips */
const Testar: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.testar);
  if (op <= 0) return null;
  const items = [['🃏', 'flashcard', B.testar + 2], ['📋', 'questão', B.testar + 2.9], ['🧠', 'explicar sem olhar', B.testar + 3.7]] as const;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center' }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 56, color: WHITE, letterSpacing: -1 }}>
          revisar de verdade<br />é <span style={{ color: RED }}>se testar.</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 860, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        {items.map(([ic, lb, at]) => {
          const o = interpolate(t, [at, at + 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return <div key={lb} style={{ opacity: o, transform: `translateX(${(1 - o) * 40}px)` }}><AiChip icon={ic} label={lb} /></div>;
        })}
      </div>
    </div>
  );
};

export const C23_Reler: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t < B.onemed ? 0.6 : 1} />
      <Hook t={t} />
      <Testar t={t} />

      <OPhone t={t} range={SC.demoFlash} src="rec/oa_flash_gen.mp4" startFrom={30}>
        <FloatBadge x={56} y={330} delay={Math.round(B.flash * FPS)} from="left" accent>
          <BadgeText top="🃏 flashcards do conteúdo" bottom="um clique, terminou a aula" />
        </FloatBadge>
      </OPhone>

      <OPhone t={t} range={SC.demoQuest} src="rec/oa_questions.mp4" startFrom={90}>
        <FloatBadge x={56} y={330} delay={Math.round((SC.demoQuest[0] + 0.4) * FPS)} from="left">
          <BadgeText top="📋 questões com resposta comentada" />
        </FloatBadge>
      </OPhone>

      <OPhone t={t} range={SC.demoAssist} src="rec/oa_assistant.mp4" startFrom={210}>
        <FloatBadge x={56} y={330} delay={Math.round((SC.demoAssist[0] + 0.4) * FPS)} from="left" accent>
          <BadgeText top="💬 dúvida no meio?" bottom="o assistente lê a tela e explica" />
        </FloatBadge>
      </OPhone>

      <NumbersScene t={t} range={SC.numeros}
        atFirstSec={B.n530} atSecondSec={B.n530 + 1.9} atPillSec={undefined} />

      {/* grifar acalma. se testar prepara. */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.punch) }}>
        <div style={{ position: 'absolute', left: 60, right: 60, top: 720, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 52, color: W40 }}>grifar acalma.</div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 66, color: RED, marginTop: 18 }}>se testar prepara.</div>
        </div>
      </div>

      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.cta) }}>
        <div style={{
          position: 'absolute', left: 50, right: 50, top: 760, textAlign: 'center',
          opacity: interpolate(t, [SC.cta[0], SC.cta[0] + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: WHITE, letterSpacing: -1.5, lineHeight: 1.25 }}>
            faz o teste grátis —<br />da plataforma, <span style={{ color: RED }}>e da sua memória.</span>
          </div>
        </div>
      </div>

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={54} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c23.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
