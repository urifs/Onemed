import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/v44.json';
import { HEAD } from './theme';
import { M_BLUE, M_NAVY } from './meduf';
import { FimClaro } from './medufui';
import { FPS, DELAY, TakePan, Wipe, Beneficio, FundoReal, win, outB } from './medufreal';

/* ============================================================
   V44 — ESTRUTURAÇÃO DE ANAMNESE
   O texto corrido do plantão entrando, e saindo do outro lado
   como anamnese organizada por seções.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const V44_DURATION = Math.round((DELAY + T.duration + 2.4) * FPS);

export const V44_Anamnese: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const segA = DELAY + 0.2;   /* texto livre entrando */
  const segB = DELAY + 7.7;   /* estruturada */
  const fimAt = DELAY + 15.2;

  return (
    <FundoReal>
      {t >= segA && t < segB + 0.4 && (
        <Sequence from={Math.round(segA * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 0, top: 330 }}>
            <TakePan nome="n_anam" t={t} from={2.4} h={1320}
              kf={[
                [segA, 1.55, 430, 340],
                [segB, 1.62, 460, 470],
              ]} />
          </div>
        </Sequence>
      )}

      {t >= segB + 0.36 && (
        <Sequence from={Math.round((segB + 0.36) * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 0, top: 330 }}>
            <TakePan nome="n_anam" t={t} fromEnd={11.5} h={1320}
              kf={[
                [segB, 1.6, 1050, 380],
                [fimAt, 1.66, 1065, 480],
              ]} />
          </div>
        </Sequence>
      )}

      <div style={{
        position: 'absolute', top: 150, left: 70, right: 70, textAlign: 'center',
        fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: M_NAVY,
        opacity: outB(win(t, DELAY + 0.2, DELAY + 0.7)),
      }}>
        {t < segB ? <>as anotações do plantão,<br /><span style={{ color: M_BLUE }}>do seu jeito.</span></>
          : <>anamnese completa, <span style={{ color: M_BLUE }}>por seções.</span></>}
      </div>

      <Beneficio t={t} at={DELAY + 2.2} ate={segB}>
        cola o texto corrido — como saiu da consulta
      </Beneficio>
      <Beneficio t={t} at={segB + 1.2} ate={DELAY + 12.2}>
        QP · HMA · antecedentes · hipóteses
      </Beneficio>
      <Beneficio t={t} at={DELAY + 12.5} ate={fimAt}>
        pronta pro prontuário
      </Beneficio>

      <Wipe t={t} at={segB} />

      <FimClaro t={t} at={fimAt}
        frase="o fim do plantão ficou mais leve"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/v44.mp3')} />
      </Sequence>
    </FundoReal>
  );
};
