// Tema compartilhado dos criativos da plataforma OneMed (mesma paleta do app).
export const RED = '#ef4444';
export const RED_DK = '#c62828';
export const BG = '#050505';
export const BG_PAPER = '#0a0f18';
export const WHITE = '#ffffff';
export const W80 = 'rgba(255,255,255,0.80)';
export const W60 = 'rgba(255,255,255,0.60)';
export const W40 = 'rgba(255,255,255,0.40)';
export const W12 = 'rgba(255,255,255,0.10)';
export const GREEN = '#10b77f';

export const HEAD = "'Outfit','Helvetica Neue',Arial,sans-serif";
export const BODY = "'Inter','Helvetica Neue',Arial,sans-serif";
export const MONO = "'JetBrains Mono','Courier New',monospace";

// contorno de legenda estilo reels
export const CAPTION_OUTLINE = [
  '-4px -4px 0 #000', '4px -4px 0 #000', '-4px 4px 0 #000', '4px 4px 0 #000',
  '-4px 0 0 #000', '4px 0 0 #000', '0 -4px 0 #000', '0 4px 0 #000',
  '-2px -2px 0 #000', '2px -2px 0 #000', '-2px 2px 0 #000', '2px 2px 0 #000',
  '0 6px 18px rgba(0,0,0,0.55)',
].join(',');

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** fade-in/fade-out por frames locais */
export function fade(f: number, inS: number, inE: number, outS: number, outE: number): number {
  const fi = easeOut(clamp01((f - inS) / Math.max(1, inE - inS)));
  const fo = easeOut(clamp01(1 - (f - outS) / Math.max(1, outE - outS)));
  return fi * fo;
}
