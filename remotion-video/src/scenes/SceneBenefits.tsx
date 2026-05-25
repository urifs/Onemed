import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { theme } from '../theme';

const benefits = [
  { icon: '📥', title: 'Download Liberado', desc: 'Estude offline a qualquer hora' },
  { icon: '☁️', title: 'Google Drive', desc: 'Sem ocupar espaço no seu celular' },
  { icon: '🌎', title: 'Acesso Global', desc: 'De qualquer lugar, 24/7' },
  { icon: '🔄', title: 'Atualizado Sempre', desc: 'Conteúdo 2025 + garantia 2026/2027' },
  { icon: '📱', title: 'Apps Inclusos', desc: 'Whitebook + WeMeds no plano vitalício' },
  { icon: '💬', title: 'Suporte WhatsApp', desc: 'Atendimento 24/7 personalizado' },
];

export const SceneBenefits: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [0, 25], [-30, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      padding: '90px 60px 0',
      background: theme.bg,
      overflow: 'hidden',
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute',
        width: 900, height: 400,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${theme.primaryGlow} 0%, transparent 70%)`,
        opacity: 0.12,
        top: -80, left: '50%',
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
        Por que escolher a OneMed?
      </div>

      {/* Title */}
      <div style={{
        opacity: titleOp,
        transform: `translateY(${titleY}px)`,
        fontFamily: theme.fontHead,
        fontSize: 58,
        fontWeight: 800,
        color: theme.white,
        textAlign: 'center',
        marginBottom: 56,
        letterSpacing: '-2px',
        lineHeight: 1.1,
      }}>
        Tudo que você precisa<br />
        <span style={{ color: theme.primary }}>em um só lugar</span>
      </div>

      {/* Benefits grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
        width: '100%',
      }}>
        {benefits.map((b, i) => {
          const delay = i * 12;
          const cardOp = interpolate(frame, [25 + delay, 55 + delay], [0, 1], { extrapolateRight: 'clamp' });
          const cardY = interpolate(frame, [25 + delay, 55 + delay], [30, 0], { extrapolateRight: 'clamp' });

          return (
            <div key={i} style={{
              opacity: cardOp,
              transform: `translateY(${cardY}px)`,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${theme.border}`,
              borderRadius: 18,
              padding: '28px 24px',
            }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>{b.icon}</div>
              <div style={{
                fontFamily: theme.fontHead,
                fontSize: 22,
                fontWeight: 700,
                color: theme.white,
                marginBottom: 6,
              }}>{b.title}</div>
              <div style={{
                fontFamily: theme.fontBody,
                fontSize: 16,
                color: theme.muted,
                lineHeight: 1.5,
              }}>{b.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
