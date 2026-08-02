import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, ClipAt, Range } from './story';
import { MedufBg, MLogo, MBadge, MEndCard, M_BLUE, M_NAVY, M_MUT, M_GREEN, M_RED, M_BG, M_LIGHT, WHITE } from './meduf';
import { PhoneFrame } from './DeviceFrames';
import timing from './timings/m09.json';

const T = timing as Timing;
const DELAY = 0.7;
export const M09_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  estranha: DELAY + 1.51,
  licenca: DELAY + 3.91,
  olhou: DELAY + 5.16,
  s20: DELAY + 6.95,
  mensagem: DELAY + 10.64,
  riscou: DELAY + 15.74,
  trocou: DELAY + 17.51,
  nuncaSoube: DELAY + 19.3,
  naquele: DELAY + 23.09,
  gpt: DELAY + 27.11,
  claude: DELAY + 28.03,
  gemini: DELAY + 28.41,
  liam: DELAY + 29.06,
  milhoes: DELAY + 31.25,
  apontaram: DELAY + 34.48,
  atencao: DELAY + 38.75,
  leu: DELAY + 40.61,
  conferiu: DELAY + 42.11,
  decidiu: DELAY + 43.66,
  dela: DELAY + 45.21,
  soVi: DELAY + 48.33,
  cuidado: DELAY + 52.08,
  doutor: DELAY + 56.58,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  mesa: [0, B.naquele - 0.4] as Range,
  reveal: [B.naquele - 0.4, B.leu - 0.5] as Range,
  tresPalavras: [B.leu - 0.5, B.soVi - 0.3] as Range,
  cuidado: [B.soVi - 0.3, B.doutor - 0.4] as Range,
  doutor: [B.doutor - 0.4, B.end + 1.0] as Range,
};

/* ══ a receita do paciente ═══════════════════════════════════════════════ */
const Receita: React.FC<{ t: number; startSec: number; showFix?: boolean }> = ({ t, startSec, showFix }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - Math.round(startSec * FPS), fps, config: { damping: 16, stiffness: 55 }, from: 0, to: 1 });
  const strike = clamp01((t - B.riscou) / 0.7);
  const novaOp = interpolate(t, [B.trocou, B.trocou + 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute', left: '50%', top: 560,
      transform: `translateX(-50%) translateY(${(1 - s) * 70}px) rotate(-1deg)`,
      opacity: s,
      width: 720, borderRadius: 18, background: WHITE,
      boxShadow: '0 40px 100px -28px rgba(14,27,51,0.35)',
      padding: '40px 48px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `2px solid ${M_LIGHT}`, paddingBottom: 14 }}>
        <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 36, color: M_NAVY }}>℞</span>
        <span style={{ fontFamily: BODY, fontSize: 17, color: M_MUT, letterSpacing: 3, textTransform: 'uppercase' }}>receituário</span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 25, color: M_NAVY, lineHeight: 2.1, marginTop: 18 }}>
        <div>1. Anticoagulante oral — 1x/dia</div>
        <div style={{ position: 'relative', color: strike > 0.5 ? M_MUT : M_NAVY }}>
          2. Antiarrítmico 200 mg — 1x/dia
          <div style={{
            position: 'absolute', left: -4, top: '52%', height: 3, borderRadius: 2,
            width: `${strike * 102}%`, background: M_RED,
          }} />
        </div>
        <div style={{ opacity: novaOp, color: showFix ? M_GREEN : M_NAVY }}>
          3. Ajuste: dose reduzida + INR seriado {showFix ? '✓' : ''}
        </div>
      </div>
    </div>
  );
};

