import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01, easeInOut } from './theme';
import { FPS, sceneOpacity, ClipAt, Range } from './story';
import { PhoneFrame } from './DeviceFrames';
import timing from './timings/m01.json';

/* ══ Paleta MEDUF (extraída do app em produção) ══════════════════════════ */
const M_BLUE = '#1560e8';
const M_DEEP = '#0a3d99';
const M_NAVY = '#0e1b33';
const M_MUT = '#5b6b85';
const M_BG = '#f6f8fc';
const M_LIGHT = '#e8f0fe';
const M_GREEN = '#0e9f6e';
const M_RED = '#e02424';
const WHITE = '#ffffff';

const T = timing as Timing;
const DELAY = 0.7;
export const M01_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  plantao: DELAY + 1.44,
  interacao: DELAY + 5.07,     // "Aquela interação... eu conferi?"
  dose: DELAY + 6.82,
  diretriz: DELAY + 9.84,
  pensamento: DELAY + 12.48,   // "?" pulsando
  conheci: DELAY + 14.97,      // logo MEDUF
  digito: DELAY + 15.72,
  gpt: DELAY + 17.73,
  claude: DELAY + 18.45,
  gemini: DELAY + 18.88,
  concordam: DELAY + 21.98,
  divergem: DELAY + 23.23,
  checada: DELAY + 24.07,      // "Interação checada"
  doseCalc: DELAY + 25.87,
  pubmed: DELAY + 28.62,
  sus: DELAY + 32.55,
  conferir: DELAY + 33.2,      // "Pra eu conferir"
  decide: DELAY + 34.32,       // "Quem decide... continuo sendo eu"
  segundos: DELAY + 37.59,
  n17: DELAY + 40.27,
  n10k: DELAY + 41.93,
  n27: DELAY + 43.52,
  sozinhos: DELAY + 45.52,     // "pararam de decidir sozinhos"
  prescricao: DELAY + 47.29,   // callback
  fica: DELAY + 48.65,
  seVoce: DELAY + 50.18,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  noite: [0, B.conheci - 0.3] as Range,
  logo: [B.conheci - 0.3, B.digito + 1.1] as Range,
  typing: [B.digito + 1.1, B.concordam + 0.45] as Range,
  consenso: [B.concordam + 0.45, B.checada + 0.7] as Range,
  result: [B.checada + 0.7, B.decide + 0.6] as Range,
  decide: [B.decide + 0.6, B.n17 + 0.6] as Range,
  tools: [B.n17 + 0.6, B.n10k + 1.2] as Range,
  numeros: [B.n10k + 1.2, B.prescricao] as Range,
  callback: [B.prescricao, B.seVoce + 0.6] as Range,
  hero: [B.seVoce + 0.6, B.end + 1.0] as Range,
};

/* ══ Fundo claro da MEDUF: azul respirando + pontilhado ══════════════════ */
const MedufBg: React.FC = () => {
  const frame = useCurrentFrame();
  const b1 = (Math.sin(frame * 0.015) * 0.5 + 0.5) * 0.5 + 0.5;
  const b2 = (Math.cos(frame * 0.011 + 2) * 0.5 + 0.5) * 0.5 + 0.45;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: M_BG }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(rgba(21,96,232,0.07) 1.5px, transparent 1.5px)`,
        backgroundSize: '34px 34px',
      }} />
      <div style={{
        position: 'absolute', width: 900, height: 900, borderRadius: '50%',
        left: -340, top: -280, filter: 'blur(150px)',
        background: `rgba(21,96,232,${0.13 * b1})`,
      }} />
      <div style={{
        position: 'absolute', width: 820, height: 820, borderRadius: '50%',
        right: -300, bottom: -240, filter: 'blur(150px)',
        background: `rgba(10,61,153,${0.10 * b2})`,
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 135% 115% at 50% 45%, transparent 60%, rgba(14,27,51,0.10) 100%)',
      }} />
    </>
  );
};

/* ══ Logo MEDUF AI ═══════════════════════════════════════════════════════ */
const MLogo: React.FC<{ size?: number; row?: boolean }> = ({ size = 96, row = true }) => (
  <div style={{ display: 'flex', flexDirection: row ? 'row' : 'column', alignItems: 'center', gap: size * 0.24 }}>
    <div style={{
      width: size, height: size, borderRadius: size * 0.30,
      background: `linear-gradient(140deg, ${M_BLUE}, ${M_DEEP})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 18px 44px -10px rgba(21,96,232,0.55)',
    }}>
      <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size * 0.52, color: WHITE }}>M</span>
    </div>
    <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size * 0.56, color: M_NAVY, letterSpacing: -size * 0.015, lineHeight: 1 }}>
      MEDUF <span style={{ color: M_BLUE }}>AI</span>
    </span>
  </div>
);

