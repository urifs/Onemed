import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md02.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, WHITE } from './meduf';

/* ============================================================
   MD02 — PRONTUÁRIO (MEDUF)
   Estilo: folha de evolução clínica sendo escrita à máquina,
   e a MEDUF respondendo ao lado com o diferencial ranqueado.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MD02_DURATION = Math.round((DELAY + T.duration + 2.8) * FPS);

const FUNDO = '#e9eef6';
const FOLHA = '#ffffff';
const LINHA = 'rgba(14,27,51,0.12)';
const TINTA = '#22314f';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const outB = (p: number) => 1 - Math.pow(1 - p, 3);

const Maquina: React.FC<{ t: number; at: number; dur: number; children: string; size?: number }> =
  ({ t, at, dur, children, size = 40 }) => {
    if (t < at) return null;
    const n = Math.ceil(win(t, at, at + dur) * children.length);
    return (
      <div style={{ fontFamily: MONO, fontSize: size, color: TINTA, lineHeight: 1.6 }}>
        {children.slice(0, n)}
        {n < children.length && <span style={{ color: M_BLUE }}>▌</span>}
      </div>
    );
  };

/* barra do diferencial: cresce até a fração, com etiqueta de prioridade */
const Dif: React.FC<{ t: number; at: number; rotulo: string; frac: number; tag: string }> =
  ({ t, at, rotulo, frac, tag }) => {
    if (t < at) return null;
    const p = outB(win(t, at, at + 0.7));
    return (
      <div style={{ marginBottom: 22, opacity: Math.min(1, p * 2) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 30, color: WHITE }}>{rotulo}</span>
          <span style={{
            fontFamily: HEAD, fontWeight: 800, fontSize: 22, color: '#9db9ee',
            border: '2px solid rgba(157,185,238,0.4)', borderRadius: 999, padding: '4px 14px',
          }}>{tag}</span>
        </div>
        <div style={{ height: 18, borderRadius: 9, background: 'rgba(255,255,255,0.12)' }}>
          <div style={{
            height: '100%', width: `${frac * 100 * p}%`, borderRadius: 9,
            background: `linear-gradient(90deg, ${M_BLUE}, #6ea8ff)`,
          }} />
        </div>
      </div>
    );
  };

export const MD02_Prontuario: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const painelAt = DELAY + 6.6;
  const pPainel = t < painelAt ? 0 : outB(win(t, painelAt, painelAt + 0.6));
  const faixaAt = DELAY + 13.1;
  const fimAt = DELAY + 18.0;
  const pFim = t < fimAt ? 0 : outB(win(t, fimAt, fimAt + 0.6));

  const chip = (at: number, texto: string) => t >= at && (
    <span style={{
      fontFamily: HEAD, fontWeight: 700, fontSize: 27, color: WHITE,
      border: `2px solid rgba(255,255,255,0.35)`, borderRadius: 999, padding: '10px 20px',
      opacity: outB(win(t, at, at + 0.35)),
    }}>{texto}</span>
  );

  return (
    <AbsoluteFill style={{ background: FUNDO }}>
      {/* folha de evolução */}
      <div style={{
        position: 'absolute', left: 50, right: 50, top: 70, bottom: 70, background: FOLHA,
        borderRadius: 10, boxShadow: '0 30px 80px rgba(14,27,51,0.18)', padding: '54px 58px',
        backgroundImage: `repeating-linear-gradient(0deg, transparent 0 63px, ${LINHA} 63px 65px)`,
        backgroundPosition: '0 210px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: M_NAVY, letterSpacing: '0.04em' }}>
            EVOLUÇÃO CLÍNICA
          </div>
          <div style={{ fontFamily: MONO, fontSize: 26, color: 'rgba(14,27,51,0.5)' }}>
            leito 07 · 08:40
          </div>
        </div>
        <div style={{ height: 3, background: M_NAVY, margin: '20px 0 40px' }} />

        <Maquina t={t} at={DELAY + 0.1} dur={1.6}>Paciente, 62 anos.</Maquina>
        <Maquina t={t} at={DELAY + 2.2} dur={2.1}>Dor torácica há 2 horas.</Maquina>
        <Maquina t={t} at={DELAY + 4.17} dur={1.0}>Sudorese.</Maquina>
      </div>

      {/* painel MEDUF por cima da folha */}
      <div style={{
        position: 'absolute', left: 50, right: 50, top: 560,
        transform: `translateX(${(1 - pPainel) * 1100}px)`,
        background: M_NAVY, borderRadius: 24, padding: '40px 44px',
        boxShadow: '0 30px 90px rgba(14,27,51,0.45)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 30 }}>
          <div style={{
            width: 58, height: 58, borderRadius: 16,
            background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: HEAD, fontWeight: 900, fontSize: 30, color: WHITE,
          }}>M</div>
          <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 36, color: WHITE }}>
            MEDUF <span style={{ color: '#6ea8ff' }}>pensa junto</span>
          </span>
        </div>

        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 28, color: '#9db9ee', marginBottom: 18, letterSpacing: '0.06em' }}>
          DIFERENCIAL RANQUEADO
        </div>
        <Dif t={t} at={DELAY + 8.0} rotulo="Síndrome coronariana aguda" frac={0.9} tag="alta" />
        <Dif t={t} at={DELAY + 8.5} rotulo="Dissecção de aorta" frac={0.52} tag="não descartar" />
        <Dif t={t} at={DELAY + 9.0} rotulo="Tromboembolismo pulmonar" frac={0.38} tag="considerar" />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 26 }}>
          {chip(DELAY + 9.6, 'o que perguntar na anamnese')}
          {chip(DELAY + 11.0, 'ECG em 10 min')}
          {chip(DELAY + 11.7, 'troponina seriada')}
        </div>
      </div>

      {/* faixa: do plantão à prova */}
      {t >= faixaAt && t < fimAt + 0.4 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 150,
          display: 'flex', justifyContent: 'center',
          opacity: outB(win(t, faixaAt, faixaAt + 0.5)),
        }}>
          <div style={{
            background: M_BLUE, color: WHITE, fontFamily: HEAD, fontWeight: 800, fontSize: 40,
            borderRadius: 999, padding: '22px 44px', boxShadow: '0 18px 50px rgba(21,96,232,0.45)',
          }}>
            do plantão à prova de residência
          </div>
        </div>
      )}

      {/* encerramento claro */}
      <AbsoluteFill style={{
        background: FUNDO, opacity: pFim, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 28,
      }}>
        <div style={{
          width: 140, height: 140, borderRadius: 40,
          background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: HEAD, fontWeight: 900, fontSize: 70, color: WHITE,
          boxShadow: '0 26px 70px rgba(21,96,232,0.45)',
        }}>M</div>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 64, color: M_NAVY, textAlign: 'center', lineHeight: 1.2 }}>
          a IA que estuda<br />medicina com você
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 52, color: M_BLUE }}>
          meduf.com.br
        </div>
        <div style={{ fontFamily: HEAD, fontSize: 26, color: 'rgba(14,27,51,0.5)' }}>
          apoio ao raciocínio clínico — a conduta é sempre do médico
        </div>
      </AbsoluteFill>

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md02.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