/* ══ S1 — a consulta, vista do outro lado da mesa ════════════════════════ */
const S1: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const op = sceneOpacity(t, SC.mesa, true);
  const topOp = interpolate(frame, [3, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // o contador de 20s
  const cAt = B.s20 - 0.4;
  const cEl = Math.max(0, t - cAt);
  const cVal = Math.min(20, cEl * 20 / 13);   // chega em 20 perto do "nunca soube"
  const cOp = interpolate(t, [cAt, cAt + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const msgOp = interpolate(t, [B.mensagem, B.mensagem + 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center', opacity: topOp }}>
        <div style={{ fontFamily: BODY, fontSize: 24, color: M_MUT, letterSpacing: 6, textTransform: 'uppercase' }}>
          a consulta · pelo olhar do paciente
        </div>
      </div>
      <Receita t={t} startSec={0.5} />
      {/* o "celular da médica": contador dos 20 segundos */}
      <div style={{
        position: 'absolute', left: '50%', top: 1130, transform: 'translateX(-50%)',
        opacity: cOp, display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r="47" fill="none" stroke={M_LIGHT} strokeWidth="9" />
          <circle cx="55" cy="55" r="47" fill="none" stroke={M_BLUE} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 47}
            strokeDashoffset={2 * Math.PI * 47 * (1 - cVal / 20)}
            transform="rotate(-90 55 55)" />
          <text x="55" y="64" textAnchor="middle" fontFamily={MONO} fontWeight="700" fontSize="30" fill={M_NAVY}>{Math.floor(cVal)}s</text>
        </svg>
        <div style={{ fontFamily: BODY, fontSize: 24, color: M_MUT, textAlign: 'left', opacity: msgOp }}>
          mensagem?<br />distração?
        </div>
      </div>
    </div>
  );
};

/* ══ S2 — o que aconteceu nos 20 segundos ════════════════════════════════ */
const S2: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.reveal);
  const base = Math.round(SC.reveal[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 16, stiffness: 60 }, from: 0, to: 1 });
  const atencaoOp = interpolate(t, [B.atencao - 0.4, B.atencao], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center' }}>
        <div style={{ fontFamily: BODY, fontSize: 23, color: M_MUT, letterSpacing: 5, textTransform: 'uppercase' }}>
          o que ele nunca viu
        </div>
      </div>
      <div style={{
        position: 'absolute', left: '50%', top: 400,
        transform: `translateX(-50%) translateY(${(1 - s) * 80}px)`,
        opacity: s,
      }}>
        <ClipAt fromSec={SC.reveal[0]}>
          <PhoneFrame src="rec/mf_inter.mp4" width={560} startFrom={885} playbackRate={0.8} statusDark />
        </ClipAt>
      </div>
      <MBadge x={600} y={480} delay={Math.round(B.gpt * FPS)} from="right" top="GPT" bottom="OpenAI" />
      <MBadge x={620} y={630} delay={Math.round(B.claude * FPS)} from="right" top="Claude" bottom="Anthropic" />
      <MBadge x={600} y={780} delay={Math.round(B.gemini * FPS)} from="right" top="Gemini" bottom="Google" />
      <MBadge x={56} y={520} delay={Math.round(B.milhoes * FPS)} from="left" accent
        top="35 milhões de artigos" bottom="conferidos naqueles 20s" />
      <MBadge x={56} y={950} delay={Math.round((B.apontaram + 0.8) * FPS)} from="left"
        top="⚠ dois remédios, juntos" bottom="pediam atenção" />
    </div>
  );
};

/* ══ S3 — Leu. Conferiu. Decidiu. ════════════════════════════════════════ */
const S3: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.tresPalavras);
  const W = [
    { w: 'Leu.', at: B.leu },
    { w: 'Conferiu.', at: B.conferiu },
    { w: 'Decidiu.', at: B.decidiu },
  ];
  const delaOp = interpolate(t, [B.dela + 0.4, B.dela + 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center' }}>
        {W.map((x, i) => {
          const o = interpolate(t, [x.at, x.at + 0.25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const sc = 0.85 + o * 0.15;
          return (
            <div key={i} style={{
              fontFamily: HEAD, fontWeight: 900, fontSize: 92,
              color: i === 2 ? M_BLUE : M_NAVY,
              letterSpacing: -3, lineHeight: 1.35,
              opacity: o, transform: `scale(${sc})`,
            }}>{x.w}</div>
          );
        })}
        <div style={{ fontFamily: BODY, fontSize: 30, color: M_MUT, marginTop: 34, opacity: delaOp }}>
          a decisão... sempre foi dela.
        </div>
      </div>
    </div>
  );
};

/* ══ S4 — cuidado de verdade ═════════════════════════════════════════════ */
const S4: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.cuidado);
  const frase = interpolate(t, [B.cuidado, B.cuidado + 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <Receita t={t} startSec={SC.cuidado[0]} showFix />
      <div style={{ position: 'absolute', left: 70, right: 70, top: 1140, textAlign: 'center', opacity: frase }}>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 37, color: M_NAVY, lineHeight: 1.4 }}>
          cuidado de verdade, às vezes...<br />
          <span style={{ color: M_BLUE }}>é o que a gente nunca vê.</span>
        </div>
      </div>
    </div>
  );
};

/* ══ S5 — Doutor ═════════════════════════════════════════════════════════ */
const S5: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.doutor);
  const base = Math.round(SC.doutor[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 14, stiffness: 75 }, from: 0.88, to: 1 });
  const o = interpolate(frame - base, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 60, right: 60, top: 720, textAlign: 'center', opacity: o, transform: `scale(${s})` }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 84, color: M_NAVY, letterSpacing: -2 }}>
          Doutor:
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 44, color: M_BLUE, marginTop: 22 }}>
          esses 20 segundos existem.
        </div>
      </div>
    </div>
  );
};

export const M09_Paciente: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <MedufBg />
      <S1 t={t} />
      <S2 t={t} />
      <S3 t={t} />
      <S4 t={t} />
      <S5 t={t} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1620} size={54} highlight={M_BLUE} />
      <MEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/m09.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
