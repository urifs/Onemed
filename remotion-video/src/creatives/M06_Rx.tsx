import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { MedufBg, MLogo, MBadge, MPhone, MHero, MNumbers, MEndCard, ConsensusCard, M_BLUE, M_NAVY, M_MUT, M_GREEN, M_RED, WHITE } from './meduf';
import timing from './timings/m06.json';

const T = timing as Timing;
const DELAY = 0.7;
export const M06_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  raiox: DELAY + 2.77,
  semRadio: DELAY + 5.17,
  sombra: DELAY + 8.37,
  tudo: DELAY + 9.77,
  nada: DELAY + 11.19,
  sozinho: DELAY + 12.89,
  conheci: DELAY + 16.06,
  enviei: DELAY + 17.95,
  laudo: DELAY + 20.53,
  tecnica: DELAY + 21.58,
  achados: DELAY + 22.28,
  correlacao: DELAY + 23.11,
  conferir: DELAY + 25.68,
  ias: DELAY + 27.96,
  gpt: DELAY + 29.09,
  concordam: DELAY + 33.18,
  divergem: DELAY + 34.54,
  pubmed: DELAY + 36.85,
  sus: DELAY + 38.67,
  valida: DELAY + 39.94,
  n10k: DELAY + 44.18,
  n27: DELAY + 45.85,
  madrugada: DELAY + 48.1,
  imagem2: DELAY + 49.5,      // callback
  descritos: DELAY + 51.72,
  noite: DELAY + 53.22,
  seVoce: DELAY + 56.55,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  tela: [0, B.conheci - 0.3] as Range,
  logo: [B.conheci - 0.3, B.enviei + 0.5] as Range,
  upload: [B.enviei + 0.5, B.laudo + 0.7] as Range,
  result: [B.laudo + 0.7, B.ias + 0.9] as Range,
  consenso: [B.ias + 0.9, B.valida + 0.1] as Range,
  decide: [B.valida + 0.1, B.n10k - 0.4] as Range,
  numeros: [B.n10k - 0.4, B.imagem2 + 0.4] as Range,
  callback: [B.imagem2 + 0.4, B.seVoce + 0.6] as Range,
  hero: [B.seVoce + 0.6, B.end + 1.0] as Range,
};

/* ══ negatoscópio: o RX real na tela ═════════════════════════════════════ */
const XrayView: React.FC<{ t: number; startSec: number; marked?: boolean; ringAt?: number }> =
({ t, startSec, marked, ringAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - Math.round(startSec * FPS), fps, config: { damping: 15, stiffness: 70 }, from: 0, to: 1 });
  const ringP = ringAt ? clamp01((t - ringAt) / 0.6) : 0;
  const ringPulse = ringAt && t > ringAt ? 1 + Math.sin((t - ringAt) * 4) * 0.05 : 1;
  const MARKS = marked ? [
    { txt: '✓ PA · qualidade adequada', at: B.descritos, y: -30 },
    { txt: '✓ campos avaliados', at: B.descritos + 0.6, y: 300 },
    { txt: '✓ achados descritos', at: B.descritos + 1.2, y: 630 },
  ] : [];
  return (
    <div style={{
      position: 'absolute', left: '50%', top: 470,
      transform: `translateX(-50%) translateY(${(1 - s) * 80}px)`,
      opacity: s,
      width: 720, borderRadius: 22, overflow: 'visible',
      background: '#05080f', padding: 18,
      boxShadow: '0 40px 110px -28px rgba(0,0,0,0.85), 0 0 0 1.5px rgba(255,255,255,0.08)',
    }}>
      <Img src={staticFile('rec/chest_xray.jpg')} style={{ width: '100%', borderRadius: 12, display: 'block', opacity: 0.94 }} />
      {ringAt && ringP > 0 && (
        <div style={{
          position: 'absolute', left: 396, top: 330,
          width: 190, height: 150,
          transform: `scale(${ringPulse})`,
          border: `4px dashed ${M_RED}`, borderRadius: '50%',
          opacity: ringP * (marked ? 0 : 1),
          boxShadow: `0 0 30px rgba(224,36,36,0.4), inset 0 0 30px rgba(224,36,36,0.15)`,
        }} />
      )}
      {MARKS.map((m, i) => {
        const o = interpolate(t, [m.at, m.at + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{
            position: 'absolute', left: i % 2 === 0 ? -30 : 420, top: m.y,
            opacity: o, transform: `translateY(${(1 - o) * 16}px)`,
            background: 'rgba(14,159,110,0.95)', borderRadius: 12,
            padding: '10px 20px', fontFamily: HEAD, fontWeight: 800, fontSize: 23, color: WHITE,
            boxShadow: '0 12px 32px -8px rgba(14,159,110,0.5)', whiteSpace: 'nowrap',
          }}>{m.txt}</div>
        );
      })}
    </div>
  );
};

