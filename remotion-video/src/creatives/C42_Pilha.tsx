import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, clamp01 } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { OLightBg, OLogo, OLHero, OLEndCard, O_RED, O_INK, O_MUT, WHITE } from './olight';
import timing from './timings/c42.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C42_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  exercicio: DELAY + 0.5,
  empilha: DELAY + 2.4,
  vai: DELAY + 6.4,
  n9000: DELAY + 7.7,
  n530: DELAY + 9.3,
  mesa: DELAY + 14.5,
  teto: DELAY + 16.2,
  predio: DELAY + 17.9,
  quarto: DELAY + 19.9,
  plantao: DELAY + 21.1,
  rotina: DELAY + 22.7,
  peso: DELAY + 24.6,
  sozinho: DELAY + 26.0,
  sopro: DELAY + 29.6,
  lugar: DELAY + 32.9,
  busca: DELAY + 34.3,
  resumo: DELAY + 34.9,
  flash: DELAY + 35.6,
  quest: DELAY + 36.5,
  crono: DELAY + 38.1,
  mapa: DELAY + 38.9,
  mesmo: DELAY + 42.9,
  mudou: DELAY + 46.0,
  solta: DELAY + 47.3,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  hook: [0, B.vai - 0.2] as Range,
  pilha: [B.vai - 0.2, B.sopro + 0.9] as Range,
  lugar: [B.sopro + 0.5, B.mesmo - 0.3] as Range,
  hero: [B.mesmo - 0.3, B.end + 1.0] as Range,
};

/* livros da pilha: determinístico por índice */
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

/* quantos livros no tempo t: acelera */
const countAt = (t: number) => {
  const u = clamp01((t - B.vai) / (B.peso - 0.6 - B.vai));
  return Math.floor(NBOOKS * u * u * (3 - 2 * u) * (0.4 + 0.6 * u) / 1);
};

/* réguas de escala (altura em px da pilha) */
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
      background: WHITE, border: '2px solid rgba(22,24,29,0.12)', borderRadius: 999,
      padding: '12px 24px', boxShadow: '0 12px 34px -10px rgba(22,24,29,0.22)',
      fontFamily: HEAD, fontWeight: 800, fontSize: 25, color: O_INK, whiteSpace: 'nowrap',
    }}>{text}</div>
  );
};

export const C42_Pilha: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / FPS;

  const n = countAt(t);
  const H = totalH(n);
  // zoom-out conforme cresce, mas com piso: no clímax a pilha estoura o topo do quadro
  const scale = Math.max(0.62, Math.min(1, 1050 / Math.max(H, 1)));
  const shake = t > B.quarto - 0.2 && t < B.rotina + 1.3 ? Math.sin(t * 42) * 5 : 0;
  const lean = t > B.peso && t < B.sopro ? Math.sin((t - B.peso) * 2.2) * 2.2 : 0;
  const blow = clamp01((t - B.sopro) / 0.8);
  const logoS = spring({ frame: frame - Math.round((B.sopro + 0.5) * FPS), fps, config: { damping: 12, stiffness: 90 }, from: 0, to: 1 });

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />

      {/* hook */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.hook, true) }}>
        <div style={{ position: 'absolute', left: 60, right: 60, top: 560, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 66, color: O_INK, letterSpacing: -2, lineHeight: 1.2 }}>
            empilha <span style={{ color: O_RED }}>tudo</span><br />que você precisa estudar<br />até a prova.
          </div>
          <div style={{
            fontFamily: BODY, fontSize: 30, color: O_MUT, marginTop: 26,
            opacity: interpolate(t, [B.vai - 1.2, B.vai - 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            vai. eu espero. 👇
          </div>
        </div>
      </div>

      {/* a pilha (zoom-out conforme cresce) */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.pilha) }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 340, height: 0,
          transform: `translateX(${shake}px) rotate(${lean}deg) scale(${scale})`,
          transformOrigin: '50% 100%',
        }}>
          {/* chão */}
          <div style={{ position: 'absolute', left: '50%', bottom: -6, width: 760, transform: 'translateX(-50%)', height: 6, borderRadius: 3, background: 'rgba(22,24,29,0.18)' }} />
          {/* réguas */}
          {RULERS.map((r, i) => {
            const o = interpolate(t, [r.at(), r.at() + 0.35], [0, 0.9], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{ position: 'absolute', left: '50%', bottom: r.h, transform: 'translateX(-50%)', width: 880, opacity: o }}>
                <div style={{ borderTop: `3px dashed ${O_RED}66` }} />
                <div style={{
                  position: 'absolute', left: -8, top: -46, background: WHITE, border: `2px solid ${O_RED}`,
                  borderRadius: 999, padding: '6px 18px', fontFamily: HEAD, fontWeight: 800,
                  fontSize: Math.min(26 / scale, 46), color: O_RED, whiteSpace: 'nowrap',
                }}>{r.label} ↑</div>
              </div>
            );
          })}
          {/* livros */}
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
                background: b.c, opacity: (1 - blow) * 0.95,
                boxShadow: '0 4px 10px -4px rgba(22,24,29,0.25)',
              }} />
            );
          })}
        </div>
        {/* contadores durante o empilhamento */}
        <Chip t={t} at={B.n9000} x={64} y={430} text="+9.000 livros" />
        <Chip t={t} at={B.n530} x={700} y={560} text="+530 cursos" />
        <Chip t={t} at={B.sozinho} x={290} y={330} text="esse é o peso. todos os dias." />
      </div>

      {/* sopro → um lugar só */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.lugar) }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 600, display: 'flex', justifyContent: 'center', transform: `scale(${logoS})` }}>
          <OLogo size={120} row={false} />
        </div>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 900, textAlign: 'center',
          opacity: interpolate(t, [B.lugar, B.lugar + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: O_INK, letterSpacing: -1.5,
        }}>
          tudo isso... <span style={{ color: O_RED }}>num lugar só.</span>
        </div>
        <Chip t={t} at={B.busca} x={130} y={1030} text="🔎 busca" />
        <Chip t={t} at={B.resumo} x={370} y={1030} text="📝 resumo" />
        <Chip t={t} at={B.flash} x={640} y={1030} text="🃏 flashcards" />
        <Chip t={t} at={B.quest} x={170} y={1130} text="📋 questões comentadas" />
        <Chip t={t} at={B.mapa} x={620} y={1130} text="🧠 cronograma + mapa" />
      </div>

      <OLHero t={t} range={SC.hero} line1="o conteúdo é o mesmo." line2="carregar... é que mudou."
        size={62} redAfterSec={B.mudou - SC.hero[0]} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c42.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
