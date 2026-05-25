import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { theme } from '../theme';

const platforms = [
  { name: 'Estratégia Med', count: '20 cursos', color: '#3b82f6' },
  { name: 'MedGrupo / MedCurso', count: '30 cursos', color: '#8b5cf6' },
  { name: 'Medway', count: '10 cursos', color: '#06b6d4' },
  { name: 'Medcof', count: '10 cursos', color: '#f59e0b' },
  { name: 'HardWork Med', count: '5 cursos', color: '#10b981' },
  { name: 'Sanar / SanarFlix', count: '7 cursos', color: '#ec4899' },
  { name: 'Medcel / Afya', count: '7 cursos', color: '#f97316' },
  { name: 'Eu Médico Residente', count: '4 cursos', color: '#14b8a6' },
];

const specialties = [
  'Cardiologia', 'Emergência & UTI', 'Pediatria', 'Cirurgia',
  'Ginecologia & Obstetrícia', 'Clínica Médica', 'Neurologia', 'Psiquiatria',
  'Infectologia', 'Nefrologia', 'Radiologia', 'Farmacologia',
  'Revalida INEP', 'Residência', 'Anatomia', 'Ciclo Básico',
];

export const ScenePlatforms: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 25], [-30, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      padding: '80px 60px 0',
      background: theme.bgPaper,
      overflow: 'hidden',
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute',
        width: 800, height: 400,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.primaryGlow} 0%, transparent 70%)`,
        opacity: 0.1,
        bottom: -100, left: '50%',
        transform: 'translateX(-50%)',
      }} />

      {/* Label */}
      <div style={{
        opacity: titleOp,
        transform: `translateY(${titleY}px)`,
        fontFamily: theme.fontMono,
        fontSize: 18,
        color: theme.primary,
        letterSpacing: 4,
        textTransform: 'uppercase',
        marginBottom: 20,
      }}>
        Plataformas incluídas
      </div>

      {/* Title */}
      <div style={{
        opacity: titleOp,
        transform: `translateY(${titleY}px)`,
        fontFamily: theme.fontHead,
        fontSize: 52,
        fontWeight: 800,
        color: theme.white,
        textAlign: 'center',
        marginBottom: 50,
        letterSpacing: '-2px',
        lineHeight: 1.1,
      }}>
        +530 Cursos das Maiores
        <br />
        <span style={{ color: theme.primary }}>Plataformas Médicas</span>
      </div>

      {/* Platform cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 18,
        width: '100%',
        marginBottom: 36,
      }}>
        {platforms.map((p, i) => {
          const delay = i * 8;
          const cardOp = interpolate(frame, [20 + delay, 45 + delay], [0, 1], { extrapolateRight: 'clamp' });
          const cardX = interpolate(frame, [20 + delay, 45 + delay], [i % 2 === 0 ? -40 : 40, 0], { extrapolateRight: 'clamp' });

          return (
            <div key={i} style={{
              opacity: cardOp,
              transform: `translateX(${cardX}px)`,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${theme.border}`,
              borderLeft: `3px solid ${p.color}`,
              borderRadius: 14,
              padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 10, height: 10,
                borderRadius: '50%',
                background: p.color,
                boxShadow: `0 0 10px ${p.color}`,
                flexShrink: 0,
              }} />
              <div>
                <div style={{
                  fontFamily: theme.fontHead,
                  fontSize: 20,
                  fontWeight: 700,
                  color: theme.white,
                  marginBottom: 2,
                }}>{p.name}</div>
                <div style={{
                  fontFamily: theme.fontMono,
                  fontSize: 14,
                  color: theme.muted,
                }}>{p.count}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Specialties tags */}
      <div style={{
        opacity: interpolate(frame, [80, 100], [0, 1], { extrapolateRight: 'clamp' }),
        display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center',
      }}>
        {specialties.map((s, i) => (
          <span key={i} style={{
            fontFamily: theme.fontBody,
            fontSize: 15,
            color: theme.mutedLight,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${theme.border}`,
            borderRadius: 100,
            padding: '6px 16px',
          }}>{s}</span>
        ))}
      </div>
    </div>
  );
};
