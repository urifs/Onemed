import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText, Narration, useCountUp } from './common';
import { PhoneFrame, LaptopFrame, TabletFrame } from './DeviceFrames';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, MONO, clamp01, easeInOut } from './theme';
import timing from './timings/c15.json';

const T = timing as Timing;
const DELAY = 0.7;
const FPS = 30;
export const C15_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

// beats = timestamp real da palavra + DELAY (medidos do c15.json)
const B = {
  prova12: DELAY + 3.9,
  caos: DELAY + 4.9,
  link: DELAY + 11.2,
  tudo: DELAY + 13.9,
  mapa: DELAY + 15.6,
  busca: DELAY + 19.7,
  baixou: DELAY + 23.0,
  favoritou: DELAY + 24.8,
  concluida: DELAY + 27.6,
  telas: DELAY + 30.6,
  comunidade: DELAY + 34.7,
  selo: DELAY + 39.2,
  flashcards: DELAY + 41.4,
  payoff: DELAY + 46.3,
  n530: DELAY + 48.8,
  n9000: DELAY + 51.1,
  atualizados: DELAY + 53.2,
  praVoce: DELAY + 57.3,
  end: DELAY + T.duration - 3.2,
};

const SCENES = {
  clock: [0, B.caos],
  chaos: [B.caos, B.link],
  chat: [B.link, B.mapa],
  mapa: [B.mapa, B.busca],
  buscaS: [B.busca, B.baixou],
  triade: [B.baixou, B.telas],
  telas: [B.telas, B.comunidade],
  comun: [B.comunidade, B.flashcards],
  flash: [B.flashcards, B.payoff],
  payoff: [B.payoff, B.praVoce],
  voce: [B.praVoce, B.end + 1.0],
} as const;

const XF = 0.45;
function sceneOpacity(t: number, [a, b]: readonly [number, number], first = false): number {
  const fi = first ? 1 : clamp01((t - a) / XF);
  const fo = clamp01((b - t) / XF);
  return Math.min(fi, fo);
}
// Sequence zera o frame local — OffthreadVideo passa a tocar do startFrom
// no instante em que a cena entra (sem isso, o vídeo corre desde o frame 0
// da composição e chega congelado no fim do take).
const ClipAt: React.FC<{ fromSec: number; children: React.ReactNode }> = ({ fromSec, children }) => (
  <Sequence from={Math.max(0, Math.round(fromSec * FPS))} layout="none">
    {children}
  </Sequence>
);

function useRise(startSec: number, dist = 130) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - Math.round(startSec * FPS);
  const s = spring({ frame: lf, fps, config: { damping: 16, stiffness: 60 }, from: 0, to: 1 });
  const op = interpolate(lf, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return { y: dist * (1 - s), op };
}

// ═══ S1 — 23:47, fim do plantão ════════════════════════════════════════════
const ECG_PATH = (() => {
  let d = 'M 0 40';
  for (let x = 0; x <= 1080; x += 6) {
    const c = (x / 6) % 40;
    let y = 40;
    if (c === 8) y = 34; if (c === 12) y = 10; if (c === 13) y = 62; if (c === 14) y = 40;
    if (c === 24) y = 32;
    d += ` L ${x} ${y}`;
  }
  return d;
})();

