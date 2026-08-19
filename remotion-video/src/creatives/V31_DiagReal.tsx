import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/v31.json';
import { HEAD } from './theme';
import { M_BLUE, M_NAVY, WHITE } from './meduf';
import { FimClaro } from './medufui';
import {
  FPS, DELAY, TakeNotebook, TakeZoom, SeloReal, Rotulo, FundoReal, win, outB, flashAt,
} from './medufreal';

/* ============================================================
   V31 — DIAGNÓSTICO DETALHADO, GRAVAÇÃO REAL
   O take real do desktop: formulário sendo digitado, Analisar,
   e a resposta REAL da IA (plano completo com doses) chegando.
   Notebook inteiro → close no formulário → close na resposta.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const V31_DURATION = Math.round((DELAY + T.duration + 2.4) * FPS);

export const V31_DiagReal: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  /* segmentos do take (43s) mapeados na narração (32s) */
  const segForm = DELAY + 0.2;      /* notebook inteiro: digitação */
  const segClose = DELAY + 8.2;     /* close no formulário digitando */
  const segResp = DELAY + 12.0;     /* close: resposta chegando (painel direito) */
  const segScroll = DELAY + 21.3;   /* close: rolando o plano completo */
  const fimAt = DELAY + 29.7;

  return (
    <FundoReal>
      <SeloReal />

      {/* fase 1: o notebook INTEIRO no quadro, take rodando */}
      {t >= segForm && t < segClose && (
        <Sequence from={Math.round(segForm * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 40, right: 40, top: 460, display: 'flex', justifyContent: 'center' }}>
            <TakeNotebook nome="d_diag" from={3.0} width={1000} />
          </div>
        </Sequence>
      )}

      {/* fase 2: close no formulário (metade esquerda) */}
      {t >= segClose && t < segResp && (
        <Sequence from={Math.round(segClose * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 0, top: 330 }}>
            <TakeZoom nome="d_diag" from={11.2} zoom={1.75} foco={[450, 430]} h={1280} />
          </div>
        </Sequence>
      )}

      {/* fase 3: close na resposta chegando (painel direito) */}
      {t >= segResp && t < segScroll && (
        <Sequence from={Math.round(segResp * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 0, top: 330 }}>
            <TakeZoom nome="d_diag" from={26.0} zoom={1.75} foco={[1065, 420]} h={1280} />
          </div>
        </Sequence>
      )}

      {/* fase 4: rolando o plano completo */}
      {t >= segScroll && (
        <Sequence from={Math.round(segScroll * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 0, top: 330 }}>
            <TakeZoom nome="d_diag" fromEnd={11.5} zoom={1.6} foco={[1065, 425]} h={1280} />
          </div>
        </Sequence>
      )}

      {/* título da fase, sem cobrir o app */}
      {t < segClose && (
        <div style={{
          position: 'absolute', top: 150, left: 70, right: 70, textAlign: 'center',
          fontFamily: HEAD, fontWeight: 900, fontSize: 56, color: M_NAVY,
          opacity: outB(win(t, DELAY + 0.2, DELAY + 0.7)),
        }}>
          isso é a MEDUF, <span style={{ color: M_BLUE }}>ao vivo.</span>
        </div>
      )}
      {t >= segClose && (
        <div style={{
          position: 'absolute', top: 170, left: 70, right: 70, textAlign: 'center',
          fontFamily: HEAD, fontWeight: 900, fontSize: 48, color: M_NAVY,
        }}>
          {t < segResp ? 'o caso entra...' : t < segScroll ? 'a IA responde de verdade' : 'o plano completo, com doses'}
        </div>
      )}

      {t < segClose && (
        <Rotulo t={t} at={DELAY + 2.2} bottom={150}>
          o caso entra digitado, ao vivo — sem maquete
        </Rotulo>
      )}
      <Rotulo t={t} at={DELAY + 13.2} bottom={110}>
        hipóteses · condutas · doses · mecanismos
      </Rotulo>
      {t >= DELAY + 21.4 && t < fimAt && (
        <Rotulo t={t} at={DELAY + 21.4} bottom={110}>
          sem roteiro, sem edição — resposta real
        </Rotulo>
      )}

      <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, segClose) * 0.7, pointerEvents: 'none' }} />
      <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, segResp) * 0.7, pointerEvents: 'none' }} />
      <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, segScroll) * 0.5, pointerEvents: 'none' }} />

      <FimClaro t={t} at={fimAt}
        frase="a plataforma real, respondendo em segundos"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/v31.mp3')} />
      </Sequence>
    </FundoReal>
  );
};
