import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText, Narration } from './common';
import { PhoneFrame } from './DeviceFrames';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, BODY, fade, clamp01, easeInOut, easeOut } from './theme';
import timing from './timings/c09.json';

const T = timing as Timing;
const DELAY = 1.4;                        // narração entra depois do campo de senha aparecer
const FPS = 30;
export const C09_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

// beats (segundos absolutos na comp = DELAY + timestamp real da palavra)
const B_STRIKE = DELAY + 2.158;           // "Senha" — risco vermelho atravessa os dots
const B_PHONE = B_STRIKE - 0.12;          // celular sobe junto do estilhaço
const B_LOGIN2 = 5.95;                    // jump-cut do login: pula o spinner → check verde cai em "tá dentro"
const B_DASH = DELAY + 5.968;             // "tela" — crossfade para a dashboard
const B_530 = DELAY + 6.876;              // "+530 cursos"
const B_9000 = DELAY + 9.954;             // "+9.000 livros"
const B_52 = DELAY + 12.878;              // "parou" — fileira Continuar assistindo visível no clipe
const B_SIMPLES = DELAY + 14.376;         // "Simples assim." — pop + glow
const B_UPDATE = DELAY + 15.944;          // "atualizações constantes"
const B_END = DELAY + T.duration - 4.6;   // end card cobre o CTA falado

const PHONE_W = 580;
const PHONE_BEZEL = PHONE_W * 0.032;
const PHONE_H = (PHONE_W - PHONE_BEZEL * 2) * (844 / 390) + PHONE_BEZEL * 2;

// sequências dos clipes dentro do celular
const F_LOGIN1 = Math.round(B_PHONE * FPS);        // clipe do login desde o início (digitação ~4.0–5.7s comp)
const F_LOGIN2 = Math.round(B_LOGIN2 * FPS);       // from=179 + startFrom=179 → tempo do clipe == tempo da comp
const F_DASH = Math.round(B_DASH * FPS);           // dashboard do zero: hero → Continuar assistindo em ~13.9s comp

/** pseudo-random determinístico por índice (estilhaço dos dots) */
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 11.7) * 43758.5453;
  return x - Math.floor(x);
};