const S1: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const op = sceneOpacity(t, SCENES.clock, true);
  const clockOp = interpolate(frame, [4, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const blink = Math.floor(t * 1.4) % 2 === 0;
  const subOp = interpolate(frame, [24, 38], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const provaOp = interpolate(t, [B.prova12, B.prova12 + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const provaS = 1 + Math.max(0, 1 - (t - B.prova12) * 2.4) * 0.12;
  const ecgX = (frame * 3) % 240;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', opacity: clockOp }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 190, color: WHITE, letterSpacing: -4, lineHeight: 1, textShadow: '0 0 60px rgba(239,68,68,0.35)' }}>
          23<span style={{ color: RED, opacity: blink ? 1 : 0.25 }}>:</span>47
        </div>
        <div style={{ fontFamily: BODY, fontSize: 27, color: W60, letterSpacing: 9, textTransform: 'uppercase', marginTop: 26, opacity: subOp }}>
          fim do plantão
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1010, display: 'flex', justifyContent: 'center', opacity: provaOp, transform: `scale(${provaS})` }}>
        <div style={{
          background: 'rgba(239,68,68,0.13)', border: '1.5px solid rgba(239,68,68,0.5)',
          borderRadius: 999, padding: '15px 40px',
          fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: WHITE,
        }}>
          📅 prova em <span style={{ color: RED }}>12 dias</span>
        </div>
      </div>
      <svg width={1080} height={80} style={{ position: 'absolute', top: 380, left: 0, opacity: 0.35 }}>
        <g transform={`translate(${-ecgX},0)`}>
          <path d={ECG_PATH} fill="none" stroke={RED} strokeWidth={2.5} />
          <path d={ECG_PATH} fill="none" stroke={RED} strokeWidth={2.5} transform="translate(1080,0)" />
        </g>
      </svg>
    </div>
  );
};

// ═══ S2 — caos de abas e arquivos ══════════════════════════════════════════
const TABS = [
  { txt: '📄 resumo_prova(3).pdf', x: 90, y: 420, r: -7 },
  { txt: '▶ aula_final_v2.mp4', x: 470, y: 350, r: 5 },
  { txt: '🔗 link expirado', x: 220, y: 590, r: -3 },
  { txt: '📁 Downloads/medicina2', x: 520, y: 660, r: 8 },
  { txt: '▶ playlist — 73 vídeos', x: 120, y: 800, r: 4 },
  { txt: '📄 apostila_cap12_FINAL.pdf', x: 420, y: 900, r: -6 },
  { txt: '🗂 40 abas abertas', x: 250, y: 1050, r: 3 },
];
const S2: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SCENES.chaos);
  if (op <= 0) return null;
  const base = Math.round(SCENES.chaos[0] * FPS);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      {TABS.map((tab, i) => {
        const lf = frame - base - i * 5;
        const s = spring({ frame: lf, fps, config: { damping: 13, stiffness: 90 }, from: 0, to: 1 });
        const drift = Math.sin((frame + i * 47) * 0.03) * 7;
        const driftX = Math.cos((frame + i * 31) * 0.021) * 5;
        return (
          <div key={i} style={{
            position: 'absolute', left: tab.x + driftX, top: tab.y + drift,
            transform: `rotate(${tab.r}deg) scale(${0.6 + s * 0.4})`,
            opacity: s * 0.94,
            background: 'rgba(24,26,32,0.96)', border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 14, padding: '16px 26px',
            fontFamily: BODY, fontSize: 25, fontWeight: 600, color: 'rgba(255,255,255,0.82)',
            boxShadow: '0 18px 50px -14px rgba(0,0,0,0.8)',
            whiteSpace: 'nowrap',
          }}>{tab.txt}</div>
        );
      })}
    </div>
  );
};

// ═══ S3 — a amiga manda o link → celular sobe ═════════════════════════════
const S3: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SCENES.chat);
  const phoneRise = useRise(B.tudo - 0.35, 720);
  if (op <= 0) return null;
  const msgLf = frame - Math.round((SCENES.chat[0] + 0.25) * FPS);
  const msgS = spring({ frame: msgLf, fps, config: { damping: 13, stiffness: 110 }, from: 0, to: 1 });
  const msg2Lf = frame - Math.round((SCENES.chat[0] + 1.0) * FPS);
  const msg2S = spring({ frame: msg2Lf, fps, config: { damping: 13, stiffness: 110 }, from: 0, to: 1 });
  const lift = interpolate(phoneRise.op, [0, 1], [0, -240]);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 330 + lift }}>
        <div style={{
          margin: '0 auto', width: 640,
          transform: `scale(${0.7 + msgS * 0.3})`,
          opacity: msgS,
          background: 'rgba(32,36,44,0.98)', borderRadius: '24px 24px 24px 6px',
          padding: '24px 30px',
          boxShadow: '0 24px 60px -18px rgba(0,0,0,0.85)',
        }}>
          <div style={{ fontFamily: BODY, fontSize: 21, color: W40, marginBottom: 6 }}>Marina · residência</div>
          <div style={{ fontFamily: BODY, fontSize: 29, color: WHITE }}>cê ainda tá estudando espalhado? 😳</div>
        </div>
        <div style={{
          margin: '18px auto 0', width: 640,
          transform: `scale(${0.7 + msg2S * 0.3})`,
          opacity: msg2S,
          background: 'rgba(239,68,68,0.14)', border: '1.5px solid rgba(239,68,68,0.45)',
          borderRadius: '24px 24px 6px 24px',
          padding: '24px 30px',
          boxShadow: '0 24px 60px -18px rgba(0,0,0,0.85)',
        }}>
          <div style={{ fontFamily: BODY, fontSize: 29, color: WHITE }}>olha isso 👇</div>
          <div style={{ fontFamily: MONO, fontSize: 25, color: RED, marginTop: 8 }}>onemedcursos.com.br</div>
        </div>
      </div>
      <div style={{
        position: 'absolute', left: '50%', top: 640,
        transform: `translateX(-50%) translateY(${phoneRise.y}px)`,
        opacity: phoneRise.op,
      }}>
        <ClipAt fromSec={B.tudo - 0.35}>
          <PhoneFrame src="rec/n_banner.mp4" width={560} startFrom={10} />
        </ClipAt>
      </div>
    </div>
  );
};

