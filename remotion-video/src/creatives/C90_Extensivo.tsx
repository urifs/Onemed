import React from 'react';
import timing from './timings/c90.json';
import {
  FPS, DELAY, RED, BLK, OFF, fit, Slam, Band, Center, Beat, StampFinal, ManifestoVideo,
} from './manifesto';

/* ============================================================
   C90 — EXTENSIVO
   Manifesto do ano inteiro: os extensivos dos grandes,
   +65 mil aulas, de janeiro à prova.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const C90_DURATION = Math.round((DELAY + T.duration + 2.8) * FPS);

const BEATS: Beat[] = [
  { at: 0, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 0.1} size={172} color={OFF} rot={-2}>Extensivo.</Slam>
    </div>
  )},
  { at: DELAY + 1.04, bg: RED, render: t => (
    <div style={{ ...Center, alignItems: 'flex-start', paddingLeft: 70, gap: 16 }}>
      <Slam t={t} at={DELAY + 1.05} size={118} color={BLK} style={{ whiteSpace: 'normal', maxWidth: 940 }}>
        A palavra é grande.
      </Slam>
      <Slam t={t} at={DELAY + 2.4} size={132} color={OFF} style={{ whiteSpace: 'normal', maxWidth: 940 }}>
        O acervo é maior.
      </Slam>
    </div>
  )},
  { at: DELAY + 3.62, bg: OFF, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 3.63} size={112} color={BLK} rot={-2}>Estratégia MED</Slam>
      <Slam t={t} at={DELAY + 4.9} size={280} color={RED} rot={-2} style={{ marginTop: 20 }}>14.142</Slam>
      <div style={{ marginTop: 26 }}>
        <Band t={t} at={DELAY + 6.6} bg={BLK} fg={OFF} size={76} rot={-2}>aulas</Band>
      </div>
    </div>
  )},
  { at: DELAY + 7.37, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 7.38} size={fit(8)} color={OFF} rot={2}>MEDCurso</Slam>
      <div style={{ marginTop: 30 }}>
        <Band t={t} at={DELAY + 8.53} bg={RED} fg={OFF} size={64} rot={2}>do início ao fim</Band>
      </div>
    </div>
  )},
  { at: DELAY + 9.73, bg: RED, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 9.74} size={fit(6)} color={OFF} rot={-2}>Medcof</Slam></div>
  )},
  { at: DELAY + 10.67, bg: OFF, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 10.68} size={fit(6)} color={RED} rot={2}>MedCel</Slam></div>
  )},
  { at: DELAY + 11.6, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 11.61} size={290} color={OFF}>+65 mil</Slam>
      <div style={{ marginTop: 30 }}>
        <Band t={t} at={DELAY + 12.98} bg={RED} fg={OFF} size={56} rot={-2}>aulas só de extensivos</Band>
      </div>
    </div>
  )},
  { at: DELAY + 14.68, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 14.69} size={126} color={OFF} rot={-2}>O ano inteiro.</Slam>
      <Slam t={t} at={DELAY + 15.69} size={220} color={BLK} rot={-2} style={{ marginTop: 16 }}>Coberto.</Slam>
    </div>
  )},
  { at: DELAY + 16.55, bg: BLK, render: t => (
    <div style={{ ...Center, alignItems: 'flex-start', paddingLeft: 70, gap: 16 }}>
      <Slam t={t} at={DELAY + 16.56} size={116} color={OFF} style={{ whiteSpace: 'normal', maxWidth: 940 }}>
        De janeiro à prova.
      </Slam>
      <div>
        <Band t={t} at={DELAY + 17.81} bg={RED} fg={OFF} size={78} rot={-2}>num login só</Band>
      </div>
    </div>
  )},
  { at: DELAY + 18.89, bg: OFF, render: t => (
    <StampFinal t={t} at={DELAY + 19.97} extraAt={DELAY + 20.8}
      topLabel="O ano inteiro. Coberto." bottomLeft="+65 mil aulas de extensivo" bottomRight="teste grátis" />
  )},
];

export const C90_Extensivo: React.FC = () => (
  <ManifestoVideo beats={BEATS} audio="narration/c90.mp3" />
);
