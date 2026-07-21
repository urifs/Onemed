import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText, Narration } from './common';
import { PhoneFrame } from './DeviceFrames';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, BODY, MONO, fade, clamp01, easeInOut } from './theme';
import timing from './timings/c05.json';

const T = timing as Timing;
const DELAY = 0.8;                          // narração entra quase junto do caos
const FPS = 30;
export const C05_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

// ── beats (segundos absolutos na comp = tempo da palavra + DELAY) ──────────
const B_SWEEP = DELAY + 6.65;               // "A OneMed..." — risco vermelho varre
const B_FLY = DELAY + 6.78;                 // "...resolveu" — cartões voam pra fora
const B_PHONE = DELAY + 7.3;                // celular limpo sobe (m_search do zero)
const B_530 = DELAY + 9.88;                 // "+530"
const B_9000 = DELAY + 12.0;                // "9.000"
const B_CATEG = DELAY + 13.64;              // "categoria"
const B_PILL_BUSCA = DELAY + 14.62;         // "busca"
const B_PILL_PLAYER = DELAY + 15.25;        // "player"
const B_PILL_PROG = DELAY + 15.7;           // "progresso salvo"
const B_PLAYER_XF = DELAY + 15.1;           // crossfade busca → player
const B_ACHOU = DELAY + 16.9;               // "Achou, clicou, estudou" — legenda maior
const B_ACHOU_END = DELAY + 19.35;
const B_UPDATE = DELAY + 19.5;              // "atualizações chegam sozinhas"
const B_END = DELAY + T.duration - 4.6;     // end card cobre o CTA falado

const SWEEP_F = Math.round(B_SWEEP * FPS);
const PHONE_F = Math.round(B_PHONE * FPS);
const XFADE_F = Math.round(B_PLAYER_XF * FPS);
const PHONE_W = 540;

// ── cartões bagunçados do beat de caos ─────────────────────────────────────
type IconKind = 'video' | 'pdf' | 'folder' | 'zip' | 'warn' | 'doc';

interface ChaosCardData {
  label: string;
  meta: string;
  icon: IconKind;
  x: number; y: number; rot: number;
  delaySec: number;                         // segundos absolutos na comp
  enterX: number; enterY: number;           // direção de entrada
  bad?: boolean;                            // borda avermelhada (link expirado)
}

const CARDS: ChaosCardData[] = [
  { label: 'aula_final_v2.mp4', meta: 'Downloads · 812 MB', icon: 'video', x: 84, y: 250, rot: -7, delaySec: DELAY + 0.05, enterX: -420, enterY: -80 },
  { label: 'PROVA_resumo(3).pdf', meta: 'sem pasta', icon: 'pdf', x: 500, y: 430, rot: 5, delaySec: DELAY + 0.7, enterX: 440, enterY: -60 },
  { label: 'Downloads/medicina2', meta: '34 arquivos soltos', icon: 'folder', x: 130, y: 620, rot: -4, delaySec: DELAY + 1.35, enterX: -460, enterY: 60 },
  { label: 'curso_completo(1).zip', meta: '1,8 GB · corrompido?', icon: 'zip', x: 470, y: 815, rot: 8, delaySec: DELAY + 2.0, enterX: 460, enterY: 90 },
  { label: 'link expirado ⚠', meta: 'acesso negado', icon: 'warn', x: 240, y: 1010, rot: -6, delaySec: DELAY + 3.18, enterX: -480, enterY: 120, bad: true }, // "um link aqui"
  { label: 'pasta sem nome', meta: 'vazia?', icon: 'folder', x: 540, y: 1185, rot: 4, delaySec: DELAY + 4.35, enterX: 480, enterY: 140 },                       // "uma pasta ali"
  { label: 'aula03_URGENTE.mp4', meta: 'WhatsApp · sem áudio', icon: 'video', x: 70, y: 1290, rot: 9, delaySec: DELAY + 4.9, enterX: -420, enterY: 200 },
  { label: 'resumo-FINAL-final.doc', meta: 'versão 07 — qual vale?', icon: 'doc', x: 350, y: 120, rot: -3, delaySec: DELAY + 5.28, enterX: 60, enterY: -360 },  // "nada organizado"
];

