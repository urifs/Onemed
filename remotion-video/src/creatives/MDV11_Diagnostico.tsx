import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md11.json';
import { HEAD } from './theme';
import { M_BLUE, M_NAVY, M_MUT } from './meduf';
import {
  AppShell, Cartao, CampoDigitando, BotaoAnalisar, Consenso, Rank, Linha, Refs,
  Seguranca, FimClaro, surge, win, outB,
} from './medufui';

/* ============================================================
   MDV11 — DIAGNÓSTICO DETALHADO em uso
   Demo real: quadro clínico entra → 3 IAs analisam → consenso
   devolve diferencial ranqueado, conduta e referências.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MDV11_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

export const MDV11_Diagnostico: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const clickAt = DELAY + 7.0;
  const procAt = DELAY + 8.9;
  const resultadoAt = DELAY + 16.0;

  return (
    <AbsoluteFill>
      <AppShell ferramenta="Diagnóstico Detalhado">
        <div style={{ padding: '44px 44px 0' }}>
          {/* entrada do caso */}
          <div style={surge(t, DELAY + 0.1)}>
            <CampoDigitando t={t} at={DELAY + 0.9} dur={4.2} rotulo="QUADRO CLÍNICO"
              texto="Febre há 5 dias, petéquias em membros inferiores, plaquetas em queda (92 mil). Retorno de área endêmica há 1 semana." />
          </div>
          {t >= DELAY + 5.9 && (
            <div style={{ marginTop: 24, ...surge(t, DELAY + 5.9) }}>
              <BotaoAnalisar t={t} clickAt={clickAt} />
            </div>
          )}

          {/* consenso das 3 IAs */}
          {t >= procAt && (
            <div style={{ marginTop: 30 }}>
              <Consenso t={t} at={procAt}
                doneAts={[DELAY + 11.6, DELAY + 12.5, DELAY + 12.9]}
                consensoAt={DELAY + 13.6} />
            </div>
          )}

          {/* resultado */}
          {t >= resultadoAt && (
            <Cartao style={{ marginTop: 30, ...surge(t, resultadoAt) }}>
              <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 30, color: M_NAVY, marginBottom: 22 }}>
                Diagnósticos prováveis
              </div>
              <Rank t={t} at={DELAY + 16.3} rotulo="Dengue com sinais de alarme" frac={0.88} tag="alta probabilidade" />
              <Rank t={t} at={DELAY + 16.9} rotulo="Outras arboviroses (zika, chikungunya)" frac={0.44} tag="considerar" />
              <Rank t={t} at={DELAY + 17.5} rotulo="Púrpura trombocitopênica imune" frac={0.28} tag="diferencial" />

              {t >= DELAY + 18.8 && (
                <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 30, color: M_NAVY, margin: '26px 0 14px', ...surge(t, DELAY + 18.8) }}>
                  Conduta sugerida
                </div>
              )}
              <Linha t={t} at={DELAY + 19.2}>hidratação conforme estadiamento + prova do laço</Linha>
              <Linha t={t} at={DELAY + 19.9}>hemograma seriado: plaquetas e hematócrito</Linha>
              <Linha t={t} at={DELAY + 20.5}>notificação e sinais de alarme orientados</Linha>

              <div style={{ marginTop: 24 }}>
                <Refs t={t} at={DELAY + 21.4} itens={['PubMed · revisões 2024', 'PCDT Dengue — SUS', 'Caderno de Atenção Básica']} />
              </div>
            </Cartao>
          )}

          {/* mensagem final antes do encerramento */}
          {t >= DELAY + 28.3 && t < DELAY + 33.4 && (
            <div style={{
              marginTop: 28, fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: M_NAVY,
              ...surge(t, DELAY + 28.3),
            }}>
              a decisão continua sua — <span style={{ color: M_BLUE }}>agora, com mais segurança.</span>
            </div>
          )}
        </div>
        <Seguranca />
      </AppShell>

      <FimClaro t={t} at={DELAY + 33.4}
        frase="apoio à decisão clínica, com fonte"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md11.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
