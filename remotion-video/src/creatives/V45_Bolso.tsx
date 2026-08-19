import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/v45.json';
import { HEAD } from './theme';
import { M_BLUE, M_NAVY } from './meduf';
import { FimClaro } from './medufui';
import { FPS, DELAY, TakeCelular, Wipe, Beneficio, FundoReal, win, outB } from './medufreal';

/* ============================================================
   V45 — NO BOLSO
   O app no celular: painel com as ferramentas e o Diagnóstico
   Rápido resolvendo um caso de fossa ilíaca direita.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const V45_DURATION = Math.round((DELAY + T.duration + 2.4) * FPS);

export const V45_Bolso: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const segA = DELAY + 0.2;   /* tour mobile: filtros e ferramentas */
  const segB = DELAY + 6.9;   /* diagnóstico rápido: resposta */
  const fimAt = DELAY + 13.6;

  const flutua = Math.sin(t * 1.1) * 8;

  return (
    <FundoReal>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 300,
        display: 'flex', justifyContent: 'center',
        transform: `translateY(${flutua}px)`,
      }}>
        {t >= segA && t < segB + 0.4 && (
          <Sequence from={Math.round(segA * FPS)} layout="none">
            <TakeCelular nome="nm_tour" from={2.2} width={790} />
          </Sequence>
        )}
        {t >= segB + 0.36 && (
          <Sequence from={Math.round((segB + 0.36) * FPS)} layout="none">
            <TakeCelular nome="nm_diag" fromEnd={12.5} width={790} />
          </Sequence>
        )}
      </div>

      <div style={{
        position: 'absolute', top: 130, left: 60, right: 60, textAlign: 'center',
        fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: M_NAVY,
        opacity: outB(win(t, DELAY + 0.2, DELAY + 0.7)),
      }}>
        {t < segB ? <>a MEDUF <span style={{ color: M_BLUE }}>vai no bolso.</span></>
          : <>a resposta chega <span style={{ color: M_BLUE }}>em segundos.</span></>}
      </div>

      <Beneficio t={t} at={DELAY + 2.6} ate={segB} bottom={80}>
        17 ferramentas no celular
      </Beneficio>
      <Beneficio t={t} at={segB + 1.2} ate={fimAt} bottom={80}>
        do consultório ao plantão — sempre com você
      </Beneficio>

      <Wipe t={t} at={segB} />

      <FimClaro t={t} at={fimAt}
        frase="o apoio à decisão anda com você"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/v45.mp3')} />
      </Sequence>
    </FundoReal>
  );
};
