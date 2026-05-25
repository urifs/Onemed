import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  OffthreadVideo,
  staticFile,
  Series,
} from 'remotion';

export const SHOWCASE_DURATION = 810; // 27 s @ 30 fps

// ── Palette ────────────────────────────────────────────────────────────────
const RED  = '#ef4444';
const WHITE = '#ffffff';
const W70  = 'rgba(255,255,255,0.70)';
const W50  = 'rgba(255,255,255,0.50)';
const W30  = 'rgba(255,255,255,0.30)';
const W10  = 'rgba(255,255,255,0.07)';
const BG   = '#05080f';
const HEAD = "'Outfit','Helvetica Neue',Arial,sans-serif";
const BODY = "'Inter','Helvetica Neue',Arial,sans-serif";
const MONO = "'JetBrains Mono','Courier New',monospace";

// Drive video: 576×1280 portrait
// Scale to fill 1080px wide → factor 1.875 → height 2400
// Center in 1920: top = (1920-2400)/2 = -240
const VID_W = 1080;
const VID_H = Math.round(1280 * (1080 / 576)); // 2400
const VID_TOP = Math.round((1920 - VID_H) / 2); // -240

// ── Helpers ────────────────────────────────────────────────────────────────
function c01(x: number) { return Math.max(0, Math.min(1, x)); }
function easeOut(t: number) { return 1 - (1 - t) * (1 - t); }
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

function fade(f: number, inS: number, inE: number, outS: number, outE: number): number {
  const fi = easeOut(c01((f - inS) / Math.max(1, inE - inS)));
  const fo = easeOut(c01(1 - (f - outS) / Math.max(1, outE - outS)));
  return fi * fo;
}

// ── ECG waveform ──────────────────────────────────────────────────────────
function ecgY(t: number): number {
  const n = ((t % 1) + 1) % 1;
  if (n < 0.05) return 0;
  if (n < 0.15) return Math.sin((n - 0.05) / 0.10 * Math.PI) * 0.18;
  if (n < 0.18) return 0;
  if (n < 0.20) return -(n - 0.18) / 0.02 * 0.20;
  if (n < 0.22) return -0.20 + (n - 0.20) / 0.02 * 1.20;
  if (n < 0.24) return  1.00 - (n - 0.22) / 0.02 * 1.30;
  if (n < 0.26) return -0.30 + (n - 0.24) / 0.02 * 0.30;
  if (n < 0.37) return 0;
  if (n < 0.53) return Math.sin((n - 0.37) / 0.16 * Math.PI) * 0.36;
  return 0;
}

