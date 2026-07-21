import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { HEAD, CAPTION_OUTLINE, RED, WHITE } from './theme';

export interface Word { w: string; t: number; end: number }
export interface Timing { voice: string; duration: number; words: Word[] }

interface Group { words: Word[]; t: number; end: number }

/** agrupa palavras em blocos de legenda (máx. 3, quebra em pontuação/pausas) */
export function buildGroups(words: Word[], maxWords = 3): Group[] {
  const groups: Group[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) {
      groups.push({ words: cur, t: cur[0].t, end: cur[cur.length - 1].end });
      cur = [];
    }
  };
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const prev = cur[cur.length - 1];
    if (prev && w.t - prev.end > 0.55) flush();
    cur.push(w);
    const isUrl = w.w.includes('.com');
    const long = w.w.length > 12;
    if (cur.length >= maxWords || isUrl || (long && cur.length >= 2)) flush();
  }
  flush();
  // estende cada grupo até o início do próximo (sem buracos)
  for (let i = 0; i < groups.length - 1; i++) {
    groups[i].end = Math.max(groups[i].end, Math.min(groups[i + 1].t, groups[i].end + 0.9));
  }
  if (groups.length) groups[groups.length - 1].end += 1.2;
  return groups;
}

/**
 * Legendas estilo reels sincronizadas por palavra: um grupo por vez,
 * palavra ativa destaca em vermelho com "pop".
 */
export const CaptionTrack: React.FC<{
  timing: Timing;
  y?: number;            // centro vertical (px)
  size?: number;
  delaySec?: number;     // atraso do áudio dentro da comp
  highlight?: string;
}> = ({ timing, y = 1430, size = 58, delaySec = 0, highlight = RED }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - delaySec;

  const groups = useMemo(() => buildGroups(timing.words), [timing]);
  const g = groups.find(gr => t >= gr.t - 0.06 && t < gr.end);
  if (!g) return null;

  const appear = Math.min(1, Math.max(0, (t - (g.t - 0.06)) / 0.13));
  const pop = 0.92 + 0.08 * (1 - Math.pow(1 - appear, 3));

  return (
    <div
      style={{
        position: 'absolute', left: 40, right: 40, top: y,
        transform: `translateY(-50%) scale(${pop})`,
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
        alignItems: 'center', gap: '0 18px', rowGap: 6,
        opacity: appear,
        pointerEvents: 'none',
      }}
    >
      {g.words.map((w, i) => {
        const active = t >= w.t && t <= Math.max(w.end, w.t + 0.18);
        const spoken = t >= w.t;
        const isUrl = w.w.includes('.com');
        return (
          <span
            key={i}
            style={{
              fontFamily: HEAD,
              fontWeight: 900,
              fontSize: isUrl ? size * 0.82 : size,
              lineHeight: 1.18,
              textTransform: isUrl ? 'lowercase' : 'uppercase',
              letterSpacing: 1,
              color: spoken ? (active ? highlight : WHITE) : 'rgba(255,255,255,0.35)',
              textShadow: CAPTION_OUTLINE,
              transform: active ? 'scale(1.07)' : 'scale(1)',
              display: 'inline-block',
              transition: 'none',
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
};
