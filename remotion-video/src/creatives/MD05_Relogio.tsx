import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md05.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, WHITE } from './meduf';

/* ============================================================
   MD05 — RELÓGIO (MEDUF)
   Estilo: um dia inteiro girando num relógio central. O céu
   muda de cor com a hora; em cada hora, uma cena; no fim, a
   noite — e a MEDUF acordada.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MD05_DURATION = Math.round((DELAY + T.duration + 2.8) * FPS);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const outB = (p: number) => 1 - Math.pow(1 - p, 3);
const smooth = (p: number) => p * p * (3 - 2 * p);

/* cenas do dia: hora → céu → texto */
const CENAS = [
  { at: DELAY + 0.1, hora: '06:00', ang: 180, ceu: ['#2b3f66', '#e8a06b'], rot: 'enfermaria', sub: 'prescrição pra revisar' },
  { at: DELAY + 4.25, hora: '12:00', ang: 360, ceu: ['#3f7fd4', '#bcd9f5'], rot: 'ambulatório', sub: 'um exame que não fecha' },
  { at: DELAY + 8.19, hora: '22:00', ang: 660, ceu: ['#101b36', '#2c3d66'], rot: 'em casa', sub: 'capítulo atrasado' },
  { at: DELAY + 11.14, hora: '03:00', ang: 810, ceu: ['#05070f', '#101b30'], rot: 'plantão', sub: 'o caso que não espera' },
];

