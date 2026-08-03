import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText } from './common';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, GREEN, clamp01 } from './theme';
import { FPS, sceneOpacity, DemoPhone, NumbersScene, Range } from './story';
import { OPhone } from './oaia';
import timing from './timings/c28.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C28_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  tres: DELAY + 0.1,
  v1: DELAY + 4.48,          // "verdade um: ninguém revisa tudo"
  v1busca: DELAY + 10.4,     // busca
  v1acha: DELAY + 16.4,
  v2: DELAY + 19.96,         // "verdade dois: quem não testa esquece"
  v2quest: DELAY + 28.0,     // questões
  v3: DELAY + 37.2,          // "verdade três: dúvida vira lacuna"
  v3assist: DELAY + 40.9,    // assistente
  n10k: DELAY + 49.3,
  anota: DELAY + 53.0,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  intro: [0, B.v1 - 0.3] as Range,
  v1: [B.v1 - 0.3, B.v2 - 0.3] as Range,
  v2: [B.v2 - 0.3, B.v3 - 0.3] as Range,
  v3: [B.v3 - 0.3, B.n10k - 0.3] as Range,
  numeros: [B.n10k - 0.3, B.anota - 0.2] as Range,
  cta: [B.anota - 0.2, B.end + 1.0] as Range,
};

const BigNum: React.FC<{ n: number; label: string; atSec: number }> = ({ n, label, atSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - Math.round(atSec * FPS), fps, config: { damping: 12, stiffness: 130 }, from: 0.5, to: 1 });
  const o = interpolate(frame - Math.round(atSec * FPS), [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 60, top: 300, opacity: o, transform: `scale(${s})`, transformOrigin: 'left center', display: 'flex', alignItems: 'center', gap: 24 }}>
      <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 130, color: RED, letterSpacing: -4, lineHeight: 1 }}>{n}</span>
      <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: WHITE, maxWidth: 380 }}>{label}</span>
    </div>
  );
};

const Intro: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.intro, true);
  const o = interpolate(t, [0.3, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 50, right: 50, top: 620, textAlign: 'center', opacity: o }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 88, color: WHITE, letterSpacing: -3 }}>3 <span style={{ color: RED }}>verdades</span></div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 40, color: WHITE, marginTop: 10 }}>sobre passar na residência</div>
        <div style={{ fontFamily: BODY, fontSize: 26, color: W60, marginTop: 16 }}>que ninguém te conta</div>
      </div>
    </div>
  );
};

export const C28_Verdades: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t < B.v1 ? 0.6 : 1} />
      <Intro t={t} />

      {/* VERDADE 1 — ninguém revisa tudo (busca) */}
      <div style={{ opacity: sceneOpacity(t, SC.v1) }}>
        {sceneOpacity(t, SC.v1) > 0 && <BigNum n={1} label="ninguém revisa tudo" atSec={B.v1} />}
      </div>
      <OPhone t={t} range={[B.v1busca - 0.3, B.v2 - 0.3] as Range} src="rec/m_search.mp4" startFrom={26} top={520}>
        <FloatBadge x={56} y={520} delay={Math.round(B.v1acha * FPS)} from="left" accent>
          <BadgeText top="+530 cursos, busca em cada um" bottom="acha o tema, revisa só o que importa" />
        </FloatBadge>
      </OPhone>

      {/* VERDADE 2 — quem não testa esquece (questões) */}
      <div style={{ opacity: sceneOpacity(t, SC.v2) }}>
        {sceneOpacity(t, SC.v2) > 0 && <BigNum n={2} label="quem não testa, esquece" atSec={B.v2} />}
      </div>
      <OPhone t={t} range={[B.v2quest - 0.3, B.v3 - 0.3] as Range} src="rec/oa_questions.mp4" startFrom={90} top={520}>
        <FloatBadge x={56} y={520} delay={Math.round((B.v2quest + 0.6) * FPS)} from="left" accent>
          <BadgeText top="📋 questões com resposta comentada" bottom="+ vira flashcards do que estudou" />
        </FloatBadge>
      </OPhone>

      {/* VERDADE 3 — dúvida vira lacuna (assistente) */}
      <div style={{ opacity: sceneOpacity(t, SC.v3) }}>
        {sceneOpacity(t, SC.v3) > 0 && <BigNum n={3} label="dúvida parada vira lacuna" atSec={B.v3} />}
      </div>
      <OPhone t={t} range={[B.v3assist - 0.3, B.n10k - 0.3] as Range} src="rec/oa_assistant.mp4" startFrom={210} top={520}>
        <FloatBadge x={56} y={520} delay={Math.round((B.v3assist + 0.6) * FPS)} from="left" accent>
          <BadgeText top="💬 o assistente lê a sua tela" bottom="a dúvida morre ali. antes de virar erro" />
        </FloatBadge>
      </OPhone>

      <NumbersScene t={t} range={SC.numeros}
        atFirstSec={B.n10k - 100} atSecondSec={B.n10k} atPillSec={undefined} />

      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.cta) }}>
        <div style={{
          position: 'absolute', left: 50, right: 50, top: 780, textAlign: 'center',
          opacity: interpolate(t, [SC.cta[0], SC.cta[0] + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 56, color: WHITE, letterSpacing: -1.5, lineHeight: 1.2 }}>
            a prova <span style={{ color: RED }}>não vai esperar</span><br />você decidir.
          </div>
        </div>
      </div>

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={54} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c28.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
