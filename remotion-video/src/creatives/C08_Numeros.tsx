import React from 'react';
import {
  AbsoluteFill, OffthreadVideo, Sequence, staticFile,
  useCurrentFrame, useVideoConfig, interpolate, spring,
} from 'remotion';
import { AmbientBg, Logo, EndCard, Narration, useCountUp } from './common';
import { PhoneFrame } from './DeviceFrames';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, MONO, fade, clamp01, easeInOut } from './theme';
import timing from './timings/c08.json';

const T = timing as Timing;
const DELAY = 0.9;                        // respiro antes do primeiro número
const FPS = 30;
export const C08_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

// beats (segundos absolutos na comp — timestamps reais do c08.json + DELAY)
const B_C1 = DELAY + 0.098;               // "530..."
const B_C2 = DELAY + 3.071;               // "9.000..."
const B_C3 = DELAY + 5.429;               // "17 categorias..."
const B_SUB = DELAY + 7.036;              // "...das maiores plataformas do Brasil"
const B_C4 = DELAY + 9.786;               // "+10.000 médicos e estudantes..."
const B_PLAT = DELAY + 13.119;            // "E agora tudo isso mora numa plataforma própria"
const B_PILL1 = DELAY + 16.512;           // "player"
const B_PILL2 = DELAY + 17.369;           // "busca"
const B_PILL3 = DELAY + 17.845;           // "progresso salvo"
const B_UPDATE = DELAY + 19.607;          // "Atualizações? Constantes..."
const B_END = DELAY + T.duration - 4.6;   // end card cobre o CTA falado

// ── fundo: clipes full-bleed desfocados, um por contador ──────────────────
const BG_SEGS = [
  { src: 'rec/m_dashboard.mp4', startFrom: 0,  inA: 0,           inB: 0.4,  outA: B_C2,         outB: B_C2 + 0.55 },
  { src: 'rec/m_rows.mp4',      startFrom: 81, inA: B_C2 - 0.55, inB: B_C2, outA: B_C3,         outB: B_C3 + 0.55 },
  { src: 'rec/d_dashboard.mp4', startFrom: 80, inA: B_C3 - 0.55, inB: B_C3, outA: B_C4,         outB: B_C4 + 0.55 },
  { src: 'rec/t_dashboard.mp4', startFrom: 0,  inA: B_C4 - 0.55, inB: B_C4, outA: B_PLAT + 0.2, outB: B_PLAT + 0.9 },
];

