import React from 'react';
import {
  AbsoluteFill, useCurrentFrame, useVideoConfig,
  interpolate, spring,
} from 'remotion';
import { PhoneMockup } from './components/PhoneMockup';
import { FloatingBadge } from './components/FloatingBadge';
import { Marquee } from './components/Marquee';
import { theme } from './theme';

export const MOCKUP_DURATION = 1080; // 36s

// ─── Layout constants ──────────────────────────────────────────────────────
// Canvas: 1080 × 1920
// Header:  0 → 220 px
// Phone:  220 → 1270 px  (500 × 1050 px centered)
// Marquee: 1280 → 1400 px
// Panel:  1400 → 1870 px  (~470 px usable)
const PHONE_W = 500;          // was 300 — now fills ~46 % of canvas width
const PHONE_TOP = 220;        // px from top
const PHONE_H = PHONE_W * 2.1; // 1050

const courseMarquee1 = [
  'Estratégia Med', 'MedGrupo', 'Medway', 'Medcof', 'HardWork',
  'Sanar', 'Medcel', 'Eu Médico Residente', 'PS Zerado', 'UTI Online',
];
const courseMarquee2 = [
  'Cardiologia', 'Emergência', 'Pediatria', 'Cirurgia', 'Ginecologia',
  'Neurologia', 'Psiquiatria', 'Infectologia', 'Radiologia', 'Revalida',
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function GlowOrb({ x, y, color, size, opacity }: { x: string; y: string; color: string; size: number; opacity: number }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      opacity, transform: 'translate(-50%, -50%)', pointerEvents: 'none',
    }} />
  );
}