// ECGLine uses its own frame so it stays in sync with composition
const ECGLine: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => {
  const frame = useCurrentFrame();
  const W = 1080, H = 60, AMP = 22, PTS = 220;
  const off = frame * 0.004;
  const d = Array.from({ length: PTS }, (_, i) => {
    const x = (i / (PTS - 1)) * W;
    const y = H / 2 - ecgY(i / PTS + off) * AMP;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <div style={{ position: 'absolute', bottom: 36, left: 0, width: W, height: H, opacity, pointerEvents: 'none' }}>
      <svg width={W} height={H} style={{ filter: 'drop-shadow(0 0 5px rgba(239,68,68,0.55))' }}>
        <defs>
          <linearGradient id="ecgShowFade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="transparent" />
            <stop offset="8%"   stopColor={RED} />
            <stop offset="92%"  stopColor={RED} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke="url(#ecgShowFade)" strokeWidth={1.8} />
      </svg>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 1 — Intro  (local 0–90 f)
// ═══════════════════════════════════════════════════════════════════════════
const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSc = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 80 }, from: 0.82, to: 1 });
  const logoOp = fade(frame, 8, 32, 68, 90);
  const line1Op = fade(frame, 28, 52, 68, 90);
  const line2Op = fade(frame, 46, 70, 68, 90);
  const barSc  = interpolate(frame, [5, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <>
      {/* Red top bar sweeping in */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: RED,
        transformOrigin: 'left', transform: `scaleX(${barSc})`,
      }} />

      {/* Logo block */}
      <div style={{
        position: 'absolute', top: 660, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: logoOp, transform: `scale(${logoSc})`,
      }}>
        {/* Medical cross icon */}
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 22, boxShadow: '0 0 48px rgba(239,68,68,0.18)',
        }}>
          <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
            <rect x="17" y="5" width="8" height="32" rx="4" fill={RED} />
            <rect x="5"  y="17" width="32" height="8" rx="4" fill={RED} />
          </svg>
        </div>
        <div style={{ fontFamily: HEAD, fontSize: 80, fontWeight: 900, color: WHITE, letterSpacing: '-3px', lineHeight: 1 }}>
          One<span style={{ color: RED }}>Med</span>
        </div>
        <div style={{ width: 72, height: 3, background: RED, borderRadius: 2, marginTop: 20 }} />
      </div>

      {/* Tagline — two lines */}
      <div style={{
        position: 'absolute', top: 920, left: 60, right: 60, textAlign: 'center',
        opacity: line1Op,
        transform: `translateY(${interpolate(c01((frame - 28) / 24), [0, 1], [18, 0])}px)`,
      }}>
        <p style={{ fontFamily: HEAD, fontSize: 36, fontWeight: 700, color: W70, margin: 0, lineHeight: 1.25 }}>
          Você não precisa acreditar.
        </p>
      </div>
      <div style={{
        position: 'absolute', top: 982, left: 60, right: 60, textAlign: 'center',
        opacity: line2Op,
        transform: `translateY(${interpolate(c01((frame - 46) / 24), [0, 1], [18, 0])}px)`,
      }}>
        <p style={{ fontFamily: HEAD, fontSize: 36, fontWeight: 700, color: RED, margin: 0 }}>
          Veja.
        </p>
      </div>

      <ECGLine opacity={logoOp * 0.55} />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 2 — Showcase / video visible  (local 0–240 f)
// ═══════════════════════════════════════════════════════════════════════════
const SPEC_ROWS = [
  ['Cardiologia', 'Neurologia', 'Clínica Médica', 'Cirurgia', 'Pediatria'],
  ['Residência',  'Revalida',   'Anatomia',        'Fisiologia', 'Semiologia'],
  ['Ortopedia',   'Ginecologia','Dermatologia',    'Urgência',   'INEP Sprint'],
];

const SceneShowcase: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOp = fade(frame, 5, 35, 210, 240);
  const statOp  = fade(frame, 120, 155, 210, 240);

  return (
    <>
      {/* Top readability gradient */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 420,
        background: 'linear-gradient(to bottom, rgba(5,8,15,0.96), transparent)',
        pointerEvents: 'none',
      }} />
      {/* Bottom readability gradient */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 420,
        background: 'linear-gradient(to top, rgba(5,8,15,0.96), transparent)',
        pointerEvents: 'none',
      }} />

      {/* Title */}
      <div style={{
        position: 'absolute', top: 90, left: 0, right: 0, textAlign: 'center',
        opacity: titleOp,
      }}>
        <p style={{ fontFamily: HEAD, fontSize: 22, fontWeight: 600, color: W50, letterSpacing: 5, textTransform: 'uppercase', margin: '0 0 12px' }}>
          Acervo completo
        </p>
        <p style={{ fontFamily: HEAD, fontSize: 58, fontWeight: 800, color: WHITE, margin: 0, lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          No Google Drive
        </p>
      </div>

      {/* Specialty tag rows sliding in from alternating sides */}
      {SPEC_ROWS.map((tags, ri) => {
        const rowStart = 45 + ri * 22;
        const op = fade(frame, rowStart, rowStart + 35, 210, 240);
        const dir = ri % 2 === 0 ? 1 : -1;
        const tx = interpolate(c01((frame - rowStart) / 35), [0, 1], [dir * 55, 0]);
        return (
          <div key={ri} style={{
            position: 'absolute',
            top: 380 + ri * 120,
            left: 0, right: 0,
            display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap',
            opacity: op, transform: `translateX(${tx}px)`,
          }}>
            {tags.map(t => (
              <span key={t} style={{
                fontFamily: BODY, fontSize: 22, fontWeight: 500, color: WHITE,
                background: 'rgba(255,255,255,0.09)',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 100, padding: '8px 22px',
              }}>{t}</span>
            ))}
          </div>
        );
      })}

      {/* Stats bar */}
      <div style={{
        position: 'absolute', bottom: 90, left: 40, right: 40,
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        background: 'rgba(5,8,15,0.65)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 22, padding: '26px 20px',
        opacity: statOp,
      }}>
        {([['530+', 'Cursos'], ['9.000+', 'Livros'], ['35+', 'Especialidades']] as const).map(([n, l]) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: HEAD, fontSize: 46, fontWeight: 800, color: RED, margin: '0 0 4px', lineHeight: 1 }}>{n}</p>
            <p style={{ fontFamily: BODY, fontSize: 18, color: W50, margin: 0 }}>{l}</p>
          </div>
        ))}
      </div>

      <ECGLine opacity={0.30} />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 3 — Stats  (local 0–180 f)
