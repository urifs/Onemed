import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText, Narration, useCountUp } from './common';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, DemoPhone, HeroLine, Range } from './story';
import timing from './timings/c19.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C19_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  linha1: DELAY + 1.6,        // "pra estudar do jeito que eu queria"
  linha2: DELAY + 3.8,        // "três cursinhos diferentes"
  linha3: DELAY + 6.1,        // "cada um custava uma fortuna"
  desisti: DELAY + 7.8,       // papel amassa
  achei: DELAY + 9.5,
  estrategia: DELAY + 13.2,
  medgrupo: DELAY + 14.3,
  medway: DELAY + 15.4,
  medcof: DELAY + 16.3,
  hardwork: DELAY + 17.3,
  livros: DELAY + 18.7,
  acesso: DELAY + 20.9,       // "Um acesso."
  organizado: DELAY + 22.1,
  mapa: DELAY + 23.8,
  buscaB: DELAY + 24.9,
  download: DELAY + 25.5,
  comunidade: DELAY + 26.9,
  atualizam: DELAY + 29.3,
  fechou: DELAY + 31.8,       // "A conta que não fechava? Fechou."
  cafe: DELAY + 35.2,
  n530: DELAY + 36.5,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  papel: [0, B.achei] as Range,
  gigantes: [B.achei, B.acesso - 0.3] as Range,
  acesso: [B.acesso - 0.3, B.organizado + 0.8] as Range,
  tools: [B.organizado + 0.8, B.fechou] as Range,
  fechou: [B.fechou, B.n530 - 0.3] as Range,
  numeros: [B.n530 - 0.3, B.end + 1.0] as Range,
};

// ═══ S1 — a conta no papel ════════════════════════════════════════════════
const NOTE_LINES: Array<{ txt: string; at: number }> = [
  { txt: 'cursinho de teoria ......... caro', at: B.linha1 },
  { txt: 'banco de questões ..... mais caro', at: B.linha2 },
  { txt: 'revisão de reta final ... nem pergunta', at: B.linha3 },
];

const S1: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.papel, true);
  const noteS = spring({ frame, fps, config: { damping: 15, stiffness: 70 }, from: 0, to: 1 });
  // amassa: encolhe girando com blur rápido
  const cr = clamp01((t - B.desisti) / 0.4);
  const crE = cr * cr;
  const titleOp = interpolate(frame, [2, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const desistiOp = interpolate(t, [B.desisti + 0.4, B.desisti + 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 430, textAlign: 'center', opacity: titleOp }}>
        <div style={{ fontFamily: BODY, fontSize: 25, color: W60, letterSpacing: 6, textTransform: 'uppercase' }}>
          a conta no papel
        </div>
      </div>
      <div style={{
        position: 'absolute', left: '50%', top: 560,
        transform: `translateX(-50%) translateY(${(1 - noteS) * 90}px) rotate(${-2 + crE * 38}deg) scale(${noteS * (1 - crE * 0.92)})`,
        opacity: noteS * (1 - crE),
        filter: crE > 0 ? `blur(${crE * 7}px)` : 'none',
        width: 760, borderRadius: 14,
        background: '#f5f1e8',
        boxShadow: '0 40px 100px -30px rgba(0,0,0,0.85)',
        padding: '48px 54px',
      }}>
        {NOTE_LINES.map((ln, i) => {
          const lo = interpolate(t, [ln.at, ln.at + 0.35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{
              fontFamily: MONO, fontSize: 27, color: '#4a4437',
              padding: '13px 0', borderBottom: i < 2 ? '1.5px dashed #d8d1c0' : 'none',
              opacity: lo, transform: `translateX(${(1 - lo) * 24}px)`,
            }}>
              {ln.txt}
            </div>
          );
        })}
        <div style={{
          marginTop: 24, fontFamily: MONO, fontWeight: 700, fontSize: 30, color: '#b3372f',
          opacity: interpolate(t, [B.linha3 + 0.5, B.linha3 + 0.9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          = a conta não fecha
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 800, textAlign: 'center', opacity: desistiOp }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 64, color: WHITE, letterSpacing: -2 }}>
          desisti <span style={{ color: RED }}>de escolher.</span>
        </div>
      </div>
    </div>
  );
};

// ═══ S5 — o papel volta, e a conta fecha ══════════════════════════════════
const S5: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.fechou);
  const base = Math.round(SC.fechou[0] * FPS);
  // desamassa: volta girando do amassado
  const s = spring({ frame: frame - base, fps, config: { damping: 13, stiffness: 75 }, from: 0, to: 1 });
  const o = interpolate(frame - base, [0, 9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fechouAt = SC.fechou[0] + 1.5;   // "Fechou." na narração
  const fOp = interpolate(t, [fechouAt, fechouAt + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cafeOp = interpolate(t, [B.cafe, B.cafe + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: '50%', top: 540,
        transform: `translateX(-50%) rotate(${(1 - s) * -30 - 1.5}deg) scale(${0.15 + s * 0.85})`,
        opacity: o,
        width: 760, borderRadius: 14,
        background: '#f5f1e8',
        boxShadow: '0 40px 100px -30px rgba(0,0,0,0.85)',
        padding: '52px 54px', textAlign: 'center',
      }}>
        <div style={{ fontFamily: MONO, fontSize: 26, color: '#8a8577', textDecoration: 'line-through' }}>
          três cursinhos separados
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: '#1a7a58', marginTop: 22, letterSpacing: -1, opacity: fOp }}>
          ✓ TUDO NUM ACESSO
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, color: '#1a7a58', marginTop: 18, opacity: fOp }}>
          = a conta fechou
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1080, display: 'flex', justifyContent: 'center', opacity: cafeOp }}>
        <div style={{
          background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.14)',
          borderRadius: 999, padding: '14px 38px',
          fontFamily: HEAD, fontWeight: 700, fontSize: 26, color: WHITE,
        }}>
          ☕ e sobrou até pro café do plantão
        </div>
      </div>
    </div>
  );
};

