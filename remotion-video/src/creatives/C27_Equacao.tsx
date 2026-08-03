import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { AmbientBg, EndCard, useCountUp } from './common';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, MONO, GREEN, clamp01 } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import timing from './timings/c27.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C27_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  faz: DELAY + 0.1,
  n530: DELAY + 2.14,
  n9000: DELAY + 4.54,
  termo: DELAY + 6.86,
  multiplica: DELAY + 9.07,
  clique1: DELAY + 12.37,   // aula → resumo
  clique2: DELAY + 15.15,   // resumo → flashcard
  clique3: DELAY + 18.1,    // flashcard → questão
  duvida: DELAY + 22.65,    // assistente
  resultado: DELAY + 29.26,
  n10k: DELAY + 33.62,
  incognita: DELAY + 37.69,
  quanto: DELAY + 39.23,
  essa: DELAY + 41.83,
  end: DELAY + T.duration - 3.2,
};

const Big: React.FC<{ size?: number; color?: string; children: React.ReactNode; style?: React.CSSProperties }> =
({ size = 100, color = WHITE, children, style }) => (
  <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size, color, letterSpacing: -2, lineHeight: 1, ...style }}>{children}</span>
);

const Slam: React.FC<{ t: number; from: number; to: number; children: React.ReactNode }> = ({ t, from, to, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (t < from || t >= to) return null;
  const s = spring({ frame: frame - Math.round(from * FPS), fps, config: { damping: 13, stiffness: 190 }, from: 1.1, to: 1 });
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', transform: `scale(${s})`, padding: '0 50px' }}>
      {children}
    </div>
  );
};

/* linha da equação: A vira B (operando → resultado), com sinal */
const Line: React.FC<{ op: string; a: string; b: string }> = ({ op, a, b }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 22, justifyContent: 'center' }}>
    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 60, color: RED }}>{op}</span>
    <Big size={54} color={W60}>{a}</Big>
    <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 48, color: RED }}>→</span>
    <Big size={62} color={WHITE}>{b}</Big>
  </div>
);

export const C27_Equacao: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cursos = useCountUp(530, Math.round(B.n530 * FPS), 34);
  const livros = useCountUp(9000, Math.round(B.n9000 * FPS), 34);
  const medicos = useCountUp(10000, Math.round(B.n10k * FPS), 30);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={0.7} />

      <Slam t={t} from={B.faz} to={B.multiplica}>
        <Big size={30} color={W60} style={{ fontWeight: 700, letterSpacing: 3 }}>FAZ ESSA CONTA COMIGO</Big>
        <div style={{ marginTop: 30, display: 'flex', alignItems: 'baseline', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Big size={130} color={WHITE}>({t >= B.n530 ? cursos : '0'}</Big>
          <Big size={80} color={RED}>+</Big>
          <Big size={130} color={WHITE}>{t >= B.n9000 ? livros : '0'})</Big>
        </div>
        <Big size={26} color={W40} style={{ marginTop: 14, fontWeight: 600 }}>cursos + livros — só o primeiro termo</Big>
      </Slam>

      <Slam t={t} from={B.multiplica} to={B.resultado}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Big size={130} color={RED}>×</Big>
          <Big size={90} color={WHITE}>1 clique</Big>
        </div>
        <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', gap: 26 }}>
          {t >= B.clique1 && <Line op="=" a="aula" b="resumo" />}
          {t >= B.clique2 && <Line op="+" a="resumo" b="flashcard" />}
          {t >= B.clique3 && <Line op="+" a="flashcard" b="questão ✏" />}
        </div>
        {t >= B.duvida && (
          <div style={{ marginTop: 40, opacity: interpolate(t, [B.duvida, B.duvida + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
            <Big size={34} color={W60} style={{ fontWeight: 700 }}>💬 dúvida no meio? o assistente lê a tela</Big>
          </div>
        )}
      </Slam>

      <Slam t={t} from={B.resultado} to={B.incognita}>
        <Big size={40} color={W60} style={{ fontWeight: 700 }}>= revisão pronta</Big>
        <Big size={30} color={W40} style={{ marginTop: 14, fontWeight: 600 }}>antes de você terminar de grifar</Big>
        <Big size={92} color={WHITE} style={{ marginTop: 40 }}>{t >= B.n10k ? medicos : '0'}<span style={{ color: RED }}>+</span></Big>
        <Big size={26} color={W40} style={{ fontWeight: 600 }}>já resolveram essa equação</Big>
      </Slam>

      <Slam t={t} from={B.incognita} to={B.end + 1.2}>
        <Big size={44} color={W60} style={{ fontWeight: 700 }}>só sobra uma incógnita:</Big>
        <Big size={72} color={RED} style={{ marginTop: 24 }}>quanto vale o seu<br />tempo de revisão?</Big>
        <Big size={30} color={W40} style={{ marginTop: 28, fontWeight: 600 }}>essa, só você resolve.</Big>
      </Slam>

      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={52} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c27.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
