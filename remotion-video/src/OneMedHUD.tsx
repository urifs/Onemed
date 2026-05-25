import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export const HUD_DURATION = 810; // 27 s @ 30 fps

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg:   '#030609',
  red:  '#ef4444',
  grn:  '#10b981',
  cyn:  '#06b6d4',
  amb:  '#f59e0b',
  wht:  '#ffffff',
  w60:  'rgba(255,255,255,0.60)',
  w30:  'rgba(255,255,255,0.30)',
  w10:  'rgba(255,255,255,0.08)',
  mono: "'JetBrains Mono','Courier New',monospace",
  head: "'Outfit','Helvetica Neue',Arial,sans-serif",
};

// ── Helpers ────────────────────────────────────────────────────────────────
const tw = (text: string, f: number, start: number, spd = 2.5) =>
  text.slice(0, Math.max(0, Math.floor((f - start) * spd)));

const blink = (f: number) => Math.floor(f / 15) % 2 === 0 ? '█' : ' ';

function ecgY(t: number): number {
  const n = ((t % 1) + 1) % 1;
  if (n < 0.05) return 0;
  if (n < 0.15) return Math.sin((n - 0.05) / 0.10 * Math.PI) * 0.20;
  if (n < 0.18) return 0;
  if (n < 0.20) return -(n - 0.18) / 0.02 * 0.22;
  if (n < 0.22) return -0.22 + (n - 0.20) / 0.02 * 1.22;
  if (n < 0.24) return 1.0  - (n - 0.22) / 0.02 * 1.32;
  if (n < 0.26) return -0.32 + (n - 0.24) / 0.02 * 0.32;
  if (n < 0.37) return 0;
  if (n < 0.53) return Math.sin((n - 0.37) / 0.16 * Math.PI) * 0.38;
  return 0;
}

// ── Global overlays ────────────────────────────────────────────────────────
const Scanlines: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, zIndex: 98, pointerEvents: 'none',
    backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px)',
  }} />
);

const Corners: React.FC<{ color: string; op: number }> = ({ color, op }) => {
  const sz = 48, m = 36, b = `2px solid ${color}`;
  return <>
    {[
      { top: m, left: m,  borderTop: b, borderLeft: b },
      { top: m, right: m, borderTop: b, borderRight: b },
      { bottom: m, left: m,  borderBottom: b, borderLeft: b },
      { bottom: m, right: m, borderBottom: b, borderRight: b },
    ].map((s, i) => <div key={i} style={{ position: 'absolute', width: sz, height: sz, opacity: op, ...s }} />)}
  </>;
};

