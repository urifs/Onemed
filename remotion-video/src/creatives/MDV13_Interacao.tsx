import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md13.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, M_MUT, M_GREEN, WHITE } from './meduf';
import {
  AppShell, Cartao, Alerta, Linha, Seguranca, FimClaro, surge, win, outB, AZUL_SOFT, VERDE_BG,
} from './medufui';

/* ============================================================
   MDV13 — INTERAÇÃO MEDICAMENTOSA + CÁLCULO DE DOSES em uso
   Demo real: três fármacos entram, o alerta grave aparece com
   mecanismo e conduta; depois a dose ajustada por peso e
   função renal.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MDV13_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

export const MDV13_Interacao: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const farmacos: Array<[string, number]> = [
    ['Varfarina 5 mg', DELAY + 0.15],
    ['Amiodarona 200 mg', DELAY + 1.1],
    ['Ibuprofeno 600 mg', DELAY + 2.3],
  ];
  const alertaAt = DELAY + 6.3;
  const dosesAt = DELAY + 11.2;

  return (
    <AbsoluteFill>
      <AppShell ferramenta="Interação Medicamentosa">
        <div style={{ padding: '40px 44px 0' }}>
          {/* prescrição em análise */}
          <Cartao style={surge(t, DELAY + 0.1)}>
            <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 24, color: M_MUT, marginBottom: 18, letterSpacing: '0.06em' }}>
              PRESCRIÇÃO EM ANÁLISE
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {farmacos.map(([nome, at]) => t >= at && (
                <span key={nome} style={{
                  fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: M_NAVY,
                  background: AZUL_SOFT, border: '2px solid rgba(21,96,232,0.25)',
                  borderRadius: 999, padding: '16px 28px', ...surge(t, at, 0.3),
                }}>{nome}</span>
              ))}
            </div>
          </Cartao>

          {/* alerta grave */}
          {t >= alertaAt && (
            <div style={{ marginTop: 26 }}>
              <Alerta t={t} at={alertaAt} grave titulo="Interação GRAVE detectada">
                varfarina + amiodarona — potencialização do efeito anticoagulante
              </Alerta>
              <Cartao style={{ marginTop: 20, ...surge(t, DELAY + 8.4) }}>
                <Linha t={t} at={DELAY + 8.5} cor={M_BLUE}>
                  mecanismo: inibição do metabolismo hepático da varfarina (CYP2C9)
                </Linha>
                <Linha t={t} at={DELAY + 9.6} cor={M_BLUE}>
                  o que fazer: reduzir dose, monitorar INR em 3 a 5 dias
                </Linha>
                <Linha t={t} at={DELAY + 10.3} cor={M_BLUE}>
                  atenção também ao AINE: risco adicional de sangramento digestivo
                </Linha>
              </Cartao>
            </div>
          )}

          {/* cálculo de doses */}
          {t >= dosesAt && (
            <Cartao style={{ marginTop: 26, ...surge(t, dosesAt) }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <span style={{
                  fontFamily: HEAD, fontWeight: 800, fontSize: 24, color: M_BLUE,
                  background: AZUL_SOFT, borderRadius: 999, padding: '10px 22px',
                }}>Cálculo de Doses</span>
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
                {[['peso', '72 kg', DELAY + 13.5], ['idade', '68 anos', DELAY + 14.15], ['ClCr', '44 mL/min', DELAY + 14.9]].map(([r, v, at]) => t >= (at as number) && (
                  <div key={r as string} style={{
                    background: '#f4f7fc', border: '1.5px solid rgba(14,27,51,0.1)',
                    borderRadius: 14, padding: '14px 22px', ...surge(t, at as number, 0.3),
                  }}>
                    <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 22, color: M_MUT, marginRight: 12 }}>{r as string}</span>
                    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, color: M_NAVY }}>{v as string}</span>
                  </div>
                ))}
              </div>
              {t >= DELAY + 15.6 && (
                <div style={{
                  background: VERDE_BG, border: `2.5px solid ${M_GREEN}`, borderRadius: 16,
                  padding: '22px 28px', ...surge(t, DELAY + 15.6, 0.4),
                }}>
                  <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 29, color: '#065f46' }}>
                    dose ajustada para a função renal — com a referência junto
                  </span>
                </div>
              )}
            </Cartao>
          )}

          {/* fecho */}
          {t >= DELAY + 16.9 && t < DELAY + 21.3 && (
            <div style={{
              marginTop: 28, fontFamily: HEAD, fontWeight: 900, fontSize: 42, color: M_NAVY,
              ...surge(t, DELAY + 16.9),
            }}>
              menos risco na prescrição.{' '}
              {t >= DELAY + 19.2 && <span style={{ color: M_BLUE }}>mais segurança pro paciente.</span>}
            </div>
          )}
        </div>
        <Seguranca />
      </AppShell>

      <FimClaro t={t} at={DELAY + 21.3}
        frase="prescreva com as interações e doses conferidas"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md13.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
