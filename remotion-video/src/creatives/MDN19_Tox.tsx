import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md19.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, M_MUT, M_RED, M_GREEN, WHITE } from './meduf';
import {
  LaptopShell, TelaApp, Cursor, Cartao, Refs, FimClaro, surge, win, outB, AZUL_SOFT, VERM_BG,
} from './medufui';

/* ============================================================
   MDN19 — GUIA TOXICOLÓGICO, O RELÓGIO CORRE
   Cena: intoxicação aguda. A faixa vermelha pulsa, o notebook
   devolve o protocolo passo a passo com checkboxes marcando.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MDN19_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

const PASSOS: Array<[string, number]> = [
  ['ABC + monitorização contínua', DELAY + 10.6],
  ['ECG seriado — alargamento de QRS?', DELAY + 11.6],
  ['descontaminação: avaliar janela e via aérea', DELAY + 12.6],
  ['nível sérico seriado', DELAY + 13.4],
  ['medidas avançadas: quando considerar', DELAY + 14.0],
];

export const MDN19_Tox: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const laptopAt = DELAY + 4.9;
  const pLap = t < laptopAt ? 0 : outB(win(t, laptopAt, laptopAt + 0.7));
  const pulso = 0.6 + 0.4 * Math.abs(Math.sin(frame * 0.16));

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #f5f6f9, #eef0f6)' }}>
      {/* faixa de urgência */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 116,
        background: `rgba(224,36,36,${0.92 * pulso})`, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 60px', zIndex: 3,
      }}>
        <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 38, color: WHITE, letterSpacing: '0.04em' }}>
          INTOXICAÇÃO AGUDA
        </span>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: WHITE }}>
          há 2h da ingestão
        </span>
      </div>

      <div style={{ position: 'absolute', top: 180, left: 70, right: 70, ...surge(t, DELAY + 0.1) }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: M_NAVY, lineHeight: 1.25 }}>
          carbamazepina. quantidade incerta.<br />
          <span style={{ color: M_RED }}>o relógio corre.</span>
        </div>
      </div>

      {t >= laptopAt && (
        <div style={{
          position: 'absolute', left: 40, top: 470, opacity: pLap,
          transform: `translateY(${(1 - pLap) * 50}px)`,
        }}>
          <LaptopShell width={1000}>
            <TelaApp ferramenta="Guia Toxicológico"
              extra={<span style={{ fontFamily: MONO, fontSize: 24, color: M_RED }}>● prioridade</span>}>
              <div style={{ display: 'flex', gap: 30 }}>
                <div style={{ width: 620 }}>
                  <Cartao style={{ padding: '24px 28px' }}>
                    <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 21, color: M_MUT, marginBottom: 14, letterSpacing: '0.06em' }}>
                      AGENTE E CONTEXTO
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[['carbamazepina', DELAY + 5.3], ['ingestão há 2 horas', DELAY + 5.8], ['quantidade incerta', DELAY + 6.3]].map(([s, at]) => t >= (at as number) && (
                        <span key={s as string} style={{
                          fontFamily: HEAD, fontWeight: 800, fontSize: 28, color: M_NAVY,
                          background: VERM_BG, border: `2px solid ${M_RED}`,
                          borderRadius: 999, padding: '13px 24px', width: 'fit-content',
                          ...surge(t, at as number, 0.3),
                        }}>{s as string}</span>
                      ))}
                    </div>
                  </Cartao>
                  {t >= DELAY + 7.2 && (
                    <Cartao style={{ marginTop: 18, padding: '22px 26px', ...surge(t, DELAY + 7.2) }}>
                      {[['dose tóxica', 'faixa e gravidade esperada', DELAY + 7.4], ['quadro esperado', 'neurológico · cardíaco · tempo', DELAY + 8.4]].map(([a, b, at]) => t >= (at as number) && (
                        <div key={a as string} style={{ marginBottom: 12, ...surge(t, at as number, 0.3) }}>
                          <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 26, color: M_NAVY }}>{a as string}</span>
                          <span style={{ fontFamily: HEAD, fontSize: 24, color: M_MUT, marginLeft: 14 }}>{b as string}</span>
                        </div>
                      ))}
                    </Cartao>
                  )}
                </div>
                <div style={{ width: 780 }}>
                  {t >= DELAY + 9.8 && (
                    <Cartao style={{ padding: '24px 28px', ...surge(t, DELAY + 9.8) }}>
                      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 27, color: M_NAVY, marginBottom: 16 }}>
                        Conduta passo a passo
                      </div>
                      {PASSOS.map(([s, at], i) => {
                        const marcado = t >= at;
                        if (t < at - 0.4 && i > 0) return null;
                        return (
                          <div key={s} style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 13, opacity: t >= at - 0.4 ? 1 : 0 }}>
                            <span style={{
                              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                              border: `3px solid ${marcado ? M_GREEN : 'rgba(14,27,51,0.2)'}`,
                              background: marcado ? M_GREEN : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: WHITE, fontFamily: HEAD, fontWeight: 900, fontSize: 20,
                              transform: marcado && t < at + 0.2 ? 'scale(1.2)' : 'scale(1)',
                            }}>{marcado ? '✓' : ''}</span>
                            <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 26, color: M_NAVY }}>{s}</span>
                          </div>
                        );
                      })}
                      <div style={{ marginTop: 12 }}>
                        <Refs t={t} at={DELAY + 15.3} itens={['tudo com referência', 'em segundos']} />
                      </div>
                    </Cartao>
                  )}
                </div>
              </div>
              <Cursor t={t}
                path={[[DELAY + 5.2, 300, 300], [DELAY + 9.9, 820, 240], [DELAY + 14.2, 900, 620]]}
                clicks={[DELAY + 9.95]} />
            </TelaApp>
          </LaptopShell>
        </div>
      )}

      {t >= DELAY + 17.3 && t < DELAY + 20.4 && (
        <div style={{
          position: 'absolute', top: 320, left: 70, right: 70,
          fontFamily: HEAD, fontWeight: 900, fontSize: 48, color: M_NAVY, lineHeight: 1.3,
          ...surge(t, DELAY + 17.3),
        }}>
          na intoxicação, quem responde rápido,<br />
          <span style={{ color: M_RED }}>responde melhor.</span>
        </div>
      )}

      <FimClaro t={t} at={DELAY + 20.4}
        frase="o protocolo certo, na hora em que importa"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md19.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