export const C09_Login: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ── intro: campo de senha com dots ──────────────────────────────────────
  const fieldS = spring({ frame: frame - 8, fps, config: { damping: 13, stiffness: 90 }, from: 0.85, to: 1 });
  const introOp = fade(frame, 8, 20, (B_STRIKE + 0.28) * FPS, (B_STRIKE + 0.75) * FPS);
  const strikeW = interpolate(frame, [B_STRIKE * FPS, B_STRIKE * FPS + 7], [0, 840], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const strikeOp = fade(frame, B_STRIKE * FPS, B_STRIKE * FPS + 3, (B_STRIKE + 0.5) * FPS, (B_STRIKE + 0.9) * FPS);
  const shake = t >= B_STRIKE && t < B_STRIKE + 0.3
    ? Math.sin(frame * 2.4) * 7 * (1 - (t - B_STRIKE) / 0.3)
    : 0;

  // ── celular sobe ────────────────────────────────────────────────────────
  const phoneIn = spring({ frame: frame - B_PHONE * fps, fps, config: { damping: 15, stiffness: 60 }, from: 0, to: 1 });
  const phoneY = interpolate(phoneIn, [0, 1], [1500, 160]);
  const driftScale = 1 + easeInOut(clamp01((t - 4.6) / 15)) * 0.045;
  const popScale = 1 + interpolate(t, [B_SIMPLES, B_SIMPLES + 0.18, B_SIMPLES + 0.65], [0, 0.035, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // crossfades dentro do celular
  const seg2Op = interpolate(t, [B_LOGIN2, B_LOGIN2 + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dashOp = interpolate(t, [B_DASH, B_DASH + 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // glow do "Simples assim."
  const simplesGlow = interpolate(t,
    [B_SIMPLES, B_SIMPLES + 0.25, B_SIMPLES + 1.1, B_SIMPLES + 1.7],
    [0, 1, 0.7, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={1 + simplesGlow * 0.4} />

      {/* glow vermelho atrás do celular no beat "Simples assim." */}
      <div style={{
        position: 'absolute', left: 90, top: 190, width: 900, height: 1240,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(239,68,68,0.4) 0%, transparent 65%)',
        filter: 'blur(50px)', opacity: simplesGlow,
      }} />

      {/* celular: login (digitação) → jump-cut (check verde) → dashboard */}
      <div style={{
        position: 'absolute', left: '50%', top: phoneY,
        transform: `translateX(-50%) scale(${driftScale * popScale})`,
        transformOrigin: '50% 18%',
      }}>
        <div style={{ position: 'relative', width: PHONE_W, height: PHONE_H }}>
          <Sequence from={F_LOGIN1} durationInFrames={95} layout="none">
            <PhoneFrame
              src="rec/m_login.mp4" width={PHONE_W} startFrom={0}
              style={{ position: 'absolute', top: 0, left: 0 }}
            />
          </Sequence>
          <Sequence from={F_LOGIN2} durationInFrames={71} layout="none">
            <div style={{ position: 'absolute', inset: 0, opacity: seg2Op }}>
              <PhoneFrame src="rec/m_login.mp4" width={PHONE_W} startFrom={179} />
            </div>
          </Sequence>
          <Sequence from={F_DASH} layout="none">
            <div style={{ position: 'absolute', inset: 0, opacity: dashOp }}>
              <PhoneFrame src="rec/m_dashboard.mp4" width={PHONE_W} startFrom={0} />
            </div>
          </Sequence>
        </div>
      </div>

      {/* intro: campo de senha riscado + estilhaço (por cima do celular que sobe) */}
      {t < B_STRIKE + 1.0 && (
        <>
          <div style={{
            position: 'absolute', left: '50%', top: 620, transform: 'translate(-50%,-50%)',
            opacity: introOp, fontFamily: BODY, fontSize: 26, color: W60,
            letterSpacing: 8, textTransform: 'uppercase',
          }}>
            senha
          </div>
          <div style={{
            position: 'absolute', left: '50%', top: 760,
            transform: `translate(-50%,-50%) translateX(${shake}px) scale(${fieldS})`,
            width: 690, height: 148, borderRadius: 30,
            background: 'rgba(10,15,24,0.72)', border: '2px solid rgba(255,255,255,0.16)',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
            opacity: introOp,
          }}>
            <svg width={34} height={34} viewBox="0 0 24 24" fill="none"
              stroke={W60} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              style={{ marginRight: 6 }}>
              <rect x="4" y="10" width="16" height="10" rx="2.5" />
              <path d="M8 10 V7 a4 4 0 0 1 8 0 v3" />
            </svg>
            {Array.from({ length: 8 }).map((_, i) => {
              const ds = spring({ frame: frame - (16 + i * 4.5), fps, config: { damping: 11, stiffness: 170 }, from: 0, to: 1 });
              const p = easeOut(clamp01((t - (B_STRIKE + 0.2)) / 0.55));
              const dx = (i - 3.5) * 110 * p;
              const dy = (rnd(i) - 0.35) * 460 * p;
              return (
                <div key={i} style={{
                  width: 34, height: 34, borderRadius: '50%', background: WHITE,
                  transform: `translate(${dx}px, ${dy}px) scale(${(0.5 + 0.5 * ds) * (1 - 0.45 * p)})`,
                  opacity: ds * (1 - p),
                  boxShadow: '0 0 14px rgba(255,255,255,0.35)',
                }} />
              );
            })}
            {t < B_STRIKE && (
              <div style={{
                width: 5, height: 52, background: WHITE, borderRadius: 3, marginLeft: 4,
                opacity: Math.floor(frame / 12) % 2 === 0 ? 1 : 0.15,
              }} />
            )}
          </div>
          {/* risco vermelho no beat "Senha" */}
          <div style={{
            position: 'absolute', left: '50%', top: 760,
            transform: 'translate(-50%,-50%) rotate(-5deg)',
            width: strikeW, height: 12, borderRadius: 8, background: RED,
            boxShadow: `0 0 30px ${RED}, 0 0 60px rgba(239,68,68,0.5)`,
            opacity: strikeOp,
          }} />
        </>
      )}

      {/* selos nos beats de número */}
      {t > B_530 && (
        <FloatBadge x={36} y={430} delay={Math.round(B_530 * FPS)} from="left" accent>
          <BadgeText top="+530 cursos" bottom="em 17 categorias" />
        </FloatBadge>
      )}
      {t > B_9000 && (
        <FloatBadge x={688} y={640} delay={Math.round(B_9000 * FPS)} from="right">
          <BadgeText top="+9.000" bottom="livros médicos" />
        </FloatBadge>
      )}
      {t > B_52 && (
        <FloatBadge x={420} y={1120} delay={Math.round(B_52 * FPS)} from="right" accent>
          <BadgeText top="52% assistido" bottom="continue de ontem" />
        </FloatBadge>
      )}
      {t > B_UPDATE && (
        <FloatBadge x={48} y={1170} delay={Math.round(B_UPDATE * FPS)} from="left" accent>
          <BadgeText top="Atualizações" bottom="constantes, sem custo" />
        </FloatBadge>
      )}

      {/* legendas sincronizadas */}
      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={56} />

      {/* end card + narração */}
      <EndCard startFrame={Math.round(B_END * FPS)} />
      <Narration id="c09" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