/* ══ Badge flutuante clara ═══════════════════════════════════════════════ */
const MBadge: React.FC<{
  x: number; y: number; delay: number; from?: 'left' | 'right';
  accent?: boolean; green?: boolean;
  top: string; bottom?: string;
}> = ({ x, y, delay, from = 'left', accent, green, top, bottom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 13, stiffness: 110 }, from: 0, to: 1 });
  const drift = Math.sin((frame - delay) * 0.045) * 6;
  const dx = (from === 'left' ? -1 : 1) * (1 - s) * 160;
  const border = green ? 'rgba(14,159,110,0.5)' : accent ? M_BLUE : 'rgba(14,27,51,0.10)';
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transform: `translate(${dx}px, ${drift}px) scale(${0.7 + s * 0.3})`,
      opacity: s,
      background: accent ? M_BLUE : 'rgba(255,255,255,0.96)',
      border: `1.5px solid ${border}`,
      borderRadius: 18, padding: '16px 26px',
      boxShadow: accent ? '0 18px 44px -10px rgba(21,96,232,0.5)' : '0 18px 50px -14px rgba(14,27,51,0.28)',
    }}>
      <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 29, color: accent ? WHITE : green ? M_GREEN : M_NAVY, lineHeight: 1.12 }}>{top}</div>
      {bottom && <div style={{ fontFamily: BODY, fontSize: 19, color: accent ? 'rgba(255,255,255,0.85)' : M_MUT, marginTop: 4 }}>{bottom}</div>}
    </div>
  );
};

/* ══ Receita (o objeto da história) ══════════════════════════════════════ */
const RxCard: React.FC<{ topPx: number; children?: React.ReactNode; opacity?: number; scale?: number }> =
({ topPx, children, opacity = 1, scale = 1 }) => (
  <div style={{
    position: 'absolute', left: '50%', top: topPx,
    transform: `translateX(-50%) scale(${scale}) rotate(-1.2deg)`,
    opacity,
    width: 740, borderRadius: 18,
    background: WHITE,
    boxShadow: '0 40px 100px -28px rgba(14,27,51,0.45)',
    padding: '40px 48px 36px',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `2px solid ${M_LIGHT}`, paddingBottom: 16 }}>
      <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: M_NAVY }}>℞</span>
      <span style={{ fontFamily: BODY, fontSize: 18, color: M_MUT, letterSpacing: 3, textTransform: 'uppercase' }}>prescrição · plantão noturno</span>
    </div>
    <div style={{ fontFamily: MONO, fontSize: 27, color: M_NAVY, lineHeight: 2.05, marginTop: 20 }}>
      1. Varfarina 5 mg — 1x/dia<br />
      2. Amiodarona 200 mg — 1x/dia
    </div>
    {children}
  </div>
);

/* ══ S1 — a noite e a dúvida ═════════════════════════════════════════════ */
const DOUBTS: Array<{ txt: string; at: number }> = [
  { txt: 'a interação... eu conferi?', at: B.interacao },
  { txt: 'a dose pra função renal?', at: B.dose },
  { txt: 'saiu diretriz nova?', at: B.diretriz },
];