const S1: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.tela, true);
  const topOp = interpolate(t, [0.3, 0.9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const semOp = interpolate(t, [B.semRadio + 0.4, B.semRadio + 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const soOp = interpolate(t, [B.sozinho, B.sozinho + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,10,20,0.94)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 396, textAlign: 'center', opacity: topOp }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 58, color: WHITE, textShadow: '0 0 40px rgba(21,96,232,0.5)' }}>03:00</div>
      </div>
      <XrayView t={t} startSec={B.raiox - 0.9} ringAt={B.sombra} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1360, display: 'flex', justifyContent: 'center', opacity: semOp }}>
        <div style={{
          background: 'rgba(224,36,36,0.13)', border: '1.5px solid rgba(224,36,36,0.5)',
          borderRadius: 999, padding: '13px 34px',
          fontFamily: HEAD, fontWeight: 800, fontSize: 26, color: WHITE,
        }}>
          sem radiologista <span style={{ color: '#ff8a80' }}>até de manhã</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1455, textAlign: 'center', opacity: soOp }}>
        <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 32, color: 'rgba(255,255,255,0.85)' }}>
          eu, sozinho, encarando a imagem.
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
  const calmaOp = interpolate(t, [B.noite + 0.4, B.noite + 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,10,20,0.9)' }} />
      <XrayView t={t} startSec={SC.callback[0]} marked />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1400, textAlign: 'center', opacity: calmaOp }}>
        <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 33, color: WHITE }}>
          a noite seguiu. <span style={{ color: '#2ee6a8' }}>sem o frio na barriga.</span>
        </span>
      </div>
    </div>
  );
};

export const M06_Rx: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <MedufBg />
      <S1 t={t} />
      <S2 t={t} />

      {/* envio da radiografia */}
      <MPhone t={t} range={SC.upload} src="rec/mg_rx.mp4" startFrom={165}>
        <MBadge x={56} y={330} delay={Math.round((SC.upload[0] + 0.4) * FPS)} from="left" accent
          top="Análise Radiológica" bottom="envia a imagem · confere o laudo" />
      </MPhone>

      {/* laudo assistido real */}
      <MPhone t={t} range={SC.result} src="rec/mg_rx.mp4" startFrom={720} playbackRate={0.75}>
        <MBadge x={56} y={330} delay={Math.round((B.laudo + 0.8) * FPS)} from="left" green
          top="✓ Laudo assistido" />
        <MBadge x={620} y={490} delay={Math.round(B.tecnica * FPS)} from="right" top="técnica" />
        <MBadge x={640} y={640} delay={Math.round(B.achados * FPS)} from="right" top="achados" />
        <MBadge x={600} y={790} delay={Math.round(B.correlacao * FPS)} from="right" top="correlação clínica" />
        <MBadge x={56} y={960} delay={Math.round(B.conferir * FPS)} from="left"
          top="ponto a ponto" bottom="pra você conferir na imagem" />
      </MPhone>

      <ConsensusCard t={t} range={SC.consenso}
        atConcordamSec={B.concordam} atDivergemSec={B.divergem}
        atPubmedSec={B.pubmed} atSusSec={B.sus} />

      <MHero t={t} range={SC.decide} line1="quem valida o laudo..." line2="é você." size={74} blueAfterSec={1.4} />

      <MNumbers t={t} range={SC.numeros}
        atFirstSec={B.n10k} atSecondSec={B.n27} atPillSec={B.madrugada}
        pillText={<>🌙 a qualquer hora da madrugada</>} />

      <S8 t={t} />

      <MHero t={t} range={SC.hero} line1="se você já encarou uma sombra sozinho..." line2="isso aqui é pra você." size={56} blueAfterSec={1.7} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1580} size={56} highlight={M_BLUE} />
      <MEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/m06.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
