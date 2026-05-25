import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export const MEDICAL_DURATION = 810; // 27 s @ 30 fps

// ── Palette ────────────────────────────────────────────────────────────────
const RED   = '#ef4444';
const WHITE = '#ffffff';
const W70   = 'rgba(255,255,255,0.70)';
const W40   = 'rgba(255,255,255,0.40)';
const W12   = 'rgba(255,255,255,0.07)';
const BG    = '#05080f';          // deep navy-black, medical/academic
const HEAD  = "'Outfit','Helvetica Neue',Arial,sans-serif";
const BODY  = "'Inter','Helvetica Neue',Arial,sans-serif";
const MONO  = "'JetBrains Mono','Courier New',monospace";

// ── ECG math (real waveform, not sci-fi) ──────────────────────────────────
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

// ── Global: ECG strip ─────────────────────────────────────────────────────
const ECGStrip: React.FC<{ frame: number; y: number; opacity: number; amplitude?: number }> =
({ frame, y, opacity, amplitude = 30 }) => {
  const W = 1080, cycleW = 230, spd = 4.0;
  const off = (frame * spd) % cycleW;
  const d = Array.from({ length: Math.ceil(W / 3) + 2 }, (_, i) => {
    const x = i * 3;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y - ecgY((x + off) / cycleW) * amplitude}`;
  }).join(' ');
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity, overflow: 'hidden' }}>
      <defs>
        <filter id="ecg-glow-m">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="ecg-fade-m" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={RED} stopOpacity="0" />
          <stop offset="6%"   stopColor={RED} stopOpacity="1" />
          <stop offset="94%"  stopColor={RED} stopOpacity="1" />
          <stop offset="100%" stopColor={RED} stopOpacity="0" />
        </linearGradient>
        <mask id="ecg-mask-m"><rect x="0" y="0" width="1080" height="1920" fill="url(#ecg-fade-m)" /></mask>
      </defs>
      <path d={d} stroke={RED} strokeWidth="2.5" fill="none"
        filter="url(#ecg-glow-m)" mask="url(#ecg-mask-m)" />
    </svg>
  );
};

// ── Global: background library waterfall ──────────────────────────────────
// Subtle scrolling columns of course/specialty names — gives visual depth
const BackgroundLibrary: React.FC<{ frame: number }> = ({ frame }) => {
  const columns = [
    ['Cardiologia','Neurologia','Pediatria','Cirurgia','Clínica Médica',
     'Infectologia','Nefrologia','Pneumologia','Endocrinologia','Psiquiatria',
     'Ginecologia','Dermatologia','Ortopedia','Radiologia','Emergência',
     'Farmacologia','Semiologia','Anatomia','Fisiologia','Patologia'],
    ['Estratégia Med','MedGrupo','Medway','Medcof','HardWork',
     'Sanar','Medcel','UTI Online','PS Zerado','CardioClub',
     'SBP Pediatria','Jaleko','Manole','Afya','AnatomyFlix',
     'NeuroPost','Infectoflix','NefroFlix','Dermatopapers','Endocrinopapers'],
    ['Revalida','Residência','Internato','Ciclo Básico','Ciclo Clínico',
     'ECG','USG','Radiologia','Ventilação','Intubação',
     'Prescrição','Antibiótico','Gasometria','Urgência','Plantão',
     'Questões','Simulados','FlashCards','Mapas Mentais','Resumos'],
  ];
  const speeds  = [0.38, 0.26, 0.34];
  const heights = [52, 52, 52];

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.038, pointerEvents: 'none' }}>
      {columns.map((col, ci) => {
        const rowH   = heights[ci];
        const total  = col.length * rowH;
        const offset = (frame * speeds[ci]) % total;
        const triple = [...col, ...col, ...col];
        return (
          <div key={ci} style={{
            position: 'absolute',
            left: `${ci * 33 + 2}%`,
            top: 0,
            transform: `translateY(${-offset}px)`,
            display: 'flex', flexDirection: 'column',
          }}>
            {triple.map((item, i) => (
              <div key={i} style={{
                height: rowH, lineHeight: `${rowH}px`,
                fontFamily: HEAD, fontSize: 20, fontWeight: 700,
                color: WHITE, whiteSpace: 'nowrap',
              }}>{item}</div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

// ── Stethoscope SVG ────────────────────────────────────────────────────────
const Stethoscope: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
    <circle cx="20" cy="10" r="2" />
  </svg>
);

// ── Thin red divider line ──────────────────────────────────────────────────
const RedLine: React.FC<{ frame: number; startFrame: number; y?: number }> = ({ frame, startFrame, y = 0 }) => {
  const progress = interpolate(frame, [startFrame, startFrame + 45], [0, 1080], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute', left: 0, top: y, height: 2,
      width: progress, background: RED,
      boxShadow: `0 0 8px ${RED}80`,
    }} />
  );
};

// ── Counter animation ──────────────────────────────────────────────────────
function useCounter(target: number, frame: number, startF: number, dur = 60): string {
  const eased = interpolate(frame, [startF, startF + dur], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: t => 1 - Math.pow(1 - t, 3),
  });
  const val = Math.round(target * eased);
  return val >= 1000 ? val.toLocaleString('pt-BR') : String(val);
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 1 — Intro (0–90 f / 0–3 s)
// ═══════════════════════════════════════════════════════════════════════════
const SceneIntro: React.FC<{ frame: number }> = ({ frame: f }) => {
  const { fps } = useVideoConfig();
  const op   = interpolate(f, [0, 15, 78, 90], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const logoSc = spring({ frame: f - 5,  fps, config: { damping: 14, stiffness: 70 }, from: 0.8, to: 1 });
  const logoOp = interpolate(f, [5, 30], [0, 1], { extrapolateRight: 'clamp' });

  const tagOp = interpolate(f, [28, 55], [0, 1], { extrapolateRight: 'clamp' });
  const tagY  = interpolate(f, [28, 55], [20, 0], { extrapolateRight: 'clamp' });

  const subOp = interpolate(f, [46, 68], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', inset: 0, opacity: op,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 0,
    }}>
      {/* Logo */}
      <div style={{ opacity: logoOp, transform: `scale(${logoSc})`, marginBottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 96, height: 96, borderRadius: 24, background: `rgba(239,68,68,0.12)`, border: `1.5px solid rgba(239,68,68,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 48px rgba(239,68,68,0.2)` }}>
          <Stethoscope size={50} color={RED} />
        </div>
        <div style={{ fontFamily: HEAD, fontSize: 84, fontWeight: 800, color: WHITE, letterSpacing: '-4px', lineHeight: 1 }}>
          One<span style={{ color: RED }}>Med</span>
        </div>
      </div>

      {/* Red divider sweeps in */}
      <div style={{ position: 'relative', width: 640, marginBottom: 32 }}>
        <RedLine frame={f} startFrame={30} y={0} />
        <div style={{ height: 2 }} />
      </div>

      {/* Tagline */}
      <div style={{ opacity: tagOp, transform: `translateY(${tagY}px)`, textAlign: 'center' }}>
        <div style={{ fontFamily: HEAD, fontSize: 38, fontWeight: 700, color: WHITE, lineHeight: 1.25, letterSpacing: '-1px' }}>
          Para cada etapa da sua
          <br />
          <span style={{ color: RED }}>formação médica</span>
        </div>
      </div>

      {/* Subtitle */}
      <div style={{ opacity: subOp, marginTop: 28, textAlign: 'center' }}>
        <div style={{ fontFamily: BODY, fontSize: 20, color: W70, letterSpacing: 0.5 }}>
          Residência · Revalida · Internato · Ciclo Básico
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 2 — Cursos (90–270 f / 3–9 s)
// ═══════════════════════════════════════════════════════════════════════════
const SceneCursos: React.FC<{ frame: number }> = ({ frame: f }) => {
  const lf  = f - 90;
  const op  = interpolate(lf, [0, 20, 155, 178], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const { fps } = useVideoConfig();

  const numSc = spring({ frame: lf - 5, fps, config: { damping: 12, stiffness: 60 }, from: 0.7, to: 1 });
  const numOp = interpolate(lf, [5, 28], [0, 1], { extrapolateRight: 'clamp' });
  const count = useCounter(530, f, 90 + 10, 55);

  const tagOp  = interpolate(lf, [40, 65], [0, 1], { extrapolateRight: 'clamp' });
  const tagY   = interpolate(lf, [40, 65], [20, 0], { extrapolateRight: 'clamp' });

  const platforms = [
    'Estratégia Med', 'MedGrupo', 'Medway', 'Medcof',
    'HardWork Med',   'Sanar',    'Medcel / Afya', 'PS Zerado',
    'UTI Online',     'CardioClub', 'Eu Médico Residente', 'Medcof',
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0, opacity: op,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 64px',
    }}>
      {/* Label */}
      <div style={{ fontFamily: MONO, fontSize: 14, color: RED, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 20, opacity: interpolate(lf, [0, 22], [0, 1], { extrapolateRight: 'clamp' }) }}>
        Conteúdo
      </div>

      {/* Counter */}
      <div style={{ opacity: numOp, transform: `scale(${numSc})`, textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: HEAD, fontSize: 148, fontWeight: 900, color: WHITE, lineHeight: 1, letterSpacing: '-6px' }}>
          {count}<span style={{ color: RED }}>+</span>
        </div>
        <div style={{ fontFamily: HEAD, fontSize: 36, fontWeight: 700, color: W70, letterSpacing: '-1px', marginTop: -8 }}>
          Cursos Médicos Completos
        </div>
      </div>

      {/* Red line */}
      <div style={{ position: 'relative', width: '100%', marginBottom: 36, marginTop: 12 }}>
        <RedLine frame={f} startFrame={90 + 32} y={0} />
        <div style={{ height: 2 }} />
      </div>

      {/* Platform tags */}
      <div style={{ opacity: tagOp, transform: `translateY(${tagY}px)`, textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontFamily: BODY, fontSize: 18, color: W40, marginBottom: 20, letterSpacing: 1 }}>
          Das maiores plataformas médicas do Brasil
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {platforms.map((p, i) => {
            const pOp = interpolate(lf, [45 + i * 6, 68 + i * 6], [0, 1], { extrapolateRight: 'clamp' });
            return (
              <span key={i} style={{
                opacity: pOp,
                fontFamily: BODY, fontSize: 18, fontWeight: 600, color: WHITE,
                background: W12, border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 100, padding: '8px 20px',
              }}>{p}</span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 3 — Livros (270–420 f / 9–14 s)
// ═══════════════════════════════════════════════════════════════════════════
const SceneLivros: React.FC<{ frame: number }> = ({ frame: f }) => {
  const lf  = f - 270;
  const op  = interpolate(lf, [0, 20, 125, 148], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const { fps } = useVideoConfig();

  const numSc = spring({ frame: lf - 5, fps, config: { damping: 12, stiffness: 60 }, from: 0.7, to: 1 });
  const numOp = interpolate(lf, [5, 28], [0, 1], { extrapolateRight: 'clamp' });
  const count = useCounter(9000, f, 270 + 10, 55);

  const specialties = [
    'Anatomia','Anestesiologia','Bioquímica','Cardiologia','Cirurgia',
    'Clínica Médica','Dermatologia','Emergência e PS','Endocrinologia',
    'Farmacologia','Fisiologia','Gastroenterologia','Geriatria',
    'Ginecologia e Obstetrícia','Histologia','Imunologia','Infectologia',
    'Medicina Intensiva','Medicina Legal','Microbiologia','Nefrologia',
    'Neonatologia','Neurologia','Nutrologia','Oftalmologia','Oncologia',
    'Ortopedia','Otorrinolaringologia','Patologia','Pediatria',
    'Pneumologia','Psiquiatria','Radiologia','Reumatologia','Urologia',
  ];

  const tagsOp = interpolate(lf, [42, 68], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', inset: 0, opacity: op,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 64px',
    }}>
      {/* Label */}
      <div style={{ fontFamily: MONO, fontSize: 14, color: RED, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 20, opacity: interpolate(lf, [0, 22], [0, 1], { extrapolateRight: 'clamp' }) }}>
        Biblioteca
      </div>

      {/* Counter */}
      <div style={{ opacity: numOp, transform: `scale(${numSc})`, textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: HEAD, fontSize: 148, fontWeight: 900, color: WHITE, lineHeight: 1, letterSpacing: '-6px' }}>
          {count}<span style={{ color: RED }}>+</span>
        </div>
        <div style={{ fontFamily: HEAD, fontSize: 36, fontWeight: 700, color: W70, letterSpacing: '-1px', marginTop: -8 }}>
          Livros Médicos
        </div>
      </div>

      {/* Red line */}
      <div style={{ position: 'relative', width: '100%', marginBottom: 28, marginTop: 12 }}>
        <RedLine frame={f} startFrame={270 + 32} y={0} />
        <div style={{ height: 2 }} />
      </div>

      {/* Specialty tags */}
      <div style={{ opacity: tagsOp }}>
        <div style={{ fontFamily: BODY, fontSize: 17, color: W40, textAlign: 'center', marginBottom: 18, letterSpacing: 0.5 }}>
          59 especialidades · traduzidos · atualizados 2025
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, justifyContent: 'center' }}>
          {specialties.map((s, i) => {
            const sOp = interpolate(lf, [48 + i * 2.2, 72 + i * 2.2], [0, 1], { extrapolateRight: 'clamp' });
            return (
              <span key={i} style={{
                opacity: sOp,
                fontFamily: BODY, fontSize: 14, color: W70,
                background: W12, border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 100, padding: '5px 14px',
              }}>{s}</span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 4 — Etapas da formação (420–570 f / 14–19 s)
// ═══════════════════════════════════════════════════════════════════════════
const SceneEtapas: React.FC<{ frame: number }> = ({ frame: f }) => {
  const { fps } = useVideoConfig();
  const lf  = f - 420;
  const op  = interpolate(lf, [0, 20, 125, 148], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hOp = interpolate(lf, [0, 22], [0, 1], { extrapolateRight: 'clamp' });
  const hY  = interpolate(lf, [0, 22], [-20, 0], { extrapolateRight: 'clamp' });

  const stages = [
    {
      emoji: '🔬', title: 'Ciclo Básico',
      desc: 'Anatomia · Fisiologia · Bioquímica · Histologia · Farmacologia',
      color: '#3b82f6', delay: 22,
    },
    {
      emoji: '🩺', title: 'Ciclo Clínico',
      desc: 'Semiologia · Clínica Médica · Patologia · Infectologia',
      color: '#8b5cf6', delay: 38,
    },
    {
      emoji: '🏥', title: 'Internato',
      desc: 'Emergência · Plantão · Prescrição · Urgência e PS',
      color: '#06b6d4', delay: 54,
    },
    {
      emoji: '📋', title: 'Residência',
      desc: 'Estratégia Med · MedGrupo · Medway · +100k questões',
      color: RED, delay: 70,
    },
    {
      emoji: '🌎', title: 'Revalida',
      desc: 'Sprint INEP · HardWork · Mundo Revalida · Provas anteriores',
      color: '#10b981', delay: 86,
    },
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0, opacity: op,
      padding: '72px 58px 0',
    }}>
      {/* Header */}
      <div style={{ opacity: hOp, transform: `translateY(${hY}px)`, textAlign: 'center', marginBottom: 44 }}>
        <div style={{ fontFamily: MONO, fontSize: 14, color: RED, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>
          Formação Completa
        </div>
        <div style={{ fontFamily: HEAD, fontSize: 52, fontWeight: 800, color: WHITE, letterSpacing: '-2px', lineHeight: 1.1 }}>
          Para cada etapa da medicina,
          <br />
          <span style={{ color: RED }}>temos o conteúdo certo</span>
        </div>
      </div>

      {/* Stage cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {stages.map((st, i) => {
          const sc = spring({ frame: lf - st.delay, fps, config: { damping: 14, stiffness: 70 }, from: 0.92, to: 1 });
          const sOp = interpolate(lf, [st.delay, st.delay + 22], [0, 1], { extrapolateRight: 'clamp' });
          const sX  = interpolate(lf, [st.delay, st.delay + 22], [-24, 0], { extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{
              opacity: sOp, transform: `translateX(${sX}px) scale(${sc})`,
              display: 'flex', alignItems: 'center', gap: 20,
              background: W12,
              border: `1px solid rgba(255,255,255,0.07)`,
              borderLeft: `4px solid ${st.color}`,
              borderRadius: 16, padding: '18px 24px',
            }}>
              <div style={{ fontSize: 34, flexShrink: 0 }}>{st.emoji}</div>
              <div>
                <div style={{ fontFamily: HEAD, fontSize: 22, fontWeight: 700, color: WHITE, marginBottom: 3 }}>{st.title}</div>
                <div style={{ fontFamily: BODY, fontSize: 15, color: W40 }}>{st.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCENE 5 — CTA (570–810 f / 19–27 s)
// ═══════════════════════════════════════════════════════════════════════════
const SceneCTA: React.FC<{ frame: number }> = ({ frame: f }) => {
  const { fps } = useVideoConfig();
  const lf   = f - 570;
  const op   = interpolate(lf, [0, 28], [0, 1], { extrapolateRight: 'clamp' });
  const hOp  = interpolate(lf, [0, 28], [0, 1], { extrapolateRight: 'clamp' });
  const hY   = interpolate(lf, [0, 28], [-24, 0], { extrapolateRight: 'clamp' });
  const membrosCount = useCounter(10000, f, 570 + 15, 60);
  const pulse = Math.sin(lf * 0.09) * 0.1 + 0.22;

  const plans = [
    {
      tag: 'Anual', desc: '12 meses de acesso · Atualizações garantidas',
      orig: 'R$ 399', price: 'R$199', suffix: '/ano',
      color: WHITE, delay: 35, highlight: false,
    },
    {
      tag: 'Vitalício ★', desc: 'Acesso para sempre · Whitebook + WeMeds inclusos',
      orig: 'R$ 667', price: 'R$299', suffix: ',90 único',
      color: RED, delay: 58, highlight: true,
    },
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0, opacity: op,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 60px',
    }}>
      {/* Ambient pulse */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 900px 700px at 50% 42%, rgba(239,68,68,0.14) 0%, transparent 65%)`,
        opacity: pulse,
      }} />

      {/* Members counter */}
      <div style={{ opacity: hOp, transform: `translateY(${hY}px)`, textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontFamily: HEAD, fontSize: 58, fontWeight: 900, color: WHITE, letterSpacing: '-2px', lineHeight: 1 }}>
          +{membrosCount}
        </div>
        <div style={{ fontFamily: HEAD, fontSize: 28, fontWeight: 600, color: W70, marginTop: 6 }}>
          médicos já escolheram a OneMed
        </div>
      </div>

      {/* Red divider */}
      <div style={{ position: 'relative', width: '100%', marginBottom: 36 }}>
        <RedLine frame={f} startFrame={570 + 22} y={0} />
        <div style={{ height: 2 }} />
      </div>

      {/* Plans */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%', marginBottom: 24 }}>
        {plans.map((pl, i) => {
          const sc  = spring({ frame: lf - pl.delay, fps, config: { damping: 12, stiffness: 65 }, from: 0.88, to: 1 });
          const pOp = interpolate(lf, [pl.delay, pl.delay + 26], [0, 1], { extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{
              opacity: pOp, transform: `scale(${sc})`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: pl.highlight ? `rgba(239,68,68,0.08)` : W12,
              border: pl.highlight ? `1.5px solid rgba(239,68,68,0.4)` : `1px solid rgba(255,255,255,0.08)`,
              borderRadius: 18, padding: '26px 32px',
              boxShadow: pl.highlight ? `0 0 48px rgba(239,68,68,0.12)` : 'none',
            }}>
              <div>
                <div style={{ fontFamily: HEAD, fontSize: 26, fontWeight: 700, color: pl.color, marginBottom: 5 }}>
                  {pl.tag}
                </div>
                <div style={{ fontFamily: BODY, fontSize: 16, color: W40 }}>{pl.desc}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: BODY, fontSize: 13, color: W40, textDecoration: 'line-through', marginBottom: 2 }}>{pl.orig}</div>
                <div style={{ fontFamily: HEAD, fontSize: 44, fontWeight: 900, color: pl.color, letterSpacing: '-2px', lineHeight: 1 }}>
                  {pl.price}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 14, color: pl.color }}>{pl.suffix}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trial */}
      <div style={{
        width: '100%',
        opacity: interpolate(lf, [85, 112], [0, 1], { extrapolateRight: 'clamp' }),
        transform: `translateY(${interpolate(lf, [85, 112], [16, 0], { extrapolateRight: 'clamp' })}px)`,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 14, padding: '18px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 28,
      }}>
        <div>
          <div style={{ fontFamily: HEAD, fontSize: 22, fontWeight: 700, color: WHITE }}>
            🎁 Experimente grátis por 30 minutos
          </div>
          <div style={{ fontFamily: BODY, fontSize: 15, color: W40, marginTop: 4 }}>
            Sem cartão · Acesso imediato ao Google Drive
          </div>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: RED, letterSpacing: '-1px', flexShrink: 0 }}>
          0,00
        </div>
      </div>

      {/* URL */}
      <div style={{
        opacity: interpolate(lf, [110, 138], [0, 1], { extrapolateRight: 'clamp' }),
        fontFamily: MONO, fontSize: 26, color: RED, letterSpacing: 1,
        textShadow: `0 0 20px rgba(239,68,68,0.6)`,
      }}>
        onemedcursos.com.br
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════
export const OneMedMedical: React.FC = () => {
  const frame = useCurrentFrame();

  // ECG appears from scene 2 onward, fades in gently
  const ecgOp = interpolate(frame, [85, 115], [0, 0.65], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: BG, overflow: 'hidden' }}>
      {/* Subtle library waterfall in background */}
      <BackgroundLibrary frame={frame} />

      {/* ECG heartbeat strip — genuinely medical, not sci-fi */}
      <ECGStrip frame={frame} y={1820} opacity={ecgOp} amplitude={26} />

      {/* Scenes — each fades in/out, no hard cuts */}
      {frame <  90               && <SceneIntro   frame={frame} />}
      {frame >= 90  && frame < 270 && <SceneCursos  frame={frame} />}
      {frame >= 270 && frame < 420 && <SceneLivros  frame={frame} />}
      {frame >= 420 && frame < 570 && <SceneEtapas  frame={frame} />}
      {frame >= 570                && <SceneCTA     frame={frame} />}
    </AbsoluteFill>
  );
};
