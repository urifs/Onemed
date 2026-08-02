import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText, Narration } from './common';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, DemoPhone, HeroLine, NumbersScene, Range } from './story';
import timing from './timings/c18.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C18_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  congelei: DELAY + 4.5,       // monitor congela junto
  prometi: DELAY + 6.2,
  achei: DELAY + 10.1,         // "Achei uma plataforma"
  uti: DELAY + 11.5,
  emergencia: DELAY + 14.4,
  zerado: DELAY + 17.2,
  busca: DELAY + 22.0,         // "eu busco sepse"
  segundos: DELAY + 24.1,
  protocolo: DELAY + 25.9,
  prescricao: DELAY + 26.9,
  eletro: DELAY + 27.8,
  baixei: DELAY + 29.9,
  madruga: DELAY + 33.8,       // "quando bate a dúvida às 3h"
  parou: DELAY + 38.5,         // "O plantão parou de me assustar"
  n530: DELAY + 41.1,
  n9000: DELAY + 43.9,
  atualiza: DELAY + 45.8,
  vive: DELAY + 48.2,          // "Se você vive de plantão"
  end: DELAY + T.duration - 3.2,
};

const SC = {
  monitor: [0, B.achei] as Range,
  cursos: [B.achei, B.busca] as Range,
  busca: [B.busca, B.baixei] as Range,
  baixei: [B.baixei, B.madruga] as Range,
  madruga: [B.madruga, B.parou] as Range,
  calmo: [B.parou, B.n530 - 0.3] as Range,
  numeros: [B.n530 - 0.3, B.vive] as Range,
  hero: [B.vive, B.end + 1.0] as Range,
};

// ═══ Monitor de sinais vitais ═════════════════════════════════════════════
// Um ciclo de ECG (300px): baseline → P → QRS → T → baseline
const ECG_CYCLE =
  'l40,0 l8,-10 l8,10 l24,0 l6,4 l5,-46 l6,58 l5,-16 l30,0 l12,-14 l14,14 l97,0';

const EcgTrace: React.FC<{ t: number; freezeAt?: number; color: string; speed: number; y: number }> =
({ t, freezeAt, color, speed, y }) => {
  const tt = freezeAt !== undefined ? Math.min(t, freezeAt) : t;
  const off = (tt * speed) % 300;
  // 6 ciclos cobrem a viewbox com folga pro deslocamento
  let d = 'M-300,0 ';
  for (let i = 0; i < 6; i++) d += ECG_CYCLE + ' ';
  return (
    <svg width={900} height={140} viewBox="0 0 900 140" style={{ position: 'absolute', left: 90, top: y, overflow: 'visible' }}>
      <g transform={`translate(${-off}, 80)`}>
        <path d={d} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
      </g>
      {/* fade nas bordas */}
      <rect x={0} y={0} width={60} height={140} fill="url(#fadeL)" />
      <defs>
        <linearGradient id="fadeL" x1="0" x2="1">
          <stop offset="0" stopColor="#0b0d12" stopOpacity="1" />
          <stop offset="1" stopColor="#0b0d12" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const Vital: React.FC<{ label: string; value: string; color: string; blink?: number; x: number; y: number }> =
({ label, value, color, blink, x, y }) => (
  <div style={{ position: 'absolute', left: x, top: y, opacity: blink ?? 1 }}>
    <div style={{ fontFamily: BODY, fontSize: 20, color: W40, letterSpacing: 3, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 66, color, textShadow: `0 0 22px ${color}66`, lineHeight: 1.1 }}>
      {value}
    </div>
  </div>
);

const S1: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const op = sceneOpacity(t, SC.monitor, true);
  const frameOp = interpolate(frame, [4, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const frozen = t >= B.congelei;
  // alarme piscando antes do congelamento
  const blink = frozen ? 0.9 : 0.55 + 0.45 * Math.sin(t * 9);
  // flash curto no instante do congelamento
  const dt = t - B.congelei;
  const flash = dt > 0 && dt < 0.22 ? (1 - dt / 0.22) * 0.35 : 0;
  const dim = frozen ? interpolate(t, [B.congelei + 0.3, B.prometi], [1, 0.62], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  const promOp = interpolate(t, [B.prometi + 0.3, B.prometi + 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: 60, right: 60, top: 480, height: 620,
        opacity: frameOp * dim,
        borderRadius: 28,
        background: 'rgba(10,12,17,0.96)',
        border: '1.5px solid rgba(255,255,255,0.09)',
        boxShadow: '0 40px 110px -30px rgba(0,0,0,0.9)',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', left: 34, top: 24, fontFamily: BODY, fontSize: 19, color: W40, letterSpacing: 4, textTransform: 'uppercase' }}>
          leito 07 · pronto-socorro
        </div>
        <EcgTrace t={t} freezeAt={B.congelei} color="#2ee6a8" speed={190} y={70} />
        <Vital label="FC" value={frozen ? '138' : '138'} color="#2ee6a8" x={110} y={300} />
        <Vital label="PA" value="78/40" color="#ef4444" blink={blink} x={380} y={300} />
        <Vital label="SpO₂" value="89%" color="#f5b942" x={690} y={300} />
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 34, textAlign: 'center',
          fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: '#ef4444',
          opacity: blink, letterSpacing: 2,
        }}>
          ⚠ SEPSE — PROTOCOLO 1ª HORA
        </div>
        {/* flash do congelamento */}
        <div style={{ position: 'absolute', inset: 0, background: WHITE, opacity: flash }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1170, textAlign: 'center', opacity: promOp }}>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 33, color: WHITE }}>
          nunca mais <span style={{ color: RED }}>sem preparo.</span>
        </div>
      </div>
    </div>
  );
};

