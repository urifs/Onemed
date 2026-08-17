import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md14.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, M_MUT, M_RED, WHITE } from './meduf';
import {
  AppShell, Cartao, Consenso, Linha, Seguranca, FimClaro, surge, win, outB,
  AZUL_SOFT, AMBAR, AMBAR_BG, VERM_BG,
} from './medufui';

/* ============================================================
   MDV14 — ANÁLISE DE EXAMES LABORATORIAIS em uso
   Demo real: o painel inteiro colado, valores fora marcados,
   interpretação no contexto e próximos exames sugeridos.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MDV14_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

type Exame = [string, string, string, 'ok' | 'alto' | 'baixo', number];

const EXAMES: Exame[] = [
  ['Potássio', '6,1', 'mEq/L', 'alto', DELAY + 2.46],
  ['Creatinina', '2,4', 'mg/dL', 'alto', DELAY + 4.3],
  ['Hemoglobina', '9,8', 'g/dL', 'baixo', DELAY + 6.15],
  ['Sódio', '138', 'mEq/L', 'ok', DELAY + 7.0],
  ['Ureia', '98', 'mg/dL', 'alto', DELAY + 7.2],
  ['Leucócitos', '8.400', '/mm³', 'ok', DELAY + 7.4],
];

export const MDV14_Laboratorio: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const interpAt = DELAY + 8.4;
  const proxAt = DELAY + 11.6;
  const statAt = DELAY + 13.9;

  return (
    <AbsoluteFill>
      <AppShell ferramenta="Análise de Exames Laboratoriais">
        <div style={{ padding: '40px 44px 0' }}>
          {/* painel colado */}
          <Cartao style={surge(t, DELAY + 0.1)}>
            <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 24, color: M_MUT, marginBottom: 18, letterSpacing: '0.06em' }}>
              PAINEL COLADO · 20 RESULTADOS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {EXAMES.map(([nome, valor, un, status, at]) => {
                if (t < at) return null;
                const cor = status === 'ok' ? 'rgba(14,27,51,0.10)' : status === 'alto' ? M_RED : AMBAR;
                const bg = status === 'ok' ? '#f6f8fc' : status === 'alto' ? VERM_BG : AMBAR_BG;
                return (
                  <div key={nome} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: bg, border: `2px solid ${cor}`, borderRadius: 14,
                    padding: '16px 22px', ...surge(t, at, 0.3),
                  }}>
                    <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 27, color: M_NAVY }}>{nome}</span>
                    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, color: status === 'ok' ? M_NAVY : (status === 'alto' ? M_RED : AMBAR) }}>
                      {valor} <span style={{ fontSize: 20, color: M_MUT }}>{un}</span>
                      {status !== 'ok' && <span style={{ marginLeft: 8 }}>{status === 'alto' ? '↑' : '↓'}</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </Cartao>

          {/* interpretação no contexto */}
          {t >= interpAt && (
            <Cartao style={{ marginTop: 24, ...surge(t, interpAt) }}>
              <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 30, color: M_NAVY, marginBottom: 16 }}>
                Interpretação no contexto
              </div>
              <Linha t={t} at={interpAt + 0.2} cor={M_RED}>
                hipercalemia com disfunção renal — padrão compatível com lesão renal aguda
              </Linha>
              <Linha t={t} at={interpAt + 1.2} cor={AMBAR}>
                anemia associada: investigar no mesmo contexto
              </Linha>
              {t >= proxAt && (
                <>
                  <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 28, color: M_NAVY, margin: '20px 0 12px', ...surge(t, proxAt) }}>
                    Próximos exames sugeridos
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {['gasometria', 'ECG (hipercalemia)', 'USG de rins e vias'].map((s, i) => t >= proxAt + i * 0.3 && (
                      <span key={s} style={{
                        fontFamily: HEAD, fontWeight: 800, fontSize: 26, color: M_BLUE,
                        background: AZUL_SOFT, borderRadius: 999, padding: '12px 24px',
                        ...surge(t, proxAt + i * 0.3, 0.25),
                      }}>{s}</span>
                    ))}
                  </div>
                </>
              )}
            </Cartao>
          )}

          {/* leitura clara + consenso */}
          {t >= statAt && (
            <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 26, ...surge(t, statAt) }}>
              <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: M_NAVY }}>
                20 resultados → <span style={{ color: M_BLUE }}>uma leitura clara</span>
              </div>
            </div>
          )}
          {t >= DELAY + 17.4 && (
            <div style={{ marginTop: 20 }}>
              <Consenso t={t} at={DELAY + 17.4} escala={0.86}
                doneAts={[DELAY + 18.0, DELAY + 18.3, DELAY + 18.6]}
                consensoAt={DELAY + 18.9} />
            </div>
          )}
        </div>
        <Seguranca />
      </AppShell>

      <FimClaro t={t} at={DELAY + 20.3}
        frase="o laboratório inteiro, interpretado no contexto"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md14.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
