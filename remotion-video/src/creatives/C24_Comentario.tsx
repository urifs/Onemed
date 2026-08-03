import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText } from './common';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, GREEN, clamp01 } from './theme';
import { FPS, sceneOpacity, DemoPhone, NumbersScene, Range } from './story';
import { OPhone } from './oaia';
import timing from './timings/c24.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C24_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  comentario: DELAY + 0.1,
  boa: DELAY + 3.44,
  n530: DELAY + 7.8,
  metade: DELAY + 12.9,      // "os cursos são metade"
  flash: DELAY + 18.4,       // "vira flashcards"
  questoes: DELAY + 23.0,
  assist: DELAY + 29.4,
  resumo: DELAY + 35.6,
  respondendo: DELAY + 41.4, // "então, respondendo: não"
  dois: DELAY + 45.2,        // "vale pelos dois"
  deixa: DELAY + 46.4,       // CTA
  end: DELAY + T.duration - 3.2,
};

const SC = {
  hook: [0, B.metade - 0.3] as Range,
  metade: [B.metade - 0.3, B.flash - 0.3] as Range,
  demoFlash: [B.flash - 0.3, B.questoes - 0.2] as Range,
  demoQuest: [B.questoes - 0.2, B.assist - 0.2] as Range,
  demoAssist: [B.assist - 0.2, B.resumo - 0.2] as Range,
  demoResumo: [B.resumo - 0.2, B.respondendo - 0.2] as Range,
  resposta: [B.respondendo - 0.2, B.deixa - 0.2] as Range,
  cta: [B.deixa - 0.2, B.end + 1.0] as Range,
};

/* hook: um comentário de rede social (bolha) com a pergunta */
const Comment: React.FC<{ t: number; startSec: number; y?: number; small?: boolean }> = ({ t, startSec, y = 560, small }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - Math.round(startSec * FPS), fps, config: { damping: 15, stiffness: 80 }, from: 0, to: 1 });
  return (
    <div style={{
      position: 'absolute', left: 70, right: 70, top: y,
      transform: `translateY(${(1 - s) * 40}px) scale(${small ? 0.82 : 1})`, opacity: s,
      background: 'rgba(14,16,22,0.95)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 22,
      padding: '24px 28px', display: 'flex', gap: 16, alignItems: 'flex-start',
      boxShadow: '0 24px 60px -18px rgba(0,0,0,0.7)',
    }}>
      <div style={{ width: 56, height: 56, borderRadius: 999, background: 'linear-gradient(135deg,#e0574a,#c62828)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEAD, fontWeight: 800, fontSize: 24, color: WHITE }}>R</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 22, color: WHITE }}>Rafael_R3 <span style={{ color: W40, fontWeight: 400, fontSize: 18 }}>· 2h</span></div>
        <div style={{ fontFamily: BODY, fontSize: 27, color: 'rgba(255,255,255,0.9)', marginTop: 6 }}>vale a pena só pelos cursos? 🤔</div>
        <div style={{ display: 'flex', gap: 20, marginTop: 12, fontFamily: BODY, fontSize: 18, color: W40 }}>
          <span>♥ 128</span><span>responder</span>
        </div>
      </div>
    </div>
  );
};

const Hook: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.hook, true);
  const arrow = interpolate(t, [B.comentario + 0.5, B.comentario + 1.2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const boaOp = interpolate(t, [B.boa, B.boa + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 400, textAlign: 'center', opacity: arrow }}>
        <div style={{ fontFamily: BODY, fontSize: 24, color: W60, letterSpacing: 3, textTransform: 'uppercase' }}>comentário aqui embaixo 👇</div>
      </div>
      <Comment t={t} startSec={0.6} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 900, textAlign: 'center', opacity: boaOp }}>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: WHITE }}>boa pergunta. <span style={{ color: RED }}>se fosse só, já valia.</span></div>
      </div>
    </div>
  );
};

export const C24_Comentario: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t < B.metade ? 0.6 : 1} />
      <Hook t={t} />

      <NumbersScene t={t} range={SC.metade}
        atFirstSec={B.n530} atSecondSec={B.n530 + 2.6} atPillSec={undefined} />

      <OPhone t={t} range={SC.demoFlash} src="rec/oa_flash_study.mp4" startFrom={30}>
        <FloatBadge x={56} y={330} delay={Math.round((SC.demoFlash[0] + 0.4) * FPS)} from="left" accent>
          <BadgeText top="a outra metade:" bottom="🃏 a aula vira flashcards" />
        </FloatBadge>
      </OPhone>

      <OPhone t={t} range={SC.demoQuest} src="rec/oa_questions.mp4" startFrom={90}>
        <FloatBadge x={56} y={330} delay={Math.round((SC.demoQuest[0] + 0.4) * FPS)} from="left">
          <BadgeText top="📋 questões com resposta comentada" bottom="explica o porquê de cada uma" />
        </FloatBadge>
      </OPhone>

      <OPhone t={t} range={SC.demoAssist} src="rec/oa_assistant.mp4" startFrom={210}>
        <FloatBadge x={56} y={330} delay={Math.round((SC.demoAssist[0] + 0.4) * FPS)} from="left" accent>
          <BadgeText top="💬 travou? o assistente lê a tela" bottom="e responde sobre aquele trecho" />
        </FloatBadge>
      </OPhone>

      <DemoPhone t={t} range={SC.demoResumo} src="rec/oa_resumo.mp4" startFrom={30}
        badgeTop="📝 sem tempo? resumo num clique" badgeBottom="" badgeX={56} badgeFrom="left" />

      {/* resposta: não vale só pelos cursos. vale pelos dois. */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.resposta) }}>
        <div style={{ position: 'absolute', left: 60, right: 60, top: 700, textAlign: 'center' }}>
          <div style={{ fontFamily: BODY, fontSize: 28, color: W60 }}>então, respondendo:</div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 64, color: WHITE, marginTop: 14, lineHeight: 1.2 }}>
            não vale só pelos cursos.<br />
            <span style={{ color: RED, opacity: interpolate(t, [B.dois, B.dois + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>vale pelos dois.</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.cta) }}>
        <Comment t={t} startSec={SC.cta[0]} y={560} small />
        <div style={{
          position: 'absolute', left: 50, right: 50, top: 860, textAlign: 'center',
          opacity: interpolate(t, [SC.cta[0] + 0.5, SC.cta[0] + 0.9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 46, color: WHITE, letterSpacing: -1, lineHeight: 1.25 }}>
            deixa sua pergunta aí embaixo —<br /><span style={{ color: RED }}>a próxima resposta pode ser a sua.</span>
          </div>
        </div>
      </div>

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={54} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c24.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
