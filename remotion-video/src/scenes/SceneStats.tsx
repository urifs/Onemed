import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { theme } from '../theme';

const stats = [
  { value: 530, suffix: '+', label: 'Cursos Médicos', sub: 'Estratégia Med, MedGrupo, Medway e mais' },
  { value: 9000, suffix: '+', label: 'Livros Médicos', sub: 'Todas especialidades, traduzidos' },
  { value: 10000, suffix: '+', label: 'Membros Ativos', sub: 'Comunidade de médicos e estudantes' },
];

function AnimatedNumber({ target, frame, startFrame }: { target: number; frame: number; startFrame: number }) {
  const progress = interpolate(frame, [startFrame, startFrame + 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  });
  const current = Math.round(target * progress);
  return <>{current.toLocaleString('pt-BR')}</>;
}

export const SceneStats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 30], [-30, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 60px',
      background: theme.bg,
      gap: 0,
    }}>
      {/* Top glow */}
      <div style={{
        position: 'absolute',
        width: 600, height: 600,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.primaryGlow} 0%, transparent 70%)`,
        opacity: 0.15,
        top: '10%', right: '-10%',
      }} />
      <div style={{
        position: 'absolute',
        width: 500, height: 500,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)`,
        opacity: 0.1,
        bottom: '10%', left: '-10%',
      }} />

      {/* Section label */}
      <div style={{
        opacity: titleOp,
        transform: `translateY(${titleY}px)`,
        fontFamily: theme.fontMono,
        fontSize: 18,
        color: theme.primary,
        letterSpacing: 4,
        textTransform: 'uppercase',
        marginBottom: 32,
      }}>
        Números que impressionam
      </div>

      {/* Title */}
      <div style={{
        opacity: titleOp,
        transform: `translateY(${titleY}px)`,
        fontFamily: theme.fontHead,
        fontSize: 56,
        fontWeight: 800,
        color: theme.white,
        textAlign: 'center',
        marginBottom: 80,
        letterSpacing: '-2px',
      }}>
        O maior acervo médico
        <br />
        <span style={{ color: theme.primary }}>da América Latina</span>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, width: '100%', maxWidth: 880 }}>
        {stats.map((stat, i) => {
          const delay = i * 20;
          const cardScale = spring({ frame: frame - 20 - delay, fps, config: { damping: 14, stiffness: 80 }, from: 0.8, to: 1 });
          const cardOp = interpolate(frame, [20 + delay, 50 + delay], [0, 1], { extrapolateRight: 'clamp' });

          return (
            <div key={i} style={{
              opacity: cardOp,
              transform: `scale(${cardScale})`,
              display: 'flex', alignItems: 'center', gap: 36,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${theme.border}`,
              borderRadius: 20,
              padding: '32px 40px',
            }}>
              {/* Number */}
              <div style={{
                fontFamily: theme.fontHead,
                fontSize: 80,
                fontWeight: 800,
                color: theme.primary,
                lineHeight: 1,
                minWidth: 220,
                letterSpacing: '-2px',
              }}>
                <AnimatedNumber target={stat.value} frame={frame} startFrame={30 + delay} />
                {stat.suffix}
              </div>

              {/* Divider */}
              <div style={{ width: 2, height: 70, background: theme.border, flexShrink: 0 }} />

              {/* Label */}
              <div>
                <div style={{
                  fontFamily: theme.fontHead,
                  fontSize: 30,
                  fontWeight: 700,
                  color: theme.white,
                  marginBottom: 8,
                }}>
                  {stat.label}
                </div>
                <div style={{
                  fontFamily: theme.fontBody,
                  fontSize: 18,
                  color: theme.muted,
                }}>
                  {stat.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
