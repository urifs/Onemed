import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText, Narration } from './common';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, clamp01 } from './theme';
import { FPS, sceneOpacity, ClipAt, DemoPhone, HeroLine, NumbersScene, TrioDevices, SwapPhone, Range, useRise } from './story';
import { PhoneFrame } from './DeviceFrames';
import timing from './timings/c17.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C17_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  estrategia: DELAY + 3.0,
  medway: DELAY + 4.6,
  dois: DELAY + 6.5,
  achei: DELAY + 7.9,          // "Eu achei um lugar com todos eles"
  nomes: DELAY + 9.9,          // enumeração dos gigantes
  teoria: DELAY + 18.3,        // "assistia a teoria de um..."
  favoritei: DELAY + 24.9,
  baixei: DELAY + 25.65,
  conclui: DELAY + 26.25,
  celular: DELAY + 26.8,       // "no celular, no notebook"
  lista: DELAY + 29.2,         // "Quando a lista de aprovados saiu"
  r1: DELAY + 32.4,
  n530: DELAY + 34.2,
  n9000: DELAY + 35.9,
  atualizados: DELAY + 37.2,
  porque: DELAY + 39.3,        // "Por que escolher um cursinho..."
  end: DELAY + T.duration - 3.2,
};

const SC = {
  split: [0, B.achei] as Range,
  gigantes: [B.achei, B.teoria] as Range,
  hero: [B.teoria, B.favoritei] as Range,
  triade: [B.favoritei, B.celular + 0.4] as Range,
  trio: [B.celular + 0.4, B.lista + 0.4] as Range,
  aprovados: [B.lista + 0.4, B.n530 - 0.3] as Range,
  numeros: [B.n530 - 0.3, B.porque] as Range,
  porque: [B.porque, B.end + 1.0] as Range,
};

