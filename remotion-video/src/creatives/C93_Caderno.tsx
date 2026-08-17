import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/c93.json';

/* ============================================================
   C93 — CADERNO
   Estilo: página de caderno pautado. Caneta azul, caneta
   vermelha, marca-texto amarelo, post-it. Tudo "escrito à mão"
   no ritmo da narração.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const C93_DURATION = Math.round((DELAY + T.duration + 2.8) * FPS);

const PAPEL = '#fbf7ec';
const PAUTA = '#bcd2e8';
const CANETA = '#2b3f66';
const VERMELHA = '#c8382b';
const MARCA = 'rgba(255,214,48,0.55)';
const MAO = "'Comic Sans MS', 'Segoe Print', 'Chilanka', cursive";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const outQ = (p: number) => 1 - (1 - p) * (1 - p);

/* escrita: revela da esquerda pra direita (clip), como caneta correndo */
const Escreve: React.FC<{
  t: number; at: number; dur?: number; size?: number; color?: string;
  rot?: number; children: React.ReactNode; style?: React.CSSProperties;
}> = ({ t, at, dur = 0.7, size = 46, color = CANETA, rot = 0, children, style }) => {
  if (t < at) return null;
  const p = outQ(win(t, at, at + dur));
  return (
    <div style={{
      fontFamily: MAO, fontSize: size, color, transform: `rotate(${rot}deg)`,
      clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`, whiteSpace: 'nowrap',
      ...style,
    }}>
      {children}
    </div>
  );
};

/* marca-texto passando por trás */
const Marca: React.FC<{ t: number; at: number; children: React.ReactNode }> =
  ({ t, at, children }) => {
    const p = t < at ? 0 : outQ(win(t, at, at + 0.5));
    return (
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <span style={{
          position: 'absolute', left: -8, right: -8, top: '12%', bottom: '6%',
          background: MARCA, transform: `scaleX(${p}) rotate(-0.6deg)`,
          transformOrigin: 'left center', borderRadius: 6,
        }} />
        <span style={{ position: 'relative' }}>{children}</span>
      </span>
    );
  };

/* risco vermelho por cima */
const Risco: React.FC<{ t: number; at: number }> = ({ t, at }) => {
  const p = t < at ? 0 : outQ(win(t, at, at + 0.45));
  return (
    <div style={{
      position: 'absolute', left: -6, right: -2, top: '52%', height: 5,
      background: VERMELHA, transform: `scaleX(${p}) rotate(-1.2deg)`,
      transformOrigin: 'left center', borderRadius: 3, opacity: 0.9,
    }} />
  );
};

const Checkbox: React.FC = () => (
  <span style={{
    display: 'inline-block', width: 34, height: 34, border: `3px solid ${CANETA}`,
    borderRadius: 6, marginRight: 20, verticalAlign: 'middle', transform: 'rotate(-1deg)',
  }} />
);

export const C93_Caderno: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const postitAt = DELAY + 27.6;
  const pPost = t < postitAt ? 0 : outQ(win(t, postitAt, postitAt + 0.5));
  const circAt = DELAY + 28.9;
  const pCirc = t < circAt ? 0 : win(t, circAt, circAt + 0.7);

  return (
    <AbsoluteFill style={{ background: PAPEL }}>
      {/* pauta do caderno + margem vermelha */}
      <AbsoluteFill style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent 0 54px, ${PAUTA} 54px 56px)`,
        backgroundPosition: '0 26px',
      }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 118, width: 3, background: '#e59a94' }} />
      {/* furos do fichário */}
      {[300, 900, 1500].map(y => (
        <div key={y} style={{
          position: 'absolute', left: 42, top: y, width: 34, height: 34, borderRadius: 17,
          background: '#eee7d8', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.18)',
        }} />
      ))}

      <div style={{ position: 'absolute', left: 160, right: 70, top: 120 }}>
        <Escreve t={t} at={DELAY + 0.1} size={64} color={VERMELHA} rot={-1}>
          Hoje:
        </Escreve>

        {/* a lista do dia */}
        <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Escreve t={t} at={DELAY + 2.44} size={46} rot={-0.5}>
            <Checkbox />revisar cárdio
          </Escreve>
          <Escreve t={t} at={DELAY + 3.37} size={46} rot={0.4}>
            <Checkbox />fazer questões
          </Escreve>
          <Escreve t={t} at={DELAY + 4.38} size={46} rot={-0.3}>
            <Checkbox />ler 2 capítulos
          </Escreve>
          <div style={{ position: 'relative', width: 'fit-content' }}>
            <Escreve t={t} at={DELAY + 5.81} size={46} rot={0.5}>
              <Checkbox />achar tempo pra tudo isso...
            </Escreve>
            <Risco t={t} at={DELAY + 7.9} />
          </div>
        </div>

        {/* num lugar só */}
        <Escreve t={t} at={DELAY + 9.53} size={54} color={VERMELHA} rot={-0.8}
          style={{ marginTop: 48 }}>
          num lugar só:
        </Escreve>
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Escreve t={t} at={DELAY + 10.93} size={48} rot={-0.4}>Estratégia MED</Escreve>
          <Escreve t={t} at={DELAY + 12.06} size={48} rot={0.3}>MEDCurso</Escreve>
          <Escreve t={t} at={DELAY + 13.11} size={48} rot={-0.2}>Medcof</Escreve>
          <Escreve t={t} at={DELAY + 13.86} size={52} rot={0.4} dur={0.9}>
            <Marca t={t} at={DELAY + 14.4}>e mais... +530 cursos!</Marca>
          </Escreve>
        </div>

        {/* marca-texto no que importa */}
        <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Escreve t={t} at={DELAY + 17.55} size={48} rot={-0.3}>
            <Marca t={t} at={DELAY + 17.9}>+9.000 livros</Marca>
          </Escreve>
          <Escreve t={t} at={DELAY + 19.18} size={48} rot={0.4}>
            <Marca t={t} at={DELAY + 19.6}>31 mil questões comentadas</Marca>
          </Escreve>
        </div>

        {/* quando cansar */}
        <Escreve t={t} at={DELAY + 21.33} size={44} color={VERMELHA} rot={-0.5}
          style={{ marginTop: 44 }}>
          quando cansar, a plataforma:
        </Escreve>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Escreve t={t} at={DELAY + 23.31} size={44} rot={0.3}>→ resume a aula</Escreve>
          <Escreve t={t} at={DELAY + 24.38} size={44} rot={-0.3}>→ monta teus flashcards</Escreve>
          <Escreve t={t} at={DELAY + 25.53} size={44} rot={0.4}>→ desenha teu cronograma</Escreve>
        </div>
      </div>

      {/* post-it com o site */}
      <div style={{
        position: 'absolute', right: 80, bottom: 130, width: 560, padding: '44px 40px 52px',
        background: '#ffe873', boxShadow: '0 18px 40px rgba(0,0,0,0.22)',
        transform: `rotate(-3deg) scale(${0.7 + 0.3 * pPost})`, opacity: pPost,
        transformOrigin: 'center bottom',
      }}>
        <div style={{ fontFamily: MAO, fontSize: 46, color: '#3a3323', textAlign: 'center' }}>
          onemedcursos<br />.com.br
        </div>
        <div style={{ fontFamily: MAO, fontSize: 38, color: VERMELHA, textAlign: 'center', marginTop: 14 }}>
          teste grátis!
        </div>
        {/* círculo de caneta vermelha desenhado por cima */}
        <svg viewBox="0 0 560 320" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <ellipse cx="280" cy="160" rx="240" ry="130" fill="none" stroke={VERMELHA} strokeWidth="7"
            strokeLinecap="round" strokeDasharray={1190}
            strokeDashoffset={1190 * (1 - pCirc)}
            transform="rotate(-4 280 160)" opacity={pCirc > 0 ? 0.9 : 0} />
        </svg>
      </div>

      {/* sombra de dobra no pé da página */}
      <AbsoluteFill style={{
        pointerEvents: 'none',
        background: 'radial-gradient(130% 100% at 50% 30%, transparent 70%, rgba(90,70,40,0.10) 100%)',
      }} />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/c93.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