const ECGStrip: React.FC<{ frame: number; y: number; color: string; op: number }> = ({ frame, y, color, op }) => {
  const W = 1080, amp = 28, cycleW = 215, spd = 3.8;
  const off = (frame * spd) % cycleW;
  const pts = Array.from({ length: Math.ceil(W / 3) + 2 }, (_, i) => {
    const x = i * 3;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y - ecgY((x + off) / cycleW) * amp}`;
  }).join(' ');
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: op, overflow: 'hidden' }}>
      <defs>
        <filter id="eg">
          <feGaussianBlur stdDeviation="1.8" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="ef" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={color} stopOpacity="0" />
          <stop offset="8%"   stopColor={color} stopOpacity="1" />
          <stop offset="92%"  stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <mask id="em"><rect x="0" y="0" width="1080" height="1920" fill="url(#ef)" /></mask>
      </defs>
      <path d={pts} stroke={color} strokeWidth="2.5" fill="none" filter="url(#eg)" mask="url(#em)" />
    </svg>
  );
};

const Ring: React.FC<{ frame: number; cx: number; cy: number; r: number; color: string; dir?: 1 | -1; speed?: number }> =
({ frame, cx, cy, r, color, dir = 1, speed = 1 }) => {
  const circ = 2 * Math.PI * r;
  const rot  = (frame * dir * speed * 2.5) % 360;
  const dash = circ * 0.22;
  const ticks = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const inner = r - 7, outer = r + 3;
    return { x1: cx + Math.cos(a) * inner, y1: cy + Math.sin(a) * inner, x2: cx + Math.cos(a) * outer, y2: cy + Math.sin(a) * outer };
  });
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <circle cx={cx} cy={cy} r={r} stroke={`${color}18`} strokeWidth="1.5" fill="none" />
      {ticks.map((t, i) => <line key={i} {...t} stroke={`${color}35`} strokeWidth="1.5" />)}
      <circle cx={cx} cy={cy} r={r} stroke={color} strokeWidth="3" fill="none"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform={`rotate(${rot},${cx},${cy})`}
        style={{ filter: `drop-shadow(0 0 7px ${color})` }} />
      <line x1={cx - r - 18} y1={cy} x2={cx + r + 18} y2={cy} stroke={`${color}22`} strokeWidth="1" />
      <line x1={cx} y1={cy - r - 18} x2={cx} y2={cy + r + 18} stroke={`${color}22`} strokeWidth="1" />
      <circle cx={cx} cy={cy} r="5" fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
    </svg>
  );
};

// ── SCENE 1 — Terminal boot (0–90 f) ──────────────────────────────────────
const SceneBoot: React.FC<{ frame: number }> = ({ frame: f }) => {
  const op = interpolate(f, [0, 12, 78, 90], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const prog = interpolate(f, [18, 76], [0, 20], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const lines = [
    { text: '> OneMed Medical Intelligence v2025.1', start: 4,  color: C.grn },
    { text: '> Iniciando módulo de diagnóstico...',  start: 26, color: C.w60 },
    { text: '> Conectando ao banco de dados...',      start: 48, color: C.w60 },
    { text: '> STATUS: ONLINE ✓  LATÊNCIA: <50ms',  start: 70, color: C.grn },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 90px', opacity: op }}>
      {/* Logo */}
      <div style={{ marginBottom: 60 }}>
        <div style={{ fontFamily: C.head, fontSize: 80, fontWeight: 800, color: C.wht, letterSpacing: '-3px', lineHeight: 1 }}>
          One<span style={{ color: C.red }}>Med</span>
        </div>
        <div style={{ fontFamily: C.mono, fontSize: 16, color: C.w30, letterSpacing: 4, marginTop: 8 }}>
          SISTEMA MÉDICO INTELIGENTE
        </div>
      </div>
      {/* Terminal lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {lines.map((l, i) => {
          const txt = tw(l.text, f, l.start, 3.2);
          const lOp = interpolate(f, [l.start, l.start + 8], [0, 1], { extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{ fontFamily: C.mono, fontSize: 22, color: l.color, opacity: lOp }}>
              {txt}{f >= l.start && txt.length < l.text.length ? blink(f) : ''}
            </div>
          );
        })}
        {f >= 18 && f < 80 && (
          <div style={{ fontFamily: C.mono, fontSize: 20, color: C.cyn, marginTop: 6, opacity: interpolate(f, [18, 26], [0, 1], { extrapolateRight: 'clamp' }) }}>
            {'> ['}{'█'.repeat(Math.floor(prog))}{'░'.repeat(20 - Math.floor(prog))}{`] ${Math.round(prog * 5)}%`}
          </div>
        )}
      </div>
    </div>
  );
};

// ── SCENE 2 — Scanner (90–270 f) ─────────────────────────────────────────
const SceneScan: React.FC<{ frame: number }> = ({ frame: f }) => {
  const lf = f - 90;
  const op = interpolate(lf, [0, 22, 155, 178], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const CX = 540, CY = 750, R1 = 200, R2 = 152, R3 = 265;
  const hOp = interpolate(lf, [0, 28], [0, 1], { extrapolateRight: 'clamp' });
  const hY  = interpolate(lf, [0, 28], [-28, 0], { extrapolateRight: 'clamp' });

  const stats = [
    { label: 'CURSOS ATIVOS',   val: '530+',    color: C.red,  pos: { left: 44, top: CY - 55, textAlign: 'left' as const },  delay: 45 },
    { label: 'TÍTULOS MÉDICOS', val: '9.000+',  color: C.amb,  pos: { left: 44, top: CY + R1 + 48, right: 0, textAlign: 'center' as const }, delay: 72 },
    { label: 'USUÁRIOS ATIVOS', val: '10.000+', color: C.grn,  pos: { right: 44, top: CY - 55, textAlign: 'right' as const }, delay: 100 },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      {/* Header */}
      <div style={{ position: 'absolute', top: 72, left: 0, right: 0, textAlign: 'center', opacity: hOp, transform: `translateY(${hY}px)` }}>
        <div style={{ fontFamily: C.mono, fontSize: 15, color: C.cyn, letterSpacing: 4, marginBottom: 14 }}>
          {'>> '}{tw('DIAGNÓSTICO MÉDICO EM ANDAMENTO', lf, 8, 3.2)}{lf > 8 && lf < 35 ? blink(f) : ''}
        </div>
        <div style={{ fontFamily: C.head, fontSize: 52, fontWeight: 800, color: C.wht, letterSpacing: '-2px' }}>
          Acessando Base Médica
        </div>
      </div>

      {/* Rings */}
      <Ring frame={lf} cx={CX} cy={CY} r={R1} color={C.cyn} dir={1}  speed={1.0} />
      <Ring frame={lf} cx={CX} cy={CY} r={R2} color={C.red} dir={-1} speed={1.5} />
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <circle cx={CX} cy={CY} r={R3} stroke={`${C.cyn}10`} strokeWidth="1" fill="none" strokeDasharray="3 9" />
        {/* Radar sweep gradient */}
        <defs>
          <radialGradient id="sweep" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={C.cyn} stopOpacity="0.12" />
            <stop offset="100%" stopColor={C.cyn} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={CX} cy={CY} r={R1 - 2} fill="url(#sweep)" />
      </svg>

      {/* Stats */}
      {stats.map((s, i) => {
        const sOp = interpolate(lf, [s.delay, s.delay + 25], [0, 1], { extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{
            position: 'absolute', opacity: sOp, padding: '18px 26px',
            background: 'rgba(3,6,9,0.88)', border: `1px solid ${s.color}28`,
            borderRadius: 14, ...s.pos,
          }}>
            <div style={{ fontFamily: C.mono, fontSize: 12, color: s.color, letterSpacing: 3, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: C.head, fontSize: 54, fontWeight: 900, color: s.color, lineHeight: 1, letterSpacing: '-2px', textShadow: `0 0 22px ${s.color}` }}>
              {s.val}
            </div>
          </div>
        );
      })}

      {/* Bottom scanning text */}
      {lf > 25 && lf < 170 && (
        <div style={{
          position: 'absolute', bottom: 180, left: 0, right: 0, textAlign: 'center',
          fontFamily: C.mono, fontSize: 14, color: `${C.cyn}70`, letterSpacing: 3,
          opacity: 0.5 + 0.5 * Math.sin(lf * 0.12),
        }}>
          ● PROCESSANDO 530+ CURSOS · 9.000+ LIVROS · 10.000+ MEMBROS ●
        </div>
      )}
    </div>
  );
};

// ── SCENE 3 — Big reveal (270–420 f) ─────────────────────────────────────
const SceneReveal: React.FC<{ frame: number }> = ({ frame: f }) => {
  const { fps } = useVideoConfig();
  const lf = f - 270;
  const op = interpolate(lf, [0, 18, 128, 148], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const items = [
    { val: '530+',    label: 'CURSOS',  sub: 'Estratégia Med, MedGrupo, Medway e mais', delay: 0,  color: C.red },
    { val: '9.000+',  label: 'LIVROS',  sub: 'Todas as especialidades — traduzidos',    delay: 28, color: C.amb },
    { val: '10.000+', label: 'MEMBROS', sub: 'Médicos e estudantes ativos no Brasil',   delay: 56, color: C.grn },
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0, opacity: op,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 62px', gap: 28,
    }}>
      <div style={{
        fontFamily: C.mono, fontSize: 15, color: C.grn, letterSpacing: 4,
        opacity: interpolate(lf, [0, 18], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        ✓ DIAGNÓSTICO CONFIRMADO — 3 REGISTROS CRÍTICOS
      </div>

      {items.map((it, i) => {
        const sc = spring({ frame: lf - it.delay, fps, config: { damping: 11, stiffness: 65 }, from: 0.6, to: 1 });
        const iOp = interpolate(lf, [it.delay, it.delay + 18], [0, 1], { extrapolateRight: 'clamp' });
        const pulse = 0.08 + 0.06 * Math.sin((lf - it.delay) * 0.08 + i);
        return (
          <div key={i} style={{
            opacity: iOp, transform: `scale(${sc})`, width: '100%',
            background: `rgba(0,0,0,0.7)`,
            border: `1px solid ${it.color}22`,
            borderLeft: `5px solid ${it.color}`,
            borderRadius: 18, padding: '30px 38px',
            display: 'flex', alignItems: 'center', gap: 32,
            boxShadow: `0 0 ${30 + 20 * pulse}px ${it.color}${Math.round(25 + 20 * pulse).toString(16)}`,
          }}>
            <div style={{
              fontFamily: C.head, fontSize: 86, fontWeight: 900, color: it.color,
              lineHeight: 1, letterSpacing: '-3px', minWidth: 220,
              textShadow: `0 0 30px ${it.color}60`,
            }}>{it.val}</div>
            <div style={{ borderLeft: `1px solid ${it.color}25`, paddingLeft: 32 }}>
              <div style={{ fontFamily: C.mono, fontSize: 16, color: it.color, letterSpacing: 3, marginBottom: 8 }}>{it.label}</div>
              <div style={{ fontFamily: C.head, fontSize: 22, color: C.w60 }}>{it.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── SCENE 4 — Course DB (420–570 f) ──────────────────────────────────────
const SceneCourses: React.FC<{ frame: number }> = ({ frame: f }) => {
  const lf = f - 420;
  const op = interpolate(lf, [0, 22, 125, 148], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const platforms = [
    { name: 'Estratégia Med',      n: '20', c: '#3b82f6' },
    { name: 'MedGrupo / MedCurso', n: '30', c: '#8b5cf6' },
    { name: 'Medway',              n: '10', c: '#06b6d4' },
    { name: 'Medcof',              n: '10', c: '#f59e0b' },
    { name: 'HardWork Med',        n: '5',  c: '#10b981' },
    { name: 'Sanar / SanarFlix',   n: '7',  c: '#ec4899' },
    { name: 'Medcel / Afya',       n: '7',  c: '#f97316' },
    { name: 'Eu Médico Residente', n: '4',  c: '#14b8a6' },
    { name: 'PS Zerado',           n: '4',  c: '#a78bfa' },
    { name: 'UTI Online HCFMUSP',  n: '3',  c: '#fb7185' },
  ];

  const tags = ['Cardiologia', 'Emergência & UTI', 'Pediatria', 'Cirurgia',
    'Ginecologia', 'Neurologia', 'Psiquiatria', 'Infectologia',
    'Radiologia', 'Revalida INEP', 'Ciclo Básico', 'Internato'];

  const query = tw('SELECT * FROM cursos ORDER BY plataforma;', lf, 6, 3.0);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op, padding: '72px 52px 0' }}>
      {/* DB query header */}
      <div style={{ marginBottom: 26, opacity: interpolate(lf, [0, 22], [0, 1], { extrapolateRight: 'clamp' }) }}>
        <div style={{ fontFamily: C.mono, fontSize: 16, color: C.cyn, letterSpacing: 1, marginBottom: 10 }}>
          {'> '}{query}{lf > 6 && query.length < 41 ? blink(f) : '  ← 530 registros'}
        </div>
        <div style={{ fontFamily: C.head, fontSize: 50, fontWeight: 800, color: C.wht, letterSpacing: '-2px', lineHeight: 1.1 }}>
          +530 Cursos das Maiores<br />
          <span style={{ color: C.red }}>Plataformas Médicas</span>
        </div>
      </div>

      {/* Platforms grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginBottom: 26 }}>
        {platforms.map((p, i) => {
          const delay = i * 7;
          const pOp = interpolate(lf, [24 + delay, 48 + delay], [0, 1], { extrapolateRight: 'clamp' });
          const pX  = interpolate(lf, [24 + delay, 48 + delay], [i % 2 === 0 ? -28 : 28, 0], { extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{
              opacity: pOp, transform: `translateX(${pX}px)`,
              display: 'flex', alignItems: 'center', gap: 12,
              background: C.w10, border: `1px solid rgba(255,255,255,0.06)`,
              borderLeft: `3px solid ${p.c}`, borderRadius: 12, padding: '13px 18px',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.c, flexShrink: 0, boxShadow: `0 0 7px ${p.c}` }} />
              <div style={{ flex: 1, fontFamily: C.head, fontSize: 18, fontWeight: 600, color: C.wht }}>{p.name}</div>
              <div style={{ fontFamily: C.mono, fontSize: 13, color: p.c }}>{p.n} cursos</div>
            </div>
          );
        })}
      </div>

      {/* Specialty tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, justifyContent: 'center', opacity: interpolate(lf, [100, 130], [0, 1], { extrapolateRight: 'clamp' }) }}>
        {tags.map((t, i) => (
          <span key={i} style={{ fontFamily: C.mono, fontSize: 13, color: C.w30, background: C.w10, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 100, padding: '5px 14px' }}>{t}</span>
        ))}
      </div>
    </div>
  );
};

// ── SCENE 5 — Prescription CTA (570–810 f) ────────────────────────────────
const SceneCTA: React.FC<{ frame: number }> = ({ frame: f }) => {
  const { fps } = useVideoConfig();
  const lf = f - 570;
  const op      = interpolate(lf, [0, 28], [0, 1], { extrapolateRight: 'clamp' });
  const hOp     = interpolate(lf, [0, 28], [0, 1], { extrapolateRight: 'clamp' });
  const hY      = interpolate(lf, [0, 28], [-28, 0], { extrapolateRight: 'clamp' });
  const rxSc    = spring({ frame: lf - 20, fps, config: { damping: 12, stiffness: 65 }, from: 0.87, to: 1 });
  const rxOp    = interpolate(lf, [20, 48], [0, 1], { extrapolateRight: 'clamp' });
  const stamp   = spring({ frame: lf - 95, fps, config: { damping: 8, stiffness: 80 }, from: 1.6, to: 1 });
  const stampOp = interpolate(lf, [95, 125], [0, 1], { extrapolateRight: 'clamp' });
  const stampR  = interpolate(lf, [95, 130], [22, -12], { extrapolateRight: 'clamp' });
  const trialOp = interpolate(lf, [75, 105], [0, 1], { extrapolateRight: 'clamp' });
  const trialY  = interpolate(lf, [75, 105], [20, 0], { extrapolateRight: 'clamp' });
  const urlOp   = interpolate(lf, [115, 145], [0, 1], { extrapolateRight: 'clamp' });
  const pulse   = Math.sin(lf * 0.09) * 0.12 + 0.28;

  const HR = { borderBottom: '1px solid rgba(255,255,255,0.09)', paddingBottom: 18, marginBottom: 18 };

  const plans = [
    { name: 'Plano Anual',       detail: 'Acesso 12 meses · Garantia 2026/2027',      orig: 'R$ 399', price: 'R$199',    extra: '',     period: '/ano',  color: C.wht,  delay: 30 },
    { name: 'Plano Vitalício ★', detail: 'Acesso permanente · Apps Whitebook + WeMeds', orig: 'R$ 667', price: 'R$299', extra: ',90',  period: 'único', color: C.red,  delay: 56 },
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0, opacity: op,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 58px',
    }}>
      {/* Background pulse */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 900px 700px at 50% 50%, ${C.red}16 0%, transparent 70%)`,
        opacity: pulse,
      }} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36, opacity: hOp, transform: `translateY(${hY}px)` }}>
        <div style={{ fontFamily: C.mono, fontSize: 13, color: C.grn, letterSpacing: 4, marginBottom: 12 }}>
          ✓ DIAGNÓSTICO CONCLUÍDO · PRESCRIÇÃO MÉDICA GERADA
        </div>
        <div style={{ fontFamily: C.head, fontSize: 52, fontWeight: 800, color: C.wht, letterSpacing: '-2px', lineHeight: 1.1 }}>
          Seu Acesso ao Maior<br />
          <span style={{ color: C.red }}>Acervo Médico</span>
        </div>
      </div>

      {/* Prescription card */}
      <div style={{
        width: '100%', opacity: rxOp, transform: `scale(${rxSc})`,
        background: 'rgba(8,12,16,0.96)', border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 22, padding: '36px 42px', position: 'relative', marginBottom: 22,
      }}>
        {/* Rx stamp */}
        <div style={{
          position: 'absolute', top: -18, right: 32,
          opacity: stampOp, transform: `scale(${stamp}) rotate(${stampR}deg)`,
          background: C.red, borderRadius: 9, padding: '7px 20px',
          fontFamily: C.head, fontSize: 22, fontWeight: 900, color: C.wht,
          boxShadow: `0 0 24px ${C.red}60`, letterSpacing: 1,
        }}>Rx</div>

        {/* Prescription header row */}
        <div style={{ ...HR, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: C.mono, fontSize: 13, color: C.w30 }}>RECEITA MÉDICA DIGITAL</div>
          <div style={{ fontFamily: C.mono, fontSize: 12, color: C.w30 }}>onemedcursos.com.br</div>
        </div>

        {/* Plans */}
        {plans.map((pl, i) => {
          const pOp = interpolate(lf, [pl.delay, pl.delay + 26], [0, 1], { extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{ ...HR, opacity: pOp, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: C.head, fontSize: 24, fontWeight: 700, color: pl.color, marginBottom: 4 }}>
                  {pl.name}
                </div>
                <div style={{ fontFamily: C.mono, fontSize: 14, color: C.w30 }}>{pl.detail}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: C.mono, fontSize: 12, color: C.w30, textDecoration: 'line-through', marginBottom: 2 }}>{pl.orig}</div>
                <div style={{ fontFamily: C.head, fontSize: 44, fontWeight: 900, color: pl.color, lineHeight: 1, letterSpacing: '-2px' }}>
                  {pl.price}{pl.extra && <span style={{ fontSize: 24 }}>{pl.extra}</span>}
                </div>
                <div style={{ fontFamily: C.mono, fontSize: 13, color: pl.color }}>{pl.period}</div>
              </div>
            </div>
          );
        })}

        {/* Free trial */}
        <div style={{
          opacity: trialOp, transform: `translateY(${trialY}px)`,
          display: 'flex', alignItems: 'center', gap: 16,
          background: `${C.grn}10`, border: `1px solid ${C.grn}28`,
          borderRadius: 14, padding: '18px 22px',
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.grn, flexShrink: 0, boxShadow: `0 0 8px ${C.grn}` }} />
          <div>
            <div style={{ fontFamily: C.head, fontSize: 22, fontWeight: 700, color: C.wht }}>🎁 Trial gratuito de 30 minutos</div>
            <div style={{ fontFamily: C.mono, fontSize: 13, color: C.w30, marginTop: 3 }}>Sem cartão · Acesso imediato ao Google Drive</div>
          </div>
        </div>
      </div>

      {/* URL */}
      <div style={{ opacity: urlOp, fontFamily: C.mono, fontSize: 27, color: C.red, letterSpacing: 1, textShadow: `0 0 22px ${C.red}80` }}>
        onemedcursos.com.br
      </div>
    </div>
  );
};

