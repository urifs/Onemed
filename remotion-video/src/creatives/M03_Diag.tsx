import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { MedufBg, MLogo, MBadge, MPhone, MHero, MNumbers, MEndCard, M_BLUE, M_NAVY, M_MUT, M_GREEN, M_RED, M_BG, WHITE } from './meduf';
import timing from './timings/m03.json';

const T = timing as Timing;
const DELAY = 0.7;
export const M03_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  painel: DELAY + 1.81,
  fila: DELAY + 3.46,
  medo: DELAY + 5.86,
  passar: DELAY + 8.23,
  cansaco: DELAY + 10.16,
  dor: DELAY + 11.63,
  conheci: DELAY + 14.83,
  digitei: DELAY + 16.72,
  idade: DELAY + 17.61,
  queixa: DELAY + 19.32,
  segundos: DELAY + 21.65,
  hipoteses: DELAY + 22.71,
  gpt: DELAY + 27.35,
  claude: DELAY + 28.2,
  gemini: DELAY + 28.57,
  concordam: DELAY + 31.17,
  divergem: DELAY + 32.23,
  pubmed: DELAY + 33.93,
  sus: DELAY + 35.36,
  aHipotese: DELAY + 38.34,   // "a hipótese que não me veio à cabeça"
  valida: DELAY + 41.02,
  n10k: DELAY + 45.01,
  n27: DELAY + 46.61,
  hora: DELAY + 48.19,
  painel2: DELAY + 49.72,     // callback
  nenhuma: DELAY + 51.69,
  seVoce: DELAY + 54.16,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  painel: [0, B.conheci - 0.3] as Range,
  logo: [B.conheci - 0.3, B.digitei + 0.4] as Range,
  typing: [B.digitei + 0.4, B.segundos + 0.5] as Range,
  consenso: [B.segundos + 0.5, B.hipoteses + 1.9] as Range,
  result: [B.hipoteses + 1.9, B.valida - 0.4] as Range,
  decide: [B.valida - 0.4, B.n10k - 0.4] as Range,
  numeros: [B.n10k - 0.4, B.painel2] as Range,
  callback: [B.painel2, B.seVoce + 0.5] as Range,
  hero: [B.seVoce + 0.5, B.end + 1.0] as Range,
};

/* ══ painel de senhas ════════════════════════════════════════════════════ */
const Painel: React.FC<{ t: number; startSec: number; healed?: boolean }> = ({ t, startSec, healed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - Math.round(startSec * FPS), fps, config: { damping: 15, stiffness: 70 }, from: 0, to: 1 });
  const el = Math.max(0, t - startSec);
  const senha = 47 + Math.floor(el / 1.6) + (healed ? 4 : 0);
  const blink = 0.7 + 0.3 * Math.sin(el * 6);
  return (
    <div style={{
      position: 'absolute', left: 90, right: 90, top: 470,
      transform: `translateY(${(1 - s) * 80}px)`, opacity: s,
      background: '#0b1322', borderRadius: 26, padding: '38px 44px',
      boxShadow: '0 40px 100px -28px rgba(0,0,0,0.75)',
      border: '1.5px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: BODY, fontSize: 21, color: 'rgba(255,255,255,0.45)', letterSpacing: 4, textTransform: 'uppercase' }}>
          pronto-socorro · senha
        </span>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, color: 'rgba(255,255,255,0.6)' }}>04:12</span>
      </div>
      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <span style={{
          fontFamily: MONO, fontWeight: 700, fontSize: 130,
          color: healed ? '#2ee6a8' : '#ff5252',
          opacity: blink,
          textShadow: healed ? '0 0 50px rgba(46,230,168,0.4)' : '0 0 50px rgba(255,82,82,0.4)',
        }}>
          A0{senha}
        </span>
        {healed && (
          <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: '#2ee6a8', marginLeft: 20 }}>✓</span>
        )}
      </div>
      <div style={{ textAlign: 'center', marginTop: 8, fontFamily: BODY, fontSize: 24, color: 'rgba(255,255,255,0.5)' }}>
        {healed ? 'o plantão segue — nenhuma hipótese pra trás' : '40 pacientes aguardando'}
      </div>
    </div>
  );
};

