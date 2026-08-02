import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01, easeInOut } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { MedufBg, MLogo, MBadge, MPhone, MHero, MNumbers, MEndCard, ConsensusCard, M_BLUE, M_NAVY, M_MUT, M_GREEN, M_RED, M_BG, WHITE } from './meduf';
import timing from './timings/m05.json';

const T = timing as Timing;
const DELAY = 0.7;
export const M05_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  pilha: DELAY + 3.62,
  olho: DELAY + 5.89,
  linha: DELAY + 7.04,
  quase: DELAY + 11.37,
  potassio: DELAY + 13.05,     // o reveal
  seis2: DELAY + 13.88,
  perdoa: DELAY + 16.02,
  conheci: DELAY + 18.91,
  fotografei: DELAY + 20.8,
  extraiu: DELAY + 23.74,
  gritou: DELAY + 25.15,
  critico: DELAY + 25.92,
  ias: DELAY + 27.23,
  gpt: DELAY + 29.03,
  concordam: DELAY + 32.93,
  divergem: DELAY + 34.04,
  pubmed: DELAY + 35.73,
  sus: DELAY + 37.28,
  aponta: DELAY + 38.97,
  laudo2: DELAY + 43.07,       // "aquele mesmo laudo"
  circulo: DELAY + 44.28,
  visto: DELAY + 46.68,        // "Visto a tempo"
  n10k: DELAY + 48.37,
  n27: DELAY + 49.99,
  hora: DELAY + 51.4,
  seVoce: DELAY + 52.91,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  pilha: [0, B.conheci - 0.3] as Range,
  logo: [B.conheci - 0.3, B.fotografei + 0.7] as Range,
  upload: [B.fotografei + 0.7, B.extraiu + 0.9] as Range,
  result: [B.extraiu + 0.9, B.ias + 2.6] as Range,
  consenso: [B.ias + 2.6, B.aponta + 0.3] as Range,
  decide: [B.aponta + 0.3, B.laudo2 + 0.4] as Range,
  callback: [B.laudo2 + 0.4, B.n10k - 0.4] as Range,
  numeros: [B.n10k - 0.4, B.seVoce + 0.5] as Range,
  hero: [B.seVoce + 0.5, B.end + 1.0] as Range,
};

/* ══ o laudo (HTML, com a linha do potássio) ═════════════════════════════ */
const ROWS: Array<[string, string, string, boolean]> = [
  ['Hemoglobina', '13,1 g/dL', '13,0 – 17,0', false],
  ['Leucócitos', '11.900 /mm³', '4.000 – 10.000', false],
  ['Plaquetas', '208.000 /mm³', '150.000 – 400.000', false],
  ['Creatinina', '2,1 mg/dL', '0,7 – 1,2', false],
  ['Ureia', '88 mg/dL', '15 – 45', false],
  ['Potássio', '6,2 mEq/L', '3,5 – 5,1', true],
  ['Sódio', '133 mEq/L', '136 – 145', false],
  ['Glicose', '142 mg/dL', '70 – 99', false],
];

const LabCard: React.FC<{ t: number; startSec: number; scrollT?: number; ringAt: number; stampAt?: number }> =
({ t, startSec, scrollT = 0, ringAt, stampAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - Math.round(startSec * FPS), fps, config: { damping: 15, stiffness: 70 }, from: 0, to: 1 });
  const ringP = clamp01((t - ringAt) / 0.5);
  const stampP = stampAt ? clamp01((t - stampAt) / 0.35) : 0;
  const stampS = stampAt ? spring({ frame: frame - Math.round(stampAt * FPS), fps, config: { damping: 11, stiffness: 220 }, from: 2.0, to: 1 }) : 1;
  // rolagem rápida que desacelera até a linha do potássio
  const scroll = scrollT > 0 ? interpolate(t, [startSec + 0.8, scrollT], [0, -210], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (x) => easeInOut(x) }) : 0;
  return (
    <div style={{
      position: 'absolute', left: 80, right: 80, top: 470,
      transform: `translateY(${(1 - s) * 80}px) rotate(-1deg)`,
      opacity: s,
      background: WHITE, borderRadius: 16,
      boxShadow: '0 40px 100px -28px rgba(14,27,51,0.5)',
      padding: '34px 40px', overflow: 'hidden', height: 640,
    }}>
      <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 25, color: M_NAVY, letterSpacing: 1 }}>
        LABORATÓRIO · ANÁLISES CLÍNICAS
      </div>
      <div style={{ fontFamily: BODY, fontSize: 18, color: M_MUT, marginTop: 6, marginBottom: 18 }}>
        J.S.M. · 67 anos · coleta hoje 06:40
      </div>
      <div style={{ transform: `translateY(${scroll}px)` }}>
        {ROWS.map(([n, v, ref, isK], i) => (
          <div key={i} style={{
            position: 'relative',
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            padding: '13px 6px', borderBottom: '1.5px dashed #e6ebf4',
          }}>
            <span style={{ fontFamily: BODY, fontSize: 24, color: '#3d4a61', width: 260 }}>{n}</span>
            <span style={{ fontFamily: MONO, fontWeight: isK ? 700 : 400, fontSize: 24, color: isK ? M_RED : M_NAVY }}>{v}</span>
            <span style={{ fontFamily: BODY, fontSize: 19, color: M_MUT }}>{ref}</span>
            {isK && ringP > 0 && (
              <svg width="105%" height="74" viewBox="0 0 900 74" style={{ position: 'absolute', left: '-2%', top: -6, overflow: 'visible' }}>
                <ellipse cx="450" cy="37" rx="440" ry="33" fill="none" stroke={M_RED} strokeWidth="5"
                  strokeDasharray="2400" strokeDashoffset={2400 * (1 - ringP)}
                  style={{ filter: 'drop-shadow(0 0 8px rgba(224,36,36,0.5))' }} />
              </svg>
            )}
          </div>
        ))}
      </div>
      {stampAt && stampP > 0 && (
        <div style={{
          position: 'absolute', left: '50%', top: 300,
          transform: `translateX(-50%) rotate(-8deg) scale(${stampS})`,
          opacity: Math.min(1, stampP * 2) * 0.95,
          border: `6px solid ${M_GREEN}`, borderRadius: 14, padding: '12px 32px',
          fontFamily: HEAD, fontWeight: 900, fontSize: 42, color: M_GREEN,
          letterSpacing: 2, whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.85)',
        }}>
          VISTO A TEMPO ✓
        </div>
      )}
    </div>
  );
};