const S1: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.noite, true);
  const clockOp = interpolate(frame, [3, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rxS = spring({ frame: frame - Math.round((B.interacao - 1.0) * FPS), fps, config: { damping: 15, stiffness: 70 }, from: 0, to: 1 });
  const clockShrink = interpolate(t, [B.interacao - 1.0, B.interacao - 0.2], [1, 0.52], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const clockUp = interpolate(t, [B.interacao - 1.0, B.interacao - 0.2], [0, -230], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // "?" ecoando no "é sempre o mesmo pensamento voltando"
  const qp = t - B.pensamento;
  const qPulse = qp > 0 ? 1 + Math.sin(qp * 5.2) * 0.12 : 1;
  const qOp = qp > 0 ? Math.min(1, qp / 0.3) : 0;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      {/* véu noturno sobre o fundo claro */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(14,27,51,0.88)' }} />
      <div style={{
        position: 'absolute', width: 700, height: 700, borderRadius: '50%',
        left: '50%', top: 240, transform: 'translateX(-50%)', filter: 'blur(130px)',
        background: 'rgba(21,96,232,0.16)',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 400, textAlign: 'center',
        opacity: clockOp, transform: `translateY(${clockUp}px) scale(${clockShrink})`,
        transformOrigin: '50% 0%',
      }}>
        <div style={{
          fontFamily: MONO, fontWeight: 700, fontSize: 168, color: WHITE, letterSpacing: 4, lineHeight: 1,
          textShadow: '0 0 60px rgba(21,96,232,0.55)',
        }}>
          23:00
        </div>
        <div style={{
          fontFamily: BODY, fontSize: 27, color: 'rgba(255,255,255,0.65)', marginTop: 18,
          opacity: interpolate(t, [B.plantao, B.plantao + 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          o plantão acabou. era pra ter acabado.
        </div>
      </div>
      {/* a receita com as dúvidas */}
      <div style={{ opacity: rxS, transform: `translateY(${(1 - rxS) * 90}px)` }}>
        <RxCard topPx={560}>
          <div style={{ marginTop: 22 }}>
            {DOUBTS.map((d, i) => {
              const o = interpolate(t, [d.at, d.at + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  opacity: o, transform: `translateX(${(1 - o) * 26}px)`,
                  padding: '9px 0',
                }}>
                  <span style={{
                    width: 40, height: 40, borderRadius: 999, flexShrink: 0,
                    background: 'rgba(224,36,36,0.09)', border: `2px solid ${M_RED}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: HEAD, fontWeight: 900, fontSize: 24, color: M_RED,
                  }}>?</span>
                  <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 29, color: '#3d4a61' }}>{d.txt}</span>
                </div>
              );
            })}
          </div>
        </RxCard>
      </div>
      {/* o "?" gigante que volta */}
      <div style={{
        position: 'absolute', left: '50%', top: 1195, transform: `translateX(-50%) scale(${qPulse})`,
        opacity: qOp,
      }}>
        <div style={{
          width: 120, height: 120, borderRadius: 999,
          background: 'rgba(224,36,36,0.14)', border: `4px solid ${M_RED}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: HEAD, fontWeight: 900, fontSize: 66, color: M_RED,
          boxShadow: `0 0 ${40 * qPulse}px rgba(224,36,36,0.4)`,
        }}>?</div>
      </div>
    </div>
  );
};

/* ══ S2 — logo reveal ════════════════════════════════════════════════════ */
const S2: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.logo);
  const base = Math.round(SC.logo[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 12, stiffness: 95 }, from: 0.6, to: 1 });
  const o = interpolate(frame - base, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 830, display: 'flex', justifyContent: 'center',
        opacity: o, transform: `scale(${s})`,
      }}>
        <MLogo size={120} row={false} />
      </div>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 1140, textAlign: 'center',
        opacity: interpolate(frame - base, [10, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        <span style={{ fontFamily: BODY, fontSize: 25, color: M_MUT, letterSpacing: 5, textTransform: 'uppercase' }}>
          assistente clínico com IA
        </span>
      </div>
    </div>
  );
};

/* ══ Cena de celular (kit local, tema claro) ═════════════════════════════ */
const MPhone: React.FC<{
  t: number; range: Range; src: string; startFrom: number;
  children?: React.ReactNode;
}> = ({ t, range, src, startFrom, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, range);
  const base = Math.round(range[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 16, stiffness: 60 }, from: 0, to: 1 });
  const o = interpolate(frame - base, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const breath = 1 + easeInOut(clamp01((t - range[0]) / 4.5)) * 0.04;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: '50%', top: 165,
        transform: `translateX(-50%) translateY(${(1 - s) * 95}px) scale(${breath})`,
        transformOrigin: '50% 20%',
        opacity: o,
      }}>
        <ClipAt fromSec={range[0]}>
          <PhoneFrame src={src} width={600} startFrom={startFrom} statusDark />
        </ClipAt>
      </div>
      {children}
    </div>
  );
};

/* ══ S5 — quem decide é você ═════════════════════════════════════════════ */
const S5: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.decide);
  const base = Math.round(SC.decide[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 14, stiffness: 80 }, from: 0.88, to: 1 });
  const o = interpolate(frame - base, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hi = t > SC.decide[0] + 1.3;
  const segOp = interpolate(t, [B.segundos + 0.3, B.segundos + 0.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: 50, right: 50, top: 680, textAlign: 'center',
        opacity: o, transform: `scale(${s})`,
      }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 76, color: M_NAVY, lineHeight: 1.18, letterSpacing: -2 }}>
          a IA confere.
          <br />
          <span style={{ color: hi ? M_BLUE : M_NAVY, textShadow: hi ? '0 0 44px rgba(21,96,232,0.35)' : 'none' }}>
            quem decide é você.
          </span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1010, display: 'flex', justifyContent: 'center', opacity: segOp }}>
        <div style={{
          background: WHITE, border: `1.5px solid rgba(14,27,51,0.10)`,
          borderRadius: 999, padding: '14px 38px',
          boxShadow: '0 14px 40px -12px rgba(14,27,51,0.25)',
          fontFamily: HEAD, fontWeight: 700, fontSize: 26, color: M_NAVY,
        }}>
          ⚡ conferido em <span style={{ color: M_BLUE }}>segundos</span> — não às 23h
        </div>
      </div>
    </div>
  );
};