// ═══ S4 — mapa do curso: celular árvore + notebook por trás ═══════════════
const S4: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SCENES.mapa);
  const rise = useRise(SCENES.mapa[0]);
  const lapLf = frame - Math.round((SCENES.mapa[0] + 1.3) * FPS);
  const lapS = spring({ frame: lapLf, fps, config: { damping: 16, stiffness: 55 }, from: 0, to: 1 });
  const lapOp = interpolate(lapLf, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: '50%', top: 430,
        transform: `translateX(${-50 + (1 - lapS) * 18}%)`,
        opacity: lapOp,
      }}>
        <ClipAt fromSec={SCENES.mapa[0] + 1.3}>
          <LaptopFrame src="rec/nd_tree.mp4" width={1020} startFrom={100} />
        </ClipAt>
      </div>
      <div style={{
        position: 'absolute',
        left: `calc(50% + ${interpolate(lapS, [0, 1], [0, -240])}px)`,
        top: 200,
        transform: `translateX(-50%) translateY(${rise.y}px)`,
        opacity: rise.op,
      }}>
        <ClipAt fromSec={SCENES.mapa[0]}>
          <PhoneFrame src="rec/n_tools.mp4" width={470} startFrom={358} />
        </ClipAt>
      </div>
      <FloatBadge x={600} y={250} delay={Math.round((SCENES.mapa[0] + 0.4) * FPS)} from="right" accent>
        <BadgeText top="Mapa do curso" bottom="a ordem certa de estudar" />
      </FloatBadge>
    </div>
  );
};

// ═══ S5 — busca total ═════════════════════════════════════════════════════
const S5: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SCENES.buscaS);
  const rise = useRise(SCENES.buscaS[0], 90);
  const breath = 1 + easeInOut(clamp01((t - SCENES.buscaS[0]) / 4)) * 0.04;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: '50%', top: 165,
        transform: `translateX(-50%) translateY(${rise.y}px) scale(${breath})`,
        transformOrigin: '50% 20%',
        opacity: rise.op,
      }}>
        <ClipAt fromSec={SCENES.buscaS[0]}>
          <PhoneFrame src="rec/n_search2.mp4" width={600} startFrom={26} />
        </ClipAt>
      </div>
      <FloatBadge x={56} y={330} delay={Math.round((SCENES.buscaS[0] + 0.45) * FPS)} from="left" accent>
        <BadgeText top="Busca total" bottom="aulas e arquivos, em segundos" />
      </FloatBadge>
    </div>
  );
};

// ═══ S6 — baixou · favoritou · concluiu (tríade do C14) ═══════════════════
const SWAPS = [
  { src: 'rec/n_download.mp4', startFrom: 48, from: B.baixou },
  { src: 'rec/n_tools.mp4', startFrom: 145, from: B.favoritou },
  { src: 'rec/n_tools.mp4', startFrom: 72, from: B.concluida },
];
const S6: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SCENES.triade);
  const rise = useRise(SCENES.triade[0], 80);
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
                <ClipAt fromSec={sw.from - 0.4}>
                  <PhoneFrame src={sw.src} width={600} startFrom={sw.startFrom} />
                </ClipAt>
              </div>
            );
          })}
        </div>
      </div>
      <FloatBadge x={56} y={300} delay={Math.round(B.baixou * FPS) + 6} from="left" accent>
        <BadgeText top="⬇ Download liberado" bottom="assista onde quiser" />
      </FloatBadge>
      <FloatBadge x={640} y={470} delay={Math.round(B.favoritou * FPS)} from="right">
        <BadgeText top="★ Favoritos" bottom="o que cai em prova, à mão" />
      </FloatBadge>
      <FloatBadge x={56} y={640} delay={Math.round(B.concluida * FPS)} from="left">
        <BadgeText top="✓ Concluída" bottom="uma por uma" />
      </FloatBadge>
    </div>
  );
};