const S1: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.painel, true);
  const frame = useCurrentFrame();
  // prontuário escorregando
  const slip = clamp01((t - B.passar) / 1.2);
  const medoOp = interpolate(t, [B.medo + 0.3, B.medo + 0.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(14,27,51,0.9)' }} />
      <Painel t={t} startSec={0.35} />
      {/* pilha de prontuários */}
      <div style={{ position: 'absolute', left: '50%', top: 1000, transform: 'translateX(-50%)', width: 460, height: 190 }}>
        {[0, 1, 2, 3].map(i => {
          const isTop = i === 3;
          const rot = isTop ? slip * 26 : 0;
          const dy = isTop ? slip * 46 : 0;
          const dx = isTop ? slip * 120 : 0;
          const po = interpolate(frame, [12 + i * 6, 22 + i * 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{
              position: 'absolute', left: 40 + i * 6, top: 120 - i * 26,
              width: 380, height: 54, borderRadius: 10,
              transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`,
              transformOrigin: '85% 50%',
              opacity: po,
              background: isTop && slip > 0.3 ? 'rgba(224,36,36,0.25)' : 'rgba(255,255,255,0.1)',
              border: `1.5px solid ${isTop && slip > 0.3 ? 'rgba(224,36,36,0.7)' : 'rgba(255,255,255,0.18)'}`,
              display: 'flex', alignItems: 'center', paddingLeft: 20,
              fontFamily: BODY, fontSize: 19, color: 'rgba(255,255,255,0.6)',
            }}>
              {isTop ? 'dor abdominal — ?' : `prontuário ${14 - i * 3}`}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1260, textAlign: 'center', opacity: medoOp }}>
        <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: WHITE }}>
          deixar passar... <span style={{ color: M_RED }}>por cansaço.</span>
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

/* ══ callback: painel verde ══════════════════════════════════════════════ */
const S8: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.callback);
  const alinhaOp = interpolate(t, [B.nenhuma, B.nenhuma + 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(14,27,51,0.88)' }} />
      <Painel t={t} startSec={SC.callback[0]} healed />
      <div style={{ position: 'absolute', left: '50%', top: 1010, transform: 'translateX(-50%)', width: 460, height: 190 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            position: 'absolute', left: 40 + i * 6, top: 120 - i * 26,
            width: 380, height: 54, borderRadius: 10,
            opacity: alinhaOp,
            background: i === 3 ? 'rgba(46,230,168,0.16)' : 'rgba(255,255,255,0.1)',
            border: `1.5px solid ${i === 3 ? 'rgba(46,230,168,0.6)' : 'rgba(255,255,255,0.18)'}`,
            display: 'flex', alignItems: 'center', paddingLeft: 20,
            fontFamily: BODY, fontSize: 19, color: i === 3 ? '#2ee6a8' : 'rgba(255,255,255,0.6)',
          }}>
            {i === 3 ? '✓ dor abdominal — hipóteses conferidas' : `prontuário ${14 - i * 3}`}
          </div>
        ))}
      </div>
    </div>
  );
};

export const M03_Diag: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <MedufBg />
      <S1 t={t} />
      <S2 t={t} />

      {/* preenchendo idade/sexo/queixa */}
      <MPhone t={t} range={SC.typing} src="rec/mg_diag.mp4" startFrom={150}>
        <MBadge x={56} y={330} delay={Math.round((SC.typing[0] + 0.4) * FPS)} from="left" accent
          top="Diagnóstico Rápido" bottom="idade · sexo · queixa, do seu jeito" />
      </MPhone>

      {/* consenso rodando */}
      <MPhone t={t} range={SC.consenso} src="rec/mg_diag.mp4" startFrom={405}>
        <MBadge x={600} y={500} delay={Math.round((SC.consenso[0] + 0.4) * FPS)} from="right"
          top="Consenso Meduf" bottom="3 IAs no mesmo caso" />
      </MPhone>

      {/* diagnósticos diferenciais reais */}
      <MPhone t={t} range={SC.result} src="rec/mg_diag.mp4" startFrom={770}>
        <MBadge x={56} y={330} delay={Math.round((SC.result[0] + 0.3) * FPS)} from="left" green
          top="✓ Hipóteses ordenadas" bottom="por probabilidade, com conduta" />
        <MBadge x={620} y={520} delay={Math.round(B.gpt * FPS)} from="right" top="GPT · Claude · Gemini" />
        <MBadge x={56} y={680} delay={Math.round(B.concordam * FPS)} from="left"
          top="✓ concordam · ⚠ divergem" />
        <MBadge x={600} y={840} delay={Math.round(B.pubmed * FPS)} from="right"
          top="PubMed · SUS" bottom="referência em cada conduta" />
        <MBadge x={56} y={1010} delay={Math.round(B.aHipotese * FPS)} from="left" accent
          top="a hipótese que você não pensou" bottom="tá na lista." />
      </MPhone>

      <MHero t={t} range={SC.decide} line1="ela lista. você valida." line2="quem decide é você." size={64} blueAfterSec={1.7} />

      <MNumbers t={t} range={SC.numeros}
        atFirstSec={B.n10k} atSecondSec={B.n27} atPillSec={B.hora}
        pillText={<>🩺 a qualquer hora do plantão</>} />

      <S8 t={t} />

      <MHero t={t} range={SC.hero} line1="se o plantão das 4h te assusta..." line2="isso aqui é pra você." size={62} blueAfterSec={1.6} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={56} highlight={M_BLUE} />
      <MEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/m03.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
