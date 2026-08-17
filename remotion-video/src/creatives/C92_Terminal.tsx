import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/c92.json';

/* ============================================================
   C92 — TERMINAL
   Estilo: console de computador. Comandos digitados com cursor,
   resultados imprimindo linha a linha, scanlines de CRT.
   Monoespaçada, verde sobre quase-preto.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const C92_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

const BG = '#0b120e';
const CHROME = '#16211b';
const GREEN = '#4ade80';
const DIM = '#8aa896';
const TXT = '#d9e5dd';
const REDL = '#ff6b5f';
const MONO = "'Courier New', 'JetBrains Mono', monospace";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/* linha do terminal: type = digitada (com velocidade), out = impressa de uma vez */
type Linha = {
  at: number; kind: 'cmd' | 'out' | 'ok' | 'gap';
  text?: string; hi?: string; dur?: number;
};

const LINHAS: Linha[] = [
  { at: DELAY + 0.1, kind: 'cmd', text: 'onemed buscar --tudo', dur: 1.5 },
  { at: DELAY + 2.14, kind: 'cmd', text: 'comando: "extensivo"', dur: 0.8 },
  { at: DELAY + 4.64, kind: 'ok', text: 'encontrados:' },
  { at: DELAY + 5.74, kind: 'out', text: '  Estratégia MED', hi: '  ─ 14.142 aulas' },
  { at: DELAY + 10.28, kind: 'out', text: '  MEDCurso', hi: '  ─ completo' },
  { at: DELAY + 13.13, kind: 'out', text: '  Medcof' },
  { at: DELAY + 14.71, kind: 'out', text: '  MedCel' },
  { at: DELAY + 16.43, kind: 'out', text: '  MedGrupo' },
  { at: DELAY + 18.04, kind: 'out', text: '  Sanarflix' },
  { at: DELAY + 19.84, kind: 'cmd', text: 'comando: "questões"', dur: 0.8 },
  { at: DELAY + 22.21, kind: 'ok', text: '31.612 comentadas' },
  { at: DELAY + 25.74, kind: 'ok', text: '+56.000 no Banco MED' },
  { at: DELAY + 27.98, kind: 'cmd', text: 'comando: "livros"', dur: 0.7 },
  { at: DELAY + 30.06, kind: 'ok', text: '+9.000 encontrados' },
  { at: DELAY + 32.73, kind: 'cmd', text: 'resumo --sistema', dur: 0.6 },
  { at: DELAY + 34.1, kind: 'out', text: '  cursos ............ ', hi: '+530' },
  { at: DELAY + 36.29, kind: 'out', text: '  logins necessários  ', hi: '1' },
  { at: DELAY + 38.03, kind: 'cmd', text: 'executar teste-gratis', dur: 1.1 },
];

const Digitada: React.FC<{ t: number; l: Linha }> = ({ t, l }) => {
  const texto = l.text ?? '';
  const p = win(t, l.at, l.at + (l.dur ?? 0.8));
  const n = Math.ceil(p * texto.length);
  return (
    <div style={{ color: TXT }}>
      <span style={{ color: GREEN }}>$ </span>
      {texto.slice(0, n)}
    </div>
  );
};

export const C92_Terminal: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const blink = Math.floor(frame / 14) % 2 === 0;
  const boxAt = DELAY + 39.9;
  const urlAt = DELAY + 40.9;

  const visiveis = LINHAS.filter(l => t >= l.at);
  const ultima = visiveis[visiveis.length - 1];

  return (
    <AbsoluteFill style={{ background: '#060a08', padding: 36 }}>
      {/* janela do terminal */}
      <AbsoluteFill style={{
        margin: 36, borderRadius: 18, background: BG, overflow: 'hidden',
        border: '2px solid #1e2c24', boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
        position: 'relative',
      }}>
        {/* barra de título */}
        <div style={{
          height: 74, background: CHROME, display: 'flex', alignItems: 'center',
          padding: '0 30px', gap: 14, borderBottom: '2px solid #1e2c24',
        }}>
          {['#ff5f56', '#ffbd2e', '#27c93f'].map(c => (
            <div key={c} style={{ width: 22, height: 22, borderRadius: 11, background: c }} />
          ))}
          <div style={{ flex: 1, textAlign: 'center', fontFamily: MONO, fontSize: 26, color: DIM }}>
            onemed — terminal
          </div>
        </div>

        {/* corpo */}
        <div style={{
          padding: '44px 48px', fontFamily: MONO, fontSize: 35, lineHeight: 1.72,
          textShadow: '0 0 12px rgba(74,222,128,0.25)',
        }}>
          {LINHAS.map((l, i) => {
            if (t < l.at) return null;
            if (l.kind === 'cmd') return <Digitada key={i} t={t} l={l} />;
            if (l.kind === 'ok') return (
              <div key={i} style={{ color: GREEN }}>
                <span>✔ </span><span style={{ color: TXT }}>{l.text}</span>
              </div>
            );
            return (
              <div key={i} style={{ color: DIM, whiteSpace: 'pre' }}>
                {l.text}
                {l.hi && t >= l.at + 0.25 && <span style={{ color: GREEN }}>{l.hi}</span>}
              </div>
            );
          })}

          {/* caixa final */}
          {t >= boxAt && (
            <div style={{
              marginTop: 30, border: `3px double ${GREEN}`, padding: '26px 34px',
              color: GREEN, width: 'fit-content',
              boxShadow: '0 0 30px rgba(74,222,128,0.25), inset 0 0 24px rgba(74,222,128,0.08)',
            }}>
              <div style={{ fontSize: 40 }}>TESTE GRÁTIS LIBERADO</div>
              {t >= urlAt && (
                <div style={{ fontSize: 44, color: TXT, marginTop: 14 }}>
                  → onemedcursos.com.br
                </div>
              )}
            </div>
          )}

          {/* cursor */}
          {blink && (
            <span style={{
              display: 'inline-block', width: 20, height: 40, background: GREEN,
              verticalAlign: 'middle', marginLeft: 6,
              opacity: ultima && ultima.kind === 'cmd' ? 1 : 0.85,
            }} />
          )}
        </div>

        {/* scanlines + fósforo do CRT */}
        <AbsoluteFill style={{
          pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0 2px, transparent 2px 5px)',
        }} />
        <AbsoluteFill style={{
          pointerEvents: 'none',
          background: 'radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(4,10,7,0.55) 100%)',
        }} />
      </AbsoluteFill>

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/c92.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
