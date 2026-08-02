import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { MedufBg, MLogo, MBadge, MPhone, MHero, MNumbers, MEndCard, M_BLUE, M_NAVY, M_MUT, M_GREEN, M_RED, WHITE } from './meduf';
import timing from './timings/m04.json';

const T = timing as Timing;
const DELAY = 0.7;
export const M04_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  ubs: DELAY + 1.69,
  papel: DELAY + 4.58,
  cardio: DELAY + 7.15,
  semanas: DELAY + 9.77,
  encarando: DELAY + 11.5,
  vendo: DELAY + 12.6,
  conheci: DELAY + 14.98,
  fotografei: DELAY + 16.65,
  laudo: DELAY + 19.78,       // "um laudo assistido"
  ritmo: DELAY + 20.89,
  conferir: DELAY + 24.49,
  gpt: DELAY + 26.97,
  claude: DELAY + 27.71,
  gemini: DELAY + 28.14,
  concordam: DELAY + 29.44,
  divergem: DELAY + 30.74,
  pubmed: DELAY + 32.38,
  sus: DELAY + 33.93,
  assina: DELAY + 34.62,
  n10k: DELAY + 37.43,
  n27: DELAY + 38.88,
  hora: DELAY + 40.38,
  papel2: DELAY + 41.43,      // callback
  marcados: DELAY + 43.87,
  segura: DELAY + 46.17,
  seVoce: DELAY + 47.09,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  mesa: [0, B.conheci - 0.3] as Range,
  logo: [B.conheci - 0.3, B.fotografei + 0.5] as Range,
  upload: [B.fotografei + 0.5, B.laudo + 0.8] as Range,
  result: [B.laudo + 0.8, B.assina - 0.3] as Range,
  decide: [B.assina - 0.3, B.n10k - 0.4] as Range,
  numeros: [B.n10k - 0.4, B.papel2] as Range,
  callback: [B.papel2, B.seVoce + 0.6] as Range,
  hero: [B.seVoce + 0.6, B.end + 1.0] as Range,
};

/* ══ o papel milimetrado (imagem real enviada pra IA) ════════════════════ */
const EcgPaper: React.FC<{ t: number; startSec: number; marked?: boolean }> = ({ t, startSec, marked }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - Math.round(startSec * FPS), fps, config: { damping: 15, stiffness: 70 }, from: 0, to: 1 });
  const LABELS: Array<{ txt: string; x: number; y: number; at: number }> = marked ? [
    { txt: 'Ritmo sinusal ✓', x: 40, y: -34, at: B.marcados },
    { txt: 'FC ~75 bpm ✓', x: 420, y: -34, at: B.marcados + 0.5 },
    { txt: 'intervalos normais ✓', x: 180, y: 470, at: B.marcados + 1.0 },
  ] : [];
  return (
    <div style={{
      position: 'absolute', left: '50%', top: 540,
      transform: `translateX(-50%) translateY(${(1 - s) * 80}px) rotate(-1.6deg)`,
      opacity: s,
      width: 860, borderRadius: 14, overflow: 'visible',
      boxShadow: '0 40px 100px -28px rgba(14,27,51,0.5)',
      background: WHITE, padding: 14,
    }}>
      <Img src={staticFile('rec/ecg_strip.png')} style={{ width: '100%', borderRadius: 8, display: 'block' }} />
      {LABELS.map((l, i) => {
        const o = interpolate(t, [l.at, l.at + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{
            position: 'absolute', left: l.x, top: l.y, opacity: o,
            transform: `translateY(${(1 - o) * 16}px)`,
            background: 'rgba(14,159,110,0.95)', borderRadius: 12,
            padding: '10px 20px', fontFamily: HEAD, fontWeight: 800, fontSize: 24, color: WHITE,
            boxShadow: '0 12px 32px -8px rgba(14,159,110,0.5)',
          }}>{l.txt}</div>
        );
      })}
    </div>
  );
};