// ═══ S6 — só o 530 (a narração aqui não fala dos livros) ═════════════════
const S6: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const op = sceneOpacity(t, SC.numeros);
  const f1 = Math.round(B.n530 * FPS);
  const cursos = useCountUp(530, f1 + 2, 30);
  const o1 = interpolate(frame - f1, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const oP = interpolate(t, [B.n530 + 1.6, B.n530 + 2.0], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', opacity: o1 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 190, color: WHITE, letterSpacing: -6, lineHeight: 1 }}>
          {cursos}<span style={{ color: RED }}>+</span>
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 36, color: W60, marginTop: 6 }}>
          cursos esperando por você
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1040, display: 'flex', justifyContent: 'center', opacity: oP }}>
        <div style={{
          background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.4)',
          borderRadius: 999, padding: '14px 38px',
          fontFamily: BODY, fontWeight: 600, fontSize: 24, color: WHITE,
        }}>
          faz o teste grátis e <span style={{ color: RED, fontWeight: 800 }}>tira a prova</span>
        </div>
      </div>
    </div>
  );
};

// ═══ ROOT ═════════════════════════════════════════════════════════════════
export const C19_Conta: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t < B.achei ? 0.6 : 1} />
      <S1 t={t} />

      {/* os maiores nomes, morando juntos */}
      <DemoPhone t={t} range={SC.gigantes} src="rec/n_extensivos.mp4" startFrom={92}
        badgeTop="Os maiores do Brasil" badgeBottom="morando juntos" badgeX={56} badgeFrom="left">
        <FloatBadge x={600} y={500} delay={Math.round(B.estrategia * FPS)} from="right">
          <BadgeText top="Estratégia Med" />
        </FloatBadge>
        <FloatBadge x={40} y={650} delay={Math.round(B.medgrupo * FPS)} from="left">
          <BadgeText top="MedGrupo" />
        </FloatBadge>
        <FloatBadge x={600} y={800} delay={Math.round(B.medway * FPS)} from="right">
          <BadgeText top="Medway · Medcof" />
        </FloatBadge>
        <FloatBadge x={50} y={950} delay={Math.round(B.hardwork * FPS)} from="left">
          <BadgeText top="HardWork" />
        </FloatBadge>
        <FloatBadge x={560} y={1090} delay={Math.round((B.livros + 0.4) * FPS)} from="right" accent>
          <BadgeText top="+9.000 livros" bottom="biblioteca inclusa" />
        </FloatBadge>
      </DemoPhone>

      <HeroLine t={t} range={SC.acesso} line1="um acesso." line2="todos eles." size={88} redAfterSec={0.8} />

      {/* organização: mapa, busca, download, comunidade */}
      <DemoPhone t={t} range={SC.tools} src="rec/n_tools.mp4" startFrom={358}
        badgeTop="Tudo organizado" badgeBottom="por categoria" badgeX={600} badgeFrom="right">
        <FloatBadge x={56} y={490} delay={Math.round(B.mapa * FPS)} from="left">
          <BadgeText top="🗺 Mapa de curso" />
        </FloatBadge>
        <FloatBadge x={640} y={630} delay={Math.round(B.buscaB * FPS)} from="right">
          <BadgeText top="🔎 Busca" />
        </FloatBadge>
        <FloatBadge x={56} y={770} delay={Math.round(B.download * FPS)} from="left">
          <BadgeText top="⬇ Download liberado" />
        </FloatBadge>
        <FloatBadge x={590} y={910} delay={Math.round(B.comunidade * FPS)} from="right">
          <BadgeText top="💬 Comunidade" />
        </FloatBadge>
        <FloatBadge x={56} y={1070} delay={Math.round((B.atualizam + 0.9) * FPS)} from="left" accent>
          <BadgeText top="🔔 Atualizações inclusas" bottom="sem pagar nada a mais" />
        </FloatBadge>
      </DemoPhone>

      <S5 t={t} />
      <S6 t={t} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={56} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Narration id="c19" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