const S1: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.pilha, true);
  const topOp = interpolate(t, [0.3, 0.9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dt = t - B.perdoa;
  const shake = dt > 0 && dt < 0.3 ? Math.sin(dt * 80) * 5 * (1 - dt / 0.3) : 0;
  const perdoaOp = interpolate(t, [B.perdoa, B.perdoa + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op, transform: `translateX(${shake}px)` }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(14,27,51,0.55)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 396, textAlign: 'center', opacity: topOp }}>
        <div style={{ fontFamily: BODY, fontSize: 25, color: 'rgba(255,255,255,0.75)', letterSpacing: 6, textTransform: 'uppercase' }}>
          19:07 · a pilha de exames
        </div>
      </div>
      <LabCard t={t} startSec={B.pilha - 1.2} scrollT={B.potassio - 0.2} ringAt={B.seis2} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1180, textAlign: 'center', opacity: perdoaOp }}>
        <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 36, color: WHITE }}>
          o tipo de valor <span style={{ color: '#ff8a80' }}>que não perdoa.</span>
        </span>
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
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <LabCard t={t} startSec={SC.callback[0]} ringAt={B.circulo} stampAt={B.visto} />
    </div>
  );
};

export const M05_Lab: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <MedufBg />
      <S1 t={t} />
      <S2 t={t} />

      {/* foto do laudo + envio */}
      <MPhone t={t} range={SC.upload} src="rec/mg_lab.mp4" startFrom={165}>
        <MBadge x={56} y={330} delay={Math.round((SC.upload[0] + 0.4) * FPS)} from="left" accent
          top="Análise de Exames" bottom="fotografa o laudo · envia" />
      </MPhone>

      {/* extração real (Potássio 6,2 — Alto) */}
      <MPhone t={t} range={SC.result} src="rec/mg_lab.mp4" startFrom={720}>
        <MBadge x={56} y={330} delay={Math.round((B.extraiu + 1.0) * FPS)} from="left" green
          top="✓ Valores extraídos" bottom="cada linha, interpretada" />
        <MBadge x={560} y={520} delay={Math.round(B.critico * FPS)} from="right" accent
          top="⚠ Potássio 6,2 — crítico" bottom="apontado na hora" />
      </MPhone>

      <ConsensusCard t={t} range={SC.consenso}
        atConcordamSec={B.concordam} atDivergemSec={B.divergem}
        atPubmedSec={B.pubmed} atSusSec={B.sus} />

      <MHero t={t} range={SC.decide} line1="ela aponta." line2="quem decide é você." size={72} blueAfterSec={1.2} />

      <S8 t={t} />

      <MNumbers t={t} range={SC.numeros}
        atFirstSec={B.n10k} atSecondSec={B.n27} atPillSec={B.hora}
        pillText={<>🔬 a qualquer hora do dia</>} />

      <MHero t={t} range={SC.hero} line1="se o seu olho também cansa..." line2="isso aqui é pra você." size={64} blueAfterSec={1.5} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={56} highlight={M_BLUE} />
      <MEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/m05.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
