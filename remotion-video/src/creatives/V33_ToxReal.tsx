import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/v33.json';
import { HEAD } from './theme';
import { M_BLUE, M_NAVY, M_RED, WHITE } from './meduf';
import { FimClaro } from './medufui';
import {
  FPS, DELAY, TakeNotebook, TakeZoom, SeloReal, Rotulo, FundoReal, win, outB, flashAt,
} from './medufreal';

/* ============================================================
   V33 — TOXICOLOGIA, GRAVAÇÃO REAL
   Agente/via/quadro digitados de verdade e o manejo REAL
   da intoxicação chegando na tela.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const V33_DURATION = Math.round((DELAY + T.duration + 2.4) * FPS);

export const V33_ToxReal: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const segForm = DELAY + 0.2;    /* notebook: formulário sendo preenchido */
  const segClose = DELAY + 4.4;   /* close nos campos */
  const segResp = DELAY + 9.3;    /* close: manejo chegando */
  const fimAt = DELAY + 23.8;

  return (
    <FundoReal>
      <SeloReal />

      {/* faixa de urgência discreta */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 14,
        background: M_RED, opacity: 0.85,
      }} />

      {t >= segForm && t < segClose && (
        <div style={{ position: 'absolute', left: 40, right: 40, top: 360, display: 'flex', justifyContent: 'center' }}>
          <TakeNotebook nome="d_tox" from={2.6 + (t - segForm)} width={1000} />
        </div>
      )}

      {t >= segClose && t < segResp && (
        <div style={{ position: 'absolute', left: 0, top: 380 }}>
          <TakeZoom nome="d_tox" from={7.5 + (t - segClose)} zoom={1.8} foco={[440, 400]} h={1100} />
        </div>
      )}

      {t >= segResp && (
        <div style={{ position: 'absolute', left: 0, top: 380 }}>
          <TakeZoom nome="d_tox" fromEnd={15.5 - (t - segResp)} zoom={1.7} foco={[1065, 420]} h={1100} />
        </div>
      )}

      <div style={{
        position: 'absolute', top: 160, left: 70, right: 70, textAlign: 'center',
        fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: M_NAVY,
        opacity: outB(win(t, DELAY + 0.2, DELAY + 0.7)),
      }}>
        {t < segResp ? <>intoxicação por <span style={{ color: M_RED }}>carbamazepina</span> — caso real na tela</>
          : <>o manejo vem <span style={{ color: M_BLUE }}>completo.</span></>}
      </div>

      <Rotulo t={t} at={DELAY + 10.9} bottom={110}>
        identificação · descontaminação · monitorização · quando escalar
      </Rotulo>
      {t >= DELAY + 16.2 && t < fimAt && (
        <Rotulo t={t} at={DELAY + 16.2} bottom={110}>
          gravado direto da plataforma — sem cortes na resposta
        </Rotulo>
      )}

      <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, segClose) * 0.7, pointerEvents: 'none' }} />
      <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, segResp) * 0.7, pointerEvents: 'none' }} />

      <FimClaro t={t} at={fimAt}
        frase="apoio à decisão, na velocidade da emergência"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/v33.mp3')} />
      </Sequence>
    </FundoReal>
  );
};
