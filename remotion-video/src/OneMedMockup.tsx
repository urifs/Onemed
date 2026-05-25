import React from 'react';
import {
  AbsoluteFill, useCurrentFrame, useVideoConfig,
  interpolate, spring, Sequence
} from 'remotion';
import { PhoneMockup } from './components/PhoneMockup';
import { FloatingBadge } from './components/FloatingBadge';
import { Marquee } from './components/Marquee';
import { theme } from './theme';

const FPS = 30;
export const MOCKUP_DURATION = 1080; // 36s

const courseMarquee1 = [
  'Estratégia Med', 'MedGrupo', 'Medway', 'Medcof', 'HardWork',
  'Sanar', 'Medcel', 'Eu Médico Residente', 'PS Zerado', 'UTI Online',
];
const courseMarquee2 = [
  'Cardiologia', 'Emergência', 'Pediatria', 'Cirurgia', 'Ginecologia',
  'Neurologia', 'Psiquiatria', 'Infectologia', 'Radiologia', 'Revalida',
];
const courseMarquee3 = [
  '+530 Cursos', '+9.000 Livros', '+10.000 Membros', 'Download Livre',
  'Google Drive', 'Suporte 24/7', 'Apps Inclusos', 'Whitebook', 'WeMeds',
];

function GlowOrb({ x, y, color, size, opacity }: { x: string; y: string; color: string; size: number; opacity: number }) {
  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width: size, height: size,
      borderRadius: '50%',
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      opacity,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
    }} />
  );
}

