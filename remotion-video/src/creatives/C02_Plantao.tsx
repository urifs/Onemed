import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText, Narration } from './common';
import { PhoneFrame, LaptopFrame, TabletFrame } from './DeviceFrames';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, HEAD, BODY, MONO, W60, W40, W12, fade, clamp01, easeInOut } from './theme';
import timing from './timings/c02.json';

const T = timing as Timing;
const DELAY = 2.0;                        // intro atmosférico do relógio antes da voz
const FPS = 30;
export const C02_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

const F = (s: number) => Math.round(s * FPS);

// ── beats (segundos absolutos na composição) ──────────────────────────────
const B_PHONE = DELAY + 5.1;              // "Abre a plataforma"
const B_RESUME = DELAY + 7.4;             // "exatamente de onde você parou"
const B_ECG = DELAY + 12.15;              // "revisa um ECG"
const B_PDF = DELAY + 13.2;               // "abre um resumo"
const B_NEXT = DELAY + 14.3;              // "avança uma aula"
const B_530 = DELAY + 16.05;              // "+530 cursos"
const B_9000 = DELAY + 17.9;              // "9.000 livros"
const B_TRIO = DELAY + 20.1;              // "Estuda no celular..."
const B_LAPTOP = DELAY + 21.4;            // "...no notebook"
const B_TABLET = DELAY + 22.3;            // "...no tablet"
const B_END = DELAY + T.duration - 4.6;   // end card cobre o CTA falado

// o conteúdo do phone volta ao dashboard um pouco antes do trio
// (m_player termina; crossfade completa antes do layer de baixo desmontar)
const TRIOFADE_S = B_TRIO - 0.6;
const TRIOFADE_E = B_TRIO - 0.12;

// ── onda de ECG realista (mesma matemática do OneMedMedical) ──────────────
function ecgY(t: number): number {
  const n = ((t % 1) + 1) % 1;
  if (n < 0.05) return 0;
  if (n < 0.15) return Math.sin((n - 0.05) / 0.10 * Math.PI) * 0.18;
  if (n < 0.18) return 0;
  if (n < 0.20) return -(n - 0.18) / 0.02 * 0.20;
  if (n < 0.22) return -0.20 + (n - 0.20) / 0.02 * 1.20;
  if (n < 0.24) return 1.00 - (n - 0.22) / 0.02 * 1.30;
  if (n < 0.26) return -0.30 + (n - 0.24) / 0.02 * 0.30;
  if (n < 0.37) return 0;
  if (n < 0.53) return Math.sin((n - 0.37) / 0.16 * Math.PI) * 0.36;
  return 0;
}

const EcgLine: React.FC<{ y: number; opacity: number }> = ({ y, opacity }) => {
  const frame = useCurrentFrame();
  const cycleW = 240;
  const off = frame * 3.6;
  const d = Array.from({ length: 362 }, (_, i) => {
    const x = i * 3;
    return `${i === 0 ? 'M' : 'L'} ${x} ${(y - ecgY((x + off) / cycleW) * 30).toFixed(2)}`;
  }).join(' ');
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920"
      style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}>
      <defs>
        <linearGradient id="c02-ecg-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="10%" stopColor="#fff" stopOpacity="1" />
          <stop offset="90%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="c02-ecg-mask">
          <rect x="0" y="0" width="1080" height="1920" fill="url(#c02-ecg-fade)" />
        </mask>
      </defs>
      <path d={d} stroke={RED} strokeWidth="2.5" fill="none" mask="url(#c02-ecg-mask)"
        style={{ filter: 'drop-shadow(0 0 7px rgba(239,68,68,0.75))' }} />
    </svg>
  );
};

/** pill de contexto sob o celular ("AULA · ECG" etc.) */
const ActionPill: React.FC<{ label: string; inAt: number; outAt: number }> = ({ label, inAt, outAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = fade(frame, F(inAt), F(inAt) + 8, F(outAt) - 6, F(outAt) + 3);
  if (op <= 0.002) return null;
  const s = spring({ frame: frame - F(inAt), fps, config: { damping: 13, stiffness: 140 }, from: 0.82, to: 1 });
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top: 1360,
      display: 'flex', justifyContent: 'center',
      opacity: op, transform: `scale(${s})`, pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 13,
        background: 'rgba(10,12,18,0.9)', border: '1px solid rgba(239,68,68,0.45)',
        borderRadius: 999, padding: '13px 28px',
        boxShadow: '0 14px 40px -10px rgba(0,0,0,0.7)',
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: RED, boxShadow: `0 0 12px ${RED}` }} />
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: WHITE, letterSpacing: 2.5 }}>
          {label}
        </span>
      </div>
    </div>
  );
};

