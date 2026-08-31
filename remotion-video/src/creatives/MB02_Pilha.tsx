import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, clamp01 } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { MBDarkBg, MBLogo, MBHero, MBEndCard, MB_BLUE, MB_INK, MB_MUT, MB_CARD, MB_LINE, MB_BG, WHITE } from './mbdark';
import timing from './timings/mb02.json';

const T = timing as Timing;
const DELAY = 0.7;
export const MB02_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  vai: DELAY + 6.32,
  n9000: DELAY + 6.91,
  n530: DELAY + 8.37,
  mesa: DELAY + 13.61,
  teto: DELAY + 15.35,
  predio: DELAY + 17.08,
  quarto: DELAY + 19.13,
  celular: DELAY + 20.51,
  rotina: DELAY + 22.59,
  peso: DELAY + 24.53,
  sozinho: DELAY + 25.92,
  sopro: DELAY + 29.6,
  drive: DELAY + 32.07,
  acervo: DELAY + 34.12,
  nuvem: DELAY + 36.99,
  instalar: DELAY + 38.62,
  atualiz: DELAY + 41.24,
  suporte: DELAY + 42.59,
  mesmo: DELAY + 46.75,
  mudou: DELAY + 48.72,
  solta: DELAY + 50.4,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  hook: [0, B.vai - 0.2] as Range,
  pilha: [B.vai - 0.2, B.sopro + 0.9] as Range,
  lugar: [B.sopro + 0.5, B.mesmo - 0.3] as Range,
  hero: [B.mesmo - 0.3, B.end + 1.0] as Range,
};

const PAL = ['#e05252', '#e08a3c', '#4b9de0', '#43b586', '#8a6fd6', '#d6b13f'];
const NBOOKS = 96;
const BOOKS = Array.from({ length: NBOOKS }, (_, i) => ({
  h: 22 + ((i * 7919) % 13),
  w: 300 + ((i * 104729) % 150) - 75,
  dx: ((i * 15485863) % 61) - 30,
  c: PAL[i % PAL.length],
}));
const CUM: number[] = [];
{
  let acc = 0;
  for (const b of BOOKS) { CUM.push(acc); acc += b.h + 3; }
}
const totalH = (n: number) => (n <= 0 ? 0 : CUM[Math.min(n, NBOOKS) - 1] + BOOKS[Math.min(n, NBOOKS) - 1].h);

const countAt = (t: number) => {
  const u = clamp01((t - B.vai) / (B.peso - 0.6 - B.vai));
  return Math.floor(NBOOKS * u * u * (3 - 2 * u) * (0.4 + 0.6 * u) / 1);
};

const RULERS: Array<{ h: number; label: string; at: () => number }> = [
  { h: 190, label: 'sua mesa', at: () => B.mesa },
  { h: 620, label: 'o teto', at: () => B.teto },
  { h: 1750, label: 'o prédio', at: () => B.predio },
];

const Chip: React.FC<{ t: number; at: number; x: number; y: number; text: string }> =
({ t, at, x, y, text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - Math.round(at * FPS), fps, config: { damping: 12, stiffness: 130 }, from: 0, to: 1 });
  if (t < at) return null;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: `scale(${s})`,
      background: MB_CARD, border: `2px solid ${MB_LINE}`, borderRadius: 999,
      padding: '12px 24px', boxShadow: '0 12px 34px -10px rgba(0,0,0,0.55)',
      fontFamily: HEAD, fontWeight: 800, fontSize: 25, color: MB_INK, whiteSpace: 'nowrap',
    }}>{text}</div>
  );
};

