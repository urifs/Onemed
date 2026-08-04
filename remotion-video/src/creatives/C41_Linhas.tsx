import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, clamp01, easeInOut } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { OLightBg, OLHero, OLEndCard, OLNumbers, O_RED, O_INK, O_MUT, WHITE } from './olight';
import timing from './timings/c41.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C41_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  dois: DELAY + 0.1,
  faculdade: DELAY + 1.4,
  linhas: DELAY + 5.4,
  cima: DELAY + 8.3,
  pedaco: DELAY + 10.6,
  link: DELAY + 11.6,
  pasta: DELAY + 12.7,
  no: DELAY + 15.8,
  baixo: DELAY + 16.8,
  resumo: DELAY + 18.6,
  sobe1: DELAY + 19.9,
  flash: DELAY + 20.6,
  sobe2: DELAY + 22.5,
  quest: DELAY + 23.4,
  sobe3: DELAY + 25.2,
  mapa: DELAY + 26.8,
  meses: DELAY + 29.9,
  chegam: DELAY + 32.2,
  embolada: DELAY + 34.1,
  inteira: DELAY + 35.7,
  n530: DELAY + 36.4,
  n9000: DELAY + 38.5,
  lugar: DELAY + 40.0,
  dif: DELAY + 41.2,
  caminho: DELAY + 43.4,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  hook: [0, B.linhas + 0.4] as Range,
  linhas: [B.linhas + 0.4, B.n530 - 0.3] as Range,
  numeros: [B.n530 - 0.3, B.dif - 0.4] as Range,
  hero: [B.dif - 0.4, B.end + 1.0] as Range,
};

/* progresso 0..1 do desenho das linhas: linear, com fast-forward no "6 meses" */
const T0 = B.linhas + 0.3;
const T1 = B.chegam + 0.9;
const prog = (t: number) => {
  const raw = clamp01((t - T0) / (T1 - T0));
  // até o "6 meses depois" as linhas percorrem 78% do caminho; depois correm o resto
  const cut = (B.meses - T0) / (T1 - T0);
  if (raw <= cut) return (raw / cut) * 0.78;
  return 0.78 + ((raw - cut) / (1 - cut)) * 0.22;
};

/* nós (espirais) da linha de cima, em s ∈ 0..1 */
const KNOTS = [0.3, 0.52, 0.72, 0.93];

const topPoint = (s: number): [number, number] => {
  const x = 90 + 880 * s;
  const amp = 12 + 60 * s;
  let y = 600 + Math.sin(x * 0.021) * amp + Math.sin(x * 0.057 + 1.7) * amp * 0.55;
  y += (860 - 600) * easeInOut(clamp01((s - 0.82) / 0.18)) * 0.35;
  let dx = 0, dy = 0;
  for (const k of KNOTS) {
    const w = k === 0.93 ? 0.05 : 0.038;
    if (Math.abs(s - k) < w) {
      const u = (s - k) / w;               // -1..1
      const phi = u * Math.PI * 2.2;
      const r = (k === 0.93 ? 34 : 24) * (1 - Math.abs(u) * 0.55);
      dx += r * Math.cos(phi * 2);
      dy += r * Math.sin(phi * 2);
    }
  }
  return [x + dx, y + dy];
};

const botPoint = (s: number): [number, number] => {
  const x = 90 + 880 * s;
  let y = 1150;
  const steps: Array<[number, number]> = [[0.36, -62], [0.5, -62], [0.63, -62]];
  for (const [ks, dy] of steps) y += dy * easeInOut(clamp01((s - ks) / 0.05));
  y += (886 - 964) * easeInOut(clamp01((s - 0.8) / 0.2));
  return [x, y];
};

const toPts = (fn: (s: number) => [number, number], upTo: number) => {
  const pts: string[] = [];
  const N = 340;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    if (s > upTo) break;
    const [x, y] = fn(s);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
};

/* rótulo pequeno ancorado no canvas das linhas */
const Tag: React.FC<{ t: number; at: number; x: number; y: number; text: string; red?: boolean; gray?: boolean }> =
({ t, at, x, y, text, red, gray }) => {
  const o = interpolate(t, [at, at + 0.35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute', left: x, top: y, opacity: o,
      transform: `translateY(${(1 - o) * 14}px)`,
      background: WHITE, border: `2px solid ${red ? O_RED : 'rgba(22,24,29,0.14)'}`,
      borderRadius: 12, padding: '8px 14px',
      boxShadow: '0 10px 28px -10px rgba(22,24,29,0.22)',
      fontFamily: HEAD, fontWeight: 700, fontSize: 22,
      color: red ? O_RED : gray ? O_MUT : O_INK, whiteSpace: 'nowrap',
    }}>{text}</div>
  );
};

