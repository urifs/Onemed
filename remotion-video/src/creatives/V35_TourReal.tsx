import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/v35.json';
import { HEAD } from './theme';
import { M_BLUE, M_NAVY, WHITE } from './meduf';
import { FimClaro } from './medufui';
import {
  FPS, DELAY, TakeNotebook, TakeZoom, TakeCelular, SeloReal, Rotulo, FundoReal, win, outB, flashAt,
} from './medufreal';

/* ============================================================
   V35 — TOUR REAL DO PAINEL
   O /selection de verdade: filtros clicados, cards reais;
   e o assistente respondendo uma pergunta real no celular.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const V35_DURATION = Math.round((DELAY + T.duration + 2.4) * FPS);

export const V35_TourReal: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const segPainel = DELAY + 0.2;   /* notebook: painel + filtros */
  const segClose = DELAY + 5.2;    /* close nos cards/filtros */
  const segAssist = DELAY + 9.8;   /* celular: assistente respondendo */
  const fimAt = DELAY + 21.6;

  return (
    <FundoReal>
      <SeloReal />

      {t >= segPainel && t < segClose && (
        <Sequence from={Math.round(segPainel * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 40, right: 40, top: 470, display: 'flex', justifyContent: 'center' }}>
            <TakeNotebook nome="d_home" from={2.0} width={1000} />
          </div>
        </Sequence>
      )}

      {t >= segClose && t < segAssist && (
        <Sequence from={Math.round(segClose * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 0, top: 320 }}>
            <TakeZoom nome="d_home" from={8.5} zoom={1.55} foco={[756, 560]} h={1300} />
          </div>
        </Sequence>
      )}

      {t >= segAssist && (
        <Sequence from={Math.round(segAssist * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 0, right: 0, top: 290, display: 'flex', justifyContent: 'center' }}>
            <TakeCelular nome="m_assist" fromEnd={14.5} width={760} />
          </div>
        </Sequence>
      )}

      <div style={{
        position: 'absolute', top: 150, left: 60, right: 60, textAlign: 'center',
        fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: M_NAVY,
        opacity: outB(win(t, DELAY + 0.2, DELAY + 0.7)),
      }}>
        {t < segClose ? <>um tour <span style={{ color: M_BLUE }}>de verdade</span> — sem maquete</>
          : t < segAssist ? '17 ferramentas no painel real'
          : <>pergunta real, <span style={{ color: M_BLUE }}>resposta real.</span></>}
      </div>

      {t < segClose && (
        <Rotulo t={t} at={segPainel + 1.6} bottom={150}>
          o painel real, logado agora
        </Rotulo>
      )}
      <Rotulo t={t} at={DELAY + 6.0} bottom={110}>
        clínica · medicamentos · exames · imagem
      </Rotulo>
      {t >= DELAY + 13.9 && t < fimAt && (
        <Rotulo t={t} at={DELAY + 13.9} bottom={90}>
          o assistente aciona a ferramenta certa pela sua pergunta
        </Rotulo>
      )}

      <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, segClose) * 0.6, pointerEvents: 'none' }} />
      <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, segAssist) * 0.7, pointerEvents: 'none' }} />

      <FimClaro t={t} at={fimAt}
        frase="o assistente clínico ao lado do médico"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/v35.mp3')} />
      </Sequence>
    </FundoReal>
  );
};
