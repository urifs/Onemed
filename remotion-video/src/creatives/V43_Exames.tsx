import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/v43.json';
import { HEAD } from './theme';
import { M_BLUE, M_NAVY } from './meduf';
import { FimClaro } from './medufui';
import { FPS, DELAY, TakePan, Wipe, Beneficio, FundoReal, win, outB } from './medufreal';

/* ============================================================
   V43 — DO SINTOMA AO EXAME
   Sugestão de Exames priorizando a investigação, e a Bula
   Inteligente respondendo sobre o fármaco.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const V43_DURATION = Math.round((DELAY + T.duration + 2.4) * FPS);

export const V43_Exames: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const segA = DELAY + 0.2;    /* sugestão: anamnese entrando */
  const segB = DELAY + 6.8;    /* sugestão: exames priorizados */
  const segC = DELAY + 11.2;   /* bula inteligente */
  const fimAt = DELAY + 15.4;

  return (
    <FundoReal>
      {t >= segA && t < segB + 0.4 && (
        <Sequence from={Math.round(segA * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 0, top: 330 }}>
            <TakePan nome="n_sugestao" t={t} from={2.4} h={1320}
              kf={[
                [segA, 1.55, 430, 330],
                [segB, 1.62, 450, 470],
              ]} />
          </div>
        </Sequence>
      )}

      {t >= segB + 0.36 && t < segC + 0.4 && (
        <Sequence from={Math.round((segB + 0.36) * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 0, top: 330 }}>
            <TakePan nome="n_sugestao" t={t} fromEnd={10.5} h={1320}
              kf={[
                [segB, 1.6, 1050, 400],
                [segC, 1.66, 1065, 470],
              ]} />
          </div>
        </Sequence>
      )}

      {t >= segC + 0.36 && (
        <Sequence from={Math.round((segC + 0.36) * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 0, top: 330 }}>
            <TakePan nome="n_bula" t={t} fromEnd={10.5} h={1320}
              kf={[
                [segC, 1.55, 1040, 400],
                [fimAt, 1.62, 1055, 470],
              ]} />
          </div>
        </Sequence>
      )}

      <div style={{
        position: 'absolute', top: 150, left: 70, right: 70, textAlign: 'center',
        fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: M_NAVY,
        opacity: outB(win(t, DELAY + 0.2, DELAY + 0.7)),
      }}>
        {t < segB ? <>qual exame pedir<br /><span style={{ color: M_BLUE }}>primeiro?</span></>
          : t < segC ? <>a investigação, <span style={{ color: M_BLUE }}>priorizada.</span></>
          : <>e a bula? <span style={{ color: M_BLUE }}>respondida na hora.</span></>}
      </div>

      <Beneficio t={t} at={DELAY + 1.8} ate={segB}>
        a partir da anamnese que você já tem
      </Beneficio>
      <Beneficio t={t} at={segB + 1.0} ate={segC}>
        exames na ordem certa — com o porquê
      </Beneficio>
      <Beneficio t={t} at={segC + 1.0} ate={fimAt}>
        mecanismo · dose · ajustes · interações
      </Beneficio>

      <Wipe t={t} at={segB} />
      <Wipe t={t} at={segC} />

      <FimClaro t={t} at={fimAt}
        frase="menos abas abertas, mais tempo com o paciente"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/v43.mp3')} />
      </Sequence>
    </FundoReal>
  );
};
