import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, ClipAt, Range } from './story';
import { MedufBg, MBadge, MEndCard, MHero, M_BLUE, M_NAVY, M_MUT, M_GREEN, M_RED, M_LIGHT, WHITE } from './meduf';
import { PhoneFrame } from './DeviceFrames';
import timing from './timings/m11.json';

const T = timing as Timing;
const DELAY = 0.7;
export const M11_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  pergunta: DELAY + 0.2,
  errada: DELAY + 3.6,
  certa: DELAY + 4.36,
  devolve: DELAY + 5.93,
  fazConta: DELAY + 8.08,
  busca: DELAY + 9.24,
  confere: DELAY + 11.87,
  eletro: DELAY + 15.11,
  meduf: DELAY + 17.38,
  gpt: DELAY + 19.47,
  concordam: DELAY + 22.32,
  divergem: DELAY + 23.59,
  milhoes: DELAY + 24.95,
  sus: DELAY + 28.9,
  pcdt: DELAY + 29.59,
  f17: DELAY + 31.03,
  regra: DELAY + 32.86,
  valida: DELAY + 34.37,
  decide: DELAY + 35.74,
  k10: DELAY + 37.1,
  entenderam: DELAY + 39.98,
  naoSubstitui: DELAY + 40.84,
  madrugada: DELAY + 44.55,
  referencia: DELAY + 46.1,
  sozinho: DELAY + 47.54,
  insubst: DELAY + 48.81,
  tempo: DELAY + 50.5,
  tira: DELAY + 51.89,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  pergunta: [0, B.certa - 0.2] as Range,
  certa: [B.certa - 0.2, B.fazConta + 0.4] as Range,
  friccao: [B.fazConta + 0.4, B.meduf + 0.5] as Range,
  evidencia: [B.meduf + 0.5, B.regra - 0.3] as Range,
  regra: [B.regra - 0.3, B.k10 + 0.2] as Range,
  assinatura: [B.k10 + 0.2, B.insubst - 0.2] as Range,
  punch: [B.insubst - 0.2, B.end + 1.0] as Range,
};

/* carimbo */
const Stamp: React.FC<{ atSec: number; text: string; color: string }> = ({ atSec, text, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - Math.round(atSec * FPS);
  if (lf < 0) return null;
  const s = spring({ frame: lf, fps, config: { damping: 11, stiffness: 220 }, from: 2.1, to: 1 });
  const op = interpolate(lf, [0, 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute', left: '50%', top: 990,
      transform: `translateX(-50%) rotate(-8deg) scale(${s})`,
      opacity: op * 0.95,
      border: `6px solid ${color}`, borderRadius: 14, padding: '12px 34px',
      fontFamily: HEAD, fontWeight: 900, fontSize: 46, color,
      letterSpacing: 3, whiteSpace: 'nowrap',
      background: 'rgba(255,255,255,0.9)',
      boxShadow: `0 20px 60px -20px ${color}66`,
    }}>
      {text}
    </div>
  );
};

/* S1 — a pergunta + carimbo */
const S1: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.pergunta, true);
  const s = spring({ frame, fps, config: { damping: 15, stiffness: 70 }, from: 0, to: 1 });
  const dt = t - B.errada;
  const shake = dt > 0 && dt < 0.3 ? Math.sin(dt * 85) * 6 * (1 - dt / 0.3) : 0;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op, transform: `translateX(${shake}px)` }}>
      <div style={{
        position: 'absolute', left: 70, right: 70, top: 560,
        transform: `translateY(${(1 - s) * 70}px)`, opacity: s,
        background: M_NAVY, borderRadius: 28, padding: '70px 54px',
        boxShadow: '0 40px 110px -28px rgba(14,27,51,0.6)',
        textAlign: 'center',
      }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: WHITE, lineHeight: 1.25, letterSpacing: -1 }}>
          "a IA vai substituir<br />o médico?"
        </div>
      </div>
      <Stamp atSec={B.errada - 0.15} text="PERGUNTA ERRADA" color={M_RED} />
    </div>
  );
};