// ═══════════════════════════════════════════════════════════════════════════
function counter(frame: number, end: number, startF: number, dur: number): string {
  const val = Math.round(easeOutCubic(c01((frame - startF) / dur)) * end);
  return val >= end
    ? end >= 1000 ? `${end.toLocaleString('pt-BR')}+` : `${end}+`
    : val >= 1000 ? val.toLocaleString('pt-BR') : String(val);
}

const STAT_BLOCKS = [
  { end: 530,   sub: 'Cursos médicos completos',   note: 'Residência · Revalida · Clínica · Básico',   delay: 20 },
  { end: 9000,  sub: 'Livros e materiais',          note: 'PDFs · Apostilas · Flashcards · Mapas',      delay: 40 },
  { end: 10000, sub: 'Alunos ativos',               note: 'De todas as regiões do Brasil',              delay: 60 },
];

const SceneStats: React.FC = () => {
  const frame = useCurrentFrame();
  const titleOp = fade(frame, 5, 28, 155, 180);

  return (
    <>
      <div style={{
        position: 'absolute', top: 80, left: 0, right: 0, textAlign: 'center',
        opacity: titleOp,
      }}>
        <p style={{ fontFamily: HEAD, fontSize: 24, fontWeight: 600, color: W50, letterSpacing: 5, textTransform: 'uppercase', margin: 0 }}>
          Em números
        </p>
      </div>

      <div style={{ position: 'absolute', top: 190, left: 60, right: 60, display: 'flex', flexDirection: 'column', gap: 50 }}>
        {STAT_BLOCKS.map(({ end, sub, note, delay }, i) => {
          const op = fade(frame, delay, delay + 35, 155, 180);
          const ty = interpolate(c01((frame - delay) / 35), [0, 1], [28, 0]);
          return (
            <div key={sub} style={{ opacity: op, transform: `translateY(${ty}px)` }}>
              <p style={{ fontFamily: HEAD, fontSize: 94, fontWeight: 900, color: WHITE, letterSpacing: '-3px', lineHeight: 1, margin: 0 }}>
                {counter(frame, end, delay, 100)}
              </p>
              <p style={{ fontFamily: HEAD, fontSize: 28, fontWeight: 700, color: RED, margin: '4px 0 6px' }}>{sub}</p>
              <p style={{ fontFamily: BODY, fontSize: 19, color: W50, margin: '0 0 16px' }}>{note}</p>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
            </div>
          );
        })}
      </div>

      <ECGLine opacity={0.60} />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 4 — Formation stages  (local 0–150 f)
// ═══════════════════════════════════════════════════════════════════════════
const STAGES = [
  { emoji: '🔬', label: 'Ciclo Básico',  sub: 'Anatomia · Fisiologia · Bioquímica · Histologia', color: '#3b82f6' },
  { emoji: '🩺', label: 'Ciclo Clínico', sub: 'Semiologia · Clínica Médica · Patologia',          color: '#8b5cf6' },
  { emoji: '🏥', label: 'Internato',     sub: 'Emergência · Plantão · Prescrição · Urgência',     color: '#06b6d4' },
  { emoji: '📋', label: 'Residência',    sub: 'Estratégia Med · Medway · MedGrupo · Medcof',      color: RED       },
  { emoji: '🌎', label: 'Revalida',      sub: 'INEP · HardWork · Mundo Revalida · Provas FMUSP',  color: '#10b981' },
];

const SceneStages: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleOp = fade(frame, 5, 28, 120, 150);

  return (
    <>
      <div style={{ position: 'absolute', top: 90, left: 0, right: 0, textAlign: 'center', opacity: titleOp }}>
        <p style={{ fontFamily: HEAD, fontSize: 24, fontWeight: 600, color: W50, letterSpacing: 4, textTransform: 'uppercase', margin: '0 0 12px' }}>
          Para cada etapa
        </p>
        <p style={{ fontFamily: HEAD, fontSize: 52, fontWeight: 800, color: WHITE, margin: 0, lineHeight: 1.1, letterSpacing: '-1.5px' }}>
          Da sua formação médica
        </p>
      </div>

      <div style={{ position: 'absolute', top: 330, left: 54, right: 54, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {STAGES.map(({ emoji, label, sub, color }, i) => {
          const delay = 28 + i * 14;
          const sc  = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 75 }, from: 0.92, to: 1 });
          const op  = fade(frame, delay, delay + 28, 120, 150);
          const tx  = interpolate(c01((frame - delay) / 28), [0, 1], [-44, 0]);
          return (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 22,
              background: W10,
              border: '1px solid rgba(255,255,255,0.08)',
              borderLeft: `4px solid ${color}`,
              borderRadius: 18, padding: '18px 26px',
              opacity: op, transform: `translateX(${tx}px) scale(${sc})`,
            }}>
              <span style={{ fontSize: 36, flexShrink: 0 }}>{emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: HEAD, fontSize: 25, fontWeight: 700, color: WHITE, margin: '0 0 3px' }}>{label}</p>
                <p style={{ fontFamily: BODY, fontSize: 16, color: W50, margin: 0 }}>{sub}</p>
              </div>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
            </div>
          );
        })}
      </div>

      <ECGLine opacity={0.45} />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 5 — CTA  (local 0–150 f)