/* ══ S7 — números ════════════════════════════════════════════════════════ */
function useCount(target: number, startFrame: number, durFrames = 32): string {
  const frame = useCurrentFrame();
  const p = clamp01((frame - startFrame) / durFrames);
  const v = Math.round(target * (1 - Math.pow(1 - p, 3)));
  return v.toLocaleString('pt-BR');
}

const S7: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const op = sceneOpacity(t, SC.numeros);
  const f1 = Math.round(B.n10k * FPS);
  const f2 = Math.round(B.n27 * FPS);
  const medicos = useCount(10000, f1 + 2, 30);
  const estados = useCount(27, f2, 22);
  const o1 = interpolate(frame - f1, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const o2 = interpolate(frame - f2, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const oP = interpolate(t, [B.sozinhos + 0.2, B.sozinhos + 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 520, textAlign: 'center', opacity: o1 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 150, color: M_NAVY, letterSpacing: -5, lineHeight: 1 }}>
          {medicos}<span style={{ color: M_BLUE }}>+</span>
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 33, color: M_MUT, marginTop: 4 }}>médicos e profissionais</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 850, textAlign: 'center', opacity: o2 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 150, color: M_NAVY, letterSpacing: -5, lineHeight: 1 }}>
          {estados}<span style={{ color: M_BLUE }}> estados</span>
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 33, color: M_MUT, marginTop: 4 }}>do Brasil inteiro</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1110, display: 'flex', justifyContent: 'center', opacity: oP }}>
        <div style={{
          background: M_BLUE, borderRadius: 999, padding: '16px 40px',
          boxShadow: '0 18px 50px -12px rgba(21,96,232,0.55)',
          fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: WHITE,
        }}>
          🩺 pararam de decidir sozinhos
        </div>
      </div>
    </div>
  );
};