/* S3 — as fricções que ela devolve */
const FRICCOES = [
  { txt: '1 dúvida = 1 hora de busca', at: B.busca },
  { txt: '1 interação = 3 fontes pra conferir', at: B.confere },
  { txt: '1 eletro = esperando um colega', at: B.eletro },
];
const S3: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.friccao);
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 460, textAlign: 'center' }}>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: M_NAVY }}>faz a conta:</div>
      </div>
      <div style={{ position: 'absolute', left: 90, right: 90, top: 600 }}>
        {FRICCOES.map((f, i) => {
          const o = interpolate(t, [f.at, f.at + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{
              opacity: o, transform: `translateX(${(1 - o) * 40}px)`,
              background: WHITE, borderRadius: 18, padding: '26px 32px',
              marginBottom: 20, display: 'flex', alignItems: 'center', gap: 18,
              boxShadow: '0 18px 50px -16px rgba(14,27,51,0.25)',
              border: '1.5px solid rgba(14,27,51,0.08)',
            }}>
              <span style={{ fontSize: 34 }}>⏳</span>
              <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 30, color: '#3d4a61' }}>{f.txt}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* S6 — a assinatura: o que ela substitui de verdade */
const SUBS = [
  { txt: 'a madrugada no buscador', at: B.madrugada },
  { txt: 'a dúvida sem referência', at: B.referencia },
  { txt: 'o decidir sozinho', at: B.sozinho },
];
const S6: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.assinatura);
  const base = Math.round(SC.assinatura[0] * FPS);
  const kOp = interpolate(frame - base, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const naoOp = interpolate(t, [B.naoSubstitui + 0.4, B.naoSubstitui + 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 430, textAlign: 'center', opacity: kOp }}>
        <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 26, color: M_MUT }}>
          +10.000 médicos, nos 27 estados, já entenderam:
        </div>
      </div>
      <div style={{ position: 'absolute', left: 60, right: 60, top: 540, textAlign: 'center', opacity: naoOp }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 58, color: M_NAVY, letterSpacing: -1.5 }}>
          a IA <span style={{ color: M_RED }}>não</span> substitui o médico.
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: M_MUT, marginTop: 16 }}>substitui:</div>
      </div>
      <div style={{ position: 'absolute', left: 110, right: 110, top: 790 }}>
        {SUBS.map((x, i) => {
          const o = interpolate(t, [x.at, x.at + 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const strike = clamp01((t - x.at - 0.25) / 0.35);
          return (
            <div key={i} style={{ position: 'relative', opacity: o, padding: '16px 0', textAlign: 'center' }}>
              <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 38, color: '#3d4a61' }}>{x.txt}</span>
              <div style={{
                position: 'absolute', left: '8%', top: '50%', height: 4, borderRadius: 2,
                width: `${strike * 84}%`, background: M_BLUE,
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const M11_Objecao: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <MedufBg />
      <S1 t={t} />

      <MHero t={t} range={SC.certa} line1="a pergunta certa:" line2="quantas horas ela devolve?" size={58} blueAfterSec={1.4} />

      <S3 t={t} />

      {/* evidência: a plataforma real */}
      <div>
        {(() => {
          const op = sceneOpacity(t, SC.evidencia);
          if (op <= 0) return null;
          return (
            <div style={{ position: 'absolute', inset: 0, opacity: op }}>
              <div style={{
                position: 'absolute', left: '50%', top: 330,
                transform: 'translateX(-50%)',
              }}>
                <ClipAt fromSec={SC.evidencia[0]}>
                  <PhoneFrame src="rec/mf_inter.mp4" width={560} startFrom={885} playbackRate={0.9} statusDark />
                </ClipAt>
              </div>
              <MBadge x={56} y={430} delay={Math.round(B.gpt * FPS)} from="left"
                top="GPT · Claude · Gemini" bottom="cruzadas num consenso" />
              <MBadge x={620} y={620} delay={Math.round(B.concordam * FPS)} from="right" green top="✓ concordam" />
              <MBadge x={640} y={770} delay={Math.round(B.divergem * FPS)} from="right" top="⚠ divergem" />
              <MBadge x={56} y={940} delay={Math.round(B.milhoes * FPS)} from="left" accent
                top="PubMed · +35 milhões" />
              <MBadge x={580} y={1100} delay={Math.round(B.sus * FPS)} from="right"
                top="a língua do SUS" bottom="PCDT · RENAME" />
            </div>
          );
        })()}
      </div>

      <MHero t={t} range={SC.regra} line1="quem valida é você." line2="quem decide é você." size={62} blueAfterSec={B.decide - SC.regra[0]} />

      <S6 t={t} />

      <MHero t={t} range={SC.punch} line1="médico insubstituível." line2="tempo perdido, não." size={64} blueAfterSec={B.tempo - SC.punch[0]} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1620} size={54} highlight={M_BLUE} />
      <MEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/m11.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
