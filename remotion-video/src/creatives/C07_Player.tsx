import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, Logo, EndCard, FloatBadge, BadgeText, Narration } from './common';
import { PhoneFrame } from './DeviceFrames';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, fade, clamp01, easeInOut } from './theme';
import timing from './timings/c07.json';

const T = timing as Timing;
const DELAY = 0.9;                        // narração entra logo após o celular subir
const FPS = 30;
export const C07_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

// ── beats (segundos absolutos na comp — timestamps reais do c07.json) ──────
const B_TAP = DELAY + 0.5;                // "play" (0.543) → toque na aula em m_player t=0
const B_NEXT = DELAY + 3.7;               // "A próxima" (3.703) → clique na próxima ~1s depois
const B_PDF = DELAY + 6.85;               // "Abre o PDF" (6.852)
const B_PROG = DELAY + 10.12;             // "Seu progresso" (10.118)
const B_NUM = DELAY + 13.23;              // "São +530..." (13.231)
const B_530 = DELAY + 13.47;              // "+530" (13.467)
const B_9000 = DELAY + 15.09;             // "9.000" (15.094)
const B_UPD = DELAY + 17.29;              // "sempre atualizados" (17.288)
const B_END = DELAY + T.duration - 4.6;   // end card cobre o CTA falado

const PHONE_W = 620;
const PHONE_BEZEL = PHONE_W * 0.032;
const PHONE_H = (PHONE_W - PHONE_BEZEL * 2) * (844 / 390) + PHONE_BEZEL * 2;
const F = (sec: number) => Math.round(sec * FPS);

/** Ícone de play vermelho gigante que pulsa UMA vez no momento do toque */
const PlayPulse: React.FC<{ atFrame: number }> = ({ atFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - atFrame;
  if (lf < 0 || lf > 40) return null;
  const s = spring({ frame: lf, fps, config: { damping: 9, stiffness: 140 }, from: 0.42, to: 1 });
  const op = fade(lf, 0, 5, 22, 38);
  const ring = clamp01(lf / 32);
  const SIZE = 250;
  return (
    <div style={{
      position: 'absolute', left: '50%', top: 540,
      transform: 'translate(-50%, -50%)', zIndex: 20, pointerEvents: 'none',
    }}>
      {/* onda expandindo */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: SIZE, height: SIZE, borderRadius: '50%',
        border: `3px solid ${RED}`,
        transform: `translate(-50%, -50%) scale(${1 + ring * 0.85})`,
        opacity: (1 - ring) * 0.7,
      }} />
      {/* botão de play */}
      <div style={{
        width: SIZE, height: SIZE, borderRadius: '50%',
        background: 'rgba(239,68,68,0.32)',
        border: `4px solid rgba(239,68,68,0.85)`,
        boxShadow: '0 0 70px rgba(239,68,68,0.55), inset 0 0 40px rgba(239,68,68,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${s})`, opacity: op,
        backdropFilter: 'blur(3px)',
      }}>
        <svg width={SIZE * 0.42} height={SIZE * 0.42} viewBox="0 0 24 24" style={{ marginLeft: SIZE * 0.045 }}>
          <path d="M6 3.5 L20.5 12 L6 20.5 Z" fill={WHITE} opacity={0.95} />
        </svg>
      </div>
    </div>
  );
};