// ═══ S7 — em qualquer tela: trio ══════════════════════════════════════════
const S7: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SCENES.telas);
  if (op <= 0) return null;
  const base = Math.round(SCENES.telas[0] * FPS);
  const enter = (delayF: number, dist: number) => {
    const s = spring({ frame: frame - base - delayF, fps, config: { damping: 16, stiffness: 58 }, from: 0, to: 1 });
    return { y: dist * (1 - s), op: interpolate(frame - base - delayF, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) };
  };
  const lap = enter(0, 120);
  const tab = enter(6, 150);
  const pho = enter(12, 170);
  const drift = 1 + easeInOut(clamp01((t - SCENES.telas[0]) / 4.5)) * 0.035;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${drift})`, transformOrigin: '50% 45%' }}>
        <div style={{ position: 'absolute', left: '50%', top: 330, transform: `translateX(-50%) translateY(${lap.y}px)`, opacity: lap.op }}>
          <ClipAt fromSec={SCENES.telas[0]}>
            <LaptopFrame src="rec/nd_community.mp4" width={940} startFrom={95} />
          </ClipAt>
        </div>
        <div style={{ position: 'absolute', left: 60, top: 620, transform: `translateY(${tab.y}px) rotate(-4deg)`, opacity: tab.op }}>
          <ClipAt fromSec={SCENES.telas[0] + 0.2}>
            <TabletFrame src="rec/t_dashboard.mp4" width={400} startFrom={30} />
          </ClipAt>
        </div>
        <div style={{ position: 'absolute', right: 70, top: 660, transform: `translateY(${pho.y}px) rotate(4deg)`, opacity: pho.op }}>
          <ClipAt fromSec={SCENES.telas[0] + 0.4}>
            <PhoneFrame src="rec/m_dashboard.mp4" width={310} startFrom={215} />
          </ClipAt>
        </div>
      </div>
      <FloatBadge x={330} y={260} delay={base + 18} from="right" accent>
        <BadgeText top="Progresso sincronizado" bottom="celular · notebook · tablet" />
      </FloatBadge>
    </div>
  );
};

// ═══ S8 — comunidade: feed → resposta com selo ════════════════════════════
const S8: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SCENES.comun);
  const rise = useRise(SCENES.comun[0], 110);
  if (op <= 0) return null;
  const replyOp = clamp01((t - B.selo + 0.5) / 0.45);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: '50%', top: 160,
        transform: `translateX(-50%) translateY(${rise.y}px)`,
        opacity: rise.op,
      }}>
        <div style={{ position: 'relative' }}>
          <ClipAt fromSec={SCENES.comun[0]}>
            <PhoneFrame src="rec/n_community.mp4" width={600} startFrom={118} />
          </ClipAt>
          <div style={{ position: 'absolute', inset: 0, opacity: replyOp }}>
            <ClipAt fromSec={B.selo - 0.7}>
              <PhoneFrame src="rec/n_reply.mp4" width={600} startFrom={92} />
            </ClipAt>
          </div>
        </div>
      </div>
      <FloatBadge x={56} y={330} delay={Math.round((SCENES.comun[0] + 0.4) * FPS)} from="left">
        <BadgeText top="Comunidade" bottom="quando trava, destrava junto" />
      </FloatBadge>
      <FloatBadge x={560} y={520} delay={Math.round((B.selo - 0.2) * FPS)} from="right" accent>
        <BadgeText top="✓ Equipe OneMed" bottom="resposta com selo oficial" />
      </FloatBadge>
    </div>
  );
};

// ═══ S9 — flashcards (em breve) ═══════════════════════════════════════════
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

const S9: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SCENES.flash);
  if (op <= 0) return null;
  const base = SCENES.flash[0];
  const pillLf = frame - Math.round((base + 0.25) * FPS);
  const pillS = spring({ frame: pillLf, fps, config: { damping: 13, stiffness: 90 }, from: 0.7, to: 1 });
  const pillOp = interpolate(pillLf, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const glow = 0.5 + 0.5 * Math.sin((t - base) * 2.4);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: '50%', top: 275, transform: `translateX(-50%) scale(${pillS})`,
        opacity: pillOp, whiteSpace: 'nowrap',
        background: 'rgba(239,68,68,0.14)', border: `2px solid rgba(239,68,68,${0.4 + glow * 0.3})`,
        borderRadius: 999, padding: '16px 40px',
        boxShadow: `0 0 ${34 + glow * 26}px rgba(239,68,68,0.3)`,
      }}>
        <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 28, color: WHITE }}>
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
        flipAtSec={base + 1.6}
        y={500} delaySec={base + 0.5} tilt={-2.5}
      />
      <FlashCard
        frontTitle="EMERGÊNCIA · FLASHCARD"
        front="Sepse: o que entra no pacote da 1ª hora?"
        back="Culturas + ATB empírico + lactato + cristaloide 30 mL/kg se hipotensão."
        flipAtSec={base + 2.9}
        y={960} delaySec={base + 0.85} tilt={2}
      />
    </div>
  );
};

// ═══ S10 — payoff: melhor prova + números + atualizados ═══════════════════
const S10: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SCENES.payoff);
  const base = Math.round(SCENES.payoff[0] * FPS);
  const heroLf = frame - base - 2;
  const heroS = spring({ frame: heroLf, fps, config: { damping: 14, stiffness: 75 }, from: 0.85, to: 1 });
  const heroOp = interpolate(heroLf, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const heroOut = interpolate(t, [B.n530 - 0.4, B.n530], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const nBase = Math.round(B.n530 * FPS);
  const cursos = useCountUp(530, nBase + 2, 30);
  const livros = useCountUp(9000, Math.round(B.n9000 * FPS), 34);
  const nOp1 = interpolate(frame - nBase, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const nOp2 = interpolate(frame - Math.round(B.n9000 * FPS), [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pillOp = interpolate(frame - Math.round(B.atualizados * FPS), [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: 60, right: 60, top: 660, textAlign: 'center',
        opacity: heroOp * heroOut, transform: `scale(${heroS})`,
      }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 74, color: WHITE, lineHeight: 1.14, letterSpacing: -2 }}>
          a melhor prova
          <br />
          <span style={{ color: RED }}>da minha vida.</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 500, textAlign: 'center', opacity: nOp1 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 150, color: WHITE, letterSpacing: -5, lineHeight: 1 }}>
          {cursos}<span style={{ color: RED }}>+</span>
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 33, color: W60, marginTop: 2 }}>cursos completos</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 820, textAlign: 'center', opacity: nOp2 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 150, color: WHITE, letterSpacing: -5, lineHeight: 1 }}>
          {livros}<span style={{ color: RED }}>+</span>
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 33, color: W60, marginTop: 2 }}>livros médicos</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1105, display: 'flex', justifyContent: 'center', opacity: pillOp }}>
        <div style={{
          background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.4)',
          borderRadius: 999, padding: '14px 38px',
          fontFamily: BODY, fontWeight: 600, fontSize: 24, color: WHITE,
        }}>
          🔔 sempre atualizados · <span style={{ color: RED }}>sem pagar nada a mais</span>
        </div>
      </div>
    </div>
  );
};

// ═══ S11 — "isso aqui é pra você." ════════════════════════════════════════
const S11: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SCENES.voce);
  const base = Math.round(SCENES.voce[0] * FPS);
  const l1 = spring({ frame: frame - base, fps, config: { damping: 14, stiffness: 80 }, from: 0.86, to: 1 });
  const o1 = interpolate(frame - base, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hi = t - SCENES.voce[0] > 1.1;
  const pulse = 1 + Math.sin((t - SCENES.voce[0]) * 4) * 0.012;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: 50, right: 50, top: 700, textAlign: 'center',
        opacity: o1, transform: `scale(${l1 * pulse})`,
      }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 82, color: WHITE, lineHeight: 1.16, letterSpacing: -2 }}>
          isso aqui é
          <br />
          <span style={{
            color: hi ? RED : WHITE,
            textShadow: hi ? '0 0 44px rgba(239,68,68,0.5)' : 'none',
          }}>pra você.</span>
        </div>
      </div>
    </div>
  );
};

// ═══ ROOT ═════════════════════════════════════════════════════════════════
export const C15_Historia: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t < B.link ? 0.55 : 1} />
      <S1 t={t} />
      <S2 t={t} />
      <S3 t={t} />
      <S4 t={t} />
      <S5 t={t} />
      <S6 t={t} />
      <S7 t={t} />
      <S8 t={t} />
      <S9 t={t} />
      <S10 t={t} />
      <S11 t={t} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={56} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Narration id="c15" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
