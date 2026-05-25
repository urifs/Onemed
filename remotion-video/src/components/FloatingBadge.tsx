import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { theme } from '../theme';

interface FloatingBadgeProps {
  icon: string;
  value: string;
  label: string;
  startFrame: number;
  side: 'left' | 'right';
  top: number;
}

export const FloatingBadge: React.FC<FloatingBadgeProps> = ({ icon, value, label, startFrame, side, top }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - startFrame, fps, config: { damping: 14, stiffness: 80 }, from: 0, to: 1 });
  const opacity = interpolate(frame, [startFrame, startFrame + 20], [0, 1], { extrapolateRight: 'clamp' });

  const xStart = side === 'left' ? -160 : 160;
  const x = interpolate(frame, [startFrame, startFrame + 30], [xStart, 0], { extrapolateRight: 'clamp' });

  if (frame < startFrame) return null;

  return (
    <div style={{
      position: 'absolute',
      top,
      [side]: side === 'left' ? -8 : -8,
      opacity,
      transform: `translateX(${x}px) scale(${progress})`,
      background: 'rgba(10,10,10,0.92)',
      border: `1px solid rgba(239,68,68,0.35)`,
      borderRadius: 18,
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      backdropFilter: 'blur(12px)',
      boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(239,68,68,0.15)`,
      minWidth: 160,
    }}>
      <span style={{ fontSize: 30 }}>{icon}</span>
      <div>
        <div style={{
          fontFamily: theme.fontHead,
          fontSize: 28,
          fontWeight: 800,
          color: theme.primary,
          lineHeight: 1,
          letterSpacing: '-1px',
        }}>{value}</div>
        <div style={{
          fontFamily: theme.fontBody,
          fontSize: 13,
          color: theme.mutedLight,
          marginTop: 2,
        }}>{label}</div>
      </div>
    </div>
  );
};