// ═══════════════════════════════════════════════════════════════════════════
const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const heroOp  = fade(frame, 5, 38, 125, 150);
  const plansOp = fade(frame, 45, 78, 125, 150);
  const trialOp = fade(frame, 82, 110, 125, 150);
  const urlOp   = fade(frame, 108, 132, 125, 150);

  const pulse = Math.sin(frame * 0.09) * 0.1 + 0.20;

  const plans = [
    { label: 'Anual',     price: 'R$ 199',   suffix: '/ano',     orig: 'R$ 399', highlight: false },
    { label: 'Vitalício', price: 'R$ 299',    suffix: ',90 único', orig: 'R$ 667', highlight: true  },
  ];

  return (
    <>
      {/* Red top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: RED }} />

      {/* Ambient red glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 900px 700px at 50% 44%, rgba(239,68,68,0.13) 0%, transparent 65%)',
        opacity: pulse,
      }} />

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 56px', gap: 40,
      }}>
        {/* Hero */}
        <div style={{
          textAlign: 'center', opacity: heroOp,
          transform: `translateY(${interpolate(c01(frame / 35), [0, 1], [26, 0])}px)`,
        }}>
          <p style={{ fontFamily: HEAD, fontSize: 22, fontWeight: 600, color: W50, letterSpacing: 5, textTransform: 'uppercase', margin: '0 0 18px' }}>
            Comece agora
          </p>
          <p style={{ fontFamily: HEAD, fontSize: 68, fontWeight: 900, color: WHITE, margin: 0, lineHeight: 1.0, letterSpacing: '-2px' }}>
            Experimente<br />30 min. grátis
          </p>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'flex', gap: 20, width: '100%', opacity: plansOp }}>
          {plans.map(({ label, price, suffix, orig, highlight }) => {
            const sc = spring({ frame: frame - (highlight ? 58 : 35), fps, config: { damping: 12, stiffness: 65 }, from: 0.88, to: 1 });
            return (
              <div key={label} style={{
                flex: 1, borderRadius: 22, padding: '28px 20px', textAlign: 'center',
                background: highlight ? 'rgba(239,68,68,0.09)' : W10,
                border: `2px solid ${highlight ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.12)'}`,
                boxShadow: highlight ? '0 0 48px rgba(239,68,68,0.12)' : 'none',
                transform: `scale(${sc})`,
              }}>
                <p style={{ fontFamily: HEAD, fontSize: 20, fontWeight: 600, color: WHITE, margin: '0 0 6px', opacity: 0.75 }}>{label}</p>
                <p style={{ fontFamily: BODY, fontSize: 13, color: W30, textDecoration: 'line-through', margin: '0 0 4px' }}>{orig}</p>
                <p style={{ fontFamily: HEAD, fontSize: 44, fontWeight: 900, color: highlight ? RED : WHITE, margin: '0 0 4px', letterSpacing: '-1.5px', lineHeight: 1 }}>
                  {price}<span style={{ fontSize: 22, fontWeight: 700 }}>{suffix}</span>
                </p>
              </div>
            );
          })}
        </div>

        {/* Trial badge */}
        <div style={{
          background: 'rgba(239,68,68,0.10)',
          border: '1.5px solid rgba(239,68,68,0.38)',
          borderRadius: 100, padding: '14px 44px', opacity: trialOp,
        }}>
          <p style={{ fontFamily: HEAD, fontSize: 24, fontWeight: 700, color: RED, margin: 0 }}>
            🎁 Trial gratuito de 30 minutos
          </p>
        </div>

        {/* URL */}
        <div style={{ opacity: urlOp }}>
          <p style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, color: RED, margin: 0, letterSpacing: 1, textShadow: '0 0 20px rgba(239,68,68,0.6)' }}>
            onemedcursos.com.br
          </p>
        </div>
      </div>

      <ECGLine opacity={0.85} />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ROOT — drive video plays full-bleed throughout; overlay darkens per scene
