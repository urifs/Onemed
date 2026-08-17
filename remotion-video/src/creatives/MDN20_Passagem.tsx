import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md20.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, M_MUT, M_GREEN, WHITE } from './meduf';
import {
  LaptopShell, TelaApp, Cursor, Cartao, Refs, FimClaro, surge, win, outB, AZUL_SOFT, AMBAR, AMBAR_BG,
} from './medufui';

/* ============================================================
   MDN20 — 07:00, PASSAGEM DE PLANTÃO
   Cena: amanhecer. As anotações soltas do plantão viram
   anamnese estruturada; a Análise de Prontuário aponta as
   pendências antes da passagem.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MDN20_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

const SECOES: Array<[string, string, number]> = [
  ['ID', 'M, 71 anos, hipertenso', DELAY + 9.1],
  ['QP', 'dispneia há 2 dias', DELAY + 9.7],
  ['HDA', 'piora progressiva, ortopneia...', DELAY + 10.3],
  ['Antecedentes', 'HAS · FA · IC prévia', DELAY + 10.9],
  ['Exame físico', 'crepitações em bases...', DELAY + 11.5],
  ['Hipóteses', 'IC descompensada — perfil B', DELAY + 12.1],
];

export const MDN20_Passagem: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const laptopAt = DELAY + 3.6;
  const pLap = t < laptopAt ? 0 : outB(win(t, laptopAt, laptopAt + 0.7));
  const prontAt = DELAY + 13.2;

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #fdf3e3 0%, #eef1f8 45%)' }}>
      {/* sol nascendo */}
      <div style={{
        position: 'absolute', left: '50%', top: 60, transform: 'translateX(-50%)',
        width: 300, height: 300, borderRadius: 150,
        background: 'radial-gradient(circle, rgba(255,190,90,0.5), transparent 70%)',
      }} />

      <div style={{ position: 'absolute', top: 110, left: 70, right: 70, display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...surge(t, DELAY + 0.1) }}>
        <span style={{ fontFamily: MONO, fontSize: 66, fontWeight: 700, color: M_NAVY }}>07:00</span>
        <span style={{
          fontFamily: HEAD, fontWeight: 700, fontSize: 32, color: M_NAVY, background: WHITE,
          borderRadius: 999, padding: '12px 28px', border: '1.5px solid rgba(14,27,51,0.1)',
        }}>passagem de plantão</span>
      </div>

      {t >= DELAY + 3.0 && t < DELAY + 5.6 && (
        <div style={{
          position: 'absolute', top: 240, left: 70,
          fontFamily: HEAD, fontWeight: 800, fontSize: 44, color: M_MUT,
          ...surge(t, DELAY + 3.0),
        }}>
          sobrou a papelada...
        </div>
      )}

      {t >= laptopAt && (
        <div style={{
          position: 'absolute', left: 40, top: 420, opacity: pLap,
          transform: `translateY(${(1 - pLap) * 50}px)`,
        }}>
          <LaptopShell width={1000}>
            <TelaApp ferramenta="Estruturação de Anamnese"
              extra={<span style={{ fontFamily: MONO, fontSize: 24, color: M_MUT }}>turno: noite</span>}>
              <div style={{ display: 'flex', gap: 30 }}>
                {/* anotações soltas */}
                <div style={{ width: 560 }}>
                  <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 22, color: M_MUT, marginBottom: 14, letterSpacing: '0.06em' }}>
                    SUAS ANOTAÇÕES
                  </div>
                  {[['"dispneia 2d, piora deitado"', -1.5, DELAY + 6.0], ['"HAS, FA... usa furosemida?"', 1.2, DELAY + 6.5], ['"crepita base D>E, edema 2+/4"', -0.8, DELAY + 7.0]].map(([s, rot, at]) => t >= (at as number) && (
                    <div key={s as string} style={{
                      background: '#fff9db', border: '1.5px solid rgba(180,150,40,0.35)',
                      borderRadius: 8, padding: '18px 22px', marginBottom: 14,
                      transform: `rotate(${rot}deg)`,
                      fontFamily: MONO, fontSize: 24, color: '#5a4d1f',
                      boxShadow: '0 10px 24px rgba(120,90,20,0.12)',
                      ...surge(t, at as number, 0.3),
                    }}>{s as string}</div>
                  ))}
                  {t >= DELAY + 7.8 && (
                    <div style={{ textAlign: 'center', fontSize: 46, color: M_BLUE, ...surge(t, DELAY + 7.8, 0.3) }}>→</div>
                  )}
                </div>
                {/* anamnese estruturada */}
                <div style={{ width: 840 }}>
                  <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 22, color: M_MUT, marginBottom: 14, letterSpacing: '0.06em' }}>
                    ANAMNESE ESTRUTURADA
                  </div>
                  <Cartao style={{ padding: '20px 26px' }}>
                    {SECOES.map(([sec, txt, at]) => t >= at && (
                      <div key={sec} style={{
                        display: 'flex', gap: 14, alignItems: 'baseline', marginBottom: 11,
                        ...surge(t, at, 0.3),
                      }}>
                        <span style={{
                          fontFamily: HEAD, fontWeight: 900, fontSize: 22, color: M_BLUE,
                          background: AZUL_SOFT, borderRadius: 8, padding: '5px 14px', minWidth: 150,
                          textAlign: 'center',
                        }}>{sec}</span>
                        <span style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 25, color: M_NAVY }}>{txt}</span>
                      </div>
                    ))}
                  </Cartao>
                  {/* análise de prontuário */}
                  {t >= prontAt && (
                    <div style={{ marginTop: 18, ...surge(t, prontAt) }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                        <span style={{
                          fontFamily: HEAD, fontWeight: 800, fontSize: 23, color: M_BLUE,
                          background: AZUL_SOFT, borderRadius: 999, padding: '9px 20px',
                        }}>Análise de Prontuário</span>
                      </div>
                      {[['pendente: controle de eletrólitos pós-diurético', DELAY + 15.6], ['atenção na passagem: reavaliar padrão respiratório', DELAY + 17.0]].map(([s, at]) => t >= (at as number) && (
                        <div key={s as string} style={{
                          background: AMBAR_BG, border: `2px solid ${AMBAR}`, borderRadius: 12,
                          padding: '14px 20px', marginBottom: 10,
                          fontFamily: HEAD, fontWeight: 700, fontSize: 24, color: '#6b4a08',
                          ...surge(t, at as number, 0.3),
                        }}>⚑ {s as string}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Cursor t={t}
                path={[[DELAY + 6.2, 300, 300], [DELAY + 8.6, 750, 260], [prontAt, 800, 620], [DELAY + 17.4, 1150, 660]]}
                clicks={[DELAY + 8.7, prontAt + 0.1]} />
            </TelaApp>
          </LaptopShell>
        </div>
      )}

      {t >= DELAY + 20.2 && t < DELAY + 23.5 && (
        <div style={{
          position: 'absolute', top: 260, left: 70, right: 70,
          fontFamily: HEAD, fontWeight: 900, fontSize: 50, color: M_NAVY, lineHeight: 1.3,
          ...surge(t, DELAY + 20.2),
        }}>
          você entrega o plantão.<br />
          <span style={{ color: M_BLUE }}>e o prontuário, impecável.</span>
        </div>
      )}

      <FimClaro t={t} at={DELAY + 23.5}
        frase="a papelada do plantão, resolvida em minutos"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md20.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