// ═══ S1 — a turma dividida (tela partida) ═════════════════════════════════
const SideCard: React.FC<{ label: string; atSec: number; side: 'left' | 'right'; t: number; bothAt: number }> =
({ label, atSec, side, t, bothAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - Math.round(atSec * FPS);
  const s = spring({ frame: lf, fps, config: { damping: 14, stiffness: 90 }, from: 0, to: 1 });
  const lit = t >= atSec;
  const both = t >= bothAt;
  const glow = both ? 0.5 + 0.5 * Math.sin((t - bothAt) * 5) : lit ? 1 : 0;
  return (
    <div style={{
      position: 'absolute',
      left: side === 'left' ? 70 : 570,
      top: 640, width: 440, height: 300,
      transform: `translateY(${(1 - s) * 80}px) rotate(${side === 'left' ? -2 : 2}deg)`,
      opacity: s,
      borderRadius: 24,
      background: lit ? 'rgba(239,68,68,0.1)' : 'rgba(22,24,30,0.95)',
      border: `2px solid rgba(239,68,68,${0.25 + glow * 0.35})`,
      boxShadow: `0 30px 80px -24px rgba(0,0,0,0.85), 0 0 ${24 + glow * 30}px rgba(239,68,68,${glow * 0.22})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
    }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 42, color: WHITE, letterSpacing: -1 }}>{label}</div>
      <div style={{ fontFamily: BODY, fontSize: 19, color: W40 }}>metade da turma</div>
    </div>
  );
};

const S1: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const op = sceneOpacity(t, SC.split, true);
  const lineH = interpolate(frame, [6, 26], [0, 700], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleOp = interpolate(frame, [2, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const doisOp = interpolate(t, [B.dois, B.dois + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 440, textAlign: 'center', opacity: titleOp }}>
        <div style={{ fontFamily: BODY, fontSize: 26, color: W60, letterSpacing: 7, textTransform: 'uppercase' }}>
          sexto ano · a turma se dividiu
        </div>
      </div>
      {/* linha que divide */}
      <div style={{
        position: 'absolute', left: '50%', top: 560, width: 3, height: lineH,
        background: `linear-gradient(180deg, ${RED}, transparent)`,
        transform: 'translateX(-50%)',
        boxShadow: `0 0 14px ${RED}88`,
      }} />
      <SideCard label="Estratégia" atSec={B.estrategia} side="left" t={t} bothAt={B.dois} />
      <SideCard label="Medway" atSec={B.medway} side="right" t={t} bothAt={B.dois} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1030, textAlign: 'center', opacity: doisOp }}>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 32, color: WHITE }}>
          a amiga rica? <span style={{ color: RED }}>fez os dois.</span>
        </div>
      </div>
    </div>
  );
};

// ═══ S5 — a lista de aprovados ════════════════════════════════════════════
const LIST = ['Ana Beatriz M. — Cirurgia', 'Carlos Eduardo P. — Pediatria', 'VOCÊ — Clínica Médica', 'Fernanda R. — GO', 'João Pedro S. — Ortopedia'];
const S5: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.aprovados);
  const base = Math.round(SC.aprovados[0] * FPS);
  const titleOp = interpolate(frame - base, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const youAt = B.r1 - 0.6;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 430, textAlign: 'center', opacity: titleOp }}>
        <div style={{ fontFamily: BODY, fontSize: 24, color: W60, letterSpacing: 6, textTransform: 'uppercase' }}>
          lista de aprovados · residência
        </div>
      </div>
      <div style={{ position: 'absolute', left: 90, right: 90, top: 540 }}>
        {LIST.map((name, i) => {
          const isYou = name.startsWith('VOCÊ');
          const lf = frame - base - 6 - i * 5;
          const s = spring({ frame: lf, fps, config: { damping: 15, stiffness: 90 }, from: 0, to: 1 });
          const lit = isYou && t >= youAt;
          const litP = isYou ? clamp01((t - youAt) / 0.4) : 0;
          return (
            <div key={i} style={{
              transform: `translateY(${(1 - s) * 40}px) scale(${1 + litP * 0.05})`,
              opacity: s * (isYou ? 1 : 0.5),
              margin: '0 0 18px',
              padding: '22px 30px',
              borderRadius: 16,
              background: lit ? 'rgba(239,68,68,0.14)' : 'rgba(20,22,28,0.9)',
              border: `1.5px solid ${lit ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: lit ? '0 0 40px rgba(239,68,68,0.25)' : 'none',
              fontFamily: HEAD, fontWeight: lit ? 900 : 600, fontSize: 29,
              color: lit ? WHITE : W40,
              filter: isYou ? 'none' : 'blur(2.5px)',
            }}>
              {lit ? <>✓ {name}</> : name}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══ ROOT ═════════════════════════════════════════════════════════════════
export const C17_Turma: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t < B.achei ? 0.65 : 1} />
      <S1 t={t} />

      {/* os gigantes lado a lado no grid real */}
      <DemoPhone t={t} range={SC.gigantes} src="rec/n_extensivos.mp4" startFrom={92}
        badgeTop="Todos os gigantes" badgeBottom="no mesmo login" badgeX={56} badgeFrom="left">
        <FloatBadge x={590} y={520} delay={Math.round((B.nomes + 0.4) * FPS)} from="right">
          <BadgeText top="Estratégia Med Extensivo" />
        </FloatBadge>
        <FloatBadge x={40} y={690} delay={Math.round((B.nomes + 2.0) * FPS)} from="left">
          <BadgeText top="MEDCurso completo" />
        </FloatBadge>
        <FloatBadge x={580} y={860} delay={Math.round((B.nomes + 3.7) * FPS)} from="right">
          <BadgeText top="Medway · Medcof" />
        </FloatBadge>
        <FloatBadge x={60} y={1030} delay={Math.round((B.nomes + 5.4) * FPS)} from="left">
          <BadgeText top="HardWork" bottom="lado a lado" />
        </FloatBadge>
      </DemoPhone>

      {/* "assistia a teoria de um, resolvia questões do outro" */}
      <DemoPhone t={t} range={SC.hero} src="rec/m_dashboard.mp4" startFrom={0}
        badgeTop="Compare e escolha" badgeBottom="o que funciona pra você, fica" badgeX={56} badgeFrom="left" />

      {/* favoritei · baixei · conclui */}
      <SwapPhone t={t} range={SC.triade} swaps={[
        { src: 'rec/n_tools.mp4', startFrom: 145, from: B.favoritei },
        { src: 'rec/n_download.mp4', startFrom: 48, from: B.baixei },
        { src: 'rec/n_tools.mp4', startFrom: 72, from: B.conclui },
      ]}>
        <FloatBadge x={56} y={300} delay={Math.round(B.favoritei * FPS)} from="left" accent>
          <BadgeText top="★ Favoritei" />
        </FloatBadge>
        <FloatBadge x={660} y={470} delay={Math.round(B.baixei * FPS)} from="right">
          <BadgeText top="⬇ Baixei" />
        </FloatBadge>
        <FloatBadge x={56} y={640} delay={Math.round(B.conclui * FPS)} from="left">
          <BadgeText top="✓ Concluí" />
        </FloatBadge>
      </SwapPhone>

      <TrioDevices t={t} range={SC.trio} badgeTop="Onde desse" badgeBottom="celular · notebook · tablet" />

      <S5 t={t} />

      <NumbersScene t={t} range={SC.numeros}
        atFirstSec={B.n530} atSecondSec={B.n9000} atPillSec={B.atualizados}
        pillText={<>🔔 sempre atualizados · <span style={{ color: RED }}>sem pagar a mais</span></>} />

      <HeroLine t={t} range={SC.porque} line1="por que escolher um..." line2="se você pode ter todos?" size={66} redAfterSec={1.6} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={56} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Narration id="c17" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
