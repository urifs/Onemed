import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { theme } from '../theme';

interface MarqueeProps {
  items: string[];
  speed?: number;
  startFrame?: number;
  color?: string;
}

export const Marquee: React.FC<MarqueeProps> = ({
  items,
  speed = 1.8,
  startFrame = 0,
  color = theme.mutedLight,
}) => {
  const frame = useCurrentFrame();
  const offset = (frame - startFrame) * speed;
  const repeated = [...items, ...items, ...items];
  const itemWidth = 260;
  const totalWidth = items.length * itemWidth;

  return (
    <div style={{
      overflow: 'hidden',
      width: '100%',
      maskImage: 'linear-gradient(90deg, transparent, black 15%, black 85%, transparent)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent, black 15%, black 85%, transparent)',
    }}>
      <div style={{
        display: 'flex',
        transform: `translateX(${-(offset % totalWidth)}px)`,
        width: repeated.length * itemWidth,
        willChange: 'transform',
      }}>
        {repeated.map((item, i) => (
          <div key={i} style={{
            width: itemWidth,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            paddingRight: 12,
          }}>
            <span style={{
              fontFamily: theme.fontBody,
              fontSize: 18,
              color,
              whiteSpace: 'nowrap',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid rgba(255,255,255,0.07)`,
              borderRadius: 100,
              padding: '8px 18px',
            }}>
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