const CardIcon: React.FC<{ kind: IconKind; bad?: boolean }> = ({ kind, bad }) => {
  const stroke = bad ? RED : 'rgba(255,255,255,0.55)';
  const common = { width: 30, height: 30, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'video':
      return (
        <svg {...common}>
          <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
          <path d="M10 9.2 L15 12 L10 14.8 Z" fill={stroke} stroke="none" />
        </svg>
      );
    case 'pdf':
      return (
        <svg {...common}>
          <path d="M6 2.5 H14.5 L19.5 7.5 V21.5 H6 Z" />
          <path d="M14.5 2.5 V7.5 H19.5" />
          <path d="M9 13 H16.5 M9 16.5 H14.5" />
        </svg>
      );
    case 'folder':
      return (
        <svg {...common}>
          <path d="M3 6.5 A1.5 1.5 0 0 1 4.5 5 H9 L11 7.5 H19.5 A1.5 1.5 0 0 1 21 9 V18 A1.5 1.5 0 0 1 19.5 19.5 H4.5 A1.5 1.5 0 0 1 3 18 Z" />
        </svg>
      );
    case 'zip':
      return (
        <svg {...common}>
          <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
          <path d="M12 3.5 V6 M12 8 V10.5 M12 12.5 V15" strokeDasharray="2.4 2" />
        </svg>
      );
    case 'warn':
      return (
        <svg {...common}>
          <path d="M12 3.5 L21.5 20 H2.5 Z" />
          <path d="M12 9.5 V14" />
          <circle cx="12" cy="17" r="0.4" fill={stroke} />
        </svg>
      );
    case 'doc':
      return (
        <svg {...common}>
          <path d="M6 2.5 H14.5 L19.5 7.5 V21.5 H6 Z" />
          <path d="M9 12 H16.5 M9 15 H16.5 M9 18 H13.5" />
        </svg>
      );
  }
};

/** um cartão de arquivo bagunçado: spring de entrada, deriva caótica, voo de saída */
const ChaosCard: React.FC<{ data: ChaosCardData; index: number }> = ({ data, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // saída: some de vez pouco depois do risco
  if (t > B_FLY + 1.3) return null;

  const delayF = data.delaySec * fps;
  const s = spring({ frame: frame - delayF, fps, config: { damping: 12, stiffness: 130 }, from: 0, to: 1 });
  if (frame < delayF - 1) return null;

  // deriva caótica (senos dessincronizados por cartão)
  const ph = index * 1.7;
  const driftX = Math.sin(frame * (0.031 + index * 0.004) + ph) * 8;
  const driftY = Math.cos(frame * (0.026 + index * 0.005) + ph * 1.3) * 9;
  const wobble = Math.sin(frame * 0.045 + ph) * 1.6;

  // voo de saída: direção radial a partir do centro da tela
  const cx = data.x + 190, cy = data.y + 52;
  const dx = cx - 540, dy = cy - 870;
  const len = Math.max(1, Math.hypot(dx, dy));
  const flyP = clamp01((t - B_FLY - index * 0.035) / 0.5);
  const flyAcc = flyP * flyP;                              // acelera pra fora
  const flyX = (dx / len) * flyAcc * 1300;
  const flyY = (dy / len) * flyAcc * 1300;

  const enterX = (1 - s) * data.enterX;
  const enterY = (1 - s) * data.enterY;
  const rot = data.rot + wobble + (1 - s) * data.rot * 2.2 + flyAcc * data.rot * 4;
  const op = clamp01(s * 1.5) * (1 - clamp01(flyP * 1.5));
  if (op <= 0.002) return null;

  return (
    <div style={{
      position: 'absolute', left: data.x, top: data.y,
      transform: `translate(${enterX + driftX + flyX}px, ${enterY + driftY + flyY}px) rotate(${rot}deg) scale(${0.78 + clamp01(s) * 0.22})`,
      opacity: op,
      display: 'flex', alignItems: 'center', gap: 16,
      background: 'rgba(14,16,22,0.92)',
      border: data.bad ? '1px solid rgba(239,68,68,0.45)' : '1px solid rgba(255,255,255,0.10)',
      borderRadius: 16, padding: '18px 26px',
      boxShadow: '0 20px 50px -14px rgba(0,0,0,0.75)',
    }}>
      <CardIcon kind={data.icon} bad={data.bad} />
      <div>
        <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 25, color: data.bad ? RED : 'rgba(255,255,255,0.82)', lineHeight: 1.15, whiteSpace: 'nowrap' }}>
          {data.label}
        </div>
        <div style={{ fontFamily: BODY, fontSize: 17, color: W40, marginTop: 5, whiteSpace: 'nowrap' }}>
          {data.meta}
        </div>
      </div>
    </div>
  );
};