const S1: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.mesa, true);
  const semOp = interpolate(t, [B.cardio + 0.3, B.cardio + 0.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const qp = t - B.encarando;
  const qPulse = qp > 0 ? 1 + Math.sin(qp * 5) * 0.12 : 1;
  const qOp = qp > 0 ? Math.min(1, qp / 0.3) : 0;
  const topOp = interpolate(t, [0.3, 0.9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(14,27,51,0.55)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 400, textAlign: 'center', opacity: topOp }}>
        <div style={{ fontFamily: BODY, fontSize: 25, color: 'rgba(255,255,255,0.75)', letterSpacing: 6, textTransform: 'uppercase' }}>
          07:30 · UBS do interior
        </div>
      </div>
      <EcgPaper t={t} startSec={B.papel - 1.0} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1120, display: 'flex', justifyContent: 'center', opacity: semOp }}>
        <div style={{
          background: 'rgba(224,36,36,0.13)', border: '1.5px solid rgba(224,36,36,0.5)',
          borderRadius: 999, padding: '14px 36px',
          fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: WHITE,
        }}>
          cardiologista mais perto: <span style={{ color: '#ff8a80' }}>daqui a 2 semanas</span>
        </div>
      </div>
      <div style={{
        position: 'absolute', left: '50%', top: 1230, transform: `translateX(-50%) scale(${qPulse})`,
        opacity: qOp,
      }}>
        <div style={{
          width: 110, height: 110, borderRadius: 999,
          background: 'rgba(224,36,36,0.16)', border: `4px solid ${M_RED}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: HEAD, fontWeight: 900, fontSize: 60, color: '#ff8a80',
          boxShadow: `0 0 ${36 * qPulse}px rgba(224,36,36,0.45)`,
        }}>?</div>
      </div>
    </div>
  );
};

const S2: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.logo);
  const base = Math.round(SC.logo[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 12, stiffness: 95 }, from: 0.6, to: 1 });
  const o = interpolate(frame - base, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 840, display: 'flex', justifyContent: 'center', opacity: o, transform: `scale(${s})` }}>
        <MLogo size={118} row={false} />
      </div>
    </div>
  );
};

const S8: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.callback);
  const calmaOp = interpolate(t, [B.segura, B.segura + 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <EcgPaper t={t} startSec={SC.callback[0]} marked />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1140, textAlign: 'center', opacity: calmaOp }}>
        <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: M_NAVY }}>
          encaminhada <span style={{ color: M_GREEN }}>com segurança.</span>
        </span>
      </div>
    </div>
  );
};

export const M04_Ecg: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <MedufBg />
      <S1 t={t} />
      <S2 t={t} />

      {/* contexto + upload do traçado */}
      <MPhone t={t} range={SC.upload} src="rec/mg_ecg.mp4" startFrom={165}>
        <MBadge x={56} y={330} delay={Math.round((SC.upload[0] + 0.4) * FPS)} from="left" accent
          top="Análise de ECG" bottom="fotografa · envia · confere" />
      </MPhone>

      {/* laudo assistido real (Ritmo Sinusal) */}
      <MPhone t={t} range={SC.result} src="rec/mg_ecg.mp4" startFrom={790} playbackRate={0.55}>
        <MBadge x={56} y={330} delay={Math.round((B.laudo + 0.9) * FPS)} from="left" green
          top="✓ Laudo assistido" bottom="ritmo · FC · eixo · intervalos" />
        <MBadge x={620} y={520} delay={Math.round(B.conferir * FPS)} from="right"
          top="ponto a ponto" bottom="pra você conferir" />
        <MBadge x={600} y={690} delay={Math.round(B.gpt * FPS)} from="right"
          top="GPT · Claude · Gemini" bottom="3 IAs em consenso" />
        <MBadge x={56} y={860} delay={Math.round(B.concordam * FPS)} from="left"
          top="✓ concordam · ⚠ divergem" />
        <MBadge x={590} y={1020} delay={Math.round(B.pubmed * FPS)} from="right" accent
          top="PubMed · SUS" bottom="referência em cada achado" />
      </MPhone>

      <MHero t={t} range={SC.decide} line1="quem assina..." line2="é você." size={80} blueAfterSec={1.1} />

      <MNumbers t={t} range={SC.numeros}
        atFirstSec={B.n10k} atSecondSec={B.n27} atPillSec={B.hora}
        pillText={<>🩺 a qualquer hora · em qualquer UBS</>} />

      <S8 t={t} />

      <MHero t={t} range={SC.hero} line1="se um traçado já te encarou..." line2="isso aqui é pra você." size={62} blueAfterSec={1.5} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={56} highlight={M_BLUE} />
      <MEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/m04.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
