import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText, Narration, useCountUp } from './common';
import { PhoneFrame, LaptopFrame, TabletFrame } from './DeviceFrames';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, fade, clamp01, easeInOut } from './theme';
import timing from './timings/c14.json';

const T = timing as Timing;
const DELAY = 0.9;
const FPS = 30;
export const C14_DURATION = Math.round((DELAY + T.duration + 2.3) * FPS);

// beats ancorados nas palavras reais da narração (t da palavra + DELAY)
const B = {
  mapa: DELAY + 4.33,
  pastaPorPasta: DELAY + 5.75,
  busca: DELAY + 8.54,
  baixou: DELAY + 11.72,
  favoritou: DELAY + 12.7,
  concluida: DELAY + 13.9,
  telas: DELAY + 15.9,
  comunidade: DELAY + 18.6,
  equipe: DELAY + 20.7,
  flashcards: DELAY + 22.28,
  numeros: DELAY + 26.6,
  end: DELAY + T.duration - 4.3,
};

// limites de cena (segundos absolutos) — crossfades de ~0.45s entre elas
const SCENES = {
  s1: [0, B.mapa],
  s2: [B.mapa, B.busca],
  s3: [B.busca, B.baixou],
  s4: [B.baixou, B.telas],
  s5: [B.telas, B.comunidade],
  s6: [B.comunidade, B.flashcards],
  s7: [B.flashcards, B.numeros],
  s8: [B.numeros, B.end + 1.2],
} as const;

const XF = 0.45; // crossfade padrão

function sceneOpacity(t: number, [a, b]: readonly [number, number], first = false): number {
  const fi = first ? 1 : clamp01((t - a) / XF);
  const fo = clamp01((b - t) / XF);
  return Math.min(fi, fo);
}

// entrada suave de device: sobe ~140px com spring macio + fade
function useRise(startSec: number, dist = 140) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - Math.round(startSec * FPS);
  const s = spring({ frame: lf, fps, config: { damping: 16, stiffness: 60 }, from: 0, to: 1 });
  const op = interpolate(lf, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return { y: dist * (1 - s), op, s };
}

// drift de respiração (escala 1 → 1.045 ao longo da cena)
function useBreath(startSec: number, seconds = 8) {
  const frame = useCurrentFrame();
  const p = easeInOut(clamp01((frame / FPS - startSec) / seconds));
  return 1 + p * 0.045;
}

// ═══════════════════════════════════════════════════════════════════════════
// S1 — abertura: celular sobe com o dashboard (banner de novidade visível)
// ═══════════════════════════════════════════════════════════════════════════
const S1: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SCENES.s1, true);
  const rise = useRise(0.15);
  const breath = useBreath(0.15, 6);
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: '50%', top: 170,
        transform: `translateX(-50%) translateY(${rise.y}px) scale(${breath})`,
        transformOrigin: '50% 18%',
        opacity: rise.op,
      }}>
        <PhoneFrame src="rec/n_banner.mp4" width={590} startFrom={12} />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// S2 — mapa do curso: celular com a árvore + notebook desliza por trás
// ═══════════════════════════════════════════════════════════════════════════
const S2: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SCENES.s2);
  const rise = useRise(SCENES.s2[0]);
  // notebook entra da direita no beat "pasta por pasta"
  const lapLf = frame - Math.round(B.pastaPorPasta * FPS);
  const lapS = spring({ frame: lapLf, fps, config: { damping: 16, stiffness: 55 }, from: 0, to: 1 });
  const lapOp = interpolate(lapLf, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      {/* notebook ao fundo */}
      <div style={{
        position: 'absolute', left: '50%', top: 430,
        transform: `translateX(${-50 + (1 - lapS) * 18}%)`,
        opacity: lapOp * 0.95,
      }}>
        <LaptopFrame src="rec/nd_tree.mp4" width={1020} startFrom={110} />
      </div>
      {/* celular na frente, deslocado à esquerda quando o notebook chega */}
      <div style={{
        position: 'absolute',
        left: `calc(50% + ${interpolate(lapS, [0, 1], [0, -240])}px)`,
        top: 200,
        transform: `translateX(-50%) translateY(${rise.y}px)`,
        opacity: rise.op,
      }}>
        <PhoneFrame src="rec/n_tools.mp4" width={470} startFrom={252} />
      </div>
      <FloatBadge x={620} y={250} delay={Math.round((SCENES.s2[0] + 0.35) * FPS)} from="right" accent>
        <BadgeText top="Mapa do curso" bottom="pasta por pasta, na ordem" />
      </FloatBadge>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// S3 — busca em aulas e arquivos
// ═══════════════════════════════════════════════════════════════════════════
const S3: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SCENES.s3);
  const rise = useRise(SCENES.s3[0], 90);
  const breath = useBreath(SCENES.s3[0], 5);
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: '50%', top: 165,
        transform: `translateX(-50%) translateY(${rise.y}px) scale(${breath})`,
        transformOrigin: '50% 20%',
        opacity: rise.op,
      }}>
        <PhoneFrame src="rec/n_search2.mp4" width={600} startFrom={16} />
      </div>
      <FloatBadge x={56} y={330} delay={Math.round((SCENES.s3[0] + 0.5) * FPS)} from="left">
        <BadgeText top="Busca total" bottom="aulas e arquivos, em segundos" />
      </FloatBadge>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// S4 — baixou · favoritou · concluiu (3 trocas suaves + selos que empilham)
