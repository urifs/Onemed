import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText, Narration } from './common';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, HEAD, BODY, MONO } from './theme';
import { FPS, sceneOpacity, DemoPhone, HeroLine, NumbersScene, Range } from './story';
import timing from './timings/c16.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C16_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

// beats = timestamp real + DELAY
const B = {
  carimbo: DELAY + 5.2,       // "não valia nada"
  revalida: DELAY + 6.4,
  todos: DELAY + 12.8,        // "achei um lugar que tinha todos"
  hardwork: DELAY + 13.8,
  sprint: DELAY + 16.0,
  medgrupo: DELAY + 18.4,
  mundo: DELAY + 20.6,
  mapa: DELAY + 24.6,         // "Montei meu cronograma"
  baixei: DELAY + 27.0,
  concluida: DELAY + 29.7,
  comunidade: DELAY + 32.6,
  aprovado: DELAY + 37.5,     // "Resultado? Aprovado."
  crm: DELAY + 40.7,
  n530: DELAY + 43.3,
  n9000: DELAY + 46.1,
  atualizados: DELAY + 48.5,
  praVoce: DELAY + 50.5,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  diploma: [0, B.todos] as Range,
  cursos: [B.todos, B.mapa] as Range,
  mapa: [B.mapa, B.baixei] as Range,
  baixei: [B.baixei, B.concluida] as Range,
  concl: [B.concluida, B.comunidade] as Range,
  comun: [B.comunidade, B.aprovado] as Range,
  aprovado: [B.aprovado, B.n530 - 0.3] as Range,
  numeros: [B.n530 - 0.3, B.praVoce] as Range,
  voce: [B.praVoce, B.end + 1.0] as Range,
};

// ═══ S1 — o diploma e o carimbo ═══════════════════════════════════════════
const Diploma: React.FC<{ t: number; valid?: boolean; topPx: number; scale?: number; opacity?: number }> =
({ valid, topPx, scale = 1, opacity = 1 }) => (
  <div style={{
    position: 'absolute', left: '50%', top: topPx,
    transform: `translateX(-50%) scale(${scale}) rotate(-1.5deg)`,
    opacity,
    width: 720, borderRadius: 18, overflow: 'hidden',
    background: '#f5f1e8',
    boxShadow: '0 40px 100px -30px rgba(0,0,0,0.85)',
  }}>
    <div style={{ padding: '44px 50px 40px', textAlign: 'center' }}>
      <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 21, color: '#8a8577', letterSpacing: 6, textTransform: 'uppercase' }}>
        Universidade · Faculdade de Medicina
      </div>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 46, color: '#2a2620', marginTop: 18, letterSpacing: -1 }}>
        DIPLOMA DE MÉDICO
      </div>
      <div style={{ width: 120, height: 2.5, background: '#c9c2b2', margin: '20px auto' }} />
      <div style={{ fontFamily: BODY, fontSize: 19, color: '#6d675b', lineHeight: 1.5 }}>
        conferido o grau de Doutor em Medicina,<br />com todas as honras e prerrogativas
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 60, marginTop: 30 }}>
        <div style={{ width: 150, borderTop: '1.5px solid #a49d8d', paddingTop: 6, fontFamily: BODY, fontSize: 13, color: '#8a8577' }}>Reitor</div>
        <div style={{ width: 150, borderTop: '1.5px solid #a49d8d', paddingTop: 6, fontFamily: BODY, fontSize: 13, color: '#8a8577' }}>Diretor</div>
      </div>
    </div>
  </div>
);

const Stamp: React.FC<{ atSec: number; text: string; color: string; topPx: number; rot?: number }> =
({ atSec, text, color, topPx, rot = -9 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - Math.round(atSec * FPS);
  if (lf < 0) return null;
  // carimbo bate: entra grande e assenta com impacto
  const s = spring({ frame: lf, fps, config: { damping: 11, stiffness: 220 }, from: 2.1, to: 1 });
  const op = interpolate(lf, [0, 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute', left: '50%', top: topPx,
      transform: `translateX(-50%) rotate(${rot}deg) scale(${s})`,
      opacity: op * 0.94,
      border: `6px solid ${color}`, borderRadius: 14,
      padding: '12px 34px',
      fontFamily: HEAD, fontWeight: 900, fontSize: 44, color,
      letterSpacing: 3, whiteSpace: 'nowrap',
      textShadow: `0 0 24px ${color}55`,
      boxShadow: `inset 0 0 22px ${color}22`,
    }}>
      {text}
    </div>
  );
};

