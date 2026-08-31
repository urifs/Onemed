import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, clamp01, easeInOut } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { MBDarkBg, MBHero, MBEndCard, useMBCount, MB_BLUE, MB_INK, MB_MUT, MB_CARD, MB_LINE, MB_BG, WHITE } from './mbdark';
import timing from './timings/mb01.json';

const T = timing as Timing;
const DELAY = 0.7;
export const MB01_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  faculdade: DELAY + 1.42,
  linhas: DELAY + 5.38,
  cima: DELAY + 8.09,
  curso: DELAY + 10.38,
  pdf: DELAY + 11.78,
  pasta: DELAY + 13.39,
  no: DELAY + 16.39,
  drive: DELAY + 18.1,
  sobe1: DELAY + 22.79,
  sobe2: DELAY + 25.5,
  sobe3: DELAY + 28.56,
  nuvem: DELAY + 29.9,
  meses: DELAY + 32.36,
  chegam: DELAY + 34.51,
  embolada: DELAY + 36.45,
  inteira: DELAY + 38.08,
  n530: DELAY + 38.79,
  acervo: DELAY + 40.83,
  dif: DELAY + 43.53,
  caminho: DELAY + 45.87,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  hook: [0, B.linhas + 0.4] as Range,
  linhas: [B.linhas + 0.4, B.n530 - 0.3] as Range,
  numeros: [B.n530 - 0.3, B.dif - 0.4] as Range,
  hero: [B.dif - 0.4, B.end + 1.0] as Range,
};

const T0 = B.linhas + 0.3;
const T1 = B.chegam + 0.9;
const prog = (t: number) => {
  const raw = clamp01((t - T0) / (T1 - T0));
  const cut = (B.meses - T0) / (T1 - T0);
  if (raw <= cut) return (raw / cut) * 0.78;
  return 0.78 + ((raw - cut) / (1 - cut)) * 0.22;
};

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
      const u = (s - k) / w;
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

const Tag: React.FC<{ t: number; at: number; x: number; y: number; text: string; blue?: boolean; gray?: boolean }> =
({ t, at, x, y, text, blue, gray }) => {
  const o = interpolate(t, [at, at + 0.35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute', left: x, top: y, opacity: o,
      transform: `translateY(${(1 - o) * 14}px)`,
      background: MB_CARD, border: `2px solid ${blue ? MB_BLUE : MB_LINE}`,
      borderRadius: 12, padding: '8px 14px',
      boxShadow: '0 10px 28px -10px rgba(0,0,0,0.6)',
      fontFamily: HEAD, fontWeight: 700, fontSize: 22,
      color: blue ? MB_BLUE : gray ? MB_MUT : MB_INK, whiteSpace: 'nowrap',
    }}>{text}</div>
  );
};

export const MB01_Linhas: React.FC = () => {
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
  const cursos = useMBCount(530, Math.round(B.n530 * FPS), 30);
  const numOp = sceneOpacity(t, SC.numeros);
  const pillO = interpolate(t, [B.acervo, B.acervo + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <MBDarkBg />

      {/* hook */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.hook, true) }}>
        <div style={{ position: 'absolute', left: 50, right: 50, top: 520, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 84, color: MB_INK, letterSpacing: -2.5 }}>
            dois <span style={{ color: MB_BLUE }}>estudantes.</span>
          </div>
          <div style={{
            fontFamily: BODY, fontSize: 30, color: MB_MUT, marginTop: 20,
            opacity: interpolate(t, [B.faculdade, B.faculdade + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            mesma faculdade. mesmas 16 horas por semana.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 60, marginTop: 90 }}>
            {[MB_MUT, MB_BLUE].map((c, i) => (
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
          <polyline points={toPts(topPoint, p)} fill="none" stroke={MB_MUT} strokeWidth={4.5}
            strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
          <polyline points={toPts(botPoint, p)} fill="none" stroke={MB_BLUE} strokeWidth={5.5}
            strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 5px 14px rgba(59,130,246,0.45))' }} />
          {p > 0.002 && p < 0.998 && (
            <>
              <circle cx={txEnd} cy={tyEnd} r={8} fill={MB_MUT} />
              <circle cx={bxEnd} cy={byEnd} r={9} fill={MB_BLUE} />
            </>
          )}
          <g opacity={flagOp}>
            <rect x={962} y={790} width={104} height={150} rx={18} fill={MB_BLUE} />
            <text x={1014} y={872} textAnchor="middle" fontFamily={HEAD} fontWeight={900} fontSize={26} fill={WHITE}
              transform="rotate(-90 1014 866)">PROVA</text>
          </g>
        </svg>

        <Tag t={t} at={B.cima + 0.3} x={70} y={520} text="material garimpado" gray />
        <Tag t={t} at={B.drive + 0.4} x={70} y={1290} text="Drive MedBrasil" blue />
        <Tag t={t} at={B.curso} x={230} y={615} text="um curso comprado aqui" gray />
        <Tag t={t} at={B.pdf} x={455} y={840} text="um PDF solto ali" gray />
        <Tag t={t} at={B.pasta} x={620} y={560} text="a pasta sumiu" gray />
        <Tag t={t} at={B.no + 0.2} x={330} y={745} text="🪢 nó" gray />
        <Tag t={t} at={B.sobe1} x={310} y={1195} text="melhores plataformas — 1 acesso ↑" blue />
        <Tag t={t} at={B.sobe2} x={470} y={1130} text="+9.000 livros traduzidos ↑" blue />
        <Tag t={t} at={B.sobe3} x={600} y={1063} text="atualizações garantidas ↑" blue />
        <Tag t={t} at={B.nuvem + 0.3} x={560} y={1310} text="☁️ na nuvem — sem pesar no celular" blue />

        <div style={{ position: 'absolute', left: 0, right: 0, top: 340, textAlign: 'center', opacity: skipOp }}>
          <div style={{
            display: 'inline-block', background: MB_INK, color: MB_BG, borderRadius: 999,
            padding: '12px 30px', fontFamily: HEAD, fontWeight: 800, fontSize: 28,
            boxShadow: '0 16px 44px -12px rgba(0,0,0,0.6)',
          }}>
            6 meses depois ⏩
          </div>
        </div>

        <Tag t={t} at={B.embolada} x={640} y={620} text="chega embolada" gray />
        <Tag t={t} at={B.inteira} x={640} y={960} text="chega inteira" blue />
      </div>

      {/* números */}
      <div style={{ position: 'absolute', inset: 0, opacity: numOp }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 170, color: MB_INK, letterSpacing: -6, lineHeight: 1 }}>
            {cursos}<span style={{ color: MB_BLUE }}>+</span>
          </div>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 35, color: MB_MUT, marginTop: 6 }}>cursos completos</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 66, opacity: pillO }}>
            <div style={{
              background: MB_BLUE, borderRadius: 999, padding: '16px 40px',
              boxShadow: '0 18px 50px -12px rgba(59,130,246,0.55)',
              fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: WHITE,
            }}>
              o maior acervo médico da América Latina
            </div>
          </div>
        </div>
      </div>

      <MBHero t={t} range={SC.hero} line1="a diferença nunca foi o esforço." line2="foi o caminho."
        size={62} blueAfterSec={B.caminho - SC.hero[0]} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={MB_BLUE} />
      <MBEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/mb01.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