// ─── Cycling bottom panels ─────────────────────────────────────────────────
function InfoPanel({ frame, startFrame }: { frame: number; startFrame: number }) {
  const lf = frame - startFrame;
  const op = interpolate(lf, [0, 30, 180, 210], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const y  = interpolate(lf, [0, 30], [40, 0], { extrapolateRight: 'clamp' });
  const stats = [
    { icon: '📚', val: '530+',    label: 'Cursos' },
    { icon: '📖', val: '9.000+',  label: 'Livros' },
    { icon: '👨‍⚕️', val: '10.000+', label: 'Membros' },
  ];
  return (
    <div style={{ opacity: op, transform: `translateY(${y}px)`, display: 'flex', gap: 16, width: '100%' }}>
      {stats.map((s, i) => {
        const delay = i * 15;
        const iop = interpolate(lf, [delay, delay + 25], [0, 1], { extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{
            flex: 1, opacity: iop,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid rgba(239,68,68,0.2)`,
            borderRadius: 18, padding: '22px 16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontFamily: theme.fontHead, fontSize: 36, fontWeight: 800, color: theme.primary, letterSpacing: '-1px' }}>{s.val}</div>
            <div style={{ fontFamily: theme.fontBody, fontSize: 16, color: theme.muted, marginTop: 6 }}>{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function BenefitsList({ frame, startFrame }: { frame: number; startFrame: number }) {
  const lf = frame - startFrame;
  const op = interpolate(lf, [0, 30, 180, 210], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const benefits = [
    { icon: '☁️', text: 'Google Drive — sem ocupar espaço no celular' },
    { icon: '📥', text: 'Download liberado para estudar offline' },
    { icon: '🔄', text: 'Conteúdo atualizado — garantia 2026/2027' },
    { icon: '📱', text: 'Apps Whitebook + WeMeds no plano vitalício' },
    { icon: '💬', text: 'Suporte WhatsApp 24/7 personalizado' },
  ];
  return (
    <div style={{ opacity: op, display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      {benefits.map((b, i) => {
        const delay = i * 12;
        const iop = interpolate(lf, [delay, delay + 25], [0, 1], { extrapolateRight: 'clamp' });
        const ix  = interpolate(lf, [delay, delay + 25], [-30, 0], { extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{
            opacity: iop, transform: `translateX(${ix}px)`,
            display: 'flex', alignItems: 'center', gap: 16,
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${theme.border}`,
            borderRadius: 14, padding: '14px 20px',
          }}>
            <span style={{ fontSize: 26 }}>{b.icon}</span>
            <span style={{ fontFamily: theme.fontBody, fontSize: 19, color: theme.mutedLight }}>{b.text}</span>
          </div>
        );
      })}
    </div>
  );
}

function PricingCTA({ frame, startFrame }: { frame: number; startFrame: number }) {
  const lf = frame - startFrame;
  const op    = interpolate(lf, [0, 40], [0, 1], { extrapolateRight: 'clamp' });
  const y     = interpolate(lf, [0, 40], [50, 0], { extrapolateRight: 'clamp' });
  const pulse = Math.sin(lf * 0.1) * 0.12 + 0.3;

  return (
    <div style={{ opacity: op, transform: `translateY(${y}px)`, width: '100%', position: 'relative' }}>
      <div style={{
        position: 'absolute', width: 900, height: 300, borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.primaryGlow} 0%, transparent 70%)`,
        opacity: pulse, top: -80, left: '50%', transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }} />

      {/* Plans */}
      <div style={{ display: 'flex', gap: 18, marginBottom: 18 }}>
        <div style={{
          flex: 1, background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${theme.border}`, borderRadius: 20,
          padding: '24px 20px', textAlign: 'center',
        }}>
          <div style={{ fontFamily: theme.fontBody, fontSize: 14, color: theme.muted, textDecoration: 'line-through', marginBottom: 2 }}>R$ 399</div>
          <div style={{ fontFamily: theme.fontHead, fontSize: 50, fontWeight: 800, color: theme.white, letterSpacing: '-2px', lineHeight: 1 }}>R$199</div>
          <div style={{ fontFamily: theme.fontMono, fontSize: 14, color: theme.muted, marginTop: 4 }}>/ano</div>
          <div style={{ fontFamily: theme.fontBody, fontSize: 15, color: theme.mutedLight, marginTop: 8 }}>Plano Anual</div>
        </div>
        <div style={{
          flex: 1, position: 'relative',
          background: `linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(239,68,68,0.06) 100%)`,
          border: `2px solid rgba(239,68,68,0.5)`, borderRadius: 20,
          padding: '24px 20px', textAlign: 'center',
          boxShadow: `0 0 50px rgba(239,68,68,0.2)`,
        }}>
          <div style={{
            position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)',
            background: theme.primary, color: '#fff',
            fontFamily: theme.fontMono, fontSize: 12, fontWeight: 700,
            padding: '5px 16px', borderRadius: 100, letterSpacing: 1, whiteSpace: 'nowrap',
          }}>MELHOR OFERTA</div>
          <div style={{ fontFamily: theme.fontBody, fontSize: 14, color: theme.muted, textDecoration: 'line-through', marginBottom: 2 }}>R$ 667</div>
          <div style={{ fontFamily: theme.fontHead, fontSize: 46, fontWeight: 800, color: theme.primary, letterSpacing: '-2px', lineHeight: 1 }}>
            R$299<span style={{ fontSize: 28 }}>,90</span>
          </div>
          <div style={{ fontFamily: theme.fontMono, fontSize: 14, color: theme.primary, marginTop: 4 }}>único</div>
          <div style={{ fontFamily: theme.fontBody, fontSize: 15, color: theme.mutedLight, marginTop: 8 }}>Plano Vitalício</div>
        </div>
      </div>

      {/* Trial CTA */}
      <div style={{
        background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.1)`,
        borderRadius: 16, padding: '18px 24px', textAlign: 'center', marginBottom: 18,
      }}>
        <div style={{ fontFamily: theme.fontHead, fontSize: 24, fontWeight: 700, color: theme.white }}>
          🎁 Experimente Grátis por 30 Minutos
        </div>
        <div style={{ fontFamily: theme.fontBody, fontSize: 16, color: theme.muted, marginTop: 4 }}>
          Sem cartão • Acesso imediato
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <span style={{ fontFamily: theme.fontMono, fontSize: 26, color: theme.primary, letterSpacing: 1 }}>
          onemedcursos.com.br
        </span>
      </div>
    </div>
  );
}

// ─── Main composition ──────────────────────────────────────────────────────
export const OneMedMockup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgOp      = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const phoneScale = spring({ frame: frame - 10, fps, config: { damping: 14, stiffness: 55 }, from: 0.75, to: 1 });
  const phoneOp   = interpolate(frame, [10, 50], [0, 1], { extrapolateRight: 'clamp' });
  const phoneY    = interpolate(frame, [10, 55], [100, 0], { extrapolateRight: 'clamp' });
  const headerOp  = interpolate(frame, [25, 60], [0, 1], { extrapolateRight: 'clamp' });
  const headerY   = interpolate(frame, [25, 60], [-28, 0], { extrapolateRight: 'clamp' });
  const ringPulse = Math.sin(frame * 0.05) * 0.4 + 0.6;

  const showBadges  = frame >= 80;
  const showMarquee = frame >= 120;

  const PANEL_A = 150;  // stats
  const PANEL_B = 390;  // benefits
  const PANEL_C = 630;  // pricing

  return (
    <AbsoluteFill style={{ background: theme.bg, opacity: bgOp, overflow: 'hidden' }}>

      {/* Ambient glow orbs */}
      <GlowOrb x="18%" y="30%" color={theme.primaryGlow} size={700} opacity={0.16} />
      <GlowOrb x="82%" y="65%" color="rgba(59,130,246,0.5)" size={600} opacity={0.10} />
      <GlowOrb x="50%" y="55%" color={theme.primaryGlow} size={500} opacity={0.07} />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.014) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px)`,
        backgroundSize: '80px 80px', pointerEvents: 'none',
      }} />

      {/* ── HEADER (0–220 px) ─────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '48px 50px 16px',
        opacity: headerOp, transform: `translateY(${headerY}px)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 50, height: 50, borderRadius: 13,
            background: theme.primaryDim,
            border: `1.5px solid rgba(239,68,68,0.3)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
              <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
              <circle cx="20" cy="10" r="2" />
            </svg>
          </div>
          <span style={{ fontFamily: theme.fontHead, fontSize: 50, fontWeight: 800, color: theme.white, letterSpacing: '-2px' }}>
            One<span style={{ color: theme.primary }}>Med</span>
          </span>
        </div>

        <div style={{ fontFamily: theme.fontMono, fontSize: 15, color: theme.muted, letterSpacing: 3, textTransform: 'uppercase' }}>
          O Maior Acervo Médico do Brasil
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: theme.primaryDim, border: `1px solid rgba(239,68,68,0.3)`,
          borderRadius: 100, padding: '7px 20px',
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: theme.primary }} />
          <span style={{ fontFamily: theme.fontMono, fontSize: 14, color: theme.primary, letterSpacing: 2 }}>
            VER O DRIVE AO VIVO
          </span>
        </div>
      </div>

      {/* ── PHONE MOCKUP (220–1270 px) ───────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: PHONE_TOP,
        left: '50%',
        transform: `translateX(-50%) translateY(${phoneY}px) scale(${phoneScale})`,
        opacity: phoneOp,
        zIndex: 5,
      }}>
        {/* Animated pulse ring */}
        <div style={{
          position: 'absolute',
          inset: -24,
          borderRadius: PHONE_W * 0.12 + 24,
          border: `2px solid rgba(239,68,68,${(ringPulse * 0.28).toFixed(2)})`,
          boxShadow: `0 0 ${Math.round(50 * ringPulse)}px rgba(239,68,68,${(ringPulse * 0.18).toFixed(2)})`,
          pointerEvents: 'none',
        }} />

        <PhoneMockup width={PHONE_W} />

        {/* ── Floating badges — spaced evenly along 1050px phone height */}
        {showBadges && <>
          <FloatingBadge icon="📚" value="530+"    label="Cursos"       startFrame={80}  side="left"  top={110} />
          <FloatingBadge icon="📖" value="9.000+"  label="Livros"       startFrame={105} side="right" top={310} />
          <FloatingBadge icon="👨‍⚕️" value="10k+"   label="Médicos"      startFrame={130} side="left"  top={510} />
          <FloatingBadge icon="☁️" value="Cloud"   label="Google Drive" startFrame={155} side="right" top={710} />
        </>}
      </div>

      {/* ── MARQUEES (1280–1400 px) ───────────────────────────────────── */}
      {showMarquee && (
        <>
          <div style={{
            position: 'absolute',
            top: PHONE_TOP + PHONE_H + 20,  // just below phone
            left: 0, right: 0,
            opacity: interpolate(frame, [120, 160], [0, 1], { extrapolateRight: 'clamp' }),
            zIndex: 6,
          }}>
            <Marquee items={courseMarquee1} speed={2.2} startFrame={120} color={theme.mutedLight} />
          </div>

          <div style={{
            position: 'absolute',
            top: PHONE_TOP + PHONE_H + 90,  // second row
            left: 0, right: 0,
            opacity: interpolate(frame, [150, 185], [0, 1], { extrapolateRight: 'clamp' }),
            zIndex: 6,
          }}>
            <Marquee items={courseMarquee2} speed={-1.7} startFrame={150} color="rgba(239,68,68,0.75)" />
          </div>
        </>
      )}

      {/* ── BOTTOM PANEL (1400–1920 px) ──────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: PHONE_TOP + PHONE_H + 160,  // 1430 px from top
        left: 0, right: 0, bottom: 0,
        padding: '0 44px 48px',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        zIndex: 8,
      }}>
        {frame >= PANEL_A && frame < PANEL_B && <InfoPanel   frame={frame} startFrame={PANEL_A} />}
        {frame >= PANEL_B && frame < PANEL_C && <BenefitsList frame={frame} startFrame={PANEL_B} />}
        {frame >= PANEL_C               && <PricingCTA  frame={frame} startFrame={PANEL_C} />}
      </div>

    </AbsoluteFill>
  );
};