// ═══ S6 — o monitor volta, calmo ══════════════════════════════════════════
const S6: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.calmo);
  const base = Math.round(SC.calmo[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 15, stiffness: 70 }, from: 0.9, to: 1 });
  const o = interpolate(frame - base, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pillOp = interpolate(t, [SC.calmo[0] + 1.3, SC.calmo[0] + 1.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: 60, right: 60, top: 500, height: 560,
        opacity: o, transform: `scale(${s})`,
        borderRadius: 28,
        background: 'rgba(10,12,17,0.96)',
        border: '1.5px solid rgba(46,230,168,0.25)',
        boxShadow: '0 40px 110px -30px rgba(0,0,0,0.9), 0 0 60px rgba(46,230,168,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', left: 34, top: 24, fontFamily: BODY, fontSize: 19, color: W40, letterSpacing: 4, textTransform: 'uppercase' }}>
          plantão · hoje
        </div>
        <EcgTrace t={t} color="#2ee6a8" speed={120} y={70} />
        <Vital label="FC" value="72" color="#2ee6a8" x={110} y={290} />
        <Vital label="PA" value="120/80" color="#2ee6a8" x={380} y={290} />
        <Vital label="SpO₂" value="99%" color="#2ee6a8" x={700} y={290} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1130, display: 'flex', justifyContent: 'center', opacity: pillOp }}>
        <div style={{
          background: 'rgba(46,230,168,0.1)', border: '1.5px solid rgba(46,230,168,0.4)',
          borderRadius: 999, padding: '14px 38px',
          fontFamily: HEAD, fontWeight: 800, fontSize: 28, color: '#2ee6a8',
        }}>
          o plantão parou de assustar
        </div>
      </div>
    </div>
  );
};

// ═══ ROOT ═════════════════════════════════════════════════════════════════
export const C18_Interno: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t < B.achei ? 0.55 : 1} />
      <S1 t={t} />

      {/* os cursos de emergência reais */}
      <DemoPhone t={t} range={SC.cursos} src="rec/n_emergencia.mp4" startFrom={30}
        badgeTop="Emergência & Plantão" badgeBottom="tudo junto, num lugar só" badgeX={56} badgeFrom="left">
        <FloatBadge x={590} y={520} delay={Math.round((B.uti + 0.4) * FPS)} from="right">
          <BadgeText top="UTI Online · HC" />
        </FloatBadge>
        <FloatBadge x={40} y={700} delay={Math.round((B.emergencia + 0.5) * FPS)} from="left">
          <BadgeText top="Medicina de Emergência USP" />
        </FloatBadge>
        <FloatBadge x={580} y={880} delay={Math.round((B.zerado + 0.3) * FPS)} from="right">
          <BadgeText top="PS Zerado" bottom="+ protocolos na prática" />
        </FloatBadge>
      </DemoPhone>

      {/* busca "sepse" → aula abre em segundos */}
      <DemoPhone t={t} range={SC.busca} src="rec/n_sepse.mp4" startFrom={0}
        badgeTop="Busca dentro dos cursos" badgeBottom="a aula certa, em segundos" badgeX={600} badgeFrom="right">
        <FloatBadge x={56} y={520} delay={Math.round(B.protocolo * FPS)} from="left" accent>
          <BadgeText top="Protocolo" />
        </FloatBadge>
        <FloatBadge x={660} y={670} delay={Math.round(B.prescricao * FPS)} from="right">
          <BadgeText top="Prescrição" />
        </FloatBadge>
        <FloatBadge x={56} y={820} delay={Math.round(B.eletro * FPS)} from="left">
          <BadgeText top="Eletro" bottom="no bolso" />
        </FloatBadge>
      </DemoPhone>

      <DemoPhone t={t} range={SC.baixei} src="rec/n_download.mp4" startFrom={48}
        badgeTop="⬇ Baixadas" badgeBottom="pra quando a internet cai" badgeX={56} badgeFrom="left" />

      <DemoPhone t={t} range={SC.madruga} src="rec/n_reply.mp4" startFrom={92}
        badgeTop="🌙 3h da manhã" badgeBottom="a comunidade tá acordada" badgeX={600} badgeFrom="right" />

      <S6 t={t} />

      <NumbersScene t={t} range={SC.numeros}
        atFirstSec={B.n530} atSecondSec={B.n9000} atPillSec={B.atualiza}
        pillText={<>🔔 atualizações constantes</>} />

      <HeroLine t={t} range={SC.hero} line1="se você vive de plantão..." line2="isso aqui é pra você." size={70} redAfterSec={1.6} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={56} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Narration id="c18" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
