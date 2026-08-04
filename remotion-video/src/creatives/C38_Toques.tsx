import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { OLightBg, OLBadge, OLPhone, OLHero, OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import timing from './timings/c38.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C38_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  regra: DELAY + 0.2,
  duvida: DELAY + 4.4,
  d1: DELAY + 6.3,           // desafio 1: aula
  d1t1: DELAY + 7.6, d1t2: DELAY + 8.4, d1t3: DELAY + 9.7,
  d2: DELAY + 11.3,          // desafio 2: cronograma
  d2t1: DELAY + 12.2, d2t2: DELAY + 13.0, d2t3: DELAY + 14.2,
  d3: DELAY + 18.3,          // desafio 3: acervo
  d3t1: DELAY + 23.9, d3t2: DELAY + 24.9, d3t3: DELAY + 27.8,
  n530: DELAY + 29.2,
  nada: DELAY + 32.7,
  conta: DELAY + 35.3,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  hook: [0, B.d1 - 0.2] as Range,
  d1: [B.d1 - 0.2, B.d2 - 0.2] as Range,
  d2: [B.d2 - 0.2, B.d3 - 0.2] as Range,
  d3: [B.d3 - 0.2, B.n530 - 0.3] as Range,
  regra: [B.n530 - 0.3, B.conta - 0.3] as Range,
  cta: [B.conta - 0.3, B.end + 1.0] as Range,
};

/* contador de toques 1·2·3 ✓ */
const TapCounter: React.FC<{ t: number; t1: number; t2: number; t3: number }> = ({ t, t1, t2, t3 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const taps = [t1, t2, t3];
  const done = t > t3 + 0.4;
  return (
    <div style={{
      position: 'absolute', left: '50%', top: 108, transform: 'translateX(-50%)', zIndex: 9,
      display: 'flex', alignItems: 'center', gap: 14,
      background: WHITE, border: `2px solid ${done ? O_GREEN : O_RED}`, borderRadius: 999, padding: '10px 26px',
      boxShadow: '0 16px 44px -12px rgba(22,24,29,0.25)',
    }}>
      {taps.map((at, i) => {
        const s = spring({ frame: frame - Math.round(at * FPS), fps, config: { damping: 10, stiffness: 200 }, from: 0.4, to: 1 });
        const active = t >= at;
        return (
          <div key={i} style={{
            width: 46, height: 46, borderRadius: 999,
            background: active ? O_RED : '#eceff3',
            transform: `scale(${active ? s : 1})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: HEAD, fontWeight: 900, fontSize: 24, color: active ? WHITE : O_MUT,
          }}>{i + 1}</div>
        );
      })}
      <span style={{
        fontFamily: HEAD, fontWeight: 900, fontSize: 30, color: O_GREEN,
        opacity: done ? 1 : 0, width: done ? 'auto' : 0, overflow: 'hidden',
      }}>✓</span>
    </div>
  );
};

export const C38_Toques: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />

      {/* hook: a regra */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.hook, true) }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 22, marginBottom: 44 }}>
            {[1, 2, 3].map(n => {
              const at = B.regra + 0.2 + (n - 1) * 0.25;
              const s = clamp01((t - at) / 0.25);
              return (
                <div key={n} style={{
                  width: 120, height: 120, borderRadius: 999, background: O_RED,
                  transform: `scale(${0.5 + s * 0.5})`, opacity: s,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 20px 50px -14px rgba(224,45,45,0.5)',
                  fontFamily: HEAD, fontWeight: 900, fontSize: 56, color: WHITE,
                }}>{n}</div>
              );
            })}
          </div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: O_INK, letterSpacing: -1.5 }}>
            a regra dos <span style={{ color: O_RED }}>3 toques.</span>
          </div>
          <div style={{
            fontFamily: BODY, fontSize: 28, color: O_MUT, marginTop: 18,
            opacity: interpolate(t, [B.duvida, B.duvida + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            duvida? conta comigo. 👇
          </div>
        </div>
      </div>

      {/* desafio 1: aula */}
      <OLPhone t={t} range={SC.d1} src="rec/ol_dash.mp4" startFrom={30} top={300}>
        <OLBadge x={56} y={430} delay={Math.round((SC.d1[0] + 0.4) * FPS)} from="left" accent
          top="desafio 1: uma aula de cardio" />
      </OLPhone>
      <div style={{ opacity: sceneOpacity(t, SC.d1) }}><TapCounter t={t} t1={B.d1t1} t2={B.d1t2} t3={B.d1t3} /></div>

      {/* desafio 2: cronograma/mapa */}
      <OLPhone t={t} range={SC.d2} src="rec/ol_plano.mp4" startFrom={270} top={300}>
        <OLBadge x={56} y={430} delay={Math.round((SC.d2[0] + 0.4) * FPS)} from="left" accent
          top="desafio 2: o mapa mental" bottom="semanas · marcos · checklist" />
      </OLPhone>
      <div style={{ opacity: sceneOpacity(t, SC.d2) }}><TapCounter t={t} t1={B.d2t1} t2={B.d2t2} t3={B.d2t3} /></div>

      {/* desafio 3: arquivo raro no acervo */}
      <OLPhone t={t} range={SC.d3} src="rec/ol_acervo.mp4" startFrom={150} top={300}>
        <OLBadge x={56} y={430} delay={Math.round((SC.d3[0] + 0.4) * FPS)} from="left" accent
          top="desafio final: arquivo raro" bottom="escondido dentro de um material" />
        <OLBadge x={580} y={1160} delay={Math.round((B.d3t2 + 0.4) * FPS)} from="right"
          top="a busca procura lá dentro" />
      </OLPhone>
      <div style={{ opacity: sceneOpacity(t, SC.d3) }}><TapCounter t={t} t1={B.d3t1} t2={B.d3t2} t3={B.d3t3} /></div>

      <OLHero t={t} range={SC.regra} line1="+530 cursos, +9.000 livros..." line2="nada a mais de 3 toques." size={56} redAfterSec={1.6} />

      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.cta) }}>
        <div style={{
          position: 'absolute', left: 50, right: 50, top: 740, textAlign: 'center',
          opacity: interpolate(t, [SC.cta[0], SC.cta[0] + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: O_INK, letterSpacing: -1.5, lineHeight: 1.25 }}>
            agora conta os toques<br />do jeito que você estuda hoje.<br /><span style={{ color: O_RED }}>depois vem contar aqui.</span>
          </div>
        </div>
      </div>

      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c38.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