function InfoPanel({ frame, startFrame }: { frame: number; startFrame: number }) {
  const localF = frame - startFrame;
  const panelOp = interpolate(localF, [0, 30, 180, 210], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const panelY = interpolate(localF, [0, 30], [40, 0], { extrapolateRight: 'clamp' });

  const stats = [
    { icon: '📚', val: '530+', label: 'Cursos completos' },
    { icon: '📖', val: '9.000+', label: 'Livros médicos' },
    { icon: '👨‍⚕️', val: '10.000+', label: 'Membros ativos' },
  ];

  return (
    <div style={{
      opacity: panelOp,
      transform: `translateY(${panelY}px)`,
      display: 'flex',
      gap: 16,
      width: '100%',
    }}>
      {stats.map((s, i) => {
        const delay = i * 15;
        const itemOp = interpolate(localF, [delay, delay + 25], [0, 1], { extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{
            flex: 1,
            opacity: itemOp,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid rgba(239,68,68,0.2)`,
            borderRadius: 16,
            padding: '18px 16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: theme.fontHead, fontSize: 30, fontWeight: 800, color: theme.primary, letterSpacing: '-1px' }}>{s.val}</div>
            <div style={{ fontFamily: theme.fontBody, fontSize: 14, color: theme.muted, marginTop: 4 }}>{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function BenefitsList({ frame, startFrame }: { frame: number; startFrame: number }) {
  const localF = frame - startFrame;
  const panelOp = interpolate(localF, [0, 30, 180, 210], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const benefits = [
    { icon: '☁️', text: 'Google Drive — sem ocupar espaço' },
    { icon: '📥', text: 'Download liberado para offline' },
    { icon: '🔄', text: 'Atualizado — garantia 2026/2027' },
    { icon: '📱', text: 'Whitebook + WeMeds no vitalício' },
    { icon: '💬', text: 'Suporte WhatsApp 24/7' },
  ];

  return (
    <div style={{ opacity: panelOp, display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      {benefits.map((b, i) => {
        const delay = i * 12;
        const itemOp = interpolate(localF, [delay, delay + 25], [0, 1], { extrapolateRight: 'clamp' });
        const itemX = interpolate(localF, [delay, delay + 25], [-30, 0], { extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{
            opacity: itemOp,
            transform: `translateX(${itemX}px)`,
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${theme.border}`,
            borderRadius: 12,
            padding: '12px 18px',
          }}>
            <span style={{ fontSize: 22 }}>{b.icon}</span>
            <span style={{ fontFamily: theme.fontBody, fontSize: 17, color: theme.mutedLight }}>{b.text}</span>
          </div>
        );
      })}
    </div>
  );
}

function PricingCTA({ frame, startFrame }: { frame: number; startFrame: number }) {
  const localF = frame - startFrame;
  const op = interpolate(localF, [0, 40], [0, 1], { extrapolateRight: 'clamp' });
  const y = interpolate(localF, [0, 40], [50, 0], { extrapolateRight: 'clamp' });
  const pulse = Math.sin(localF * 0.1) * 0.12 + 0.35;

  return (
    <div style={{ opacity: op, transform: `translateY(${y}px)`, width: '100%' }}>
      {/* Glow behind CTA */}
      <div style={{
        position: 'absolute',
        width: 900, height: 400,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.primaryGlow} 0%, transparent 70%)`,
        opacity: pulse,
        top: -100, left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }} />

      {/* Plans side by side */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        {/* Annual */}
        <div style={{
          flex: 1,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${theme.border}`,
          borderRadius: 18,
          padding: '22px 20px',
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: theme.fontBody, fontSize: 13, color: theme.muted, textDecoration: 'line-through', marginBottom: 2 }}>R$ 399</div>
          <div style={{ fontFamily: theme.fontHead, fontSize: 44, fontWeight: 800, color: theme.white, letterSpacing: '-2px', lineHeight: 1 }}>R$199</div>
          <div style={{ fontFamily: theme.fontMono, fontSize: 13, color: theme.muted, marginTop: 4 }}>/ano</div>
          <div style={{ fontFamily: theme.fontBody, fontSize: 14, color: theme.mutedLight, marginTop: 8 }}>Plano Anual</div>
        </div>

        {/* Lifetime */}
        <div style={{
          flex: 1,
          background: `linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(239,68,68,0.06) 100%)`,
          border: `2px solid rgba(239,68,68,0.5)`,
          borderRadius: 18,
          padding: '22px 20px',
          textAlign: 'center',
          boxShadow: `0 0 40px rgba(239,68,68,0.2)`,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
            background: theme.primary, color: '#fff',
            fontFamily: theme.fontMono, fontSize: 11, fontWeight: 700,
            padding: '4px 14px', borderRadius: 100, letterSpacing: 1, whiteSpace: 'nowrap',
          }}>MELHOR OFERTA</div>
          <div style={{ fontFamily: theme.fontBody, fontSize: 13, color: theme.muted, textDecoration: 'line-through', marginBottom: 2 }}>R$ 667</div>
          <div style={{ fontFamily: theme.fontHead, fontSize: 40, fontWeight: 800, color: theme.primary, letterSpacing: '-2px', lineHeight: 1 }}>R$299<span style={{ fontSize: 24 }}>,90</span></div>
          <div style={{ fontFamily: theme.fontMono, fontSize: 13, color: theme.primary, marginTop: 4 }}>único</div>
          <div style={{ fontFamily: theme.fontBody, fontSize: 14, color: theme.mutedLight, marginTop: 8 }}>Plano Vitalício</div>
        </div>
      </div>

      {/* Trial */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid rgba(255,255,255,0.1)`,
        borderRadius: 14,
        padding: '18px 24px',
        textAlign: 'center',
        marginBottom: 20,
      }}>
        <div style={{ fontFamily: theme.fontHead, fontSize: 22, fontWeight: 700, color: theme.white }}>
          🎁 Experimente Grátis por 30 Minutos
        </div>
        <div style={{ fontFamily: theme.fontBody, fontSize: 15, color: theme.muted, marginTop: 4 }}>
          Sem cartão • Acesso imediato
        </div>
      </div>

      {/* URL */}
      <div style={{ textAlign: 'center' }}>
        <span style={{
          fontFamily: theme.fontMono,
          fontSize: 24,
          color: theme.primary,
          letterSpacing: 1,
        }}>
          onemedcursos.com.br
        </span>
      </div>
    </div>
  );
}

export const OneMedMockup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Global entrance ---
  const bgOp = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

  // Phone entrance
  const phoneScale = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 60 }, from: 0.7, to: 1 });
  const phoneOp = interpolate(frame, [10, 50], [0, 1], { extrapolateRight: 'clamp' });
  const phoneY = interpolate(frame, [10, 55], [120, 0], { extrapolateRight: 'clamp' });

  // Header
  const headerOp = interpolate(frame, [30, 65], [0, 1], { extrapolateRight: 'clamp' });
  const headerY = interpolate(frame, [30, 65], [-30, 0], { extrapolateRight: 'clamp' });

  // Pulse ring on phone
  const ringPulse = (Math.sin(frame * 0.05) * 0.4 + 0.6);

  // Section timing
  const PHONE_W = 300;
  const showBadges = frame >= 80;
  const showMarquee = frame >= 120;

  // Content panels below phone - cycling
  const PANEL_A_START = 150;  // stats — frames 150-360
  const PANEL_B_START = 390;  // benefits — frames 390-600
  const PANEL_C_START = 630;  // pricing — frames 630-end

  const showPanelA = frame >= PANEL_A_START && frame < 390;
  const showPanelB = frame >= PANEL_B_START && frame < 630;
  const showPanelC = frame >= PANEL_C_START;

  return (
    <AbsoluteFill style={{ background: theme.bg, opacity: bgOp, overflow: 'hidden' }}>

      {/* Background orbs */}
      <GlowOrb x="15%" y="25%" color={theme.primaryGlow} size={600} opacity={0.18} />
      <GlowOrb x="85%" y="70%" color="rgba(59,130,246,0.5)" size={500} opacity={0.12} />
      <GlowOrb x="50%" y="50%" color={theme.primaryGlow} size={400} opacity={0.08} />

      {/* Grid bg */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
        pointerEvents: 'none',
      }} />

      {/* ===== HEADER ===== */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        padding: '56px 50px 28px',
        opacity: headerOp,
        transform: `translateY(${headerY}px)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        zIndex: 10,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
          <div style={{
            width: 52, height: 52,
            borderRadius: 14,
            background: theme.primaryDim,
            border: `1.5px solid rgba(239,68,68,0.3)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
              <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
              <circle cx="20" cy="10" r="2" />
            </svg>
          </div>
          <span style={{ fontFamily: theme.fontHead, fontSize: 52, fontWeight: 800, color: theme.white, letterSpacing: '-2px' }}>
            One<span style={{ color: theme.primary }}>Med</span>
          </span>
        </div>

        <div style={{ fontFamily: theme.fontMono, fontSize: 16, color: theme.muted, letterSpacing: 3, textTransform: 'uppercase' }}>
          O Maior Acervo Médico do Brasil
        </div>

        {/* Live badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: theme.primaryDim,
          border: `1px solid rgba(239,68,68,0.3)`,
          borderRadius: 100,
          padding: '8px 20px',
          marginTop: 4,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: theme.primary }} />
          <span style={{ fontFamily: theme.fontMono, fontSize: 14, color: theme.primary, letterSpacing: 2 }}>
            VER O DRIVE AO VIVO
          </span>
        </div>
      </div>

      {/* ===== PHONE + FLOATING BADGES ===== */}
      <div style={{
        position: 'absolute',
        top: 260,
        left: '50%',
        transform: `translateX(-50%) translateY(${phoneY}px) scale(${phoneScale})`,
        opacity: phoneOp,
        zIndex: 5,
      }}>
        {/* Pulse ring */}
        <div style={{
          position: 'absolute',
          inset: -20,
          borderRadius: PHONE_W * 0.15 + 20,
          border: `2px solid rgba(239,68,68,${ringPulse * 0.3})`,
          boxShadow: `0 0 ${40 * ringPulse}px rgba(239,68,68,${ringPulse * 0.2})`,
          pointerEvents: 'none',
        }} />

        <PhoneMockup width={PHONE_W} />

        {/* Floating badge LEFT — 530+ cursos */}
        {showBadges && (
          <FloatingBadge
            icon="📚"
            value="530+"
            label="Cursos"
            startFrame={80}
            side="left"
            top={100}
          />
        )}

        {/* Floating badge RIGHT — 9000+ livros */}
        {showBadges && (
          <FloatingBadge
            icon="📖"
            value="9.000+"
            label="Livros"
            startFrame={100}
            side="right"
            top={200}
          />
        )}

        {/* Floating badge LEFT — membros */}
        {showBadges && (
          <FloatingBadge
            icon="👨‍⚕️"
            value="10k+"
            label="Médicos"
            startFrame={120}
            side="left"
            top={310}
          />
        )}

        {/* Floating badge RIGHT — download */}
        {showBadges && (
          <FloatingBadge
            icon="☁️"
            value="Cloud"
            label="Google Drive"
            startFrame={140}
            side="right"
            top={400}
          />
        )}
      </div>

      {/* ===== MARQUEE STRIP — course names ===== */}
      {showMarquee && (
        <div style={{
          position: 'absolute',
          bottom: 530,
          left: 0, right: 0,
          opacity: interpolate(frame, [120, 160], [0, 1], { extrapolateRight: 'clamp' }),
          zIndex: 6,
        }}>
          <Marquee items={courseMarquee1} speed={2.2} startFrame={120} color={theme.mutedLight} />
        </div>
      )}

      {/* ===== BOTTOM PANEL ZONE ===== */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: '0 44px 50px',
        zIndex: 8,
      }}>
        {/* Second marquee row */}
        {showMarquee && (
          <div style={{
            marginBottom: 20,
            opacity: interpolate(frame, [150, 190], [0, 1], { extrapolateRight: 'clamp' }),
          }}>
            <Marquee items={courseMarquee2} speed={-1.6} startFrame={150} color="rgba(239,68,68,0.7)" />
          </div>
        )}

        {/* Stats panel */}
        {showPanelA && (
          <InfoPanel frame={frame} startFrame={PANEL_A_START} />
        )}

        {/* Benefits panel */}
        {showPanelB && (
          <BenefitsList frame={frame} startFrame={PANEL_B_START} />
        )}

        {/* Pricing CTA */}
        {showPanelC && (
          <PricingCTA frame={frame} startFrame={PANEL_C_START} />
        )}
      </div>
    </AbsoluteFill>
  );
};
