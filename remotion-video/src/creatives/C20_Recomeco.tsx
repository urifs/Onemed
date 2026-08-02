import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText, Narration } from './common';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, DemoPhone, HeroLine, NumbersScene, TrioDevices, Range } from './story';
import timing from './timings/c20.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C20_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  filhos: DELAY + 1.7,
  engaveta: DELAY + 3.3,       // gaveta fecha sobre "RESIDÊNCIA"
  tentar: DELAY + 5.6,         // gaveta reabre
  madrugada: DELAY + 7.2,      // relógio 04:50
  vinte: DELAY + 8.4,          // "20 minutos no estacionamento"
  caber: DELAY + 11.3,         // "o material tinha que caber na minha vida"
  baixei: DELAY + 14.5,
  mapa: DELAY + 17.4,
  trio: DELAY + 21.4,          // progresso sincronizava
  vitoria: DELAY + 24.6,       // "cada aula concluída era uma pequena vitória"
  passei: DELAY + 28.3,        // "Um ano depois... eu passei."
  frente: DELAY + 30.1,
  tempo: DELAY + 33.4,         // "Não é sobre ter tempo"
  certo: DELAY + 35.7,
  n530: DELAY + 37.4,
  n9000: DELAY + 39.5,
  atualiza: DELAY + 40.9,
  recomeco: DELAY + 42.4,      // "O seu recomeço cabe na sua rotina"
  end: DELAY + T.duration - 3.2,
};

const SC = {
  gaveta: [0, B.madrugada - 0.3] as Range,
  madrugada: [B.madrugada - 0.3, B.baixei] as Range,
  baixei: [B.baixei, B.mapa] as Range,
  mapa: [B.mapa, B.trio] as Range,
  trio: [B.trio, B.vitoria] as Range,
  vitoria: [B.vitoria, B.passei - 0.2] as Range,
  passei: [B.passei - 0.2, B.tempo] as Range,
  tempo: [B.tempo, B.n530 - 0.3] as Range,
  numeros: [B.n530 - 0.3, B.recomeco] as Range,
  recomeco: [B.recomeco, B.end + 1.0] as Range,
};

// ═══ S1 — o sonho na gaveta ═══════════════════════════════════════════════
const S1: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.gaveta, true);
  const topOp = interpolate(frame, [3, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const filhosOp = interpolate(t, [B.filhos, B.filhos + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const boxS = spring({ frame: frame - Math.round((B.engaveta - 1.1) * FPS), fps, config: { damping: 16, stiffness: 70 }, from: 0, to: 1 });
  // tampa desliza fechando no "engavetado" e reabre no "decidi tentar"
  const close = clamp01((t - B.engaveta) / 0.55);
  const open = clamp01((t - B.tentar) / 0.7);
  const lid = easeLid(close) * (1 - easeLid(open));
  const glow = open > 0.5 ? (open - 0.5) * 2 : 0;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center', opacity: topOp }}>
        <div style={{ fontFamily: BODY, fontSize: 26, color: W60, letterSpacing: 7, textTransform: 'uppercase' }}>
          10 anos de formada
        </div>
        <div style={{ fontFamily: BODY, fontSize: 24, color: W40, marginTop: 14, opacity: filhosOp }}>
          dois filhos · uma rotina cheia
        </div>
      </div>
      {/* a gaveta */}
      <div style={{
        position: 'absolute', left: '50%', top: 680,
        transform: `translateX(-50%) translateY(${(1 - boxS) * 70}px)`,
        opacity: boxS,
        width: 700, height: 240, borderRadius: 20,
        background: 'rgba(22,24,30,0.96)',
        border: `1.5px solid rgba(255,255,255,${0.1 + glow * 0.1})`,
        boxShadow: `0 36px 90px -28px rgba(0,0,0,0.85), 0 0 ${glow * 50}px rgba(239,68,68,${glow * 0.18})`,
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: HEAD, fontWeight: 900, fontSize: 60, letterSpacing: 2,
          color: lid > 0.6 ? W40 : WHITE,
          textShadow: glow > 0 ? `0 0 34px rgba(239,68,68,${glow * 0.45})` : 'none',
        }}>
          RESIDÊNCIA
        </div>
        {/* tampa da gaveta */}
        <div style={{
          position: 'absolute', inset: 0,
          transform: `translateY(${(lid - 1) * 100}%)`,
          background: 'linear-gradient(180deg, #1c1f27, #12141a)',
          borderBottom: '2px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 130, height: 9, borderRadius: 999, background: 'rgba(255,255,255,0.16)' }} />
        </div>
      </div>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 1010, textAlign: 'center',
        opacity: interpolate(t, [B.tentar + 0.6, B.tentar + 1.0], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: WHITE }}>
          decidi <span style={{ color: RED }}>tentar.</span>
        </div>
      </div>
    </div>
  );
};

function easeLid(x: number) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

// ═══ S2 — 04:50, a casa dormindo ══════════════════════════════════════════
const S2: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.madrugada);
  const base = Math.round(SC.madrugada[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 16, stiffness: 50 }, from: 0.9, to: 1 });
  const o = interpolate(frame - base, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const glow = 0.75 + 0.25 * Math.sin((t - SC.madrugada[0]) * 1.6);
  const vinteOp = interpolate(t, [B.vinte + 0.3, B.vinte + 0.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const caberOp = interpolate(t, [B.caber + 0.2, B.caber + 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 520, textAlign: 'center',
        opacity: o, transform: `scale(${s})`,
      }}>
        <div style={{
          fontFamily: MONO, fontWeight: 700, fontSize: 170, color: '#f5b942',
          letterSpacing: 4, lineHeight: 1,
          textShadow: `0 0 ${50 * glow}px rgba(245,185,66,${0.4 * glow})`,
        }}>
          04:50
        </div>
        <div style={{ fontFamily: BODY, fontSize: 28, color: W60, marginTop: 20 }}>
          a casa dormindo · o sonho acordado
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 880, display: 'flex', justifyContent: 'center', opacity: vinteOp }}>
        <div style={{
          background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.14)',
          borderRadius: 999, padding: '14px 36px',
          fontFamily: HEAD, fontWeight: 700, fontSize: 26, color: WHITE,
        }}>
          🚗 + 20 min no estacionamento da escola
        </div>
      </div>
      <div style={{ position: 'absolute', left: 60, right: 60, top: 1010, textAlign: 'center', opacity: caberOp }}>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 37, color: WHITE, lineHeight: 1.3 }}>
          o material tinha que caber <span style={{ color: RED }}>na minha vida</span>
        </div>
      </div>
    </div>
  );
};

