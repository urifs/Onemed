import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { OLightBg, OLBadge, OLPhone, OLHero, OLEndCard, useOLCount, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import timing from './timings/c34.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C34_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  cresce: DELAY + 1.1,
  bolso: DELAY + 2.7,
  acervoNome: DELAY + 4.0,
  alguem: DELAY + 7.4,
  n10k: DELAY + 8.3,
  subiu: DELAY + 11.0,
  categoria: DELAY + 13.1,
  curtidas: DELAY + 15.2,
  contador: DELAY + 16.8,
  busca: DELAY + 19.1,
  esconde: DELAY + 21.7,
  resumoCacado: DELAY + 23.8,
  digita: DELAY + 27.3,
  viva: DELAY + 29.1,
  visita: DELAY + 33.2,
  garimpado: DELAY + 38.1,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  hook: [0, B.acervoNome + 1.2] as Range,
  feed: [B.acervoNome + 1.2, B.busca - 0.3] as Range,
  busca: [B.busca - 0.3, B.viva - 0.3] as Range,
  viva: [B.viva - 0.3, B.visita - 0.2] as Range,
  cta: [B.visita - 0.2, B.end + 1.0] as Range,
};

/* hook: estante que ganha livros sozinha + odômetro de views */
const Estante: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const op = sceneOpacity(t, SC.hook, true);
  const views = useOLCount(3412, Math.round((B.cresce) * FPS), 70);
  if (op <= 0) return null;
  const COLORS = ['#e0574a', '#e08a3a', '#3aa0e0', '#7a5ce0', '#41b184', '#e0b73a'];
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 360, textAlign: 'center' }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: O_INK, letterSpacing: -1 }}>
          uma biblioteca que<br /><span style={{ color: O_RED }}>cresce todo dia.</span>
        </div>
      </div>
      {/* prateleiras */}
      {[0, 1].map(row => (
        <div key={row} style={{ position: 'absolute', left: 120, right: 120, top: 660 + row * 250 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 170, height: 12, background: '#d9d2c4', borderRadius: 6, boxShadow: '0 8px 20px -6px rgba(22,24,29,0.2)' }} />
          {[...Array(9)].map((_, i) => {
            const at = 0.4 + row * 0.5 + i * 0.28;
            const s = spring({ frame: frame - Math.round(at * FPS), fps: 30, config: { damping: 13, stiffness: 140 }, from: 0, to: 1 });
            const h = 120 + ((i * 37) % 46);
            return (
              <div key={i} style={{
                position: 'absolute', left: i * 92, bottom: -158, width: 66, height: h * s,
                background: COLORS[(i + row) % COLORS.length], borderRadius: 6,
                transformOrigin: 'bottom', opacity: Math.min(1, s * 1.4),
                boxShadow: '0 6px 16px -6px rgba(22,24,29,0.3)',
              }} />
            );
          })}
        </div>
      ))}
      {/* odômetro de visualizações */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 1280, display: 'flex', justifyContent: 'center',
        opacity: interpolate(t, [B.cresce + 0.5, B.cresce + 1.0], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: WHITE, border: '1.5px solid rgba(22,24,29,0.1)', borderRadius: 999,
          padding: '14px 34px', boxShadow: '0 16px 44px -14px rgba(22,24,29,0.2)',
        }}>
          <span style={{ fontSize: 28 }}>👁</span>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: O_INK }}>{views}</span>
          <span style={{ fontFamily: BODY, fontSize: 21, color: O_MUT }}>visualizações e subindo</span>
        </div>
      </div>
    </div>
  );
};

export const C34_Acervo: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />
      <Estante t={t} />

      {/* o feed real do acervo */}
      <OLPhone t={t} range={SC.feed} src="rec/ol_acervo.mp4" startFrom={30}>
        <OLBadge x={56} y={330} delay={Math.round((SC.feed[0] + 0.4) * FPS)} from="left" accent
          top="o Acervo da OneMed" bottom="+10.000 médicos alimentando" />
        <OLBadge x={600} y={520} delay={Math.round(B.categoria * FPS)} from="right"
          top="por categoria" />
        <OLBadge x={620} y={670} delay={Math.round(B.curtidas * FPS)} from="right"
          top="❤ curtidas · 💬 comentários" />
        <OLBadge x={56} y={1130} delay={Math.round(B.contador * FPS)} from="left"
          top="👁 contador girando" bottom="material bom sobe sozinho" />
      </OLPhone>

      {/* a busca que acha arquivo dentro do item */}
      <OLPhone t={t} range={SC.busca} src="rec/ol_acervo.mp4" startFrom={150}>
        <OLBadge x={56} y={330} delay={Math.round((B.busca + 0.3) * FPS)} from="left" accent
          top='digitei "arritmias"' bottom="ela procura DENTRO dos materiais" />
        <OLBadge x={580} y={1130} delay={Math.round(B.digita * FPS)} from="right" green
          top="✓ digita... acha... abre" />
      </OLPhone>

      {/* biblioteca viva */}
      <OLHero t={t} range={SC.viva} line1="uma biblioteca viva" line2="não espera visita." size={64} redAfterSec={1.4} />

      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.cta) }}>
        <div style={{
          position: 'absolute', left: 50, right: 50, top: 740, textAlign: 'center',
          opacity: interpolate(t, [SC.cta[0], SC.cta[0] + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 58, color: O_INK, letterSpacing: -1.5, lineHeight: 1.25 }}>
            visita a sua...<br /><span style={{ color: O_RED }}>e nunca mais estude<br />de material garimpado.</span>
          </div>
        </div>
      </div>

      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c34.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
