import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, ClipAt, Range } from './story';
import { MedufBg, MLogo, MBadge, MEndCard, ConsensusCard, M_BLUE, M_NAVY, M_MUT, M_GREEN, M_RED, WHITE } from './meduf';
import { PhoneFrame } from './DeviceFrames';
import timing from './timings/m08.json';

const T = timing as Timing;
const DELAY = 0.7;
export const M08_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  dia: DELAY + 1.51,
  eletro: DELAY + 2.93,
  presc: DELAY + 7.43,
  interacao: DELAY + 8.98,
  potassio: DELAY + 11.41,
  vermelho: DELAY + 13.32,
  rx: DELAY + 15.24,
  laudo: DELAY + 16.44,
  difs: DELAY + 19.52,
  rara: DELAY + 22.7,
  pubmed: DELAY + 23.82,
  gpt: DELAY + 27.11,
  concordam: DELAY + 29.51,
  divergem: DELAY + 30.75,
  noite: DELAY + 32.5,
  chat: DELAY + 33.14,
  n17: DELAY + 34.68,
  decide: DELAY + 37.94,
  n10k: DELAY + 40.26,
  testa: DELAY + 44.17,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  abre: [0, B.eletro + 0.4] as Range,
  ecg: [B.eletro + 0.4, B.presc + 0.5] as Range,
  inter: [B.presc + 0.5, B.potassio + 0.4] as Range,
  lab: [B.potassio + 0.4, B.rx + 0.4] as Range,
  rx: [B.rx + 0.4, B.difs + 0.4] as Range,
  diag: [B.difs + 0.4, B.rara + 0.5] as Range,
  consenso: [B.rara + 0.5, B.noite + 0.3] as Range,
  chat: [B.noite + 0.3, B.n17 + 0.7] as Range,
  grid: [B.n17 + 0.7, B.n10k - 0.2] as Range,
  prova: [B.n10k - 0.2, B.testa + 0.2] as Range,
  cta: [B.testa + 0.2, B.end + 1.0] as Range,
};

/* chip de horário — o metrônomo visual do vídeo */
const TimeChip: React.FC<{ t: number; atSec: number; label: string }> = ({ t, atSec, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - Math.round(atSec * FPS), fps, config: { damping: 12, stiffness: 160 }, from: 0, to: 1 });
  return (
    <div style={{
      position: 'absolute', left: '50%', top: 300,
      transform: `translateX(-50%) scale(${0.7 + s * 0.3})`,
      opacity: s,
      background: M_NAVY, borderRadius: 999, padding: '12px 34px',
      boxShadow: '0 14px 40px -10px rgba(14,27,51,0.5)',
    }}>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: WHITE }}>{label}</span>
    </div>
  );
};

/* cena-relâmpago: chip + celular com take real + 1 selo */
const Flash: React.FC<{
  t: number; range: Range; chip: string; src: string; startFrom: number;
  badgeTop: string; badgeBottom?: string; badgeGreen?: boolean; badgeAccent?: boolean; badgeAt?: number;
}> = ({ t, range, chip, src, startFrom, badgeTop, badgeBottom, badgeGreen, badgeAccent, badgeAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, range);
  const base = Math.round(range[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 15, stiffness: 90 }, from: 0, to: 1 });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <TimeChip t={t} atSec={range[0] + 0.05} label={chip} />
      <div style={{
        position: 'absolute', left: '50%', top: 400,
        transform: `translateX(-50%) translateY(${(1 - s) * 70}px)`,
        opacity: s,
      }}>
        <ClipAt fromSec={range[0]}>
          <PhoneFrame src={src} width={560} startFrom={startFrom} statusDark />
        </ClipAt>
      </div>
      <MBadge x={badgeAccent ? 500 : 56} y={520} delay={Math.round((badgeAt ?? range[0] + 0.5) * FPS)}
        from={badgeAccent ? 'right' : 'left'} green={badgeGreen} accent={badgeAccent}
        top={badgeTop} bottom={badgeBottom} />
    </div>
  );
};

const S1: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.abre, true);
  const s = spring({ frame, fps, config: { damping: 13, stiffness: 90 }, from: 0.85, to: 1 });
  const o = interpolate(frame, [2, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const diaOp = interpolate(t, [B.dia, B.dia + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 50, right: 50, top: 720, textAlign: 'center', opacity: o, transform: `scale(${s})` }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: M_NAVY, letterSpacing: -1.5, lineHeight: 1.2 }}>
          isso não é uma consulta.
          <br />
          <span style={{ color: M_BLUE, opacity: diaOp }}>é o seu dia inteiro.</span>
        </div>
      </div>
    </div>
  );
};

