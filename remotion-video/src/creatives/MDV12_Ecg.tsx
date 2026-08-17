import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md12.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, M_MUT, WHITE } from './meduf';
import {
  AppShell, Cartao, Consenso, Linha, Refs, Alerta, Seguranca, FimClaro, surge, win, outB, AZUL_SOFT,
} from './medufui';

/* ============================================================
   MDV12 — ANÁLISE DE ECG em uso
   Demo real: o traçado entra na ferramenta, a análise devolve
   ritmo/FC/intervalos e o achado que pede atenção.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MDV12_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

/* traçado irregular (FA): RR variável */
const FA_PATH =
  'M0,80 l60,0 l8,-10 l10,10 l12,0 l6,-64 l8,104 l6,-40 l88,0 l8,-10 l10,10 l12,0 l6,-64 l8,104 l6,-40 l52,0 l8,-10 l10,10 l12,0 l6,-64 l8,104 l6,-40 l120,0 l8,-10 l10,10 l12,0 l6,-64 l8,104 l6,-40 l70,0 l8,-10 l10,10 l12,0 l6,-64 l8,104 l6,-40 l100,0';

export const MDV12_Ecg: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const uploadAt = DELAY + 0.6;
  const analiseAt = DELAY + 2.0;
  const len = 1600;
  const desenho = len * (1 - outB(win(t, uploadAt + 0.4, uploadAt + 2.2)));

  return (
    <AbsoluteFill>
      <AppShell ferramenta="Análise de ECG">
        <div style={{ padding: '40px 44px 0' }}>
          {/* o traçado enviado */}
          <Cartao style={surge(t, uploadAt)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 24, color: M_MUT, letterSpacing: '0.06em' }}>
                TRAÇADO ENVIADO · DII longo
              </span>
              <span style={{ fontFamily: MONO, fontSize: 22, color: M_MUT }}>25 mm/s</span>
            </div>
            <div style={{
              background: '#fdf6f4', borderRadius: 14, border: '1.5px solid rgba(224,36,36,0.15)',
              overflow: 'hidden', height: 190,
              backgroundImage: 'linear-gradient(rgba(224,36,36,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(224,36,36,0.08) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}>
              <svg width={980} height={190} viewBox="0 0 980 170">
                <path d={FA_PATH} fill="none" stroke="#c2382e" strokeWidth={3.5}
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray={len} strokeDashoffset={desenho} transform="translate(0,10)" />
              </svg>
            </div>
          </Cartao>

          {/* análise em tempo real */}
          {t >= analiseAt && (
            <Cartao style={{ marginTop: 26, ...surge(t, analiseAt + 1.4) }}>
              <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 30, color: M_NAVY, marginBottom: 20 }}>
                Análise
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
                {[['ritmo', 'irregularmente irregular', DELAY + 5.06], ['FC', '~142 bpm', DELAY + 5.53], ['intervalos', 'RR variável · sem onda P', DELAY + 6.16]].map(([r, v, at]) => t >= (at as number) && (
                  <div key={r as string} style={{
                    background: AZUL_SOFT, borderRadius: 14, padding: '16px 22px',
                    ...surge(t, at as number, 0.3),
                  }}>
                    <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 21, color: M_MUT }}>{r as string}</div>
                    <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: M_NAVY }}>{v as string}</div>
                  </div>
                ))}
              </div>
              <Alerta t={t} at={DELAY + 7.0} titulo="Achado que pede atenção">
                padrão compatível com fibrilação atrial de alta resposta — correlacionar com clínica e estabilidade
              </Alerta>
              {t >= DELAY + 9.3 && (
                <div style={{ marginTop: 20 }}>
                  <Refs t={t} at={DELAY + 9.3} itens={['cada conclusão explicada', 'base científica citada']} />
                </div>
              )}
            </Cartao>
          )}

          {/* as 4 frentes de imagem */}
          {t >= DELAY + 13.6 && (
            <div style={{ marginTop: 28, ...surge(t, DELAY + 13.6) }}>
              <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: M_NAVY, marginBottom: 16 }}>
                na mesma plataforma:
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {[['Análise de ECG', DELAY + 14.24], ['Análise de Radiografias', DELAY + 14.92], ['TC, RM e Ultrassom', DELAY + 15.85], ['Sugestão de Exames', DELAY + 16.64]].map(([s, at]) => t >= (at as number) && (
                  <span key={s as string} style={{
                    fontFamily: HEAD, fontWeight: 800, fontSize: 28, color: WHITE,
                    background: M_BLUE, borderRadius: 999, padding: '14px 26px',
                    ...surge(t, at as number, 0.3),
                  }}>{s as string}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        <Seguranca />
      </AppShell>

      <FimClaro t={t} at={DELAY + 19.6}
        frase="a conduta é sempre sua — a análise chega em segundos"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md12.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