// ═══════════════════════════════════════════════════════════════════════════
const SWAPS = [
  { src: 'rec/n_download.mp4', startFrom: 48, from: B.baixou },
  { src: 'rec/n_tools.mp4', startFrom: 128, from: B.favoritou },
  { src: 'rec/n_tools.mp4', startFrom: 48, from: B.concluida },
];
const S4: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SCENES.s4);
  const rise = useRise(SCENES.s4[0], 80);
  if (op <= 0) return null;
  const XFC = 0.38;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: '50%', top: 165,
        transform: `translateX(-50%) translateY(${rise.y}px)`,
        opacity: rise.op,
      }}>
        <div style={{ position: 'relative' }}>
          {SWAPS.map((sw, i) => {
            const next = SWAPS[i + 1];
            const fi = i === 0 ? 1 : clamp01((t - sw.from) / XFC);
            const fo = next ? clamp01(1 - (t - next.from) / XFC) : 1;
            const swOp = Math.min(fi, fo);
            if (swOp <= 0) return null;
            return (
              <div key={i} style={{ position: i === 0 ? 'relative' : 'absolute', inset: 0, opacity: swOp }}>
                <PhoneFrame src={sw.src} width={600} startFrom={sw.startFrom} />
              </div>
            );
          })}
        </div>
      </div>
      {/* selos empilhando conforme a voz fala */}
      <FloatBadge x={56} y={300} delay={Math.round(B.baixou * FPS)} from="left" accent>
        <BadgeText top="⬇ Download liberado" bottom="aula por aula" />
      </FloatBadge>
      <FloatBadge x={640} y={470} delay={Math.round(B.favoritou * FPS)} from="right">
        <BadgeText top="★ Favoritos" bottom="o que importa, à mão" />
      </FloatBadge>
      <FloatBadge x={56} y={640} delay={Math.round(B.concluida * FPS)} from="left">
        <BadgeText top="✓ Concluída" bottom="progresso salvo sozinho" />
      </FloatBadge>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// S5 — em qualquer tela: trio notebook + tablet + celular (assinatura do C04)