const S9: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.grid);
  const base = Math.round(SC.grid[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 16, stiffness: 60 }, from: 0, to: 1 });
  const decOp = interpolate(t, [B.decide + 0.3, B.decide + 0.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: '50%', top: 240,
        transform: `translateX(-50%) translateY(${(1 - s) * 80}px)`,
        opacity: s,
      }}>
        <ClipAt fromSec={SC.grid[0]}>
          <PhoneFrame src="rec/mf_tools.mp4" width={540} startFrom={40} statusDark />
        </ClipAt>
      </div>
      <MBadge x={56} y={380} delay={Math.round((SC.grid[0] + 0.4) * FPS)} from="left" accent
        top="17 ferramentas" bottom="uma decisão por vez" />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1440, display: 'flex', justifyContent: 'center', opacity: decOp }}>
        <div style={{
          background: WHITE, borderRadius: 999, padding: '14px 36px',
          border: '1.5px solid rgba(14,27,51,0.1)',
          boxShadow: '0 14px 40px -12px rgba(14,27,51,0.25)',
          fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: M_NAVY,
        }}>
          quem decide <span style={{ color: M_BLUE }}>continua sendo você</span>
        </div>
      </div>
    </div>
  );
};

const S10: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const op = sceneOpacity(t, SC.prova);
  const o = interpolate(frame - Math.round(SC.prova[0] * FPS), [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 60, right: 60, top: 800, textAlign: 'center', opacity: o }}>
        <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 32, color: M_MUT, lineHeight: 1.6 }}>
          <span style={{ color: M_NAVY, fontWeight: 800 }}>+10.000 médicos</span>, nos 27 estados,<br />já trabalham assim.
        </div>
      </div>
    </div>
  );
};

const S11: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.cta);
  const base = Math.round(SC.cta[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 13, stiffness: 100 }, from: 0.85, to: 1 });
  const el = Math.max(0, t - SC.cta[0] - 0.8);
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 700, textAlign: 'center', transform: `scale(${s})` }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 78, color: M_NAVY, letterSpacing: -2 }}>
          TESTA UM<br /><span style={{ color: M_BLUE }}>DIA DESSES.</span>
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 40, color: M_MUT, marginTop: 40 }}>
          {`00:${String(Math.floor(el * 3) % 60).padStart(2, '0')}`}
        </div>
        <div style={{ fontFamily: BODY, fontSize: 22, color: M_MUT, marginTop: 8 }}>o seu começa agora</div>
      </div>
    </div>
  );
};

export const M08_Dia: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <MedufBg />
      <S1 t={t} />

      <Flash t={t} range={SC.ecg} chip="06:58" src="rec/mg_ecg.mp4" startFrom={800}
        badgeTop="✓ ECG analisado" badgeBottom="ritmo · FC · intervalos" badgeGreen />
      <Flash t={t} range={SC.inter} chip="08:15" src="rec/mf_inter.mp4" startFrom={885}
        badgeTop="⚠ interação sinalizada" badgeBottom="antes de assinar" badgeAccent badgeAt={B.interacao} />
      <Flash t={t} range={SC.lab} chip="12:04" src="rec/mg_lab.mp4" startFrom={735}
        badgeTop="Potássio 6,2 — crítico" badgeBottom="marcado em vermelho, na hora" badgeAccent badgeAt={B.vermelho - 0.3} />
      <Flash t={t} range={SC.rx} chip="15:30" src="rec/mg_rx.mp4" startFrom={730}
        badgeTop="✓ laudo assistido" badgeBottom="pronto pra você conferir" badgeGreen badgeAt={B.laudo} />
      <Flash t={t} range={SC.diag} chip="16:47" src="rec/mg_diag.mp4" startFrom={770}
        badgeTop="diferenciais listados" badgeBottom="nenhum esquecido" />

      <ConsensusCard t={t} range={SC.consenso}
        atConcordamSec={B.concordam} atDivergemSec={B.divergem}
        atPubmedSec={B.pubmed} atSusSec={B.pubmed + 1.2} />

      <Flash t={t} range={SC.chat} chip="22:41" src="rec/mg_chat.mp4" startFrom={520}
        badgeTop="🕐 o chat continua de pé" badgeBottom="24/7" badgeAt={B.chat + 0.4} />

      <S9 t={t} />
      <S10 t={t} />
      <S11 t={t} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1620} size={54} highlight={M_BLUE} />
      <MEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/m08.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