// ═══ S7 — PASSEI ══════════════════════════════════════════════════════════
const S7: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.passei);
  const base = Math.round(SC.passei[0] * FPS);
  const preOp = interpolate(frame - base, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pAt = Math.round((B.passei + 0.7) * FPS);   // "eu passei" na voz
  const s = spring({ frame: frame - pAt, fps, config: { damping: 12, stiffness: 100 }, from: 0.7, to: 1 });
  const pOp = interpolate(frame - pAt, [0, 7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const frOp = interpolate(t, [B.frente + 0.3, B.frente + 0.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', opacity: preOp }}>
        <div style={{ fontFamily: BODY, fontSize: 30, color: W60 }}>um ano depois...</div>
      </div>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 660, textAlign: 'center',
        opacity: pOp, transform: `scale(${s})`,
      }}>
        <div style={{
          fontFamily: HEAD, fontWeight: 900, fontSize: 140, color: '#2ee6a8',
          letterSpacing: -4, textShadow: '0 0 60px rgba(46,230,168,0.35)',
        }}>
          PASSEI.
        </div>
      </div>
      <div style={{ position: 'absolute', left: 70, right: 70, top: 920, textAlign: 'center', opacity: frOp }}>
        <div style={{ fontFamily: BODY, fontSize: 27, color: W60, lineHeight: 1.5 }}>
          na frente de muita gente que tinha<br />o dia inteiro pra estudar
        </div>
      </div>
    </div>
  );
};

// ═══ ROOT ═════════════════════════════════════════════════════════════════
export const C20_Recomeco: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t < B.baixei ? 0.7 : 1} />
      <S1 t={t} />
      <S2 t={t} />

      <DemoPhone t={t} range={SC.baixei} src="rec/n_download.mp4" startFrom={48}
        badgeTop="⬇ Aulas baixadas" badgeBottom="assista sem internet" badgeX={56} badgeFrom="left" />

      <DemoPhone t={t} range={SC.mapa} src="rec/n_tools.mp4" startFrom={358}
        badgeTop="🗺 Mapa do curso" badgeBottom="onde parar · onde voltar" badgeX={600} badgeFrom="right" />

      <TrioDevices t={t} range={SC.trio}
        badgeTop="Progresso sincronizado" badgeBottom="do celular pro notebook" />

      {/* cada concluída, uma pequena vitória */}
      <DemoPhone t={t} range={SC.vitoria} src="rec/n_tools.mp4" startFrom={72}
        badgeTop="✓ Concluída" badgeBottom="uma pequena vitória" badgeX={56} badgeFrom="left">
        <FloatBadge x={640} y={520} delay={Math.round((B.vitoria + 1.0) * FPS)} from="right">
          <BadgeText top="✓ na madrugada" />
        </FloatBadge>
        <FloatBadge x={620} y={670} delay={Math.round((B.vitoria + 1.8) * FPS)} from="right">
          <BadgeText top="✓ no estacionamento" />
        </FloatBadge>
        <FloatBadge x={600} y={820} delay={Math.round((B.vitoria + 2.6) * FPS)} from="right" accent>
          <BadgeText top="✓ no meio do caos" />
        </FloatBadge>
      </DemoPhone>

      <S7 t={t} />

      <HeroLine t={t} range={SC.tempo} line1="não é sobre ter tempo." line2="é sobre ter o material certo." size={62} redAfterSec={B.certo - B.tempo} />

      <NumbersScene t={t} range={SC.numeros}
        atFirstSec={B.n530} atSecondSec={B.n9000} atPillSec={B.atualiza}
        pillText={<>🔔 sempre atualizados</>} />

      <HeroLine t={t} range={SC.recomeco} line1="seu recomeço" line2="cabe na sua rotina." size={72} redAfterSec={1.2} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={56} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Narration id="c20" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
