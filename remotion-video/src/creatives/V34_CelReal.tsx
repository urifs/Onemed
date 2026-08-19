import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/v34.json';
import { HEAD } from './theme';
import { M_BLUE, M_NAVY, WHITE } from './meduf';
import { FimClaro } from './medufui';
import {
  FPS, DELAY, TakeCelular, SeloReal, Rotulo, FundoReal, win, outB, flashAt,
} from './medufreal';

/* ============================================================
   V34 — NO CELULAR, GRAVAÇÃO REAL
   O app mobile de verdade: home rolando, ferramenta aberta
   por toque, caso digitado e a análise real chegando.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const V34_DURATION = Math.round((DELAY + T.duration + 2.4) * FPS);

export const V34_CelReal: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const segHome = DELAY + 0.2;     /* m_home: rolar e tocar */
  const segCaso = DELAY + 4.6;     /* m_simple: digitando o caso */
  const segResp = DELAY + 8.9;     /* m_simple: resposta + scroll */
  const fimAt = DELAY + 14.6;

  const escala = 1 + 0.05 * Math.sin(win(t, segHome, fimAt) * Math.PI); /* respiração sutil da câmera */

  return (
    <FundoReal>
      <SeloReal />

      <div style={{
        position: 'absolute', left: 0, right: 0, top: 250,
        display: 'flex', justifyContent: 'center',
        transform: `scale(${escala})`,
      }}>
        {t < segCaso && <TakeCelular nome="m_home" from={3.0 + (t - segHome)} width={760} />}
        {t >= segCaso && t < segResp && <TakeCelular nome="m_simple" from={3.2 + (t - segCaso)} width={760} />}
        {t >= segResp && <TakeCelular nome="m_simple" fromEnd={13.0 - (t - segResp)} width={760} />}
      </div>

      <div style={{
        position: 'absolute', top: 130, left: 60, right: 60, textAlign: 'center',
        fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: M_NAVY,
        opacity: outB(win(t, DELAY + 0.2, DELAY + 0.7)),
      }}>
        {t < segCaso ? <>no celular, <span style={{ color: M_BLUE }}>a mesma plataforma.</span></>
          : t < segResp ? 'descreve o caso...'
          : <>a análise, <span style={{ color: M_BLUE }}>na palma da mão.</span></>}
      </div>

      <Rotulo t={t} at={DELAY + 9.9} bottom={90}>
        app de verdade — do jeito que você vai usar amanhã
      </Rotulo>

      <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, segCaso) * 0.7, pointerEvents: 'none' }} />
      <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, segResp) * 0.7, pointerEvents: 'none' }} />

      <FimClaro t={t} at={fimAt}
        frase="o assistente clínico no seu bolso"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/v34.mp3')} />
      </Sequence>
    </FundoReal>
  );
};
