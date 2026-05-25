import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { theme } from '../theme';

export const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const glowPulse = Math.sin(frame * 0.08) * 0.15 + 0.35;

  const introOp = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const introY = interpolate(frame, [0, 30], [-40, 0], { extrapolateRight: 'clamp' });

  const plan1Scale = spring({ frame: frame - 20, fps, config: { damping: 12, stiffness: 80 }, from: 0.8, to: 1 });
  const plan1Op = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: 'clamp' });

  const plan2Scale = spring({ frame: frame - 40, fps, config: { damping: 12, stiffness: 80 }, from: 0.8, to: 1 });
  const plan2Op = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: 'clamp' });

  const trialOp = interpolate(frame, [65, 90], [0, 1], { extrapolateRight: 'clamp' });
  const trialY = interpolate(frame, [65, 90], [20, 0], { extrapolateRight: 'clamp' });

  const urlOp = interpolate(frame, [85, 110], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 60px',
      background: theme.bg,
      gap: 0,
    }}>
      {/* Animated glow */}
      <div style={{
        position: 'absolute',
        width: 800, height: 800,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.primaryGlow} 0%, transparent 65%)`,
        opacity: glowPulse,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />

      {/* Title */}
      <div style={{
        opacity: introOp,
        transform: `translateY(${introY}px)`,
        textAlign: 'center',
        marginBottom: 56,
      }}>
        <div style={{
          fontFamily: theme.fontMono,
          fontSize: 18,
          color: theme.primary,
          letterSpacing: 4,
          textTransform: 'uppercase',
          marginBottom: 16,
        }}>Escolha seu plano</div>
        <div style={{
          fontFamily: theme.fontHead,
          fontSize: 60,
          fontWeight: 800,
          color: theme.white,
          letterSpacing: '-2px',
          lineHeight: 1.1,
        }}>
          Acesso a todo
          <br />
          <span style={{ color: theme.primary }}>o conteúdo médico</span>
        </div>
      </div>

      {/* Plans */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', marginBottom: 36 }}>

        {/* Annual plan */}
        <div style={{
          opacity: plan1Op,
          transform: `scale(${plan1Scale})`,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${theme.border}`,
          borderRadius: 20,
          padding: '28px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: theme.fontHead, fontSize: 26, fontWeight: 700, color: theme.white, marginBottom: 4 }}>
              Plano Anual
            </div>
            <div style={{ fontFamily: theme.fontBody, fontSize: 18, color: theme.muted }}>
              Acesso por 12 meses • Todas as atualizações
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: theme.fontBody, fontSize: 16, color: theme.muted, textDecoration: 'line-through', marginBottom: 2 }}>
              R$ 399
            </div>
            <div style={{ fontFamily: theme.fontHead, fontSize: 42, fontWeight: 800, color: theme.white, lineHeight: 1 }}>
              R$<span style={{ fontSize: 54 }}>199</span>
            </div>
            <div style={{ fontFamily: theme.fontMono, fontSize: 15, color: theme.muted }}>/ano</div>
          </div>
        </div>

        {/* Lifetime plan — highlighted */}
        <div style={{
          opacity: plan2Op,
          transform: `scale(${plan2Scale})`,
          background: `linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)`,
          border: `2px solid rgba(239,68,68,0.5)`,
          borderRadius: 20,
          padding: '28px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative',
          boxShadow: `0 0 40px rgba(239,68,68,0.2)`,
        }}>
          {/* Best value badge */}
          <div style={{
            position: 'absolute',
            top: -16, right: 32,
            background: theme.primary,
            color: theme.white,
            fontFamily: theme.fontMono,
            fontSize: 14,
            fontWeight: 700,
            padding: '6px 16px',
            borderRadius: 100,
            letterSpacing: 1,
          }}>
            MELHOR OFERTA
          </div>

          <div>
            <div style={{ fontFamily: theme.fontHead, fontSize: 26, fontWeight: 700, color: theme.white, marginBottom: 4 }}>
              Plano Vitalício
            </div>
            <div style={{ fontFamily: theme.fontBody, fontSize: 18, color: theme.mutedLight }}>
              Acesso para sempre • Apps Whitebook + WeMeds
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: theme.fontBody, fontSize: 16, color: theme.muted, textDecoration: 'line-through', marginBottom: 2 }}>
              R$ 667
            </div>
            <div style={{ fontFamily: theme.fontHead, fontSize: 42, fontWeight: 800, color: theme.primary, lineHeight: 1 }}>
              R$<span style={{ fontSize: 54 }}>299</span><span style={{ fontSize: 28 }}>,90</span>
            </div>
            <div style={{ fontFamily: theme.fontMono, fontSize: 15, color: theme.primary }}>pagamento único</div>
          </div>
        </div>
      </div>

      {/* Free trial CTA */}
      <div style={{
        opacity: trialOp,
        transform: `translateY(${trialY}px)`,
        width: '100%',
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid rgba(255,255,255,0.1)`,
        borderRadius: 16,
        padding: '22px 32px',
        textAlign: 'center',
        marginBottom: 32,
      }}>
        <div style={{
          fontFamily: theme.fontHead,
          fontSize: 26,
          fontWeight: 700,
          color: theme.white,
          marginBottom: 6,
        }}>
          🎁 Experimente Grátis por 30 Minutos
        </div>
        <div style={{
          fontFamily: theme.fontBody,
          fontSize: 18,
          color: theme.mutedLight,
        }}>
          Sem cartão de crédito • Acesso imediato ao Drive
        </div>
      </div>

      {/* URL */}
      <div style={{
        opacity: urlOp,
        fontFamily: theme.fontMono,
        fontSize: 26,
        color: theme.primary,
        letterSpacing: 1,
      }}>
        onemedcursos.com.br
      </div>
    </div>
  );
};