/* ══ S8 — callback: a receita volta, ? vira ✓ ════════════════════════════ */
const S8: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.callback);
  const base = Math.round(SC.callback[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 15, stiffness: 75 }, from: 0, to: 1 });
  // o "?" gira e vira check
  const flipAt = B.fica - 0.3;
  const flip = clamp01((t - flipAt) / 0.5);
  const flipE = easeInOut(flip);
  const selOp = interpolate(t, [flipAt + 0.4, flipAt + 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ opacity: s, transform: `translateY(${(1 - s) * 70}px)` }}>
        <RxCard topPx={520}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 26 }}>
            <div style={{
              width: 96, height: 96, borderRadius: 999, flexShrink: 0,
              transform: `rotate(${flipE * 360}deg) scale(${1 + Math.sin(flip * Math.PI) * 0.18})`,
              background: flip > 0.5 ? 'rgba(14,159,110,0.10)' : 'rgba(224,36,36,0.09)',
              border: `4px solid ${flip > 0.5 ? M_GREEN : M_RED}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: HEAD, fontWeight: 900, fontSize: 52,
              color: flip > 0.5 ? M_GREEN : M_RED,
              boxShadow: flip > 0.5 ? '0 0 44px rgba(14,159,110,0.35)' : 'none',
            }}>
              {flip > 0.5 ? '✓' : '?'}
            </div>
            <div style={{ opacity: selOp }}>
              <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 32, color: M_GREEN }}>conferida.</div>
              <div style={{ fontFamily: BODY, fontSize: 21, color: M_MUT, marginTop: 4 }}>
                interação · dose · referência PubMed
              </div>
            </div>
          </div>
        </RxCard>
      </div>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 1130, textAlign: 'center',
        opacity: interpolate(t, [B.fica + 0.3, B.fica + 0.7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 33, color: M_NAVY }}>
          a dúvida <span style={{ color: M_BLUE }}>ficou no plantão.</span>
        </span>
      </div>
    </div>
  );
};

/* ══ S9 — hero final ═════════════════════════════════════════════════════ */
const S9: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = sceneOpacity(t, SC.hero);
  const base = Math.round(SC.hero[0] * FPS);
  const s = spring({ frame: frame - base, fps, config: { damping: 14, stiffness: 80 }, from: 0.86, to: 1 });
  const o = interpolate(frame - base, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hi = t - SC.hero[0] > 1.5;
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{
        position: 'absolute', left: 50, right: 50, top: 740, textAlign: 'center',
        opacity: o, transform: `scale(${s})`,
      }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 82, color: M_NAVY, lineHeight: 1.16, letterSpacing: -2 }}>
          isso aqui é
          <br />
          <span style={{ color: hi ? M_BLUE : M_NAVY, textShadow: hi ? '0 0 44px rgba(21,96,232,0.4)' : 'none' }}>pra você.</span>
        </div>
      </div>
    </div>
  );
};

/* ══ End card MEDUF ══════════════════════════════════════════════════════ */
const MEndCard: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - startFrame;
  if (lf < 0) return null;
  const bgOp = interpolate(lf, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logoS = spring({ frame: lf - 4, fps, config: { damping: 13, stiffness: 90 }, from: 0.7, to: 1 });
  const logoOp = interpolate(lf, [4, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pillOp = interpolate(lf, [14, 27], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const urlOp = interpolate(lf, [22, 36], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const statsOp = interpolate(lf, [30, 44], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pulse = 1 + Math.sin(lf * 0.16) * 0.015;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: bgOp }}>
      <div style={{ position: 'absolute', inset: 0, background: M_BG, opacity: 0.97 }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 800px 640px at 50% 42%, rgba(21,96,232,0.14) 0%, transparent 65%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 44, padding: '0 70px',
      }}>
        <div style={{ opacity: logoOp, transform: `scale(${logoS})` }}>
          <MLogo size={116} row={false} />
        </div>
        <div style={{
          opacity: pillOp, transform: `scale(${pulse})`,
          background: M_BLUE, borderRadius: 999, padding: '20px 54px',
          boxShadow: '0 22px 60px -14px rgba(21,96,232,0.6)',
        }}>
          <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 38, color: WHITE }}>
            Testa grátis · 30 min · sem cartão
          </span>
        </div>
        <div style={{ opacity: urlOp, textAlign: 'center' }}>
          <span style={{
            fontFamily: MONO, fontWeight: 700, fontSize: 42, color: M_BLUE, letterSpacing: 0.5,
          }}>
            meduf.com.br
          </span>
        </div>
        <div style={{ opacity: statsOp, display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['17 ferramentas', 'consenso de 3 IAs', 'PubMed + SUS'].map(s2 => (
            <span key={s2} style={{
              fontFamily: BODY, fontWeight: 600, fontSize: 22, color: M_NAVY,
              background: WHITE, border: '1px solid rgba(14,27,51,0.12)',
              borderRadius: 999, padding: '10px 24px',
              boxShadow: '0 8px 24px -8px rgba(14,27,51,0.18)',
            }}>{s2}</span>
          ))}
        </div>
        <div style={{
          opacity: statsOp, fontFamily: BODY, fontSize: 17, color: M_MUT, marginTop: -14,
        }}>
          apoio à decisão clínica — não substitui o julgamento médico
        </div>
      </div>
    </div>
  );
};

/* ══ ROOT ════════════════════════════════════════════════════════════════ */
export const M01_Meduf: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <MedufBg />
      <S1 t={t} />
      <S2 t={t} />

      {/* digitando o caso real: varfarina + amiodarona */}
      <MPhone t={t} range={SC.typing} src="rec/mf_inter.mp4" startFrom={175}>
        <MBadge x={56} y={330} delay={Math.round((SC.typing[0] + 0.4) * FPS)} from="left" accent
          top="Digita o caso" bottom="interação medicamentosa" />
        <MBadge x={600} y={520} delay={Math.round(B.gpt * FPS)} from="right" top="GPT" bottom="OpenAI" />
        <MBadge x={620} y={680} delay={Math.round(B.claude * FPS)} from="right" top="Claude" bottom="Anthropic" />
        <MBadge x={600} y={840} delay={Math.round(B.gemini * FPS)} from="right" top="Gemini" bottom="Google" />
        <MBadge x={56} y={1010} delay={Math.round((B.gemini + 0.9) * FPS)} from="left"
          top="3 IAs · ao mesmo tempo" bottom="cada uma analisa por conta própria" />
      </MPhone>

      {/* consenso: "Analisando com o Consenso Meduf..." */}
      <MPhone t={t} range={SC.consenso} src="rec/mf_inter.mp4" startFrom={510}>
        <MBadge x={56} y={430} delay={Math.round((B.concordam + 0.45) * FPS)} from="left" green
          top="✓ onde concordam" />
        <MBadge x={620} y={590} delay={Math.round((B.divergem - 0.15) * FPS)} from="right"
          top="⚠ onde divergem" bottom="destacado pra você" />
      </MPhone>

      {/* resultado REAL da análise */}
      <MPhone t={t} range={SC.result} src="rec/mf_inter.mp4" startFrom={885}>
        <MBadge x={56} y={330} delay={Math.round((B.checada + 0.75) * FPS)} from="left" green
          top="✓ Interação checada" bottom="severidade: grave — monitorar INR" />
        <MBadge x={590} y={520} delay={Math.round(B.doseCalc * FPS)} from="right"
          top="Dose calculada" bottom="ajuste de −30 a −50%" />
        <MBadge x={56} y={680} delay={Math.round(B.pubmed * FPS)} from="left" accent
          top="PubMed" bottom="+35 milhões de artigos" />
        <MBadge x={600} y={850} delay={Math.round(B.sus * FPS)} from="right"
          top="Protocolos do SUS" bottom="PCDT · RENAME" />
        <MBadge x={56} y={1020} delay={Math.round((B.conferir + 0.2) * FPS)} from="left"
          top="pra você conferir" bottom="referência em cada resposta" />
      </MPhone>

      <S5 t={t} />

      {/* 17 ferramentas no grid real */}
      <MPhone t={t} range={SC.tools} src="rec/mf_tools.mp4" startFrom={40}>
        <MBadge x={56} y={330} delay={Math.round((SC.tools[0] + 0.35) * FPS)} from="left" accent
          top="17 ferramentas" bottom="diagnóstico · doses · ECG · imagem · voz" />
      </MPhone>

      <S7 t={t} />
      <S8 t={t} />
      <S9 t={t} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={56} highlight={M_BLUE} />
      <MEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/m01.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
