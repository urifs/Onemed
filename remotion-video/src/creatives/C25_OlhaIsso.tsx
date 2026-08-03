import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText } from './common';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, GREEN, clamp01 } from './theme';
import { FPS, sceneOpacity, HeroLine, NumbersScene, Range } from './story';
import { OPhone } from './oaia';
import timing from './timings/c25.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C25_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  mostrar: DELAY + 0.1,
  aula: DELAY + 3.5,          // "aula de insuficiência cardíaca"
  botao: DELAY + 8.1,         // "esse botão flutuante"
  presta: DELAY + 12.6,       // "presta atenção"
  leu: DELAY + 18.1,          // "leu o conteúdo sozinho"
  pergunto: DELAY + 20.9,     // 1ª pergunta
  responde: DELAY + 25.7,
  denovo: DELAY + 31.5,       // "pergunta de novo"
  comoCai: DELAY + 33.4,      // 2ª pergunta
  respondeu: DELAY + 36.3,    // "respondeu. explicou. apontou"
  funciona: DELAY + 41.6,
  n530: DELAY + 43.4,
  n9000: DELAY + 45.7,
  duvida: DELAY + 48.2,       // "aquela dúvida... 20min → 10s"
  abre: DELAY + 53.7,         // CTA
  end: DELAY + T.duration - 3.2,
};

const SC = {
  hook: [0, B.botao - 0.3] as Range,
  demo1: [B.botao - 0.3, B.denovo - 0.3] as Range,   // botão + 1ª pergunta + resposta
  demo2: [B.denovo - 0.3, B.funciona - 0.2] as Range, // 2ª pergunta + resposta
  ampla: [B.funciona - 0.2, B.duvida - 0.2] as Range, // 530/9000
  punch: [B.duvida - 0.2, B.abre - 0.2] as Range,     // 20min → 10s
  cta: [B.abre - 0.2, B.end + 1.0] as Range,
};

const Hook: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.hook, true);
  const s = spring({ frame, fps, config: { damping: 14, stiffness: 80 }, from: 0.9, to: 1 });
  const o = interpolate(frame, [2, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sub = interpolate(t, [B.aula, B.aula + 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 50, right: 50, top: 620, textAlign: 'center', opacity: o, transform: `scale(${s})` }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 90, color: WHITE, letterSpacing: -3 }}>
          OLHA<br />ISSO.
        </div>
        <div style={{ fontFamily: BODY, fontSize: 27, color: W60, marginTop: 24, opacity: sub }}>
          sem enrolação. sem edição.
        </div>
      </div>
    </div>
  );
};

/* legenda "PROVA AO VIVO" tremulando enquanto o assistente responde de verdade */
const LiveTag: React.FC<{ t: number; range: Range }> = ({ t, range }) => {
  const op = sceneOpacity(t, range);
  if (op <= 0) return null;
  const blink = 0.6 + 0.4 * Math.sin(t * 5);
  return (
    <div style={{ position: 'absolute', left: '50%', top: 120, transform: 'translateX(-50%)', opacity: op }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(239,68,68,0.16)', border: `1.5px solid ${RED}`, borderRadius: 999, padding: '10px 24px',
      }}>
        <div style={{ width: 12, height: 12, borderRadius: 999, background: RED, opacity: blink }} />
        <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 22, color: WHITE, letterSpacing: 2 }}>AO VIVO · SEM CORTE</span>
      </div>
    </div>
  );
};

export const C25_OlhaIsso: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t < B.botao ? 0.6 : 1} />
      <Hook t={t} />

      {/* o assistente lendo a tela e respondendo — take REAL */}
      <OPhone t={t} range={SC.demo1} src="rec/oa_assistant.mp4" startFrom={0}>
        <FloatBadge x={56} y={330} delay={Math.round(B.botao * FPS)} from="left" accent>
          <BadgeText top="💬 o Assistente" bottom="no canto da tela" />
        </FloatBadge>
        <FloatBadge x={580} y={470} delay={Math.round((B.leu) * FPS)} from="right">
          <BadgeText top="ele leu a aula" bottom="sozinho — nada colado" />
        </FloatBadge>
        <FloatBadge x={56} y={1150} delay={Math.round(B.responde * FPS)} from="left">
          <BadgeText top="respondeu na hora" bottom="em cima do material aberto" />
        </FloatBadge>
      </OPhone>
      <LiveTag t={t} range={SC.demo1} />

      <OPhone t={t} range={SC.demo2} src="rec/oa_assistant.mp4" startFrom={300}>
        <FloatBadge x={56} y={330} delay={Math.round(B.comoCai * FPS)} from="left" accent>
          <BadgeText top="pergunta de novo" bottom="'como isso cai na prova?'" />
        </FloatBadge>
        <FloatBadge x={560} y={1150} delay={Math.round(B.respondeu * FPS)} from="right">
          <BadgeText top="✓ respondeu · explicou" bottom="apontou o trecho da aula" />
        </FloatBadge>
      </OPhone>
      <LiveTag t={t} range={SC.demo2} />

      <NumbersScene t={t} range={SC.ampla}
        atFirstSec={B.n530} atSecondSec={B.n9000} atPillSec={undefined} />

      {/* 20 min → 10 s */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.punch) }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center' }}>
          <div style={{ fontFamily: BODY, fontSize: 28, color: W60 }}>a dúvida que travava seu estudo</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30, marginTop: 24 }}>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 96, color: W40, textDecoration: 'line-through' }}>20&apos;</span>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 60, color: RED }}>→</span>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 130, color: RED, textShadow: '0 0 40px rgba(239,68,68,0.4)' }}>10&quot;</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.cta) }}>
        <div style={{
          position: 'absolute', left: 50, right: 50, top: 780, textAlign: 'center',
          opacity: interpolate(t, [SC.cta[0], SC.cta[0] + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: WHITE, letterSpacing: -1.5, lineHeight: 1.2 }}>
            abre uma aula...<br /><span style={{ color: RED }}>e pergunta qualquer coisa.</span>
          </div>
        </div>
      </div>

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={54} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c25.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
