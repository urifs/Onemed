import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md23.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, M_MUT, M_RED, M_GREEN, WHITE } from './meduf';
import {
  MobileShell, Dedo, CameraRig, Cartao, Refs, FimClaro, surge, win, outB, flashAt,
  AZUL_SOFT, VERM_BG, VERDE_BG,
} from './medufui';

/* ============================================================
   MDX23 — A PRESCRIÇÃO PASSA NA MEDUF (celular, dentro do app)
   Chips de medicamento entrando por toque, ALERTA descendo
   como notificação com tremida, folha de mecanismo subindo,
   e o Cálculo de Doses fechando com verde.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MDX23_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

export const MDX23_Prescricao: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const meds: Array<[string, number]> = [
    ['Varfarina 5 mg', DELAY + 2.9],
    ['Amiodarona 200 mg', DELAY + 3.55],
    ['Ibuprofeno 600 mg', DELAY + 4.15],
  ];
  const alertaAt = DELAY + 5.55;
  const folhaAt = DELAY + 8.8;
  const pFolha = t < folhaAt ? 0 : outB(win(t, folhaAt, folhaAt + 0.5));
  const doseAt = DELAY + 11.3;
  const verdeAt = DELAY + 13.6;
  const seloAt = DELAY + 15.2;
  const fimAt = DELAY + 17.6;

  /* tremida do alerta */
  const shake = t >= alertaAt && t < alertaAt + 0.45
    ? Math.sin((t - alertaAt) * 70) * 9 * (1 - win(t, alertaAt, alertaAt + 0.45))
    : 0;
  const pAlerta = t < alertaAt ? 0 : outB(win(t, alertaAt, alertaAt + 0.4));

  return (
    <AbsoluteFill style={{ background: '#0e1b33' }}>
      <CameraRig t={t} kf={[
        [0, 1.0, 0, 0],
        [alertaAt, 1.0, 0, 0],
        [alertaAt + 0.5, 1.05, 0, -10],
        [folhaAt, 1.04, 0, -10],
        [doseAt, 1.0, 0, 0],
        [verdeAt + 0.3, 1.1, 0, -120],
        [fimAt, 1.0, 0, 0],
      ]}>
        <AbsoluteFill style={{ transform: `translateX(${shake}px)` }}>
          <MobileShell ferramenta={t < doseAt ? 'Interação Medicamentosa' : 'Cálculo de Doses'} voltar hora="14:22">
            <div style={{ padding: '26px 40px' }}>
              {/* prescrição em análise */}
              {t < doseAt && (
                <>
                  <Cartao style={{ padding: '26px 30px' }}>
                    <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 22, color: M_MUT, marginBottom: 16, letterSpacing: '0.06em' }}>
                      PRESCRIÇÃO EM ANÁLISE
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {meds.map(([nome, at]) => t >= at && (
                        <div key={nome} style={{
                          display: 'flex', alignItems: 'center', gap: 16,
                          ...surge(t, at, 0.3),
                        }}>
                          <span style={{
                            width: 46, height: 46, borderRadius: 13, background: AZUL_SOFT, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: M_BLUE, fontFamily: HEAD, fontWeight: 900, fontSize: 24,
                          }}>+</span>
                          <span style={{
                            fontFamily: HEAD, fontWeight: 800, fontSize: 32, color: M_NAVY,
                            background: '#f2f6fd', border: '2px solid rgba(21,96,232,0.2)',
                            borderRadius: 999, padding: '14px 28px',
                          }}>{nome}</span>
                        </div>
                      ))}
                    </div>
                  </Cartao>

                  {/* folha de mecanismo sobe como sheet */}
                  <div style={{
                    position: 'absolute', left: 24, right: 24, top: 560,
                    transform: `translateY(${(1 - pFolha) * 900}px)`,
                    background: WHITE, borderRadius: '28px 28px 0 0',
                    boxShadow: '0 -24px 70px rgba(14,27,51,0.25)', padding: '26px 34px 40px',
                    minHeight: 700,
                  }}>
                    <div style={{ width: 90, height: 8, borderRadius: 4, background: 'rgba(14,27,51,0.15)', margin: '0 auto 24px' }} />
                    <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 32, color: M_NAVY, marginBottom: 18 }}>
                      por que é grave?
                    </div>
                    {[['mecanismo', 'a amiodarona inibe o metabolismo da varfarina (CYP2C9) — o efeito anticoagulante dispara', folhaAt + 0.2], ['o que fazer', 'reduzir a dose e monitorar INR em 3 a 5 dias', folhaAt + 1.2], ['e o AINE', 'risco adicional de sangramento digestivo — reavaliar a escolha', folhaAt + 2.0]].map(([r, s, at]) => t >= (at as number) && (
                      <div key={r as string} style={{ marginBottom: 18, ...surge(t, at as number, 0.35) }}>
                        <span style={{
                          fontFamily: HEAD, fontWeight: 800, fontSize: 22, color: M_BLUE,
                          background: AZUL_SOFT, borderRadius: 999, padding: '6px 18px',
                        }}>{r as string}</span>
                        <div style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 28, color: M_NAVY, lineHeight: 1.45, marginTop: 10 }}>
                          {s as string}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* cálculo de doses */}
              {t >= doseAt && (
                <>
                  <Cartao style={{ padding: '26px 30px', ...surge(t, doseAt + 0.2) }}>
                    <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 22, color: M_MUT, marginBottom: 18, letterSpacing: '0.06em' }}>
                      AJUSTE PELA FUNÇÃO RENAL
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {[['peso', '72 kg', doseAt + 0.4], ['idade', '68', doseAt + 0.7], ['ClCr', '44 mL/min', doseAt + 1.0]].map(([r, v, at]) => t >= (at as number) && (
                        <div key={r as string} style={{
                          background: '#f4f7fc', border: '1.5px solid rgba(14,27,51,0.1)',
                          borderRadius: 16, padding: '18px 26px', ...surge(t, at as number, 0.3),
                        }}>
                          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 22, color: M_MUT }}>{r as string}</div>
                          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: M_NAVY }}>{v as string}</div>
                        </div>
                      ))}
                    </div>
                  </Cartao>
                  {t >= verdeAt && (
                    <div style={{
                      marginTop: 22, background: VERDE_BG, border: `3px solid ${M_GREEN}`,
                      borderRadius: 20, padding: '28px 32px', ...surge(t, verdeAt, 0.4),
                    }}>
                      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 34, color: '#065f46' }}>
                        ✓ dose ajustada — referência junto
                      </div>
                      <div style={{ marginTop: 14 }}>
                        <Refs t={t} at={verdeAt + 0.4} itens={['RENAME', 'guia farmacológico']} />
                      </div>
                    </div>
                  )}
                  {t >= seloAt && (
                    <div style={{
                      marginTop: 26, textAlign: 'center', ...surge(t, seloAt),
                    }}>
                      <span style={{
                        fontFamily: HEAD, fontWeight: 900, fontSize: 38, color: M_NAVY,
                      }}>
                        30 segundos que <span style={{ color: M_BLUE }}>protegem seu paciente.</span>
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ALERTA desce como notificação */}
            {t >= alertaAt && t < doseAt && (
              <div style={{
                position: 'absolute', left: 24, right: 24, top: 8,
                transform: `translateY(${(pAlerta - 1) * 200}px)`,
                background: VERM_BG, border: `3px solid ${M_RED}`, borderRadius: 22,
                padding: '24px 30px', boxShadow: '0 24px 60px rgba(224,36,36,0.3)', zIndex: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{
                    width: 52, height: 52, borderRadius: 15, background: M_RED, color: WHITE, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: HEAD, fontWeight: 900, fontSize: 30,
                  }}>!</span>
                  <div>
                    <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 30, color: M_RED }}>
                      Interação GRAVE
                    </div>
                    <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 25, color: M_NAVY, marginTop: 4 }}>
                      varfarina + amiodarona — efeito anticoagulante potencializado
                    </div>
                  </div>
                </div>
              </div>
            )}
          </MobileShell>
          <Dedo t={t} taps={[[meds[0][1], 700, 620], [meds[1][1], 730, 750], [meds[2][1], 700, 880], [doseAt - 0.2, 540, 1500]]} />
        </AbsoluteFill>
      </CameraRig>

      <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, doseAt) * 0.6, pointerEvents: 'none' }} />

      <FimClaro t={t} at={fimAt}
        frase="a prescrição conferida antes de sair da tela"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md23.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
