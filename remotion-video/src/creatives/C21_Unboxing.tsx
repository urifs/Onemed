import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText } from './common';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, MONO, clamp01, easeInOut } from './theme';
import { FPS, sceneOpacity, DemoPhone, NumbersScene, Range } from './story';
import { OPhone, AiRow, AiChip } from './oaia';
import timing from './timings/c21.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C21_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  inventario: DELAY + 0.75,
  camada1: DELAY + 4.7,
  n530: DELAY + 5.75,
  busca: DELAY + 17.2,
  camada2: DELAY + 22.1,
  n9000: DELAY + 23.4,
  aindaMais: DELAY + 29.6,
  ferramentas: DELAY + 32.5,
  aula: DELAY + 36.1,
  flash: DELAY + 38.5,
  questoes: DELAY + 40.5,
  resumo: DELAY + 43.9,
  assistente: DELAY + 47.4,
  n10k: DELAY + 51.7,
  atualiza: DELAY + 54.9,
  confere: DELAY + 60.5,
  teste: DELAY + 63.8,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  hook: [0, B.camada1] as Range,
  cursos: [B.camada1, B.busca + 0.3] as Range,
  busca: [B.busca + 0.3, B.camada2] as Range,
  livros: [B.camada2, B.aindaMais] as Range,
  twist: [B.aindaMais, B.aula - 0.3] as Range,
  demo1: [B.aula - 0.3, B.resumo] as Range,     // flash + questões
  demo2: [B.resumo, B.n10k - 0.3] as Range,     // resumo + assistente
  numeros: [B.n10k - 0.3, B.confere] as Range,
  cta: [B.confere, B.end + 1.0] as Range,
};

/* ══ hook: card lacrado que se desdobra em camadas ═══════════════════════ */
const Hook: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.hook, true);
  const s = spring({ frame, fps, config: { damping: 15, stiffness: 70 }, from: 0, to: 1 });
  const invOp = interpolate(t, [B.inventario, B.inventario + 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const unfold = clamp01((t - (B.inventario + 1.4)) / 1.8);
  if (op <= 0) return null;
  const LAYERS = ['+530 cursos', '+9.000 livros', 'IA de revisão'];
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 430, textAlign: 'center', opacity: invOp }}>
        <div style={{ fontFamily: BODY, fontSize: 25, color: W60, letterSpacing: 7, textTransform: 'uppercase' }}>
          o que abre quando o seu acesso abre
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 88, color: WHITE, letterSpacing: -2, marginTop: 12 }}>
          INVENTÁRIO
        </div>
      </div>
      <div style={{ position: 'absolute', left: '50%', top: 720, transform: `translateX(-50%) scale(${s})` }}>
        {LAYERS.map((lb, i) => {
          const spread = easeInOut(unfold) * (i - 1) * 150;
          const lo = interpolate(t, [B.inventario + 1.4 + i * 0.25, B.inventario + 1.8 + i * 0.25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={lb} style={{
              position: 'absolute', left: -230, top: 40 + spread, width: 460,
              opacity: lo, transform: `rotate(${(i - 1) * -2}deg)`,
              background: i === 2 ? 'rgba(239,68,68,0.14)' : 'rgba(14,16,22,0.95)',
              border: `1.5px solid ${i === 2 ? RED : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 18, padding: '22px 28px', textAlign: 'center',
              boxShadow: '0 24px 60px -18px rgba(0,0,0,0.7)',
            }}>
              <div style={{ fontFamily: BODY, fontSize: 17, color: W40, letterSpacing: 3 }}>CAMADA {i + 1}</div>
              <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: i === 2 ? RED : WHITE, marginTop: 4 }}>{lb}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TwistLabel: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.twist);
  const o = interpolate(t, [B.aindaMais, B.aindaMais + 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 500, textAlign: 'center', opacity: o }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 60, color: WHITE, letterSpacing: -1 }}>
          e ainda tem mais...
        </div>
        <div style={{ fontFamily: BODY, fontSize: 26, color: W60, marginTop: 14 }}>
          as ferramentas que viram <span style={{ color: RED }}>revisão</span>
        </div>
      </div>
      <AiRow t={t} startSec={B.ferramentas} y={760} />
    </div>
  );
};

export const C21_Unboxing: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t < B.camada1 ? 0.6 : 1} />
      <Hook t={t} />

      <DemoPhone t={t} range={SC.cursos} src="rec/m_dashboard.mp4" startFrom={0}
        badgeTop="+530 cursos completos" badgeBottom="Estratégia · Medway · HardWork · Revalida" badgeX={56} badgeFrom="left" />

      <DemoPhone t={t} range={SC.busca} src="rec/m_search.mp4" startFrom={26}
        badgeTop="Busca dentro do curso" badgeBottom="o mapa mostra onde você parou" badgeX={600} badgeFrom="right" />

      <NumbersScene t={t} range={SC.livros}
        atFirstSec={B.n9000 - 10} atSecondSec={B.n9000} atPillSec={undefined} />

      <TwistLabel t={t} />

      <OPhone t={t} range={SC.demo1} src="rec/oa_flash_study.mp4" startFrom={30}>
        <FloatBadge x={56} y={330} delay={Math.round((B.aula) * FPS)} from="left" accent>
          <BadgeText top="🃏 vira flashcard sozinha" bottom="da aula que você assistiu" />
        </FloatBadge>
        <FloatBadge x={580} y={1180} delay={Math.round(B.questoes * FPS)} from="right">
          <BadgeText top="📋 e banco de questões" bottom="com resposta comentada" />
        </FloatBadge>
      </OPhone>

      <OPhone t={t} range={SC.demo2} src="rec/oa_assistant.mp4" startFrom={210}>
        <FloatBadge x={56} y={330} delay={Math.round(B.resumo * FPS)} from="left">
          <BadgeText top="📝 resumo num clique" />
        </FloatBadge>
        <FloatBadge x={560} y={1150} delay={Math.round(B.assistente * FPS)} from="right" accent>
          <BadgeText top="💬 o assistente lê a sua tela" bottom="e responde na hora" />
        </FloatBadge>
      </OPhone>

      <NumbersScene t={t} range={SC.numeros}
        atFirstSec={B.n10k - 100} atSecondSec={B.n10k} atPillSec={B.atualiza}
        pillText={<>🔔 atualizações sem custo adicional</>} />

      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.cta) }}>
        <div style={{
          position: 'absolute', left: 50, right: 50, top: 760, textAlign: 'center',
          opacity: interpolate(t, [SC.cta[0], SC.cta[0] + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 66, color: WHITE, letterSpacing: -2, lineHeight: 1.2 }}>
            confere você mesmo,<br /><span style={{ color: RED }}>camada por camada.</span>
          </div>
        </div>
      </div>

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={54} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c21.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