// ── ROOT ───────────────────────────────────────────────────────────────────
export const OneMedHUD: React.FC = () => {
  const frame = useCurrentFrame();

  const cornerColor = frame < 90 ? C.grn : frame < 270 ? C.cyn : frame < 420 ? C.red : frame < 570 ? C.cyn : C.red;
  const cornerOp    = interpolate(frame, [0, 14], [0, 0.65], { extrapolateRight: 'clamp' });
  const ecgOp       = interpolate(frame, [258, 288], [0, 0.75], { extrapolateRight: 'clamp' });

  // Ambient background gradient shifts by scene
  const bgR = interpolate(frame, [0, 90, 270, 420, 570], [3, 3, 6, 3, 6], { extrapolateRight: 'clamp' });
  const bgG = interpolate(frame, [0, 90, 270, 420, 570], [6, 9, 3, 9, 3], { extrapolateRight: 'clamp' });
  const bgB = interpolate(frame, [0, 90, 270, 420, 570], [9, 14, 4, 14, 4], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: `rgb(${bgR},${bgG},${bgB})`, overflow: 'hidden' }}>
      <Scanlines />
      <ECGStrip frame={frame} y={1060} color={C.red} op={ecgOp} />
      <Corners color={cornerColor} op={cornerOp} />

      {frame <  90               && <SceneBoot    frame={frame} />}
      {frame >= 90  && frame < 270 && <SceneScan    frame={frame} />}
      {frame >= 270 && frame < 420 && <SceneReveal  frame={frame} />}
      {frame >= 420 && frame < 570 && <SceneCourses frame={frame} />}
      {frame >= 570                && <SceneCTA     frame={frame} />}
    </AbsoluteFill>
  );
};
