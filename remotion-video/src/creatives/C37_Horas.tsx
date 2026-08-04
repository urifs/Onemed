import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01, easeInOut } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { OLightBg, OLBadge, OLPhone, OLHero, OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import timing from './timings/c37.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C37_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  h168: DELAY + 2.2,
  plantao: DELAY + 6.2,
  faculdade: DELAY + 7.9,
  sono: DELAY + 10.0,
  desloc: DELAY + 11.3,
  familia: DELAY + 13.1,
  sobra: DELAY + 14.6,
  fininha: DELAY + 18.1,
  precisa: DELAY + 19.5,
  rendam: DELAY + 22.1,
  estica: DELAY + 25.7,
  resumo: DELAY + 26.7,
  flash: DELAY + 27.9,
  questoes: DELAY + 29.5,
  assist: DELAY + 31.6,
  crono: DELAY + 34.6,
  mapa: DELAY + 42.3,
  n530: DELAY + 45.4,
  dobro: DELAY + 49.6,
  teste: DELAY + 52.0,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  grafico: [0, B.rendam + 2.6] as Range,
  ferramentas: [B.rendam + 2.6, B.crono - 0.3] as Range,
  crono: [B.crono - 0.3, B.n530 - 0.3] as Range,
  dobro: [B.n530 - 0.3, B.teste - 0.2] as Range,
  cta: [B.teste - 0.2, B.end + 1.0] as Range,
};

/* a barra da semana: 168h fatiada, com a fatia do estudo esticando no fim */
const SEGS = [
  { label: 'plantão', h: 36, at: () => B.plantao, color: '#c9d2dd' },
  { label: 'faculdade', h: 30, at: () => B.faculdade, color: '#d8cfc4' },
  { label: 'sono', h: 49, at: () => B.sono, color: '#cfd8cf' },
  { label: 'deslocamento', h: 12, at: () => B.desloc, color: '#ddd1da' },
  { label: 'família', h: 25, at: () => B.familia, color: '#d3cfe0' },
];

const Grafico: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const op = sceneOpacity(t, SC.grafico, true);
  const total = 168;
  const H = 1040;
  const titOp = interpolate(frame, [3, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const usado = SEGS.reduce((a, s) => a + s.h, 0);
  const estudo = total - usado;   // 16h
  const sobraOp = interpolate(t, [B.sobra, B.sobra + 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pulse = t > B.fininha && t < B.rendam ? 1 + Math.sin((t - B.fininha) * 5) * 0.06 : 1;
  if (op <= 0) return null;
  let acc = 0;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', opacity: titOp }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 96, color: O_INK, letterSpacing: -3 }}>
          168<span style={{ color: O_RED, fontSize: 52 }}>h</span>
        </div>
        <div style={{ fontFamily: BODY, fontSize: 26, color: O_MUT }}>toda semana. a sua também.</div>
      </div>
      {/* barra vertical */}
      <div style={{ position: 'absolute', left: 320, top: 560, width: 190, height: H, borderRadius: 22, background: '#eceff3', overflow: 'hidden', boxShadow: 'inset 0 2px 10px rgba(22,24,29,0.08)' }}>
        {SEGS.map((s, i) => {
          const p = clamp01((t - s.at()) / 0.5);
          const y = acc; acc += s.h;
          return (
            <div key={i} style={{
              position: 'absolute', left: 0, right: 0, top: (y / total) * H,
              height: (s.h / total) * H * easeInOut(p),
              background: s.color,
            }} />
          );
        })}
        {/* fatia do estudo */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: (usado / total) * H,
          height: (estudo / total) * H, background: O_RED, opacity: sobraOp,
          transform: `scaleX(${pulse})`,
        }} />
      </div>
      {/* labels */}
      <div style={{ position: 'absolute', left: 560, top: 580 }}>
        {SEGS.map((s, i) => {
          const p = clamp01((t - s.at()) / 0.4);
          return (
            <div key={i} style={{ opacity: p, transform: `translateX(${(1 - p) * 30}px)`, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: s.color }} />
              <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 26, color: O_INK }}>{s.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 21, color: O_MUT }}>{s.h}h</span>
            </div>
          );
        })}
        <div style={{ opacity: sobraOp, display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: O_RED }} />
          <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 30, color: O_RED }}>estudo</span>
          <span style={{ fontFamily: MONO, fontSize: 23, color: O_RED }}>{'≈'}16h</span>
        </div>
        <div style={{
          marginTop: 20, fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: O_INK,
          opacity: interpolate(t, [B.fininha, B.fininha + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          fininha. <span style={{ color: O_RED }}>e é ela que decide.</span>
        </div>
      </div>
    </div>
  );
};

export const C37_Horas: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />
      <Grafico t={t} />

      {/* a fatia rende mais: ferramentas */}
      <OLPhone t={t} range={SC.ferramentas} src="rec/ol_flash.mp4" startFrom={160}>
        <OLBadge x={56} y={330} delay={Math.round((B.estica) * FPS)} from="left" accent
          top="a fatia estica" bottom="resumo · flashcards · questões" />
        <OLBadge x={580} y={1140} delay={Math.round(B.assist * FPS)} from="right"
          top="💬 assistente lê a tela" bottom="responde ali mesmo" />
      </OLPhone>

      {/* cronograma com as horas que você TEM */}
      <OLPhone t={t} range={SC.crono} src="rec/ol_plano.mp4" startFrom={270}>
        <OLBadge x={56} y={330} delay={Math.round((B.crono + 0.5) * FPS)} from="left" accent
          top="o plano com as horas que você TEM" bottom="objetivo · prova · sua semana real" />
        <OLBadge x={580} y={1140} delay={Math.round(B.mapa * FPS)} from="right"
          top="🧠 mapa mental navegável" bottom="com marcos" />
      </OLPhone>

      {/* a mesma fatia valendo o dobro */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.dobro) }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 620, textAlign: 'center' }}>
          <div style={{ fontFamily: BODY, fontSize: 27, color: O_MUT }}>+530 cursos · +9.000 livros</div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 40, marginTop: 44 }}>
            <div>
              <div style={{ width: 130, height: 120, borderRadius: 16, background: '#eceff3' }} />
              <div style={{ fontFamily: BODY, fontSize: 20, color: O_MUT, marginTop: 10 }}>sua fatia</div>
            </div>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: O_RED, paddingBottom: 40 }}>→</span>
            <div>
              <div style={{
                width: 130, borderRadius: 16, background: O_RED,
                height: 120 + 120 * clamp01((t - (B.dobro - 0.6)) / 0.8),
                boxShadow: '0 18px 44px -12px rgba(224,45,45,0.45)',
              }} />
              <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 22, color: O_RED, marginTop: 10 }}>valendo o dobro</div>
            </div>
          </div>
        </div>
      </div>

      <OLHero t={t} range={SC.cta} line1="mais horas, não." line2="horas que rendem." size={66} redAfterSec={1.3} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c37.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