export const C07_Player: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ── celular sobe do rodapé e assenta rápido (narração começa em 0.9s) ────
  const phoneIn = spring({ frame, fps, config: { damping: 14, stiffness: 80 }, from: 0, to: 1 });
  const phoneY = interpolate(phoneIn, [0, 1], [1650, 120]);
  const drift = 1 + easeInOut(clamp01((t - 1) / 22)) * 0.045;
  const sway = Math.sin(frame * 0.02) * 0.35 * clamp01((t - 1.4) / 2);

  // crossfades de conteúdo do celular (0.5s cada)
  const xf = (b: number) =>
    interpolate(t, [b, b + 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tapOp = xf(B_TAP);       // lista → toque + player abrindo
  const nextOp = xf(B_NEXT);     // → trecho com clique em "próxima aula"
  const pdfOp = xf(B_PDF);       // → PDF rolando
  const progOp = xf(B_PROG);     // → lista de aulas com progresso
  const numOp = xf(B_NUM);       // → dashboard com fileiras (acervo)

  // logo pequena fixa no topo
  const logoOp = fade(frame, 4, 18, F(B_END), F(B_END) + 14);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t > B_NUM ? 1.25 : 1} />

      {/* logo discreta no topo */}
      <div style={{
        position: 'absolute', top: 44, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', opacity: logoOp,
      }}>
        <Logo size={54} />
      </div>

      {/* celular central grande */}
      <div style={{
        position: 'absolute', left: '50%', top: phoneY,
        transform: `translateX(-50%) rotate(${sway}deg) scale(${drift})`,
        transformOrigin: '50% 30%',
      }}>
        <div style={{ position: 'relative', width: PHONE_W, height: PHONE_H }}>
          {/* base: lista de aulas antes do toque */}
          <Sequence from={0} durationInFrames={F(B_TAP + 0.9)} layout="none">
            <div style={{ position: 'absolute', inset: 0 }}>
              <PhoneFrame src="rec/m_course.mp4" width={PHONE_W} startFrom={15} />
            </div>
          </Sequence>

          {/* beat 1 — "Aperta o play": toque na aula, player abre na hora */}
          <Sequence from={F(B_TAP)} durationInFrames={F(B_NEXT + 0.9) - F(B_TAP)} layout="none">
            <div style={{ position: 'absolute', inset: 0, opacity: tapOp }}>
              <PhoneFrame src="rec/m_player.mp4" width={PHONE_W} startFrom={0} />
            </div>
          </Sequence>

          {/* beat 2 — "a próxima tá do lado": clique na próxima aula (~1s após o beat) */}
          <Sequence from={F(B_NEXT)} durationInFrames={F(B_PDF + 0.9) - F(B_NEXT)} layout="none">
            <div style={{ position: 'absolute', inset: 0, opacity: nextOp }}>
              <PhoneFrame src="rec/m_player.mp4" width={PHONE_W} startFrom={300} />
            </div>
          </Sequence>

          {/* beat 3 — "Abre o PDF ali mesmo": páginas rolando */}
          <Sequence from={F(B_PDF)} durationInFrames={F(B_PROG + 0.9) - F(B_PDF)} layout="none">
            <div style={{ position: 'absolute', inset: 0, opacity: pdfOp }}>
              <PhoneFrame src="rec/m_pdf.mp4" width={PHONE_W} startFrom={120} />
            </div>
          </Sequence>

          {/* beat 4 — "progresso fica salvo sozinho": lista com barra vermelha */}
          <Sequence from={F(B_PROG)} durationInFrames={F(B_NUM + 0.9) - F(B_PROG)} layout="none">
            <div style={{ position: 'absolute', inset: 0, opacity: progOp }}>
              <PhoneFrame src="rec/m_course.mp4" width={PHONE_W} startFrom={60} />
            </div>
          </Sequence>

          {/* beats 5–6 — acervo rolando sob os selos numéricos */}
          <Sequence from={F(B_NUM)} durationInFrames={F(B_END + 2.2) - F(B_NUM)} layout="none">
            <div style={{ position: 'absolute', inset: 0, opacity: numOp }}>
              <PhoneFrame src="rec/m_dashboard.mp4" width={PHONE_W} startFrom={280} />
            </div>
          </Sequence>

          {/* pulso único de play no momento exato do toque */}
          <PlayPulse atFrame={F(B_TAP) + 4} />
        </div>
      </div>

      {/* selo de progresso salvo */}
      {t > B_PROG && (
        <FloatBadge x={52} y={1000} delay={F(B_PROG + 0.35)} from="left" accent>
          <BadgeText top="Progresso salvo" bottom="automático, aula por aula" />
        </FloatBadge>
      )}

      {/* selos numéricos */}
      {t > B_NUM && (
        <>
          <FloatBadge x={48} y={320} delay={F(B_530)} from="left" accent>
            <BadgeText top="+530 cursos" bottom="completos" />
          </FloatBadge>
          <FloatBadge x={694} y={488} delay={F(B_9000)} from="right">
            <BadgeText top="+9.000" bottom="livros médicos" />
          </FloatBadge>
        </>
      )}
      {t > B_UPD && (
        <FloatBadge x={580} y={1110} delay={F(B_UPD)} from="right" accent>
          <BadgeText top="Sempre atualizados" bottom="sem custo extra" />
        </FloatBadge>
      )}

      {/* legendas sincronizadas (abaixo do celular) */}
      <CaptionTrack timing={T} delaySec={DELAY} y={1580} size={54} />

      {/* end card + narração */}
      <EndCard startFrame={F(B_END)} />
      <Narration id="c07" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