// ═══════════════════════════════════════════════════════════════════════════
const S5: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SCENES.s5);
  if (op <= 0) return null;
  const base = Math.round(SCENES.s5[0] * FPS);
  const enter = (delayF: number, dist: number) => {
    const s = spring({ frame: frame - base - delayF, fps, config: { damping: 16, stiffness: 58 }, from: 0, to: 1 });
    return { y: dist * (1 - s), op: interpolate(frame - base - delayF, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) };
  };
  const lap = enter(0, 120);
  const tab = enter(8, 150);
  const pho = enter(16, 170);
  const drift = 1 + easeInOut(clamp01((t - SCENES.s5[0]) / 5)) * 0.035;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${drift})`, transformOrigin: '50% 45%' }}>
        <div style={{ position: 'absolute', left: '50%', top: 330, transform: `translateX(-50%) translateY(${lap.y}px)`, opacity: lap.op }}>
          <LaptopFrame src="rec/nd_community.mp4" width={940} startFrom={80} />
        </div>
        <div style={{ position: 'absolute', left: 60, top: 620, transform: `translateY(${tab.y}px) rotate(-4deg)`, opacity: tab.op }}>
          <TabletFrame src="rec/t_dashboard.mp4" width={400} startFrom={30} />
        </div>
        <div style={{ position: 'absolute', right: 70, top: 660, transform: `translateY(${pho.y}px) rotate(4deg)`, opacity: pho.op }}>
          <PhoneFrame src="rec/m_dashboard.mp4" width={310} startFrom={215} />
        </div>
      </div>
      <FloatBadge x={330} y={260} delay={base + 22} from="right" accent>
        <BadgeText top="Progresso sincronizado" bottom="celular · notebook · tablet" />
      </FloatBadge>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// S6 — comunidade: feed → resposta com selo Equipe OneMed
// ═══════════════════════════════════════════════════════════════════════════
const S6: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SCENES.s6);
  const rise = useRise(SCENES.s6[0], 110);
  if (op <= 0) return null;
  const replyOp = clamp01((t - B.equipe) / 0.45);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: '50%', top: 160,
        transform: `translateX(-50%) translateY(${rise.y}px)`,
        opacity: rise.op,
      }}>
        <div style={{ position: 'relative' }}>
          <PhoneFrame src="rec/n_community.mp4" width={600} startFrom={118} />
          <div style={{ position: 'absolute', inset: 0, opacity: replyOp }}>
            <PhoneFrame src="rec/n_reply.mp4" width={600} startFrom={92} />
          </div>
        </div>
      </div>
      <FloatBadge x={56} y={330} delay={Math.round((SCENES.s6[0] + 0.4) * FPS)} from="left">
        <BadgeText top="Comunidade" bottom="dúvidas respondidas de verdade" />
      </FloatBadge>
      <FloatBadge x={600} y={520} delay={Math.round(B.equipe * FPS)} from="right" accent>
        <BadgeText top="✓ Equipe OneMed" bottom="resposta com selo oficial" />
      </FloatBadge>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// S7 — flashcards (em breve): dois cartões girando com calma
// ═══════════════════════════════════════════════════════════════════════════
const CARD_W = 640, CARD_H = 400;
const FlashCard: React.FC<{
  frontTitle: string; front: string; back: string;
  flipAtSec: number; y: number; delaySec: number; tilt: number;
}> = ({ frontTitle, front, back, flipAtSec, y, delaySec, tilt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - Math.round(delaySec * FPS);
  const s = spring({ frame: lf, fps, config: { damping: 15, stiffness: 60 }, from: 0, to: 1 });
  const op = interpolate(lf, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // giro suave de 0 → 180° em ~0.9s no beat
  const flipP = easeInOut(clamp01((frame / FPS - flipAtSec) / 0.9));
  const deg = flipP * 180;
  const showBack = deg > 90;
  return (
    <div style={{
      position: 'absolute', left: '50%', top: y,
      transform: `translateX(-50%) translateY(${(1 - s) * 90}px) rotate(${tilt}deg)`,
      opacity: op,
      perspective: 1400,
    }}>
      <div style={{
        width: CARD_W, height: CARD_H,
        transform: `rotateY(${deg}deg)`,
        transformStyle: 'preserve-3d',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden',
          background: '#ffffff', backfaceVisibility: 'hidden',
          boxShadow: '0 40px 90px -30px rgba(0,0,0,0.8)',
          display: showBack ? 'none' : 'block',
        }}>
          <div style={{ background: RED, padding: '16px 26px', fontFamily: HEAD, fontWeight: 800, fontSize: 21, color: '#fff', letterSpacing: 1 }}>
            {frontTitle}
          </div>
          <div style={{ padding: '34px 34px', fontFamily: HEAD, fontWeight: 700, fontSize: 31, color: '#16181d', lineHeight: 1.32 }}>
            {front}
          </div>
        </div>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden',
          background: '#101319', border: `1.5px solid ${RED}55`,
          transform: 'rotateY(180deg)', backfaceVisibility: 'hidden',
          boxShadow: '0 40px 90px -30px rgba(0,0,0,0.8)',
          display: showBack ? 'block' : 'none',
        }}>
          <div style={{ background: 'rgba(239,68,68,0.16)', padding: '16px 26px', fontFamily: HEAD, fontWeight: 800, fontSize: 21, color: RED, letterSpacing: 1 }}>
            RESPOSTA
          </div>
          <div style={{ padding: '34px 34px', fontFamily: HEAD, fontWeight: 700, fontSize: 30, color: WHITE, lineHeight: 1.34 }}>
            {back}
          </div>
        </div>
      </div>
    </div>
  );
};

const S7: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SCENES.s7);
  if (op <= 0) return null;
  const base = SCENES.s7[0];
  const pillLf = frame - Math.round((base + 0.3) * FPS);
  const pillS = spring({ frame: pillLf, fps, config: { damping: 13, stiffness: 90 }, from: 0.7, to: 1 });
  const pillOp = interpolate(pillLf, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const glow = 0.5 + 0.5 * Math.sin((t - base) * 2.4);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: '50%', top: 270, transform: `translateX(-50%) scale(${pillS})`,
        opacity: pillOp,
        background: 'rgba(239,68,68,0.14)', border: `2px solid rgba(239,68,68,${0.4 + glow * 0.3})`,
        borderRadius: 999, padding: '16px 44px',
        boxShadow: `0 0 ${34 + glow * 26}px rgba(239,68,68,0.3)`,
      }}>
        <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: WHITE }}>
          🃏 EM BREVE <span style={{ color: RED }}>· Flashcards automáticos</span>
        </span>
      </div>
      <div style={{
        position: 'absolute', left: '50%', top: 372, transform: 'translateX(-50%)',
        fontFamily: BODY, fontSize: 22, color: W60, opacity: pillOp, whiteSpace: 'nowrap',
      }}>
        gerados do conteúdo que você estudou
      </div>
      <FlashCard
        frontTitle="CARDIOLOGIA · FLASHCARD"
        front="Qual a primeira conduta na IC aguda congestiva com PAS > 110?"
        back="Furosemida IV + vasodilatador. VNI precoce se edema agudo de pulmão."
        flipAtSec={base + 1.7}
        y={500} delaySec={base + 0.55} tilt={-2.5}
      />
      <FlashCard
        frontTitle="EMERGÊNCIA · FLASHCARD"
        front="Sepse: o que entra no pacote da 1ª hora?"
        back="Culturas + ATB empírico + lactato + cristaloide 30 mL/kg se hipotensão."
        flipAtSec={base + 3.1}
        y={960} delaySec={base + 0.95} tilt={2}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// S8 — números: 530+ cursos · 9.000+ livros · sempre atualizados
// ═══════════════════════════════════════════════════════════════════════════
const S8: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SCENES.s8);
  const base = Math.round(SCENES.s8[0] * FPS);
  const cursos = useCountUp(530, base + 4, 40);
  const livros = useCountUp(9000, base + 16, 44);
  if (op <= 0) return null;
  const s1 = spring({ frame: frame - base - 2, fps, config: { damping: 14, stiffness: 70 }, from: 0.8, to: 1 });
  const s2 = spring({ frame: frame - base - 14, fps, config: { damping: 14, stiffness: 70 }, from: 0.8, to: 1 });
  const o1 = interpolate(frame - base, [2, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const o2 = interpolate(frame - base, [14, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const o3 = interpolate(frame - base, [30, 44], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 430, textAlign: 'center', transform: `scale(${s1})`, opacity: o1 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 168, color: WHITE, letterSpacing: -6, lineHeight: 1 }}>
          {cursos}<span style={{ color: RED }}>+</span>
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 36, color: W60, marginTop: 2 }}>cursos completos</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 790, textAlign: 'center', transform: `scale(${s2})`, opacity: o2 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 168, color: WHITE, letterSpacing: -6, lineHeight: 1 }}>
          {livros}<span style={{ color: RED }}>+</span>
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 36, color: W60, marginTop: 2 }}>livros médicos</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1120, display: 'flex', justifyContent: 'center', opacity: o3 }}>
        <div style={{
          background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.4)',
          borderRadius: 999, padding: '14px 38px',
          fontFamily: BODY, fontWeight: 600, fontSize: 24, color: WHITE,
        }}>
          🔔 sempre atualizados · <span style={{ color: RED }}>sem custo extra</span>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════
export const C14_Completo: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg />
      <S1 t={t} />
      <S2 t={t} />
      <S3 t={t} />
      <S4 t={t} />
      <S5 t={t} />
      <S6 t={t} />
      <S7 t={t} />
      <S8 t={t} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={56} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Narration id="c14" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
