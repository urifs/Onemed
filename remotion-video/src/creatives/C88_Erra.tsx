import React from 'react';
import timing from './timings/c88.json';
import {
  FPS, DELAY, RED, BLK, OFF, fit, Slam, Band, Center, Beat, StampFinal, ManifestoVideo,
} from './manifesto';

/* ============================================================
   C88 — ERRA
   Manifesto das questões: errar aqui é acertar na prova.
   Curto e seco — 20 segundos de marretada.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const C88_DURATION = Math.round((DELAY + T.duration + 2.8) * FPS);

const BEATS: Beat[] = [
  { at: 0, bg: RED, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 0.1} size={296} color={OFF} rot={-2}>Erra.</Slam></div>
  )},
  { at: DELAY + 0.67, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 0.68} size={230} color={OFF} rot={2}>Erra</Slam>
      <Slam t={t} at={DELAY + 0.85} size={168} color={RED} rot={2} style={{ marginTop: 14 }}>aqui dentro.</Slam>
    </div>
  )},
  { at: DELAY + 1.72, bg: OFF, render: t => (
    <div style={{ ...Center, alignItems: 'flex-start', paddingLeft: 70, gap: 16 }}>
      <Slam t={t} at={DELAY + 1.73} size={140} color={BLK}>Errar aqui</Slam>
      <Slam t={t} at={DELAY + 2.8} size={124} color={RED} style={{ whiteSpace: 'normal', maxWidth: 940 }}>
        = acertar na prova.
      </Slam>
    </div>
  )},
  { at: DELAY + 4.03, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 4.04} size={330} color={OFF}>31 mil</Slam>
      <div style={{ marginTop: 30 }}>
        <Band t={t} at={DELAY + 4.6} bg={RED} fg={OFF} size={58} rot={-2}>questões comentadas</Band>
      </div>
      <div style={{ marginTop: 20 }}>
        <Band t={t} at={DELAY + 5.97} bg={OFF} fg={BLK} size={58} rot={-2}>uma a uma</Band>
      </div>
    </div>
  )},
  { at: DELAY + 6.8, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 6.81} size={290} color={OFF}>+56 mil</Slam>
      <div style={{ marginTop: 30 }}>
        <Band t={t} at={DELAY + 8.11} bg={BLK} fg={OFF} size={68} rot={2}>no banco MED</Band>
      </div>
    </div>
  )},
  { at: DELAY + 9.15, bg: OFF, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 9.16} size={fit(8)} color={BLK} rot={-2}>MedGrupo</Slam>
      <div style={{ marginTop: 28 }}>
        <Band t={t} at={DELAY + 10.03} bg={RED} fg={OFF} size={64} rot={-2}>por estado</Band>
      </div>
      <div style={{ marginTop: 18 }}>
        <Band t={t} at={DELAY + 10.94} bg={BLK} fg={OFF} size={64} rot={2}>por instituição</Band>
      </div>
    </div>
  )},
  { at: DELAY + 12.0, bg: BLK, render: t => (
    <div style={{ ...Center, alignItems: 'flex-start', paddingLeft: 70 }}>
      <Slam t={t} at={DELAY + 12.01} size={128} color={OFF} style={{ whiteSpace: 'normal', maxWidth: 940 }}>
        A prova não te espera.
      </Slam>
    </div>
  )},
  { at: DELAY + 13.39, bg: RED, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 13.4} size={280} color={OFF} rot={-2}>Treina.</Slam></div>
  )},
  { at: DELAY + 14.7, bg: OFF, render: t => (
    <StampFinal t={t} at={DELAY + 15.08} extraAt={DELAY + 15.9}
      topLabel="Erra aqui. Acerta lá." bottomLeft="+86 mil questões" bottomRight="teste grátis" />
  )},
];

export const C88_Erra: React.FC = () => (
  <ManifestoVideo beats={BEATS} audio="narration/c88.mp3" />
);
