import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { theme } from '../theme';

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 }, from: 0, to: 1 });
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const textOpacity = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: 'clamp' });
  const tagOpacity = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: 'clamp' });
  const tagY = interpolate(frame, [40, 70], [20, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: theme.bg,
    }}>
      {/* Radial glow */}
      <div style={{
        position: 'absolute',
        width: 700, height: 700,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.primaryGlow} 0%, transparent 70%)`,
        opacity: logoOpacity * 0.25,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
      }} />

      {/* Logo icon */}
      <div style={{
        transform: `scale(${logoScale})`,
        opacity: logoOpacity,
        marginBottom: 36,
      }}>
        <div style={{
          width: 140, height: 140,
          borderRadius: 32,
          background: theme.primaryDim,
          border: `2px solid rgba(239,68,68,0.35)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 60px ${theme.primaryGlow}`,
        }}>
          {/* Stethoscope SVG */}
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke={theme.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
            <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
            <circle cx="20" cy="10" r="2" />
          </svg>
        </div>
      </div>

      {/* Brand name */}
      <div style={{
        opacity: textOpacity,
        fontFamily: theme.fontHead,
        fontSize: 88,
        fontWeight: 800,
        color: theme.white,
        letterSpacing: '-3px',
        lineHeight: 1,
      }}>
        One<span style={{ color: theme.primary }}>Med</span>
      </div>

      {/* Tagline */}
      <div style={{
        opacity: tagOpacity,
        transform: `translateY(${tagY}px)`,
        marginTop: 24,
        fontFamily: theme.fontMono,
        fontSize: 22,
        color: theme.muted,
        letterSpacing: 4,
        textTransform: 'uppercase',
      }}>
        Maior Acervo Médico
      </div>
    </div>
  );
};
