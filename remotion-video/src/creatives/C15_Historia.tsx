import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText, Narration, useCountUp } from './common';
import { PhoneFrame } from './DeviceFrames';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, MONO, clamp01, easeInOut } from './theme';
import timing from './timings/c15.json';

const T = timing as Timing;
const DELAY = 0.7;
const FPS = 30;
export const C15_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

// beats = timestamp real da palavra + DELAY
const B = {
  prova12: DELAY + 3.6,        // "prova em doze dias"
  caos: DELAY + 4.7,           // "três cursos espalhados"
  abas: DELAY + 6.3,           // "quarenta abas"
  estudando: DELAY + 7.9,
  link: DELAY + 10.4,          // "Aí uma amiga..."
  tudo: DELAY + 13.2,          // "Tudo. Num lugar só."
  mapa: DELAY + 15.1,
  busca: DELAY + 18.1,
  comunidade: DELAY + 21.4,
  prova2: DELAY + 24.5,        // "Doze dias depois?"
  numeros: DELAY + 28.1,
  praVoce: DELAY + 32.4,       // "Se você tá como eu tava..."
  end: DELAY + T.duration - 3.4,
};

const SCENES = {
  clock: [0, B.caos],
  chaos: [B.caos, B.link],
  chat: [B.link, B.mapa],
  mapa: [B.mapa, B.busca],
  buscaS: [B.busca, B.comunidade],
  comun: [B.comunidade, B.prova2],
  provaN: [B.prova2, B.praVoce],
  voce: [B.praVoce, B.end + 1.0],
} as const;

const XF = 0.45;
function sceneOpacity(t: number, [a, b]: readonly [number, number], first = false): number {
  const fi = first ? 1 : clamp01((t - a) / XF);
  const fo = clamp01((b - t) / XF);
  return Math.min(fi, fo);
}
function useRise(startSec: number, dist = 130) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - Math.round(startSec * FPS);
  const s = spring({ frame: lf, fps, config: { damping: 16, stiffness: 60 }, from: 0, to: 1 });
  const op = interpolate(lf, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return { y: dist * (1 - s), op };
}

// ═══════════════════════════════════════════════════════════════════════════
// S1 — 23:47, fim do plantão (atmosfera)
// ═══════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════
// S2 — o caos: abas e arquivos espalhados + notificações
// ═══════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════
// S3 — a amiga manda o link → celular sobe com a plataforma
// ═══════════════════════════════════════════════════════════════════════════
const S3: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SCENES.chat);
  if (op <= 0) return null;
  const msgLf = frame - Math.round((SCENES.chat[0] + 0.25) * FPS);
  const msgS = spring({ frame: msgLf, fps, config: { damping: 13, stiffness: 110 }, from: 0, to: 1 });
  const msg2Lf = frame - Math.round((SCENES.chat[0] + 1.1) * FPS);
  const msg2S = spring({ frame: msg2Lf, fps, config: { damping: 13, stiffness: 110 }, from: 0, to: 1 });
  const phoneRise = useRise(B.tudo - 0.35, 720);
  // as bolhas sobem quando o celular chega
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
        <PhoneFrame src="rec/n_banner.mp4" width={560} startFrom={10} />
      </div>
    </div>
  );
};

// ═══ cenas de demo: mapa → busca → comunidade (mesma linguagem do C14) ═════
const Demo: React.FC<{
  t: number; range: readonly [number, number];
  src: string; startFrom: number;
  badgeTop: string; badgeBottom: string; badgeX: number; badgeFrom: 'left' | 'right';
}> = ({ t, range, src, startFrom, badgeTop, badgeBottom, badgeX, badgeFrom }) => {
  const op = sceneOpacity(t, range);
  const rise = useRise(range[0], 90);
  const breath = 1 + easeInOut(clamp01((t - range[0]) / 4)) * 0.04;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: '50%', top: 165,
        transform: `translateX(-50%) translateY(${rise.y}px) scale(${breath})`,
        transformOrigin: '50% 20%',
        opacity: rise.op,
      }}>
        <PhoneFrame src={src} width={600} startFrom={startFrom} />
      </div>
      <FloatBadge x={badgeX} y={330} delay={Math.round((range[0] + 0.45) * FPS)} from={badgeFrom} accent>
        <BadgeText top={badgeTop} bottom={badgeBottom} />
      </FloatBadge>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// S7 — "melhor prova da minha vida" + números
// ═══════════════════════════════════════════════════════════════════════════
const S7: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SCENES.provaN);
  const base = Math.round(SCENES.provaN[0] * FPS);
  const heroLf = frame - base - 2;
  const heroS = spring({ frame: heroLf, fps, config: { damping: 14, stiffness: 75 }, from: 0.85, to: 1 });
  const heroOp = interpolate(heroLf, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const heroOut = interpolate(t, [B.numeros - 0.4, B.numeros], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const nBase = Math.round(B.numeros * FPS);
  const cursos = useCountUp(530, nBase + 2, 34);
  const livros = useCountUp(9000, nBase + 12, 38);
  const nOp1 = interpolate(frame - nBase, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const nOp2 = interpolate(frame - nBase, [10, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
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
      <div style={{ position: 'absolute', left: 0, right: 0, top: 540, textAlign: 'center', opacity: nOp1 * (op) }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 150, color: WHITE, letterSpacing: -5, lineHeight: 1 }}>
          {cursos}<span style={{ color: RED }}>+</span>
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 33, color: W60, marginTop: 2 }}>cursos completos</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 860, textAlign: 'center', opacity: nOp2 * (op) }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 150, color: WHITE, letterSpacing: -5, lineHeight: 1 }}>
          {livros}<span style={{ color: RED }}>+</span>
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 33, color: W60, marginTop: 2 }}>livros médicos</div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// S8 — "isso aqui é pra você."
// ═══════════════════════════════════════════════════════════════════════════
const S8: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SCENES.voce);
  const base = Math.round(SCENES.voce[0] * FPS);
  const l1 = spring({ frame: frame - base, fps, config: { damping: 14, stiffness: 80 }, from: 0.86, to: 1 });
  const o1 = interpolate(frame - base, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hi = t - SCENES.voce[0] > 1.3;
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

// ═══════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════
export const C15_Historia: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t < B.link ? 0.55 : 1} />
      <S1 t={t} />
      <S2 t={t} />
      <S3 t={t} />
      <Demo t={t} range={SCENES.mapa} src="rec/n_tools.mp4" startFrom={358}
        badgeTop="Mapa do curso" badgeBottom="a ordem certa de estudar" badgeX={600} badgeFrom="right" />
      <Demo t={t} range={SCENES.buscaS} src="rec/n_search2.mp4" startFrom={26}
        badgeTop="Busca total" badgeBottom="achou em segundos" badgeX={56} badgeFrom="left" />
      <Demo t={t} range={SCENES.comun} src="rec/n_reply.mp4" startFrom={92}
        badgeTop="✓ Equipe OneMed" badgeBottom="gente respondendo com você" badgeX={560} badgeFrom="right" />
      <S7 t={t} />
      <S8 t={t} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={56} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Narration id="c15" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
