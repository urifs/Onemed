import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/v42.json';
import { HEAD } from './theme';
import { M_BLUE, M_NAVY } from './meduf';
import { FimClaro } from './medufui';
import { FPS, DELAY, TakePan, Wipe, Beneficio, FundoReal, win, outB } from './medufreal';

/* ============================================================
   V42 — PRESCRIÇÃO SEGURA
   Interação Medicamentosa (enalapril + espironolactona + AINE)
   e a Calculadora de Dose, em sequência com wipe.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const V42_DURATION = Math.round((DELAY + T.duration + 2.4) * FPS);

export const V42_Prescricao: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const segA = DELAY + 0.2;    /* interação: medicamentos entrando */
  const segB = DELAY + 7.6;    /* interação: análise */
  const segC = DELAY + 13.9;   /* calculadora de dose */
  const fimAt = DELAY + 18.9;

  return (
    <FundoReal>
      {t >= segA && t < segB + 0.4 && (
        <Sequence from={Math.round(segA * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 0, top: 330 }}>
            <TakePan nome="n_inter" t={t} from={3.2} h={1320}
              kf={[
                [segA, 1.6, 420, 330],
                [segA + 4.0, 1.7, 430, 430],
                [segB, 1.6, 450, 520],
              ]} />
          </div>
        </Sequence>
      )}

      {t >= segB + 0.36 && t < segC + 0.4 && (
        <Sequence from={Math.round((segB + 0.36) * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 0, top: 330 }}>
            <TakePan nome="n_inter" t={t} fromEnd={11.5} h={1320}
              kf={[
                [segB, 1.6, 1050, 400],
                [segC, 1.68, 1070, 480],
              ]} />
          </div>
        </Sequence>
      )}

      {t >= segC + 0.36 && (
        <Sequence from={Math.round((segC + 0.36) * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 0, top: 330 }}>
            <TakePan nome="n_dose" t={t} fromEnd={11.0} h={1320}
              kf={[
                [segC, 1.55, 1040, 400],
                [fimAt, 1.62, 1060, 470],
              ]} />
          </div>
        </Sequence>
      )}

      <div style={{
        position: 'absolute', top: 150, left: 70, right: 70, textAlign: 'center',
        fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: M_NAVY,
        opacity: outB(win(t, DELAY + 0.2, DELAY + 0.7)),
      }}>
        {t < segB ? <>a prescrição passa<br /><span style={{ color: M_BLUE }}>pela MEDUF antes.</span></>
          : t < segC ? <>interações: <span style={{ color: M_BLUE }}>severidade e monitoramento</span></>
          : <>a dose certa, <span style={{ color: M_BLUE }}>pra cada paciente.</span></>}
      </div>

      <Beneficio t={t} at={DELAY + 2.4} ate={segB}>
        até 10 medicamentos analisados juntos
      </Beneficio>
      <Beneficio t={t} at={segB + 1.2} ate={segC}>
        impacto renal · hepático · cardiovascular
      </Beneficio>
      <Beneficio t={t} at={segC + 1.2} ate={fimAt}>
        ajuste por peso, idade e função renal
      </Beneficio>

      <Wipe t={t} at={segB} />
      <Wipe t={t} at={segC} />

      <FimClaro t={t} at={fimAt}
        frase="prescrever bem é proteger quem confia em você"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/v42.mp3')} />
      </Sequence>
    </FundoReal>
  );
};
