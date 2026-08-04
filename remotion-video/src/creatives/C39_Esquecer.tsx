import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { OLightBg, OLBadge, OLPhone, OLHero, OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import timing from './timings/c39.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C39_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  esquecer: DELAY + 0.2,
  ciencia: DELAY + 3.7,
  linha: DELAY + 5.9,
  metade: DELAY + 9.9,
  curva: DELAY + 12.9,
  sobe: DELAY + 15.1,
  flash: DELAY + 18.4,
  degrau1: DELAY + 22.0,
  quest: DELAY + 24.2,
  degrau2: DELAY + 26.3,
  crono: DELAY + 27.9,
  mapa: DELAY + 32.5,
  n530: DELAY + 38.5,
  meta: DELAY + 42.5,
  revisar: DELAY + 45.2,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  hook: [0, B.flash - 0.3] as Range,
  flash: [B.flash - 0.3, B.quest - 0.2] as Range,
  quest: [B.quest - 0.2, B.crono - 0.2] as Range,
  crono: [B.crono - 0.2, B.n530 - 0.3] as Range,
  numeros: [B.n530 - 0.3, B.meta - 0.3] as Range,
  meta: [B.meta - 0.3, B.end + 1.0] as Range,
};

/* A CURVA — persistente o vídeo inteiro: cai sempre, sobe degraus nas funções */
const Curva: React.FC<{ t: number }> = ({ t }) => {
  if (t < B.linha - 0.3) return null;
  const fade = t > B.meta - 0.5 ? interpolate(t, [B.meta - 0.5, B.meta], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  // memória: decai continuamente; degraus sobem nos beats
  const W = 980, H = 260, X0 = 50;
  const t0 = B.linha;
  const dur = B.meta - t0;
  const pts: string[] = [];
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const tt = t0 + (dur * i) / N;
    if (tt > t) break;
    let mem = 100 * Math.exp(-(tt - t0) * 0.055);
    if (tt > B.degrau1) mem += 26 * Math.exp(-(tt - B.degrau1) * 0.03);
    if (tt > B.degrau2) mem += 24 * Math.exp(-(tt - B.degrau2) * 0.03);
    if (tt > B.mapa) mem += 20 * Math.exp(-(tt - B.mapa) * 0.02);
    mem = Math.min(100, mem);
    const x = X0 + (W * (tt - t0)) / dur;
    const y = 40 + (H * (100 - mem)) / 100;
    pts.push(`${x},${y}`);
  }
  if (pts.length < 2) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 1230, zIndex: 7, opacity: fade }}>
      <svg width={1080} height={330}>
        {[0, 50, 100].map(g => (
          <line key={g} x1={X0} y1={40 + H * (1 - g / 100)} x2={X0 + W} y2={40 + H * (1 - g / 100)} stroke="rgba(22,24,29,0.08)" strokeWidth={1.5} />
        ))}
        <text x={X0} y={30} fontFamily={BODY} fontSize={19} fill={O_MUT}>sua memória deste vídeo</text>
        <polyline points={pts.join(' ')} fill="none" stroke={O_RED} strokeWidth={5} strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 4px 10px rgba(224,45,45,0.35))' }} />
        <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r={9} fill={O_RED} />
      </svg>
    </div>
  );
};

export const C39_Esquecer: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />

      {/* hook */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.hook, true) }}>
        <div style={{ position: 'absolute', left: 50, right: 50, top: 480, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 74, color: O_INK, letterSpacing: -2, lineHeight: 1.15 }}>
            você vai <span style={{ color: O_RED }}>esquecer</span><br />esse vídeo.
          </div>
          <div style={{
            fontFamily: BODY, fontSize: 28, color: O_MUT, marginTop: 22,
            opacity: interpolate(t, [B.ciencia, B.ciencia + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            não é ofensa. é ciência.
          </div>
          <div style={{
            fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: O_INK, marginTop: 40,
            opacity: interpolate(t, [B.curva, B.curva + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            curva do esquecimento. <span style={{ color: O_RED }}>↓</span>
          </div>
          <div style={{
            fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: O_GREEN, marginTop: 16,
            opacity: interpolate(t, [B.sobe, B.sobe + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            só sobe com revisão ativa. ↑
          </div>
        </div>
      </div>

      <OLPhone t={t} range={SC.flash} src="rec/ol_flash.mp4" startFrom={160} top={220} width={520}>
        <OLBadge x={56} y={330} delay={Math.round((B.flash + 0.4) * FPS)} from="left" accent
          top="🃏 flashcards do material" bottom="a curva sobe um degrau ↑" />
      </OLPhone>

      <OLPhone t={t} range={SC.quest} src="rec/ol_quest.mp4" startFrom={170} top={220} width={520}>
        <OLBadge x={56} y={330} delay={Math.round((B.quest + 0.4) * FPS)} from="left" accent
          top="📋 questões comentadas" bottom="sobe outro ↑" />
      </OLPhone>

      <OLPhone t={t} range={SC.crono} src="rec/ol_plano.mp4" startFrom={270} top={220} width={520}>
        <OLBadge x={56} y={330} delay={Math.round((B.crono + 0.6) * FPS)} from="left" accent
          top="🧠 e a revisão nunca falha" bottom="cronograma + mapa mental + marcos" />
      </OLPhone>

      <OLHero t={t} range={SC.numeros} line1="+530 cursos, +9.000 livros" line2="pra curva nunca mais vencer." size={54} redAfterSec={1.6} />

      {/* a curva persistente */}
      <Curva t={t} />

      {/* meta-fecho */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.meta) }}>
        <div style={{
          position: 'absolute', left: 50, right: 50, top: 700, textAlign: 'center',
          opacity: interpolate(t, [SC.meta[0], SC.meta[0] + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 58, color: O_MUT, letterSpacing: -1.5 }}>
            esse vídeo, você vai esquecer.
          </div>
          <div style={{
            fontFamily: HEAD, fontWeight: 900, fontSize: 70, color: O_RED, marginTop: 26, letterSpacing: -2,
            opacity: interpolate(t, [B.revisar, B.revisar + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            o que você revisar... não.
          </div>
        </div>
      </div>

      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c39.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