const S1: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const op = sceneOpacity(t, SC.diploma, true);
  const dipOp = interpolate(frame, [4, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pillOp = interpolate(t, [B.revalida + 0.6, B.revalida + 1.0], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // tremor curto no impacto do carimbo
  const dt = t - B.carimbo;
  const shake = dt > 0 && dt < 0.3 ? Math.sin(dt * 90) * 6 * (1 - dt / 0.3) : 0;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op, transform: `translateX(${shake}px)` }}>
      <div style={{ opacity: dipOp }}>
        <Diploma t={t} topPx={560} />
        <Stamp atSec={B.carimbo} text="NÃO VÁLIDO NO BRASIL" color="#c62828" topPx={730} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1120, display: 'flex', justifyContent: 'center', opacity: pillOp }}>
        <div style={{
          background: 'rgba(239,68,68,0.13)', border: '1.5px solid rgba(239,68,68,0.5)',
          borderRadius: 999, padding: '14px 38px',
          fontFamily: HEAD, fontWeight: 800, fontSize: 28, color: WHITE,
        }}>
          único caminho: <span style={{ color: RED }}>REVALIDA</span>
        </div>
      </div>
    </div>
  );
};

// ═══ S7 — APROVADO: diploma volta com carimbo verde ═══════════════════════
const S7: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.aprovado);
  const base = Math.round(SC.aprovado[0] * FPS);
  const hS = spring({ frame: frame - base, fps, config: { damping: 13, stiffness: 85 }, from: 0.84, to: 1 });
  const hO = interpolate(frame - base, [0, 9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const crmOp = interpolate(t, [B.crm, B.crm + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 330, textAlign: 'center',
        opacity: hO, transform: `scale(${hS})`,
      }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 108, color: '#2ee6a8', letterSpacing: -3, textShadow: '0 0 54px rgba(46,230,168,0.35)' }}>
          APROVADO.
        </div>
      </div>
      <div style={{ opacity: hO }}>
        <Diploma t={t} topPx={560} />
        <Stamp atSec={SC.aprovado[0] + 1.1} text="VÁLIDO ✓" color="#1fae7e" topPx={745} rot={7} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1130, display: 'flex', justifyContent: 'center', opacity: crmOp }}>
        <div style={{
          background: 'rgba(46,230,168,0.1)', border: '1.5px solid rgba(46,230,168,0.45)',
          borderRadius: 999, padding: '14px 40px',
          fontFamily: MONO, fontWeight: 700, fontSize: 27, color: '#2ee6a8',
        }}>
          CRM ativo · esse ano
        </div>
      </div>
    </div>
  );
};

// ═══ ROOT ═════════════════════════════════════════════════════════════════
export const C16_Revalida: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t < B.todos ? 0.6 : 1} />
      <S1 t={t} />

      {/* cursos Revalida reais no grid */}
      <DemoPhone t={t} range={SC.cursos} src="rec/n_revalida.mp4" startFrom={20}
        badgeTop="Todos os preparatórios" badgeBottom="Revalida, num lugar só" badgeX={56} badgeFrom="left">
        <FloatBadge x={600} y={520} delay={Math.round(B.hardwork * FPS)} from="right">
          <BadgeText top="HardWork Revalida" />
        </FloatBadge>
        <FloatBadge x={40} y={680} delay={Math.round(B.sprint * FPS)} from="left">
          <BadgeText top="Sprint INEP · Estratégia" />
        </FloatBadge>
        <FloatBadge x={560} y={860} delay={Math.round(B.medgrupo * FPS)} from="right">
          <BadgeText top="MedGrupo Revalida" />
        </FloatBadge>
        <FloatBadge x={60} y={1030} delay={Math.round(B.mundo * FPS)} from="left">
          <BadgeText top="Mundo Revalida" bottom="+ provas anteriores comentadas" />
        </FloatBadge>
      </DemoPhone>

      <DemoPhone t={t} range={SC.mapa} src="rec/n_tools.mp4" startFrom={358}
        badgeTop="Mapa do curso" badgeBottom="seu cronograma, pasta por pasta" badgeX={600} badgeFrom="right" />

      <DemoPhone t={t} range={SC.baixei} src="rec/n_download.mp4" startFrom={48}
        badgeTop="⬇ Download liberado" badgeBottom="estude de madrugada, offline" badgeX={56} badgeFrom="left" />

      <DemoPhone t={t} range={SC.concl} src="rec/n_tools.mp4" startFrom={72}
        badgeTop="✓ Concluída" badgeBottom="uma por uma" badgeX={600} badgeFrom="right" />

      <DemoPhone t={t} range={SC.comun} src="rec/n_reply.mp4" startFrom={92}
        badgeTop="Comunidade" badgeBottom="gente passando pelo mesmo" badgeX={56} badgeFrom="left" />

      <S7 t={t} />

      <NumbersScene t={t} range={SC.numeros}
        atFirstSec={B.n530} atSecondSec={B.n9000} atPillSec={B.atualizados}
        pillText={<>🔔 sempre atualizados</>} />

      <HeroLine t={t} range={SC.voce} line1="isso aqui é" line2="pra você." size={82} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={56} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Narration id="c16" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
