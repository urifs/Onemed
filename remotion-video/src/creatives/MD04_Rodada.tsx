import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md04.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, M_GREEN, WHITE } from './meduf';

/* ============================================================
   MD04 — RODADA (MEDUF)
   Estilo: caso-relâmpago. Carta do caso batendo na mesa,
   alternativas em pílulas, a certa acende, e a MEDUF explica
   o porquê de todas. Ritmo acelerado, listras diagonais.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MD04_DURATION = Math.round((DELAY + T.duration + 2.9) * FPS);

const FUNDO = '#eaf1ff';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const outB = (p: number) => 1 - Math.pow(1 - p, 3);
const slam = (t: number, at: number) => {
  const p = outB(win(t, at, at + 0.22));
  return { opacity: p, transform: `scale(${1.18 - 0.18 * p})` };
};

export const MD04_Rodada: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const revelaAt = DELAY + 5.9;      /* pneumotórax acende */
  const painelAt = DELAY + 7.6;
  const chipsAt = DELAY + 11.4;
  const fimAt = DELAY + 14.6;
  const pFim = t < fimAt ? 0 : outB(win(t, fimAt, fimAt + 0.5));

  const opcoes = [
    { s: 'Crise de asma', certa: false },
    { s: 'Pneumotórax espontâneo', certa: true },
    { s: 'Tromboembolismo pulmonar', certa: false },
  ];

  return (
    <AbsoluteFill style={{ background: FUNDO }}>
      {/* listras diagonais correndo devagar */}
      <AbsoluteFill style={{
        backgroundImage: `repeating-linear-gradient(-35deg, rgba(21,96,232,0.06) 0 60px, transparent 60px 150px)`,
        backgroundPosition: `${-frame * 1.2}px 0`,
      }} />

      {/* carimbo de abertura */}
      <div style={{
        position: 'absolute', top: 150, left: 0, right: 0, display: 'flex', justifyContent: 'center',
        ...slam(t, DELAY + 0.1),
      }}>
        <div style={{
          background: M_BLUE, color: WHITE, fontFamily: HEAD, fontWeight: 900, fontSize: 62,
          padding: '22px 46px', borderRadius: 18, transform: 'rotate(-2deg)',
          boxShadow: '0 22px 60px rgba(21,96,232,0.4)', letterSpacing: '0.02em',
        }}>
          CASO RÁPIDO
        </div>
      </div>

      {/* carta do caso */}
      <div style={{
        position: 'absolute', left: 70, right: 70, top: 320,
        background: WHITE, borderRadius: 24, borderLeft: `14px solid ${M_BLUE}`,
        padding: '40px 44px', boxShadow: '0 26px 70px rgba(14,27,51,0.18)',
        ...slam(t, DELAY + 1.0),
      }}>
        <div style={{ fontFamily: MONO, fontSize: 28, color: 'rgba(14,27,51,0.55)', marginBottom: 14 }}>
          PS · sala de emergência
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 52, color: M_NAVY, lineHeight: 1.25 }}>
          23 anos · dispneia súbita depois do treino
        </div>
      </div>

      {/* pergunta + alternativas */}
      {t >= DELAY + 4.4 && (
        <div style={{ position: 'absolute', left: 70, right: 70, top: 660 }}>
          <div style={{
            fontFamily: HEAD, fontWeight: 900, fontSize: 44, color: M_NAVY, marginBottom: 26,
            opacity: outB(win(t, DELAY + 4.4, DELAY + 4.7)),
          }}>
            primeira hipótese?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {opcoes.map((o, i) => {
              const at = DELAY + 4.7 + i * 0.22;
              if (t < at) return null;
              const acesa = o.certa && t >= revelaAt;
              const apagada = !o.certa && t >= revelaAt;
              return (
                <div key={i} style={{
                  background: acesa ? M_GREEN : WHITE,
                  border: `3px solid ${acesa ? M_GREEN : 'rgba(14,27,51,0.15)'}`,
                  borderRadius: 999, padding: '24px 36px',
                  fontFamily: HEAD, fontWeight: 800, fontSize: 38,
                  color: acesa ? WHITE : M_NAVY,
                  opacity: apagada ? 0.35 : outB(win(t, at, at + 0.25)),
                  boxShadow: acesa ? '0 16px 46px rgba(14,159,110,0.4)' : '0 10px 30px rgba(14,27,51,0.10)',
                  display: 'flex', alignItems: 'center', gap: 20,
                }}>
                  <span style={{
                    width: 44, height: 44, borderRadius: 22, flexShrink: 0,
                    border: `3px solid ${acesa ? WHITE : 'rgba(14,27,51,0.3)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, color: acesa ? WHITE : 'rgba(14,27,51,0.5)',
                  }}>{acesa ? '✓' : String.fromCharCode(65 + i)}</span>
                  {o.s}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* painel de explicação */}
      {t >= painelAt && (
        <div style={{
          position: 'absolute', left: 70, right: 70, top: 1180,
          background: M_NAVY, borderRadius: 24, padding: '36px 40px',
          boxShadow: '0 26px 80px rgba(14,27,51,0.4)',
          opacity: outB(win(t, painelAt, painelAt + 0.4)),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 15,
              background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: HEAD, fontWeight: 900, fontSize: 28, color: WHITE,
            }}>M</div>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 34, color: WHITE }}>
              MEDUF explica
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              fontFamily: HEAD, fontWeight: 700, fontSize: 32, color: WHITE,
              display: 'flex', gap: 16, alignItems: 'center',
            }}>
              <span style={{ color: '#37e39b', fontSize: 38 }}>✓</span> o porquê da certa
            </div>
            {t >= DELAY + 9.6 && (
              <div style={{
                fontFamily: HEAD, fontWeight: 700, fontSize: 32, color: WHITE,
                display: 'flex', gap: 16, alignItems: 'center',
                opacity: outB(win(t, DELAY + 9.6, DELAY + 9.9)),
              }}>
                <span style={{ color: '#ff7b70', fontSize: 38 }}>✗</span> e o porquê das erradas também
              </div>
            )}
          </div>
        </div>
      )}

      {/* chips de fechamento */}
      {t >= chipsAt && (
        <div style={{
          position: 'absolute', left: 70, right: 70, bottom: 120,
          display: 'flex', gap: 14, flexWrap: 'wrap',
        }}>
          {['casos ilimitados', 'correção na hora', 'sem hora marcada'].map((s, i) => t >= chipsAt + i * 0.7 && (
            <span key={s} style={{
              fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: M_NAVY,
              background: WHITE, border: `3px solid ${M_BLUE}`, borderRadius: 999,
              padding: '14px 26px', opacity: outB(win(t, chipsAt + i * 0.7, chipsAt + i * 0.7 + 0.3)),
              boxShadow: '0 12px 32px rgba(21,96,232,0.18)',
            }}>{s}</span>
          ))}
        </div>
      )}

      {/* encerramento */}
      <AbsoluteFill style={{
        background: M_NAVY, opacity: pFim, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 30,
      }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 92, color: WHITE }}>
          treina <span style={{ color: '#6ea8ff' }}>agora.</span>
        </div>
        <div style={{
          width: 120, height: 120, borderRadius: 34,
          background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: HEAD, fontWeight: 900, fontSize: 60, color: WHITE,
          boxShadow: '0 24px 70px rgba(21,96,232,0.5)',
        }}>M</div>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 64, color: WHITE }}>
          meduf<span style={{ color: '#6ea8ff' }}>.com.br</span>
        </div>
      </AbsoluteFill>

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md04.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