export const C02_Plantao: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // ── cena 1: relógio do plantão (05:58 → 06:00) ─────────────────────────
  const clockIn = fade(frame, 0, 14, F(B_PHONE) + 4, F(B_PHONE) + 20);
  const decay = (x: number) => (x > 0 ? Math.exp(-x * 5) : 0);
  const clockPop = 1 + 0.05 * (decay(t - 1.15) + decay(t - 2.35));
  const clock = t < 1.15 ? ['05', '58'] : t < 2.35 ? ['05', '59'] : ['06', '00'];
  const sixFlash = decay(t - 2.35);                       // pulso ao virar 06:00
  const sixGlow = t >= 2.35 ? 0.5 + 0.5 * Math.sin((t - 2.35) * 3) : 0;
  const colonOn = t % 1 < 0.62;
  const sceneScale = 1 + 0.035 * easeInOut(clamp01(t / 7));
  const sceneRise = -70 * easeInOut(clamp01((t - B_PHONE) / 0.7));

  // pill "PLANTÃO EM 1H" e chip da aula pausada
  const pillS = spring({ frame: frame - F(3.05), fps, config: { damping: 13, stiffness: 110 }, from: 0, to: 1 });
  const chipS = spring({ frame: frame - F(4.68), fps, config: { damping: 14, stiffness: 95 }, from: 0, to: 1 });
  const chipPct = interpolate(frame, [F(4.68) + 8, F(4.68) + 28], [0, 52], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // ── cena 2: celular sobe com o dashboard ───────────────────────────────
  const phoneIn = spring({ frame: frame - F(B_PHONE), fps, config: { damping: 15, stiffness: 60 }, from: 0, to: 1 });
  const phoneY = interpolate(phoneIn, [0, 1], [1500, 150]);
  const drift = 1 + easeInOut(clamp01((t - B_PHONE) / 16)) * 0.045;

  // crossfades de conteúdo dentro do phone
  const ecgOp = interpolate(t, [B_ECG, B_ECG + 0.45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pdfOp = interpolate(t, [B_PDF, B_PDF + 0.45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const nextOp = interpolate(t, [B_NEXT, B_NEXT + 0.45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const trioContentOp = interpolate(t, [TRIOFADE_S, TRIOFADE_E], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // badges: fade-outs coordenados
  const resumeOp = interpolate(t, [B_ECG - 0.35, B_ECG + 0.15], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const numbersOp = interpolate(t, [TRIOFADE_S, B_TRIO], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // ── cena 3: trio de dispositivos ───────────────────────────────────────
  const trioS = spring({ frame: frame - F(B_TRIO), fps, config: { damping: 16, stiffness: 70 }, from: 0, to: 1 });
  const phoneTx = -310 * trioS;
  const phoneTy = 410 * trioS;
  const phoneScale = drift * (1 - 0.4 * trioS);
  const lapS = spring({ frame: frame - F(B_LAPTOP), fps, config: { damping: 15, stiffness: 64 }, from: 0, to: 1 });
  const tabS = spring({ frame: frame - F(B_TABLET), fps, config: { damping: 13, stiffness: 92 }, from: 0, to: 1 });
  const lapFloat = Math.sin((frame - F(B_LAPTOP)) * 0.04) * 5;
  const tabFloat = Math.sin((frame - F(B_TABLET)) * 0.05 + 2) * 5;

  const PHONE_W = 560;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={0.55 + 0.45 * clamp01((t - B_PHONE) / 1.5) + sixFlash * 0.35} />

      {/* ── cena do relógio ── */}
      {t < B_PHONE + 1 && (
        <div style={{
          position: 'absolute', inset: 0, opacity: clockIn,
          transform: `translateY(${sceneRise}px) scale(${sceneScale})`,
          transformOrigin: '50% 42%',
        }}>
          <EcgLine y={1105} opacity={0.16 * clockIn} />
          {/* glow que estoura ao virar 06:00 */}
          <div style={{
            position: 'absolute', left: 540 - 420, top: 700 - 420, width: 840, height: 840,
            borderRadius: '50%', filter: 'blur(120px)',
            background: `rgba(239,68,68,${0.10 + 0.20 * sixFlash})`,
          }} />
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center',
            fontFamily: BODY, fontSize: 24, fontWeight: 600, color: W40,
            letterSpacing: 8, textTransform: 'uppercase',
          }}>
            Hospital · turno da manhã
          </div>
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 700, transform: `translateY(-50%) scale(${clockPop})`,
            display: 'flex', justifyContent: 'center', alignItems: 'baseline',
            fontFamily: MONO, fontWeight: 700, fontSize: 214, color: WHITE,
            letterSpacing: 2, lineHeight: 1,
            textShadow: `0 0 ${44 + sixGlow * 34}px rgba(239,68,68,${0.32 + 0.26 * sixGlow})`,
          }}>
            <span>{clock[0]}</span>
            <span style={{ opacity: colonOn ? 1 : 0.22, color: RED, margin: '0 6px' }}>:</span>
            <span>{clock[1]}</span>
          </div>

          {/* pill do plantão */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 900,
            display: 'flex', justifyContent: 'center',
            opacity: pillS, transform: `translateY(${(1 - pillS) * 46}px)`,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'rgba(239,68,68,0.13)', border: '1.5px solid rgba(239,68,68,0.5)',
              borderRadius: 999, padding: '15px 34px',
              boxShadow: '0 0 40px rgba(239,68,68,0.2)',
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%', background: RED,
                opacity: 0.55 + 0.45 * Math.sin(t * 5.2), boxShadow: `0 0 14px ${RED}`,
              }} />
              <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 28, color: WHITE, letterSpacing: 3 }}>
                PLANTÃO EM 1H
              </span>
            </div>
          </div>

          {/* chip da aula que ficou pela metade */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 1210,
            display: 'flex', justifyContent: 'center',
            opacity: chipS, transform: `translateY(${(1 - chipS) * 90}px) scale(${0.85 + chipS * 0.15})`,
          }}>
            <div style={{
              width: 660, background: 'rgba(10,12,18,0.92)',
              border: '1px solid rgba(255,255,255,0.14)', borderRadius: 24,
              padding: '24px 28px', boxShadow: '0 24px 60px -16px rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 15, flexShrink: 0,
                  background: 'rgba(239,68,68,0.16)', border: '1.5px solid rgba(239,68,68,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {/* ícone de pausa */}
                  <svg width={22} height={24} viewBox="0 0 22 24" fill={RED}>
                    <rect x="2" y="2" width="6" height="20" rx="2" />
                    <rect x="14" y="2" width="6" height="20" rx="2" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: WHITE, whiteSpace: 'nowrap' }}>
                    ECG na Emergência — Parte 1
                  </div>
                  <div style={{ fontFamily: BODY, fontSize: 19, color: W60, marginTop: 4 }}>
                    Aula pausada ontem à noite
                  </div>
                </div>
                <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, color: RED }}>
                  {Math.round(chipPct)}%
                </div>
              </div>
              <div style={{ marginTop: 18, height: 7, borderRadius: 999, background: W12, overflow: 'hidden' }}>
                <div style={{
                  width: `${chipPct}%`, height: '100%', borderRadius: 999,
                  background: RED, boxShadow: `0 0 12px ${RED}`,
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── notebook (atrás, entra pela direita) ── */}
      <Sequence from={F(B_LAPTOP)} layout="none">
        <div style={{
          position: 'absolute', left: 320, top: 660,
          transform: `translate(${(1 - lapS) * 780}px, ${lapFloat}px)`,
          opacity: Math.min(1, lapS * 1.5),
        }}>
          <LaptopFrame src="rec/d_dashboard.mp4" width={640} startFrom={90} />
        </div>
      </Sequence>

      {/* ── celular (sobe no centro; desliza pra esquerda no trio) ── */}
      <div style={{
        position: 'absolute', left: '50%', top: phoneY,
        transform: `translateX(calc(-50% + ${phoneTx}px)) translateY(${phoneTy}px) scale(${phoneScale})`,
        transformOrigin: '50% 0%',
      }}>
        <div style={{ position: 'relative' }}>
          {/* dashboard: fileira "Continuar assistindo" */}
          <Sequence from={F(B_PHONE)} durationInFrames={F(B_ECG + 0.8) - F(B_PHONE)} layout="none">
            <PhoneFrame src="rec/m_dashboard.mp4" width={PHONE_W} startFrom={195} />
          </Sequence>
          {/* aula de ECG tocando */}
          <Sequence from={F(B_ECG - 0.12)} durationInFrames={F(B_PDF + 0.8) - F(B_ECG - 0.12)} layout="none">
            <div style={{ position: 'absolute', inset: 0, opacity: ecgOp }}>
              <PhoneFrame src="rec/m_player.mp4" width={PHONE_W} startFrom={60} />
            </div>
          </Sequence>
          {/* resumo em PDF */}
          <Sequence from={F(B_PDF - 0.12)} durationInFrames={F(B_NEXT + 0.8) - F(B_PDF - 0.12)} layout="none">
            <div style={{ position: 'absolute', inset: 0, opacity: pdfOp }}>
              <PhoneFrame src="rec/m_pdf.mp4" width={PHONE_W} startFrom={130} />
            </div>
          </Sequence>
          {/* clique em "próxima aula" (m_player termina antes do trio) */}
          <Sequence from={F(B_NEXT - 0.12)} durationInFrames={F(TRIOFADE_E + 0.2) - F(B_NEXT - 0.12)} layout="none">
            <div style={{ position: 'absolute', inset: 0, opacity: nextOp }}>
              <PhoneFrame src="rec/m_player.mp4" width={PHONE_W} startFrom={315} />
            </div>
          </Sequence>
          {/* de volta ao hero do dashboard para a cena do trio */}
          <Sequence from={F(TRIOFADE_S - 0.1)} layout="none">
            <div style={{ position: 'absolute', inset: 0, opacity: trioContentOp }}>
              <PhoneFrame src="rec/m_dashboard.mp4" width={PHONE_W} startFrom={12} />
            </div>
          </Sequence>
        </div>
      </div>

      {/* ── tablet (na frente, entra pela direita) ── */}
      <Sequence from={F(B_TABLET)} layout="none">
        <div style={{
          position: 'absolute', left: 645, top: 880,
          transform: `translate(${(1 - tabS) * 640}px, ${tabFloat}px)`,
          opacity: Math.min(1, tabS * 1.5),
        }}>
          <TabletFrame src="rec/t_dashboard.mp4" width={360} startFrom={15} />
        </div>
      </Sequence>

      {/* ── selo "de onde você parou" ── */}
      {t > B_RESUME && (
        <div style={{ position: 'absolute', inset: 0, opacity: resumeOp, pointerEvents: 'none' }}>
          <FloatBadge x={44} y={430} delay={F(B_RESUME)} from="left" accent>
            <BadgeText top="Continue de onde parou" bottom="ECG na Emergência · 52%" />
          </FloatBadge>
        </div>
      )}

      {/* ── pills de ação entre um atendimento e outro ── */}
      <ActionPill label="AULA · ECG" inAt={B_ECG + 0.05} outAt={B_PDF + 0.05} />
      <ActionPill label="RESUMO · PDF" inAt={B_PDF + 0.05} outAt={B_NEXT + 0.05} />
      <ActionPill label="PRÓXIMA AULA" inAt={B_NEXT + 0.05} outAt={B_530 + 0.15} />

      {/* ── selos dos números ── */}
      {t > B_530 && (
        <div style={{ position: 'absolute', inset: 0, opacity: numbersOp, pointerEvents: 'none' }}>
          <FloatBadge x={44} y={330} delay={F(B_530)} from="left" accent>
            <BadgeText top="+530 cursos" bottom="completos" />
          </FloatBadge>
          <FloatBadge x={650} y={500} delay={F(B_9000)} from="right">
            <BadgeText top="+9.000" bottom="livros médicos" />
          </FloatBadge>
        </div>
      )}

      {/* legendas sincronizadas */}
      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={56} />

      {/* end card + narração */}
      <EndCard startFrame={F(B_END)} />
      <Narration id="c02" delaySec={DELAY} />
    </AbsoluteFill>
  );
};