export const C41_Linhas: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const p = prog(t);
  const linhasOp = sceneOpacity(t, SC.linhas);
  const skipOp = t > B.meses - 0.1 && t < B.meses + 1.6
    ? interpolate(t, [B.meses - 0.1, B.meses + 0.2, B.meses + 1.2, B.meses + 1.6], [0, 1, 1, 0])
    : 0;
  const flagOp = interpolate(t, [B.chegam - 0.4, B.chegam], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const [txEnd, tyEnd] = topPoint(Math.min(p, 0.995));
  const [bxEnd, byEnd] = botPoint(Math.min(p, 0.995));

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />

      {/* hook: dois pontos */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.hook, true) }}>
        <div style={{ position: 'absolute', left: 50, right: 50, top: 520, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 84, color: O_INK, letterSpacing: -2.5 }}>
            dois <span style={{ color: O_RED }}>estudantes.</span>
          </div>
          <div style={{
            fontFamily: BODY, fontSize: 30, color: O_MUT, marginTop: 20,
            opacity: interpolate(t, [B.faculdade, B.faculdade + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            mesma faculdade. mesmas 16 horas por semana.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 60, marginTop: 90 }}>
            {[O_MUT, O_RED].map((c, i) => (
              <div key={i} style={{
                width: 42, height: 42, borderRadius: 999, background: c,
                transform: `scale(${1 + Math.sin(t * 4 + i * 1.5) * 0.1})`,
                boxShadow: `0 14px 36px -8px ${c}66`,
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* as duas linhas */}
      <div style={{ position: 'absolute', inset: 0, opacity: linhasOp }}>
        <svg width={1080} height={1450} style={{ position: 'absolute', top: 120 }}>
          {/* linha de cima: garimpado */}
          <polyline points={toPts(topPoint, p)} fill="none" stroke={O_MUT} strokeWidth={4.5}
            strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
          {/* linha de baixo: um lugar só */}
          <polyline points={toPts(botPoint, p)} fill="none" stroke={O_RED} strokeWidth={5.5}
            strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 5px 12px rgba(224,45,45,0.35))' }} />
          {/* pontas */}
          {p > 0.002 && p < 0.998 && (
            <>
              <circle cx={txEnd} cy={tyEnd} r={8} fill={O_MUT} />
              <circle cx={bxEnd} cy={byEnd} r={9} fill={O_RED} />
            </>
          )}
          {/* bandeira PROVA */}
          <g opacity={flagOp}>
            <rect x={962} y={790} width={104} height={150} rx={18} fill={O_RED} />
            <text x={1014} y={872} textAnchor="middle" fontFamily={HEAD} fontWeight={900} fontSize={26} fill={WHITE}
              transform="rotate(-90 1014 866)">PROVA</text>
          </g>
        </svg>

        {/* rótulos das linhas */}
        <Tag t={t} at={B.cima + 0.3} x={70} y={520} text="material garimpado" gray />
        <Tag t={t} at={B.baixo + 0.3} x={70} y={1290} text="num lugar só" red />
        {/* caos */}
        <Tag t={t} at={B.pedaco} x={230} y={615} text="um pedaço aqui" gray />
        <Tag t={t} at={B.link} x={455} y={840} text="um link ali" gray />
        <Tag t={t} at={B.pasta} x={620} y={560} text="a pasta sumiu" gray />
        <Tag t={t} at={B.no + 0.2} x={330} y={745} text="🪢 nó" gray />
        {/* degraus */}
        <Tag t={t} at={B.sobe1} x={330} y={1195} text="resumo — 1 clique ↑" red />
        <Tag t={t} at={B.sobe2} x={465} y={1130} text="flashcards ↑" red />
        <Tag t={t} at={B.sobe3} x={590} y={1063} text="questões comentadas ↑" red />
        <Tag t={t} at={B.mapa + 0.3} x={700} y={1210} text="🧠 mapa mental do caminho" red />

        {/* corte temporal: 6 meses */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 340, textAlign: 'center', opacity: skipOp }}>
          <div style={{
            display: 'inline-block', background: O_INK, color: WHITE, borderRadius: 999,
            padding: '12px 30px', fontFamily: HEAD, fontWeight: 800, fontSize: 28,
            boxShadow: '0 16px 44px -12px rgba(22,24,29,0.4)',
          }}>
            6 meses depois ⏩
          </div>
        </div>

        {/* veredito das chegadas */}
        <Tag t={t} at={B.embolada} x={640} y={620} text="chega embolada" gray />
        <Tag t={t} at={B.inteira} x={640} y={960} text="chega inteira" red />
      </div>

      <OLNumbers t={t} range={SC.numeros} atFirstSec={B.n530} atSecondSec={B.n9000}
        atPillSec={B.lugar} pillText="num lugar só" />

      <OLHero t={t} range={SC.hero} line1="a diferença nunca foi o esforço." line2="foi o caminho."
        size={62} redAfterSec={B.caminho - SC.hero[0]} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c41.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
