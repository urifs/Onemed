import React from 'react';
import timing from './timings/c87.json';
import {
  FPS, DELAY, RED, BLK, OFF, fit, Slam, Band, Center, Beat, StampFinal, ManifestoVideo,
} from './manifesto';

/* ============================================================
   C87 — SETE
   Manifesto da fragmentação: sete de tudo × um login.
   O "7" gigante martela; o "1" responde.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const C87_DURATION = Math.round((DELAY + T.duration + 2.8) * FPS);

/* laje-numeral: o 7 enorme com a etiqueta do que se repete */
const Sete: React.FC<{ t: number; at: number; bandAt: number; fg: string; bandBg: string; bandFg: string; label: string }> =
  ({ t, at, bandAt, fg, bandBg, bandFg, label }) => (
    <div style={Center}>
      <Slam t={t} at={at} size={560} color={fg}>7</Slam>
      <div style={{ marginTop: 24 }}>
        <Band t={t} at={bandAt} bg={bandBg} fg={bandFg} size={84} rot={-2}>{label}</Band>
      </div>
    </div>
  );

const BEATS: Beat[] = [
  { at: 0, bg: BLK, render: t => (
    <Sete t={t} at={DELAY + 0.1} bandAt={DELAY + 0.51} fg={OFF} bandBg={RED} bandFg={OFF} label="plataformas" />
  )},
  { at: DELAY + 2.13, bg: RED, render: t => (
    <Sete t={t} at={DELAY + 2.14} bandAt={DELAY + 2.58} fg={OFF} bandBg={BLK} bandFg={OFF} label="senhas" />
  )},
  { at: DELAY + 3.89, bg: OFF, render: t => (
    <Sete t={t} at={DELAY + 3.9} bandAt={DELAY + 4.31} fg={BLK} bandBg={RED} bandFg={OFF} label="boletos" />
  )},
  { at: DELAY + 5.69, bg: BLK, render: t => (
    <Sete t={t} at={DELAY + 5.7} bandAt={DELAY + 6.13} fg={RED} bandBg={OFF} bandFg={BLK} label="abas abertas" />
  )},
  { at: DELAY + 7.8, bg: RED, render: t => (
    <div style={{ ...Center, alignItems: 'flex-start', paddingLeft: 70, gap: 14 }}>
      <Slam t={t} at={DELAY + 7.81} size={112} color={BLK} style={{ whiteSpace: 'normal', maxWidth: 940 }}>
        E você,
      </Slam>
      <Slam t={t} at={DELAY + 8.59} size={112} color={OFF} style={{ whiteSpace: 'normal', maxWidth: 940 }}>
        tentando estudar no meio disso.
      </Slam>
    </div>
  )},
  { at: DELAY + 11.03, bg: BLK, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 11.04} size={296} color={OFF} rot={-2}>Para.</Slam></div>
  )},
  { at: DELAY + 12.16, bg: OFF, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 12.17} size={560} color={RED}>1</Slam>
      <div style={{ marginTop: 24 }}>
        <Band t={t} at={DELAY + 12.42} bg={BLK} fg={OFF} size={84} rot={-2}>plataforma</Band>
      </div>
    </div>
  )},
  { at: DELAY + 13.96, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 13.97} size={560} color={OFF}>1</Slam>
      <div style={{ marginTop: 24 }}>
        <Band t={t} at={DELAY + 14.14} bg={BLK} fg={OFF} size={84} rot={2}>login</Band>
      </div>
    </div>
  )},
  { at: DELAY + 15.34, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 15.35} size={390} color={OFF}>+530</Slam>
      <div style={{ marginTop: 30 }}>
        <Band t={t} at={DELAY + 16.71} bg={RED} fg={OFF} size={80} rot={-2}>cursos</Band>
      </div>
    </div>
  )},
  { at: DELAY + 18.03, bg: OFF, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 18.04} size={fit(10)} color={BLK} rot={-3}>Estratégia</Slam></div>
  )},
  { at: DELAY + 19.6, bg: RED, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 19.61} size={fit(8)} color={OFF} rot={2}>MEDCurso</Slam></div>
  )},
  { at: DELAY + 21.4, bg: BLK, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 21.41} size={fit(6)} color={OFF} rot={-2}>Medcof</Slam></div>
  )},
  { at: DELAY + 22.87, bg: OFF, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 22.88} size={200} color={BLK} rot={-1}>Todos</Slam>
      <Slam t={t} at={DELAY + 23.24} size={150} color={RED} rot={-1} style={{ marginTop: 12 }}>lá dentro.</Slam>
    </div>
  )},
  { at: DELAY + 24.61, bg: BLK, render: t => (
    <div style={{ ...Center, alignItems: 'flex-start', paddingLeft: 70, gap: 16 }}>
      <Slam t={t} at={DELAY + 24.62} size={104} color={OFF} style={{ whiteSpace: 'normal', maxWidth: 940 }}>
        Você não administra mais cadastros.
      </Slam>
      <Slam t={t} at={DELAY + 27.35} size={132} color={RED}>Você estuda.</Slam>
    </div>
  )},
  { at: DELAY + 28.98, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 28.99} size={200} color={OFF} rot={-2}>Simples</Slam>
      <Slam t={t} at={DELAY + 29.43} size={230} color={BLK} rot={-2}>assim.</Slam>
    </div>
  )},
  { at: DELAY + 30.67, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 30.68} size={250} color={OFF} rot={2}>Testa.</Slam>
      <div style={{ marginTop: 36 }}>
        <Band t={t} at={DELAY + 31.12} bg={RED} fg={OFF} size={92} rot={2}>de graça</Band>
      </div>
    </div>
  )},
  { at: DELAY + 32.4, bg: OFF, render: t => (
    <StampFinal t={t} at={DELAY + 32.42} extraAt={DELAY + 33.3}
      topLabel="1 login. Tudo." bottomLeft="+530 cursos" bottomRight="teste grátis" />
  )},
];

export const C87_Sete: React.FC = () => (
  <ManifestoVideo beats={BEATS} audio="narration/c87.mp3" />
);
