import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { RED, WHITE, W60, W40, W12, GREEN, HEAD, BODY, MONO, clamp01, easeInOut } from './theme';
import { FPS, sceneOpacity, ClipAt, Range } from './story';
import { PhoneFrame } from './DeviceFrames';

/* Kit compartilhado da série OneMed-IA (C21–C30): peças bespoke que aparecem
   em mais de um vídeo — pílula das 4 funções, "clique" que desdobra, dia D. */

export const CARD_BG = 'rgba(14,16,22,0.92)';

/* selo de função de IA */
export const AiChip: React.FC<{ icon: string; label: string; on?: boolean }> = ({ icon, label, on = true }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    background: on ? 'rgba(239,68,68,0.14)' : W12,
    border: `1.5px solid ${on ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`,
    borderRadius: 14, padding: '12px 20px',
  }}>
    <span style={{ fontSize: 26 }}>{icon}</span>
    <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 26, color: on ? WHITE : W40 }}>{label}</span>
  </div>
);

/* celular central com take real (tema escuro OneMed) */
export const OPhone: React.FC<{
  t: number; range: Range; src: string; startFrom: number; width?: number; top?: number;
  playbackRate?: number; children?: React.ReactNode;
}> = ({ t, range, src, startFrom, width = 600, top = 165, playbackRate, children }) => {
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
        position: 'absolute', left: '50%', top,
        transform: `translateX(-50%) translateY(${(1 - s) * 95}px) scale(${breath})`,
        transformOrigin: '50% 20%', opacity: o,
      }}>
        <ClipAt fromSec={range[0]}>
          <PhoneFrame src={src} width={width} startFrom={startFrom} playbackRate={playbackRate} />
        </ClipAt>
      </div>
      {children}
    </div>
  );
};

/* pílula das 4 funções de IA (a "camada nova") */
export const AiRow: React.FC<{ t: number; startSec: number; y?: number }> = ({ t, startSec, y = 1040 }) => {
  const FEAT = [['📝', 'Resumo'], ['🃏', 'Flashcards'], ['📋', 'Questões'], ['💬', 'Assistente']];
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', padding: '0 40px' }}>
      {FEAT.map(([ic, lb], i) => {
        const at = startSec + i * 0.28;
        const o = interpolate(t, [at, at + 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return <div key={lb} style={{ opacity: o, transform: `translateY(${(1 - o) * 20}px)` }}><AiChip icon={ic} label={lb} /></div>;
      })}
    </div>
  );
};

/* "um clique" que desdobra a aula em resumo/flashcard/questão */
export const ClickPulse: React.FC<{ t: number; atSec: number; x: number; y: number; label?: string }> = ({ t, atSec, x, y, label }) => {
  const dt = t - atSec;
  if (dt < 0 || dt > 1.2) return null;
  const r = interpolate(dt, [0, 0.6], [0, 90], { extrapolateRight: 'clamp' });
  const op = interpolate(dt, [0, 0.6], [0.6, 0], { extrapolateRight: 'clamp' });
  const tap = interpolate(dt, [0, 0.12, 0.3], [0.7, 1.15, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: x, top: y }}>
      <div style={{ position: 'absolute', left: -r, top: -r, width: r * 2, height: r * 2, borderRadius: 999, border: `3px solid ${RED}`, opacity: op }} />
      <div style={{ transform: `translate(-50%,-50%) scale(${tap})`, width: 64, height: 64, borderRadius: 999, background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 34px rgba(239,68,68,0.5)' }}>
        <span style={{ fontSize: 30 }}>👆</span>
      </div>
      {label && <div style={{ position: 'absolute', top: 44, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontFamily: MONO, fontWeight: 700, fontSize: 22, color: RED }}>{label}</div>}
    </div>
  );
};

/* contador estilizado de dias (D-7…D-0) */
export const DayCard: React.FC<{ t: number; atSec: number; day: number; done?: boolean }> = ({ t, atSec, day, done }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - Math.round(atSec * FPS), fps, config: { damping: 12, stiffness: 140 }, from: 0, to: 1 });
  return (
    <div style={{
      position: 'absolute', left: '50%', top: 300, transform: `translateX(-50%) scale(${0.7 + s * 0.3})`, opacity: s,
      background: CARD_BG, border: `2px solid ${done ? GREEN : RED}`, borderRadius: 22, padding: '18px 40px',
      boxShadow: `0 18px 50px -12px ${done ? 'rgba(16,183,127,0.4)' : 'rgba(239,68,68,0.4)'}`,
    }}>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 42, color: done ? GREEN : WHITE, letterSpacing: 2 }}>
        {day === 0 ? 'DIA DA PROVA' : `D-${day}`}{done ? ' ✓' : ''}
      </span>
    </div>
  );
};