export const MB02_Pilha: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / FPS;

  const n = countAt(t);
  const H = totalH(n);
  const scale = Math.max(0.62, Math.min(1, 1050 / Math.max(H, 1)));
  const shake = t > B.quarto - 0.2 && t < B.rotina + 1.3 ? Math.sin(t * 42) * 5 : 0;
  const lean = t > B.peso && t < B.sopro ? Math.sin((t - B.peso) * 2.2) * 2.2 : 0;
  const blow = clamp01((t - B.sopro) / 0.8);
  const logoS = spring({ frame: frame - Math.round((B.sopro + 0.5) * FPS), fps, config: { damping: 12, stiffness: 90 }, from: 0, to: 1 });

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <MBDarkBg />

      {/* hook */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.hook, true) }}>
        <div style={{ position: 'absolute', left: 60, right: 60, top: 560, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 66, color: MB_INK, letterSpacing: -2, lineHeight: 1.2 }}>
            empilha <span style={{ color: MB_BLUE }}>tudo</span><br />que você precisa estudar<br />até a prova.
          </div>
          <div style={{
            fontFamily: BODY, fontSize: 30, color: MB_MUT, marginTop: 26,
            opacity: interpolate(t, [B.vai - 1.2, B.vai - 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            vai. eu espero. 👇
          </div>
        </div>
      </div>

      {/* a pilha */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.pilha) }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 340, height: 0,
          transform: `translateX(${shake}px) rotate(${lean}deg) scale(${scale})`,
          transformOrigin: '50% 100%',
        }}>
          <div style={{ position: 'absolute', left: '50%', bottom: -6, width: 760, transform: 'translateX(-50%)', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.16)' }} />
          {RULERS.map((r, i) => {
            const o = interpolate(t, [r.at(), r.at() + 0.35], [0, 0.9], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{ position: 'absolute', left: '50%', bottom: r.h, transform: 'translateX(-50%)', width: 880, opacity: o }}>
                <div style={{ borderTop: `3px dashed ${MB_BLUE}66` }} />
                <div style={{
                  position: 'absolute', left: -8, top: -46, background: MB_CARD, border: `2px solid ${MB_BLUE}`,
                  borderRadius: 999, padding: '6px 18px', fontFamily: HEAD, fontWeight: 800,
                  fontSize: Math.min(26 / scale, 46), color: MB_BLUE, whiteSpace: 'nowrap',
                }}>{r.label} ↑</div>
              </div>
            );
          })}
          {BOOKS.slice(0, n).map((b, i) => {
            const ang = i * 2.399;
            const fly = blow * (260 + ((i * 31) % 240));
            const bx = Math.cos(ang) * fly;
            const by = Math.sin(ang) * fly * 0.7 - blow * 60;
            return (
              <div key={i} style={{
                position: 'absolute', left: '50%', bottom: CUM[i],
                width: b.w, height: b.h, borderRadius: 6,
                transform: `translateX(calc(-50% + ${b.dx + bx}px)) translateY(${-by}px) rotate(${blow * ((i % 7) - 3) * 30}deg)`,
                background: b.c, opacity: (1 - blow) * 0.92,
                boxShadow: '0 4px 12px -4px rgba(0,0,0,0.5)',
              }} />
            );
          })}
        </div>
        <Chip t={t} at={B.n9000} x={64} y={430} text="+9.000 livros" />
        <Chip t={t} at={B.n530} x={700} y={560} text="+530 cursos" />
        <Chip t={t} at={B.sozinho} x={290} y={330} text="esse é o peso. todos os dias." />
      </div>

      {/* sopro → Drive MedBrasil */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.lugar) }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 600, display: 'flex', justifyContent: 'center', transform: `scale(${logoS})` }}>
          <MBLogo size={120} row={false} />
        </div>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 930, textAlign: 'center',
          opacity: interpolate(t, [B.acervo, B.acervo + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          fontFamily: HEAD, fontWeight: 900, fontSize: 46, color: MB_INK, letterSpacing: -1.2, lineHeight: 1.3,
        }}>
          o maior acervo médico da América Latina...<br /><span style={{ color: MB_BLUE }}>inteiro na nuvem.</span>
        </div>
        <Chip t={t} at={B.nuvem} x={140} y={1120} text="☁️ na nuvem" />
        <Chip t={t} at={B.instalar} x={420} y={1120} text="📲 sem instalar · sem ocupar espaço" />
        <Chip t={t} at={B.atualiz} x={170} y={1220} text="🔄 atualizações garantidas" />
        <Chip t={t} at={B.suporte} x={620} y={1220} text="💬 suporte 24h" />
      </div>

      <MBHero t={t} range={SC.hero} line1="o conteúdo é o mesmo." line2="carregar... é que mudou."
        size={62} blueAfterSec={B.mudou - SC.hero[0]} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={MB_BLUE} />
      <MBEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/mb02.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
