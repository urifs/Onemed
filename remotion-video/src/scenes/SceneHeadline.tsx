import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { theme } from '../theme';

export const SceneHeadline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1Y = interpolate(frame, [0, 30], [60, 0], { extrapolateRight: 'clamp' });
  const line1Op = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

  const line2Y = interpolate(frame, [20, 50], [60, 0], { extrapolateRight: 'clamp' });
  const line2Op = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: 'clamp' });

  const line3Y = interpolate(frame, [40, 70], [60, 0], { extrapolateRight: 'clamp' });
  const line3Op = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: 'clamp' });

  const subOp = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: 'clamp' });
  const subY = interpolate(frame, [60, 90], [20, 0], { extrapolateRight: 'clamp' });

  const badgeScale = spring({ frame: frame - 70, fps, config: { damping: 10, stiffness: 100 } });

  const glowOp = interpolate(frame, [0, 60], [0, 0.3], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 60px',
      background: theme.bg,
    }}>
      {/* Background glow top */}
      <div style={{
        position: 'absolute',
        width: 900, height: 400,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.primaryGlow} 0%, transparent 70%)`,
        opacity: glowOp,
        top: -100, left: '50%',
        transform: 'translateX(-50%)',
      }} />

      {/* Grid lines decorative */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
      }} />

      <div style={{ position: 'relative', textAlign: 'center' }}>
        {/* Pill badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: theme.primaryDim,
          border: `1px solid rgba(239,68,68,0.3)`,
          borderRadius: 100,
          padding: '10px 28px',
          marginBottom: 48,
          transform: `scale(${badgeScale})`,
          opacity: frame > 70 ? 1 : 0,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.primary }} />
          <span style={{
            fontFamily: theme.fontMono,
            fontSize: 18,
            color: theme.primary,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>ACESSO GRATUITO DE 30 MIN</span>
        </div>

        {/* Line 1 */}
        <div style={{
          transform: `translateY(${line1Y}px)`,
          opacity: line1Op,
          fontFamily: theme.fontHead,
          fontSize: 98,
          fontWeight: 800,
          color: theme.white,
          lineHeight: 1.0,
          letterSpacing: '-3px',
        }}>
          O Maior
        </div>

        {/* Line 2 */}
        <div style={{
          transform: `translateY(${line2Y}px)`,
          opacity: line2Op,
          fontFamily: theme.fontHead,
          fontSize: 98,
          fontWeight: 800,
          color: theme.primary,
          lineHeight: 1.0,
          letterSpacing: '-3px',
        }}>
          Acervo
        </div>

        {/* Line 3 */}
        <div style={{
          transform: `translateY(${line3Y}px)`,
          opacity: line3Op,
          fontFamily: theme.fontHead,
          fontSize: 98,
          fontWeight: 800,
          color: theme.white,
          lineHeight: 1.0,
          letterSpacing: '-3px',
          marginBottom: 48,
        }}>
          Médico do Brasil
        </div>

        {/* Subtitle */}
        <div style={{
          transform: `translateY(${subY}px)`,
          opacity: subOp,
          fontFamily: theme.fontBody,
          fontSize: 28,
          color: theme.mutedLight,
          lineHeight: 1.6,
          maxWidth: 860,
          margin: '0 auto',
        }}>
          +530 cursos completos e +9.000 livros médicos.
          <br />
          Mais de <span style={{ color: theme.white, fontWeight: 600 }}>10.000 médicos</span> já escolheram a OneMed.
        </div>
      </div>
    </div>
  );
};
