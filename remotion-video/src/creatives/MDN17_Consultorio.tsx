import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md17.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, M_MUT, M_RED, WHITE } from './meduf';
import {
  LaptopShell, TelaApp, Cursor, Cartao, Linha, Refs, FimClaro, surge, win, outB,
  AZUL_SOFT, AMBAR, AMBAR_BG, VERM_BG,
} from './medufui';

/* ============================================================
   MDN17 — CONSULTÓRIO, 15 MINUTOS
   Cena: a sacola de exames vira dados na tela. O notebook roda
   a Análise de Exames Laboratoriais durante a consulta.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MDN17_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

export const MDN17_Consultorio: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const laptopAt = DELAY + 4.4;
  const pLap = t < laptopAt ? 0 : outB(win(t, laptopAt, laptopAt + 0.7));
  const flagsAt = DELAY + 6.6;
  const interpAt = DELAY + 8.9;
  const sugereAt = DELAY + 12.3;

  /* os papéis da sacola voando pra dentro do notebook */
  const papel = (i: number) => {
    const at = DELAY + 0.4 + i * 0.35;
    const fim = laptopAt + 0.5;
    const p = t < at ? 0 : Math.min(1, win(t, at, at + 0.5));
    const voo = t < laptopAt ? 0 : outB(win(t, laptopAt, fim));
    return {
      opacity: p * (1 - voo),
      transform: `translate(${voo * (240 - i * 60)}px, ${voo * 420}px) rotate(${(i - 1) * 7 * (1 - voo)}deg) scale(${1 - voo * 0.5})`,
    };
  };

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #f5f7fb, #e9eef7)' }}>
      {/* luz de janela */}
      <AbsoluteFill style={{
        background: 'linear-gradient(115deg, rgba(255,244,214,0.5) 0%, transparent 45%)',
      }} />

      <div style={{ position: 'absolute', top: 100, left: 70, right: 70, display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...surge(t, DELAY + 0.1) }}>
        <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: M_NAVY }}>consultório</span>
        <span style={{
          fontFamily: MONO, fontSize: 30, color: M_NAVY, background: WHITE,
          borderRadius: 999, padding: '12px 26px', border: '1.5px solid rgba(14,27,51,0.1)',
        }}>consulta: 15 min</span>
      </div>

      {/* a sacola de exames (papéis empilhados) */}
      <div style={{ position: 'absolute', top: 230, left: 90 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', left: i * 34, top: i * 20, width: 340, height: 200,
            background: WHITE, borderRadius: 10, border: '1.5px solid rgba(14,27,51,0.12)',
            boxShadow: '0 16px 40px rgba(14,27,51,0.12)', padding: '18px 20px',
            ...papel(i),
          }}>
            <div style={{ fontFamily: MONO, fontSize: 17, color: M_MUT, marginBottom: 10 }}>LABORATÓRIO · {i + 1}/3</div>
            {[0, 1, 2, 3].map(l => (
              <div key={l} style={{ height: 9, borderRadius: 5, background: 'rgba(14,27,51,0.10)', marginBottom: 9, width: `${88 - l * 14}%` }} />
            ))}
          </div>
        ))}
        {t >= DELAY + 0.9 && t < laptopAt && (
          <div style={{ position: 'absolute', left: 430, top: 70, fontFamily: HEAD, fontWeight: 700, fontSize: 34, color: M_MUT, ...surge(t, DELAY + 0.9) }}>
            ← a sacola de exames
          </div>
        )}
      </div>

      {/* notebook com a ferramenta */}
      {t >= laptopAt && (
        <div style={{
          position: 'absolute', left: 40, top: 500, opacity: pLap,
          transform: `translateY(${(1 - pLap) * 50}px)`,
        }}>
          <LaptopShell width={1000}>
            <TelaApp ferramenta="Análise de Exames Laboratoriais"
              extra={<span style={{ fontFamily: MONO, fontSize: 24, color: M_MUT }}>⏱ 12:30 restantes</span>}>
              <div style={{ display: 'flex', gap: 30 }}>
                <div style={{ width: 640 }}>
                  <Cartao style={{ padding: '24px 28px' }}>
                    <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 21, color: M_MUT, marginBottom: 14, letterSpacing: '0.06em' }}>
                      COLADO DA SACOLA · 20 RESULTADOS
                    </div>
                    {([['Glicemia jejum', '182', 'alto', flagsAt], ['HbA1c', '9,1%', 'alto', flagsAt + 0.3], ['LDL', '176', 'alto', flagsAt + 0.6], ['TSH', '2,1', 'ok', flagsAt + 0.8], ['Creatinina', '1,1', 'ok', flagsAt + 0.9]] as const).map(([nome, v, st, at]) => t >= at && (
                      <div key={nome} style={{
                        display: 'flex', justifyContent: 'space-between',
                        background: st === 'ok' ? '#f6f8fc' : VERM_BG,
                        border: `2px solid ${st === 'ok' ? 'rgba(14,27,51,0.08)' : M_RED}`,
                        borderRadius: 12, padding: '12px 18px', marginBottom: 10,
                        ...surge(t, at, 0.3),
                      }}>
                        <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 25, color: M_NAVY }}>{nome}</span>
                        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 25, color: st === 'ok' ? M_NAVY : M_RED }}>
                          {v}{st !== 'ok' && ' ↑'}
                        </span>
                      </div>
                    ))}
                  </Cartao>
                </div>
                <div style={{ width: 760 }}>
                  {t >= interpAt && (
                    <Cartao style={{ padding: '24px 28px', ...surge(t, interpAt) }}>
                      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 26, color: M_NAVY, marginBottom: 12 }}>
                        Interpretação no contexto
                      </div>
                      <Linha t={t} at={interpAt + 0.2} cor={M_RED}>controle glicêmico inadequado + dislipidemia</Linha>
                      <Linha t={t} at={interpAt + 1.0} cor={AMBAR}>risco cardiovascular: reclassificar hoje</Linha>
                    </Cartao>
                  )}
                  {t >= sugereAt && (
                    <Cartao style={{ padding: '24px 28px', marginTop: 18, ...surge(t, sugereAt) }}>
                      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 26, color: M_NAVY, marginBottom: 12 }}>
                        Próximos exames — com o porquê
                      </div>
                      {[['albuminúria', 'rastrear dano renal do diabetes', sugereAt + 0.2], ['fundo de olho', 'retinopatia: rastreio anual', sugereAt + 0.9], ['ECG de repouso', 'estratificação de risco', sugereAt + 1.6]].map(([e, pq, at]) => t >= (at as number) && (
                        <div key={e as string} style={{ display: 'flex', gap: 12, marginBottom: 10, ...surge(t, at as number, 0.3) }}>
                          <span style={{
                            fontFamily: HEAD, fontWeight: 800, fontSize: 24, color: M_BLUE,
                            background: AZUL_SOFT, borderRadius: 999, padding: '8px 18px', whiteSpace: 'nowrap',
                          }}>{e as string}</span>
                          <span style={{ fontFamily: HEAD, fontSize: 23, color: M_MUT, alignSelf: 'center' }}>{pq as string}</span>
                        </div>
                      ))}
                    </Cartao>
                  )}
                </div>
              </div>
              <Cursor t={t}
                path={[[flagsAt - 0.4, 320, 400], [interpAt - 0.3, 800, 260], [sugereAt - 0.2, 850, 520], [DELAY + 15.5, 1150, 600]]}
                clicks={[interpAt - 0.15, sugereAt - 0.05]} />
            </TelaApp>
          </LaptopShell>
        </div>
      )}

      {/* fecho narrativo */}
      {t >= DELAY + 15.6 && t < DELAY + 19.3 && (
        <div style={{
          position: 'absolute', top: 300, left: 70, right: 70,
          fontFamily: HEAD, fontWeight: 800, fontSize: 46, color: M_NAVY, lineHeight: 1.35,
          ...surge(t, DELAY + 15.6),
        }}>
          o paciente ainda está na sala...<br />
          <span style={{ color: M_BLUE }}>e a conduta já está desenhada.</span>
        </div>
      )}

      <FimClaro t={t} at={DELAY + 19.3}
        frase="a consulta rende mais quando a análise chega junto"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md17.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