export const MD05_Relogio: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  /* qual cena está ativa + interpolação do céu e do ponteiro */
  let idx = 0;
  for (let i = 0; i < CENAS.length; i++) if (t >= CENAS[i].at) idx = i;
  const cena = CENAS[idx];
  const prox = CENAS[idx + 1];
  const pTrans = prox ? smooth(win(t, prox.at - 0.7, prox.at)) : 0;
  const mix = (a: string, b: string, p: number) => {
    const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
    return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * p)).join(',')})`;
  };
  const ceuTopo = prox ? mix(cena.ceu[0], prox.ceu[0], pTrans) : cena.ceu[0];
  const ceuBase = prox ? mix(cena.ceu[1], prox.ceu[1], pTrans) : cena.ceu[1];
  const ang = prox ? cena.ang + (prox.ang - cena.ang) * pTrans : cena.ang;

  const perguntaAt = DELAY + 14.3;
  const dormeAt = DELAY + 18.5;
  const listaAt = DELAY + 20.5;
  const h24At = DELAY + 25.4;
  const fimAt = DELAY + 27.6;
  const pFim = t < fimAt ? 0 : outB(win(t, fimAt, fimAt + 0.6));
  const noite = t >= dormeAt;

  return (
    <AbsoluteFill style={{ background: ceuTopo }}>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${ceuTopo} 20%, ${ceuBase} 100%)` }} />

      {/* relógio central */}
      <div style={{
        position: 'absolute', left: '50%', top: 560, transform: 'translate(-50%,-50%)',
        opacity: t >= perguntaAt && t < fimAt ? 0.25 : 1,
      }}>
        <svg width={560} height={560} viewBox="0 0 560 560">
          <circle cx={280} cy={280} r={250} fill="rgba(255,255,255,0.07)"
            stroke="rgba(255,255,255,0.65)" strokeWidth={8} />
          {[...Array(12)].map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            return <line key={i}
              x1={280 + Math.sin(a) * 218} y1={280 - Math.cos(a) * 218}
              x2={280 + Math.sin(a) * 240} y2={280 - Math.cos(a) * 240}
              stroke="rgba(255,255,255,0.65)" strokeWidth={i % 3 === 0 ? 10 : 5} />;
          })}
          {/* ponteiro das horas */}
          <line x1={280} y1={280}
            x2={280 + Math.sin((ang * Math.PI) / 180) * 150}
            y2={280 - Math.cos((ang * Math.PI) / 180) * 150}
            stroke={WHITE} strokeWidth={16} strokeLinecap="round" />
          {/* ponteiro dos minutos gira rápido nas transições */}
          <line x1={280} y1={280}
            x2={280 + Math.sin((ang * 12 * Math.PI) / 180) * 205}
            y2={280 - Math.cos((ang * 12 * Math.PI) / 180) * 205}
            stroke="rgba(255,255,255,0.7)" strokeWidth={8} strokeLinecap="round" />
          <circle cx={280} cy={280} r={16} fill={WHITE} />
        </svg>
      </div>

      {/* hora + cena */}
      {t < perguntaAt && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 950, textAlign: 'center' }}>
          <div style={{ fontFamily: MONO, fontSize: 96, fontWeight: 700, color: WHITE, letterSpacing: '0.06em' }}>
            {cena.hora}
          </div>
          <div style={{
            fontFamily: HEAD, fontWeight: 900, fontSize: 66, color: WHITE, marginTop: 22,
            opacity: outB(win(t, cena.at + 0.15, cena.at + 0.5)),
          }}>
            {cena.rot}
          </div>
          <div style={{
            fontFamily: HEAD, fontWeight: 600, fontSize: 42, color: 'rgba(255,255,255,0.75)', marginTop: 12,
            opacity: outB(win(t, cena.at + 0.5, cena.at + 0.9)),
          }}>
            {cena.sub}
          </div>
        </div>
      )}

      {/* a pergunta do dia inteiro */}
      {t >= perguntaAt && t < dormeAt && (
        <div style={{
          position: 'absolute', left: 90, right: 90, top: 820,
          fontFamily: HEAD, fontWeight: 900, fontSize: 76, color: WHITE, lineHeight: 1.25,
          opacity: outB(win(t, perguntaAt, perguntaAt + 0.5)),
        }}>
          em todos esses horários, a mesma pergunta:
          <div style={{ color: '#8db6ff', marginTop: 20 }}>com quem discutir o caso?</div>
        </div>
      )}

      {/* a MEDUF não dorme */}
      {noite && t < fimAt && (
        <div style={{ position: 'absolute', left: 90, right: 90, top: 760 }}>
          <div style={{
            fontFamily: HEAD, fontWeight: 900, fontSize: 92, color: WHITE, lineHeight: 1.1,
            opacity: outB(win(t, dormeAt, dormeAt + 0.5)),
          }}>
            a MEDUF<br /><span style={{ color: '#6ea8ff' }}>não dorme.</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 44 }}>
            {['casos', 'eletro', 'laboratório', 'imagem', 'conduta'].map((s, i) => t >= listaAt + i * 0.85 && (
              <span key={s} style={{
                fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: WHITE,
                border: `3px solid ${M_BLUE}`, background: 'rgba(21,96,232,0.2)',
                borderRadius: 999, padding: '14px 28px',
                opacity: outB(win(t, listaAt + i * 0.85, listaAt + i * 0.85 + 0.3)),
              }}>{s}</span>
            ))}
          </div>
          {t >= h24At && (
            <div style={{
              fontFamily: HEAD, fontWeight: 900, fontSize: 110, color: WHITE, marginTop: 48,
              opacity: outB(win(t, h24At, h24At + 0.4)),
            }}>
              24h<span style={{ fontSize: 60, color: 'rgba(255,255,255,0.7)' }}> por dia</span>
            </div>
          )}
        </div>
      )}

      {/* encerramento */}
      <AbsoluteFill style={{
        background: '#05070f', opacity: pFim, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 30,
      }}>
        <div style={{
          width: 130, height: 130, borderRadius: 36,
          background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: HEAD, fontWeight: 900, fontSize: 66, color: WHITE,
          boxShadow: '0 24px 70px rgba(21,96,232,0.5)',
        }}>M</div>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 74, color: WHITE }}>
          meduf<span style={{ color: '#6ea8ff' }}>.com.br</span>
        </div>
        <div style={{ fontFamily: HEAD, fontSize: 34, color: 'rgba(255,255,255,0.6)' }}>
          24 horas por dia, todos os dias
        </div>
      </AbsoluteFill>

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md05.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