/** mini-pill do trio busca · player · progresso salvo */
const MiniPill: React.FC<{ label: string; delaySec: number }> = ({ label, delaySec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delaySec * fps, fps, config: { damping: 13, stiffness: 140 }, from: 0, to: 1 });
  if (frame < delaySec * fps - 1) return null;
  return (
    <div style={{
      opacity: clamp01(s * 1.4),
      transform: `translateY(${(1 - s) * 46}px) scale(${0.8 + clamp01(s) * 0.2})`,
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'rgba(10,12,18,0.92)', border: '1px solid rgba(255,255,255,0.16)',
      borderRadius: 999, padding: '15px 30px',
      boxShadow: '0 14px 40px -10px rgba(0,0,0,0.7)',
    }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: RED, boxShadow: `0 0 12px ${RED}` }} />
      <span style={{ fontFamily: BODY, fontWeight: 700, fontSize: 27, color: WHITE, whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
};

export const C05_Chaos: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ── risco vermelho que "resolve" o caos ───────────────────────────────────
  const sweepP = easeInOut(clamp01((frame - SWEEP_F) / 13));
  const sweepW = sweepP * 1200;
  const sweepOp = fade(frame, SWEEP_F, SWEEP_F + 3, SWEEP_F + 20, SWEEP_F + 34);
  const flashOp = interpolate(t, [B_SWEEP, B_SWEEP + 0.18, B_SWEEP + 0.8], [0, 0.5, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // ── celular limpo sobe após o risco ───────────────────────────────────────
  const phoneIn = spring({ frame: frame - PHONE_F, fps, config: { damping: 15, stiffness: 60 }, from: 0, to: 1 });
  const phoneY = interpolate(phoneIn, [0, 1], [1560, 200]);
  const drift = 1 + easeInOut(clamp01((t - B_PHONE) / 15)) * 0.05;
  const phoneTransform = `translateX(-50%) scale(${drift})`;

  // crossfade busca → player em "player e progresso salvo"
  const playerOp = interpolate(t, [B_PLAYER_XF + 0.5, B_PLAYER_XF + 1.1], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // legenda cresce em "Achou, clicou, estudou"
  const capSize = t >= B_ACHOU && t <= B_ACHOU_END + 0.8 ? 62 : 56;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t < B_SWEEP ? 0.65 : 1.15} />

      {/* ── beat 1: o caos ── */}
      {CARDS.map((c, i) => (
        <ChaosCard key={c.label} data={c} index={i} />
      ))}

      {/* rótulo sutil do caos */}
      {t < B_SWEEP + 0.4 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 58, textAlign: 'center',
          opacity: fade(frame, 30, 50, SWEEP_F - 8, SWEEP_F + 8),
          fontFamily: BODY, fontSize: 24, color: W60,
          letterSpacing: 7, textTransform: 'uppercase',
        }}>
          Seus cursos hoje
        </div>
      )}

      {/* ── beat 2: risco vermelho + flash ── */}
      {sweepOp > 0.001 && (
        <>
          <div style={{
            position: 'absolute', left: -60, top: 868, height: 4, width: sweepW,
            background: RED, borderRadius: 2, opacity: sweepOp,
            boxShadow: `0 0 24px ${RED}, 0 0 60px rgba(239,68,68,0.6)`,
          }} />
          <div style={{
            position: 'absolute', left: -60, top: 828, height: 84, width: sweepW,
            opacity: sweepOp * 0.5,
            background: 'linear-gradient(90deg, transparent 20%, rgba(239,68,68,0.35) 92%, rgba(239,68,68,0.65) 100%)',
            filter: 'blur(6px)',
          }} />
        </>
      )}
      {flashOp > 0.001 && (
        <div style={{
          position: 'absolute', inset: 0, opacity: flashOp, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 900px 700px at 50% 46%, rgba(239,68,68,0.5) 0%, transparent 70%)',
        }} />
      )}

      {/* ── beat 3: celular limpo — busca digita "cardio", grid filtra ── */}
      <Sequence from={PHONE_F} layout="none">
        <div style={{
          position: 'absolute', left: '50%', top: phoneY,
          transform: phoneTransform, transformOrigin: '50% 18%',
        }}>
          {/* glow de "ordem" atrás do aparelho */}
          <div style={{
            position: 'absolute', left: '50%', top: '42%', width: 860, height: 1050,
            transform: 'translate(-50%, -50%)', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(239,68,68,0.22) 0%, transparent 65%)',
            filter: 'blur(30px)', opacity: clamp01(phoneIn * 1.2),
          }} />
          <div style={{ position: 'relative' }}>
            <PhoneFrame src="rec/m_search.mp4" width={PHONE_W} startFrom={0} />
          </div>
        </div>
      </Sequence>

      {/* crossfade para o player em "player e progresso salvo" */}
      <Sequence from={XFADE_F} layout="none">
        <div style={{
          position: 'absolute', left: '50%', top: phoneY,
          transform: phoneTransform, transformOrigin: '50% 18%',
          opacity: playerOp,
        }}>
          <PhoneFrame src="rec/m_player.mp4" width={PHONE_W} startFrom={0} />
        </div>
      </Sequence>

      {/* ── beat 4: números nos beats da narração ── */}
      {t > B_530 && (
        <>
          <FloatBadge x={36} y={370} delay={Math.round(B_530 * FPS)} from="left" accent>
            <BadgeText top="+530 cursos" bottom="completos" />
          </FloatBadge>
          <FloatBadge x={704} y={560} delay={Math.round(B_9000 * FPS)} from="right">
            <BadgeText top="+9.000" bottom="livros médicos" />
          </FloatBadge>
          <FloatBadge x={48} y={975} delay={Math.round(B_CATEG * FPS)} from="left">
            <BadgeText top="17 categorias" bottom="tudo organizado" />
          </FloatBadge>
        </>
      )}

      {/* trio de mini-pills: busca · player · progresso salvo */}
      {t > B_PILL_BUSCA - 0.2 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 1358,
          display: 'flex', justifyContent: 'center', gap: 18,
        }}>
          <MiniPill label="busca" delaySec={B_PILL_BUSCA} />
          <MiniPill label="player" delaySec={B_PILL_PLAYER} />
          <MiniPill label="progresso salvo" delaySec={B_PILL_PROG} />
        </div>
      )}

      {/* ── beat 6: atualizações sozinhas ── */}
      {t > B_UPDATE && (
        <FloatBadge x={596} y={1050} delay={Math.round(B_UPDATE * FPS) + 4} from="right" accent>
          <BadgeText top="Atualizações" bottom="chegam sozinhas, sem custo" />
        </FloatBadge>
      )}

      {/* legendas sincronizadas (base livre: cartões ficam acima de y≈1400) */}
      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={capSize} />

      {/* end card + narração */}
      <EndCard startFrame={Math.round(B_END * FPS)} />
      <Narration id="c05" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
