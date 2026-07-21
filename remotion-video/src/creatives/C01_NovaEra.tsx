import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, Logo, EndCard, FloatBadge, BadgeText, Narration } from './common';
import { PhoneFrame } from './DeviceFrames';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, HEAD, BODY, W60, fade, clamp01, easeInOut } from './theme';
import timing from './timings/c01.json';

const T = timing as Timing;
const DELAY = 1.8;                       // narração começa após o sting do logo
const FPS = 30;
export const C01_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

// beats (segundos absolutos na comp)
const B_PHONE_IN = DELAY + 1.1;          // "Agora, todo o acervo..."
const B_BADGES = DELAY + 6.6;            // "São mais de 530..."
const B_PLAYER = DELAY + 12.2;           // "com player próprio..."
const B_UPDATE = DELAY + 15.6;           // "atualização constante..."
const B_END = DELAY + T.duration - 4.6;  // end card cobre o CTA falado

export const C01_NovaEra: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ── sting inicial: logo + risco vermelho ────────────────────────────────
  const logoS = spring({ frame, fps, config: { damping: 13, stiffness: 100 }, from: 0.72, to: 1 });
  const logoOp = fade(frame, 2, 14, B_PHONE_IN * fps + 6, B_PHONE_IN * fps + 20);
  const lineW = interpolate(frame, [8, 26], [0, 320], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // ── celular sobe ────────────────────────────────────────────────────────
  const phoneIn = spring({ frame: frame - B_PHONE_IN * fps, fps, config: { damping: 15, stiffness: 60 }, from: 0, to: 1 });
  const phoneY = interpolate(phoneIn, [0, 1], [1500, 150]);
  const drift = 1 + easeInOut(clamp01((t - B_PHONE_IN) / 20)) * 0.05;

  // crossfade dashboard → player
  const playerOp = interpolate(t, [B_PLAYER, B_PLAYER + 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // glow pulsa no beat de atualização
  const updatePulse = t > B_UPDATE && t < B_END
    ? 0.5 + 0.5 * Math.sin((t - B_UPDATE) * 5)
    : 0;

  const PHONE_W = 560;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={1 + updatePulse * 0.5} />

      {/* sting do logo */}
      {t < B_PHONE_IN + 1 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 34,
          opacity: logoOp, transform: `scale(${logoS})`,
        }}>
          <Logo size={128} row={false} />
          <div style={{ width: lineW, height: 3, background: RED, borderRadius: 2, boxShadow: `0 0 18px ${RED}` }} />
          <div style={{ fontFamily: BODY, fontSize: 26, color: W60, letterSpacing: 6, textTransform: 'uppercase' }}>
            Nova plataforma
          </div>
        </div>
      )}

      {/* celular com a plataforma */}
      <div style={{
        position: 'absolute', left: '50%', top: phoneY,
        transform: `translateX(-50%) scale(${drift})`,
        transformOrigin: '50% 20%',
      }}>
        <div style={{ position: 'relative' }}>
          <PhoneFrame src="rec/m_dashboard.mp4" width={PHONE_W} startFrom={45} />
          <div style={{ position: 'absolute', inset: 0, opacity: playerOp }}>
            <PhoneFrame src="rec/m_player.mp4" width={PHONE_W} startFrom={30} />
          </div>
        </div>
      </div>

      {/* selos de números */}
      {t > B_BADGES && (
        <>
          <FloatBadge x={40} y={330} delay={B_BADGES * FPS} from="left" accent>
            <BadgeText top="+530 cursos" bottom="completos" />
          </FloatBadge>
          <FloatBadge x={716} y={520} delay={B_BADGES * FPS + 14} from="right">
            <BadgeText top="+9.000" bottom="livros médicos" />
          </FloatBadge>
          <FloatBadge x={52} y={950} delay={B_BADGES * FPS + 28} from="left">
            <BadgeText top="17 categorias" bottom="organizadas" />
          </FloatBadge>
        </>
      )}
      {t > B_UPDATE && (
        <FloatBadge x={620} y={1080} delay={B_UPDATE * FPS + 4} from="right" accent>
          <BadgeText top="Atualizações" bottom="sem custo extra" />
        </FloatBadge>
      )}

      {/* legendas sincronizadas */}
      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={56} />

      {/* end card + narração */}
      <EndCard startFrame={Math.round(B_END * FPS)} />
      <Narration id="c01" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