// ── divisor: trecho de ECG vermelho varrendo a tela na troca de contador ──
const EcgSweep: React.FC<{ atS: number; gid: string; y?: number }> = ({ atS, gid, y = 780 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = (t - atS) / 0.75;
  if (p <= 0 || p >= 1) return null;
  const x = interpolate(p, [0, 1], [-620, 1160]);
  const op = Math.sin(Math.PI * clamp01(p));
  return (
    <div style={{
      position: 'absolute', left: 0, top: y - 65, width: 1080, height: 130,
      overflow: 'hidden', pointerEvents: 'none',
    }}>
      <svg
        width={560} height={130} viewBox="0 0 560 130"
        style={{
          position: 'absolute', left: x, top: 0, opacity: op,
          filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.85))',
        }}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={RED} stopOpacity="0" />
            <stop offset="28%" stopColor={RED} stopOpacity="1" />
            <stop offset="82%" stopColor={RED} stopOpacity="1" />
            <stop offset="100%" stopColor={RED} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 65 H166 l15 -24 l17 54 l15 -33 l11 13 H346 l13 -20 l15 46 l13 -26 H560"
          fill="none" stroke={`url(#${gid})`} strokeWidth={4}
          strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

// ── contador gigante central ──────────────────────────────────────────────
const BigCounter: React.FC<{
  idx: number;
  target: number;
  plus?: boolean;
  label: string;
  sub?: string;
  subAtS?: number;
  inS: number;
  outS: number;
}> = ({ idx, target, plus, label, sub, subAtS, inS, outS }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const inF = Math.round(inS * fps);
  const s = spring({ frame: frame - inF, fps, config: { damping: 14, stiffness: 85 } });
  const val = useCountUp(target, inF + 2, 36);
  const exitP = easeInOut(clamp01((t - outS) / 0.42));
  if (t < inS - 0.02 || exitP >= 1) return null;
  const op = Math.min(1, Math.max(0, (t - inS) / 0.18)) * (1 - exitP);
  const y = 780 + (1 - s) * 110 - exitP * 140;
  const glow = 0.5 + 0.5 * Math.sin((t - inS) * 2.2);
  const subOp = sub && subAtS !== undefined ? clamp01((t - subAtS) / 0.35) : 0;
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top: y,
      transform: `translateY(-50%) scale(${0.86 + s * 0.14 + exitP * 0.05})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      opacity: op, pointerEvents: 'none',
    }}>
      <div style={{
        fontFamily: MONO, fontWeight: 700, fontSize: 23, color: W40, letterSpacing: 8,
      }}>
        {`0${idx} / 04`}
      </div>
      <div style={{
        fontFamily: HEAD, fontWeight: 900, fontSize: 190, lineHeight: 1, color: WHITE,
        letterSpacing: -5,
        textShadow: `0 0 ${56 + glow * 34}px rgba(239,68,68,0.38), 0 10px 40px rgba(0,0,0,0.6)`,
      }}>
        {val}
        {plus && <span style={{ color: RED }}>+</span>}
      </div>
      <div style={{
        fontFamily: BODY, fontWeight: 600, fontSize: 42, color: 'rgba(255,255,255,0.8)',
        letterSpacing: 7, textTransform: 'uppercase', textAlign: 'center',
      }}>
        {label}
      </div>
      {sub && subOp > 0 && (
        <div style={{
          opacity: subOp, transform: `translateY(${(1 - subOp) * 18}px)`,
          fontFamily: BODY, fontWeight: 500, fontSize: 27, color: W60, marginTop: 2,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
};

const PILLS = [
  { text: 'player', atS: B_PILL1 },
  { text: 'busca', atS: B_PILL2 },
  { text: 'progresso salvo', atS: B_PILL3 },
];

export const C08_Numeros: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // decor/marca d'água somem junto com o end card
  const uiOp = fade(frame, 4, 16, Math.round(B_END * FPS) + 2, Math.round(B_END * FPS) + 16);

  // fundo escurecido só enquanto os clipes rodam; depois o palco fica limpo
  const bgDark = 0.72 * (1 - easeInOut(clamp01((t - (B_PLAT + 0.2)) / 0.7)));

  // kicker do bloco de contadores
  const kickerOp = fade(frame, 8, 24, Math.round((B_PLAT - 0.25) * FPS), Math.round((B_PLAT + 0.15) * FPS));

  // ── celular sobe no beat "plataforma própria" ───────────────────────────
  const phoneS = spring({ frame: frame - Math.round(B_PLAT * FPS), fps, config: { damping: 15, stiffness: 58 } });
  const phoneTop = interpolate(phoneS, [0, 1], [1980, 320]);
  const phoneDrift = 1 + easeInOut(clamp01((t - B_PLAT - 0.8) / 9)) * 0.04;
  const phoneOp = 1 - easeInOut(clamp01((t - (B_END + 0.2)) / 0.5));
  const phoneGlow = clamp01((t - B_PLAT - 0.3) / 0.6);

  // pills saem quando o badge de atualizações entra
  const pillsOut = easeInOut(clamp01((t - B_UPDATE) / 0.4));

  // badge "Atualizações constantes"
  const badgeS = spring({ frame: frame - Math.round(B_UPDATE * FPS) - 4, fps, config: { damping: 13, stiffness: 90 } });
  const badgePulse = 0.6 + 0.4 * Math.sin((t - B_UPDATE) * 4.2);

  // ambiente pulsa no beat de atualização
  const updatePulse = t > B_UPDATE && t < B_END ? 0.5 + 0.5 * Math.sin((t - B_UPDATE) * 5) : 0;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={1 + updatePulse * 0.5} />

      {/* fundo: clipes reais desfocados crossfadando por contador */}
      {BG_SEGS.map((sg) => {
        if (t < sg.inA - 0.05 || t > sg.outB + 0.1) return null;
        const segFrom = Math.max(0, Math.round((sg.inA - 0.1) * FPS));
        const segDur = Math.round((sg.outB + 0.15) * FPS) - segFrom;
        const op = fade(frame, sg.inA * FPS, sg.inB * FPS, sg.outA * FPS, sg.outB * FPS);
        const segP = easeInOut(clamp01((t - sg.inA) / (sg.outB - sg.inA)));
        return (
          <Sequence key={sg.src} from={segFrom} durationInFrames={segDur} layout="none">
            <AbsoluteFill style={{ opacity: op, transform: `scale(${1.22 + segP * 0.07})` }}>
              <OffthreadVideo
                src={staticFile(sg.src)}
                muted
                startFrom={sg.startFrom}
                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(14px)' }}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
      {/* véu escuro + vinheta sobre os clipes */}
      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: bgDark }} />
      <div style={{
        position: 'absolute', inset: 0, opacity: (bgDark / 0.72) * 0.85,
        background: 'radial-gradient(ellipse 130% 105% at 50% 44%, transparent 48%, rgba(0,0,0,0.7) 100%)',
      }} />

      {/* divisores ECG entre contadores */}
      <EcgSweep atS={B_C2 - 0.3} gid="c08sw1" />
      <EcgSweep atS={B_C3 - 0.3} gid="c08sw2" />
      <EcgSweep atS={B_C4 - 0.3} gid="c08sw3" />
      <EcgSweep atS={B_PLAT - 0.3} gid="c08sw4" />

      {/* contadores gigantes nos beats exatos da narração */}
      <BigCounter idx={1} target={530} plus label="cursos completos" inS={B_C1} outS={B_C2} />
      <BigCounter idx={2} target={9000} plus label="livros médicos" inS={B_C2} outS={B_C3} />
      <BigCounter
        idx={3} target={17} label="categorias organizadas"
        sub="das maiores plataformas do Brasil" subAtS={B_SUB}
        inS={B_C3} outS={B_C4}
      />
      <BigCounter idx={4} target={10000} plus label="médicos e estudantes" inS={B_C4} outS={B_PLAT} />

      {/* kicker do bloco numérico */}
      {t < B_PLAT + 0.4 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 262,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18,
          opacity: kickerOp,
        }}>
          <div style={{ width: 52, height: 2.5, background: RED, borderRadius: 2, boxShadow: `0 0 12px ${RED}` }} />
          <span style={{
            fontFamily: BODY, fontWeight: 600, fontSize: 26, color: W60,
            letterSpacing: 8, textTransform: 'uppercase',
          }}>
            OneMed em números
          </span>
          <div style={{ width: 52, height: 2.5, background: RED, borderRadius: 2, boxShadow: `0 0 12px ${RED}` }} />
        </div>
      )}

      {/* beat "plataforma própria": celular sobe com o player rodando */}
      {t >= B_PLAT && (
        <Sequence from={Math.round(B_PLAT * FPS)} durationInFrames={Math.round((B_END + 1.2 - B_PLAT) * FPS)} layout="none">
          <div style={{ position: 'absolute', inset: 0, opacity: phoneOp }}>
            <div style={{
              position: 'absolute', left: '50%', top: 740, transform: 'translate(-50%, -50%)',
              width: 780, height: 960, borderRadius: '50%', filter: 'blur(110px)',
              background: `rgba(239,68,68,${0.16 * phoneGlow})`,
            }} />
            <div style={{
              position: 'absolute', left: '50%', top: phoneTop,
              transform: `translateX(-50%) scale(${phoneDrift})`,
              transformOrigin: '50% 18%',
            }}>
              <PhoneFrame src="rec/m_player.mp4" width={420} startFrom={60} />
            </div>
          </div>
        </Sequence>
      )}

      {/* pills "player · busca · progresso salvo" */}
      {t >= B_PILL1 - 0.1 && pillsOut < 1 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 1252,
          display: 'flex', justifyContent: 'center', gap: 18,
          opacity: 1 - pillsOut, transform: `translateY(${pillsOut * 36}px)`,
        }}>
          {PILLS.map((p) => {
            const s = spring({ frame: frame - Math.round(p.atS * FPS), fps, config: { damping: 13, stiffness: 110 } });
            return (
              <div key={p.text} style={{
                opacity: s,
                transform: `translateY(${(1 - s) * 44}px) scale(${0.8 + s * 0.2})`,
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(10,12,18,0.9)', border: '1.5px solid rgba(239,68,68,0.45)',
                borderRadius: 999, padding: '14px 28px',
                boxShadow: '0 14px 40px -12px rgba(0,0,0,0.7)',
              }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: RED, boxShadow: `0 0 10px ${RED}` }} />
                <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 29, color: WHITE }}>{p.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* beat "Atualizações? Constantes": badge accent grande no lugar das pills */}
      {t >= B_UPDATE && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 1244,
          display: 'flex', justifyContent: 'center',
          opacity: Math.min(badgeS, uiOp),
        }}>
          <div style={{
            transform: `scale(${0.82 + badgeS * 0.18})`, textAlign: 'center',
            background: 'rgba(239,68,68,0.14)', border: '2px solid rgba(239,68,68,0.55)',
            borderRadius: 26, padding: '24px 48px',
            boxShadow: `0 0 ${40 + badgePulse * 28}px rgba(239,68,68,${0.22 + badgePulse * 0.16})`,
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 46, color: WHITE, lineHeight: 1.1 }}>
              Atualizações <span style={{ color: RED }}>constantes</span>
            </div>
            <div style={{
              fontFamily: BODY, fontWeight: 600, fontSize: 25, color: W60,
              letterSpacing: 4, textTransform: 'uppercase', marginTop: 10,
            }}>
              sem pagar a mais
            </div>
          </div>
        </div>
      )}

      {/* marca d'água */}
      <div style={{ position: 'absolute', left: 64, top: 84, opacity: uiOp * 0.92 }}>
        <Logo size={54} row />
      </div>

      {/* legendas sincronizadas */}
      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={54} />

      {/* end card + narração */}
      <EndCard startFrame={Math.round(B_END * FPS)} />
      <Narration id="c08" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
