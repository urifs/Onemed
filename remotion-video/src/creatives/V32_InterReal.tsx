import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/v32.json';
import { HEAD } from './theme';
import { M_BLUE, M_NAVY, WHITE } from './meduf';
import { FimClaro } from './medufui';
import {
  FPS, DELAY, TakeNotebook, TakeZoom, SeloReal, Rotulo, FundoReal, win, outB, flashAt,
} from './medufreal';

/* ============================================================
   V32 — INTERAÇÃO MEDICAMENTOSA, GRAVAÇÃO REAL
   Medicamentos digitados de verdade, Analisar, e a análise
   REAL de severidade/monitoramento chegando no painel.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const V32_DURATION = Math.round((DELAY + T.duration + 2.4) * FPS);

export const V32_InterReal: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const segMeds = DELAY + 0.2;     /* close: digitando os medicamentos */
  const segNote = DELAY + 6.6;     /* notebook inteiro: contexto + Analisar */
  const segResp = DELAY + 11.0;    /* close: resposta real */
  const fimAt = DELAY + 19.0;

  return (
    <FundoReal>
      <SeloReal />

      {t >= segMeds && t < segNote && (
        <Sequence from={Math.round(segMeds * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 0, top: 320 }}>
            <TakeZoom nome="d_inter" from={4.0} zoom={1.8} foco={[440, 380]} h={1300} />
          </div>
        </Sequence>
      )}

      {t >= segNote && t < segResp && (
        <Sequence from={Math.round(segNote * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 40, right: 40, top: 470, display: 'flex', justifyContent: 'center' }}>
            <TakeNotebook nome="d_inter" from={14.5} width={1000} />
          </div>
        </Sequence>
      )}

      {t >= segResp && (
        <Sequence from={Math.round(segResp * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 0, top: 320 }}>
            <TakeZoom nome="d_inter" fromEnd={12.0} zoom={1.7} foco={[1065, 420]} h={1300} />
          </div>
        </Sequence>
      )}

      <div style={{
        position: 'absolute', top: 160, left: 70, right: 70, textAlign: 'center',
        fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: M_NAVY,
        opacity: outB(win(t, DELAY + 0.2, DELAY + 0.7)),
      }}>
        {t < segNote ? <>tela real, <span style={{ color: M_BLUE }}>análise real.</span></>
          : t < segResp ? 'dados do paciente... e Analisar'
          : <>a prescrição sai <span style={{ color: M_BLUE }}>conferida.</span></>}
      </div>

      {t >= segNote && t < segResp && (
        <Rotulo t={t} at={segNote + 0.4} bottom={150}>
          Analisar — direto na plataforma
        </Rotulo>
      )}
      <Rotulo t={t} at={DELAY + 12.6} bottom={110}>
        severidade · impacto renal e cardiovascular · o que monitorar
      </Rotulo>

      <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, segNote) * 0.7, pointerEvents: 'none' }} />
      <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, segResp) * 0.7, pointerEvents: 'none' }} />

      <FimClaro t={t} at={fimAt}
        frase="interações conferidas antes da prescrição sair"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/v32.mp3')} />
      </Sequence>
    </FundoReal>
  );
};
