import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md01.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, WHITE } from './meduf';

/* ============================================================
   MD01 — MONITOR (MEDUF)
   Estilo: monitor multiparamétrico de UTI às 3h da manhã.
   Traçado correndo, alarme no complexo estranho, e a MEDUF
   entrando como painel de discussão do caso.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MD01_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

const BG = '#04090d';
const GRID = 'rgba(53,240,160,0.07)';
const ECG = '#35f0a0';
const ALARME = '#ff5a4e';
const PAINEL = '#0b1a33';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const outB = (p: number) => 1 - Math.pow(1 - p, 3);

/* um batimento normal desenhado em path (largura 360) */
const BEAT = 'l30,0 l8,-14 l10,14 l14,0 l6,-90 l10,150 l8,-60 l24,0 l16,-22 l20,22 l214,0';
const ecgPath = () => {
  let d = 'M-360,0 ';
  for (let i = 0; i < 9; i++) d += BEAT + ' ';
  return d;
};

export const MD01_Monitor: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const alarmeAt = DELAY + 5.4;       /* "traçado que você não reconhece" */
  const alarmeFim = DELAY + 11.2;
  const emAlarme = t >= alarmeAt && t < alarmeFim;
  const blink = Math.floor(frame / 9) % 2 === 0;

  const painelAt = DELAY + 11.4;
  const pPainel = t < painelAt ? 0 : outB(win(t, painelAt, painelAt + 0.6));

  const fimAt = DELAY + 26.7;
  const pFim = t < fimAt ? 0 : outB(win(t, fimAt, fimAt + 0.6));

  /* o traçado corre e CONGELA no alarme */
  const speed = 300;
  const scrollT = Math.min(t, alarmeAt);
  const x = -((scrollT * speed) % 720);

  const chip = (at: number, texto: string) => t >= at && (
    <div style={{
      border: `2px solid ${M_BLUE}`, borderRadius: 12, padding: '16px 24px',
      fontFamily: HEAD, fontWeight: 700, fontSize: 34, color: WHITE,
      background: 'rgba(21,96,232,0.16)',
      opacity: outB(win(t, at, at + 0.35)),
    }}>{texto}</div>
  );

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* grade do monitor */}
      <AbsoluteFill style={{
        backgroundImage: `linear-gradient(0deg, ${GRID} 1px, transparent 1px), linear-gradient(90deg, ${GRID} 1px, transparent 1px)`,
        backgroundSize: '54px 54px',
      }} />

      {/* barra do leito */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 96,
        borderBottom: '2px solid rgba(53,240,160,0.25)', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', padding: '0 44px',
        fontFamily: MONO, fontSize: 30, color: 'rgba(53,240,160,0.8)',
      }}>
        <span>LEITO 07 · MONITORIZAÇÃO</span>
        <span style={{ color: emAlarme && blink ? ALARME : 'rgba(53,240,160,0.8)' }}>03:12</span>
      </div>

      {/* faixa do ECG */}
      <div style={{ position: 'absolute', top: 330, left: 0, right: 0, height: 300, overflow: 'hidden' }}>
        <svg width={2600} height={300} style={{ transform: `translateX(${x}px)` }}>
          <path d={ecgPath()} transform="translate(0,170)" fill="none"
            stroke={ECG} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        {/* complexo estranho: caixa de alarme piscando sobre o trecho congelado */}
        {emAlarme && (
          <div style={{
            position: 'absolute', left: 380, top: 20, width: 300, height: 250,
            border: `4px dashed ${blink ? ALARME : 'rgba(255,90,78,0.35)'}`, borderRadius: 14,
          }}>
            <div style={{
              position: 'absolute', top: -54, left: 0, fontFamily: MONO, fontSize: 38,
              color: blink ? ALARME : 'rgba(255,90,78,0.5)', fontWeight: 700,
            }}>?</div>
          </div>
        )}
      </div>

      {/* sinais vitais */}
      <div style={{
        position: 'absolute', top: 700, left: 44, right: 44, display: 'flex',
        justifyContent: 'space-between', alignItems: 'flex-end',
      }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 28, color: 'rgba(53,240,160,0.6)' }}>FC bpm</div>
          <div style={{
            fontFamily: MONO, fontSize: 150, fontWeight: 700, lineHeight: 1,
            color: emAlarme ? (blink ? ALARME : ECG) : ECG,
          }}>118</div>
        </div>
        <div style={{ textAlign: 'right', fontFamily: MONO, color: 'rgba(53,240,160,0.85)' }}>
          <div style={{ fontSize: 28, color: 'rgba(53,240,160,0.55)' }}>SpO2</div>
          <div style={{ fontSize: 74 }}>94%</div>
          <div style={{ fontSize: 28, color: 'rgba(53,240,160,0.55)', marginTop: 14 }}>PA</div>
          <div style={{ fontSize: 74 }}>128/84</div>
        </div>
      </div>

      {/* legenda da madrugada */}
      {t >= DELAY + 0.1 && t < painelAt && (
        <div style={{
          position: 'absolute', top: 150, left: 44, fontFamily: HEAD, fontWeight: 800,
          fontSize: 56, color: WHITE, opacity: outB(win(t, DELAY + 0.1, DELAY + 0.6)),
        }}>
          3h da manhã. Plantão.
        </div>
      )}
      {t >= DELAY + 7.9 && t < painelAt && (
        <div style={{
          position: 'absolute', top: 232, left: 44, fontFamily: HEAD, fontWeight: 600,
          fontSize: 40, color: 'rgba(255,255,255,0.7)', opacity: outB(win(t, DELAY + 7.9, DELAY + 8.4)),
        }}>
          ninguém acordado pra discutir o caso...
        </div>
      )}

      {/* painel MEDUF */}
      <div style={{
        position: 'absolute', left: 34, right: 34, bottom: 90,
        transform: `translateY(${(1 - pPainel) * 560}px)`, opacity: pPainel,
        background: PAINEL, border: `3px solid ${M_BLUE}`, borderRadius: 26,
        padding: '38px 40px', boxShadow: '0 -20px 80px rgba(21,96,232,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 26 }}>
          <div style={{
            width: 66, height: 66, borderRadius: 18,
            background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: HEAD, fontWeight: 900, fontSize: 34, color: WHITE,
          }}>M</div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 42, color: WHITE }}>
            MEDUF <span style={{ color: M_BLUE }}>AI</span>
          </div>
          <div style={{
            marginLeft: 'auto', fontFamily: MONO, fontSize: 26, color: '#35f0a0',
          }}>online</div>
        </div>
        <div style={{ fontFamily: HEAD, fontSize: 36, color: 'rgba(255,255,255,0.85)', marginBottom: 24 }}>
          descreve o paciente, cola o eletro — e discute:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {chip(DELAY + 18.3, 'hipóteses prováveis, ranqueadas')}
          {chip(DELAY + 19.5, 'o que pedir agora')}
          {chip(DELAY + 20.6, 'o que não pode passar despercebido')}
        </div>
        {t >= DELAY + 23.1 && (
          <div style={{
            marginTop: 28, fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: WHITE,
            opacity: outB(win(t, DELAY + 23.1, DELAY + 23.6)),
          }}>
            Em segundos. <span style={{ color: M_BLUE, opacity: t >= DELAY + 24.9 ? 1 : 0 }}>A qualquer hora.</span>
          </div>
        )}
      </div>

      {/* encerramento */}
      <AbsoluteFill style={{
        background: '#050b14', opacity: pFim, display: 'flex', flexDirection: 'column',
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
          meduf<span style={{ color: M_BLUE }}>.com.br</span>
        </div>
        <div style={{ fontFamily: HEAD, fontSize: 36, color: 'rgba(255,255,255,0.6)' }}>
          a madrugada ficou menos solitária
        </div>
      </AbsoluteFill>

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md01.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
