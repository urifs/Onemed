import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/v41.json';
import { HEAD } from './theme';
import { M_BLUE, M_NAVY } from './meduf';
import { FimClaro } from './medufui';
import { FPS, DELAY, TakePan, Wipe, Beneficio, FundoReal, win, outB } from './medufreal';

/* ============================================================
   V41 — DIAGNÓSTICO DETALHADO
   Caso de cefaleia sentinela na plataforma, com a câmera
   deslizando sobre a tela: formulário → análise → diferencial.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const V41_DURATION = Math.round((DELAY + T.duration + 2.4) * FPS);

export const V41_Diag: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const segA = DELAY + 0.2;    /* formulário sendo digitado, câmera passeando */
  const segB = DELAY + 10.3;   /* resposta: diferencial + rolagem */
  const fimAt = DELAY + 19.4;

  return (
    <FundoReal>
      {t >= segA && t < segB + 0.4 && (
        <Sequence from={Math.round(segA * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 0, top: 330 }}>
            <TakePan nome="n_diag" t={t} from={2.6} h={1320}
              kf={[
                [segA, 1.5, 420, 300],
                [segA + 4.0, 1.62, 430, 470],
                [segA + 7.5, 1.55, 460, 620],
                [segB, 1.5, 520, 620],
              ]} />
          </div>
        </Sequence>
      )}

      {t >= segB + 0.36 && (
        <Sequence from={Math.round((segB + 0.36) * FPS)} layout="none">
          <div style={{ position: 'absolute', left: 0, top: 330 }}>
            <TakePan nome="n_diag" t={t} fromEnd={14.5} h={1320}
              kf={[
                [segB, 1.6, 1050, 380],
                [segB + 4.5, 1.68, 1070, 470],
                [fimAt, 1.55, 1060, 460],
              ]} />
          </div>
        </Sequence>
      )}

      <div style={{
        position: 'absolute', top: 150, left: 70, right: 70, textAlign: 'center',
        fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: M_NAVY,
        opacity: outB(win(t, DELAY + 0.2, DELAY + 0.7)),
      }}>
        {t < segB ? <>a pior cefaleia da vida.<br /><span style={{ color: M_BLUE }}>e agora?</span></>
          : <>o raciocínio, <span style={{ color: M_BLUE }}>montado com você.</span></>}
      </div>

      <Beneficio t={t} at={DELAY + 6.6} ate={segB}>
        o caso entra do seu jeito — texto corrido
      </Beneficio>
      <Beneficio t={t} at={DELAY + 11.6} ate={DELAY + 15.6}>
        diferencial ranqueado, com CID e justificativa
      </Beneficio>
      <Beneficio t={t} at={DELAY + 15.9} ate={fimAt}>
        três IAs · um consenso · referência junto
      </Beneficio>

      <Wipe t={t} at={segB} />

      <FimClaro t={t} at={fimAt}
        frase="decisão mais rápida, com mais segurança"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/v41.mp3')} />
      </Sequence>
    </FundoReal>
  );
};