// ═══════════════════════════════════════════════════════════════════════════
export const OneMedShowcase: React.FC = () => {
  const frame = useCurrentFrame();

  // Dark overlay opacity — lifts during showcase scene (90–330) to reveal video
  const overlayOpacity = interpolate(
    frame,
    [0, 82, 98, 322, 338, 502, 518, 652, 668, 810],
    [0.88, 0.88, 0.38, 0.38, 0.84, 0.84, 0.80, 0.80, 0.88, 0.88],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Slow vertical drift of the drive video
  const scrollY = interpolate(frame, [0, SHOWCASE_DURATION], [0, 50]);

  return (
    <AbsoluteFill style={{ background: BG, overflow: 'hidden' }}>
      {/* Drive video — always playing */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <OffthreadVideo
          src={staticFile('drive-preview.mp4')}
          style={{
            position: 'absolute',
            width: VID_W,
            height: VID_H,
            top: VID_TOP - scrollY,
            left: 0,
          }}
        />
      </div>

      {/* Dark overlay — controls how much video shows through */}
      <div style={{ position: 'absolute', inset: 0, background: BG, opacity: overlayOpacity }} />

      {/* Scenes — each gets local frame starting at 0 via Series.Sequence */}
      <Series>
        <Series.Sequence durationInFrames={90}>
          <SceneIntro />
        </Series.Sequence>
        <Series.Sequence durationInFrames={240}>
          <SceneShowcase />
        </Series.Sequence>
        <Series.Sequence durationInFrames={180}>
          <SceneStats />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <SceneStages />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <SceneCTA />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
