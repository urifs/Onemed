import React from 'react';
import timing from './timings/c91.json';
import {
  FPS, DELAY, RED, BLK, OFF, Slam, Band, Center, Beat, StampFinal, ManifestoVideo,
} from './manifesto';

/* ============================================================
   C91 — A PORTA
   Manifesto da decisão: você já sabe o que quer.
   O que falta é a porta — e ela está aberta.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const C91_DURATION = Math.round((DELAY + T.duration + 2.8) * FPS);

const BEATS: Beat[] = [
  { at: 0, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 0.1} size={168} color={OFF} rot={-2}>Você já sabe.</Slam>
      <div style={{ marginTop: 32 }}>
        <Band t={t} at={DELAY + 1.84} bg={RED} fg={OFF} size={62} rot={-2}>que precisa estudar</Band>
      </div>
    </div>
  )},
  { at: DELAY + 3.6, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 3.61} size={168} color={OFF} rot={2}>Você já sabe.</Slam>
      <div style={{ marginTop: 32 }}>
        <Band t={t} at={DELAY + 5.35} bg={BLK} fg={OFF} size={62} rot={2}>onde quer chegar</Band>
      </div>
    </div>
  )},
  { at: DELAY + 7.03, bg: OFF, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 7.04} size={176} color={BLK} rot={-2}>O que falta?</Slam>
    </div>
  )},
  { at: DELAY + 8.51, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 8.52} size={230} color={RED} rot={2}>A porta.</Slam>
    </div>
  )},
  { at: DELAY + 9.85, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 9.86} size={430} color={OFF}>+530</Slam>
      <div style={{ marginTop: 30 }}>
        <Band t={t} at={DELAY + 11.21} bg={BLK} fg={OFF} size={80} rot={-2}>cursos</Band>
      </div>
    </div>
  )},
  { at: DELAY + 12.5, bg: OFF, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 12.51} size={300} color={BLK}>+9.000</Slam>
      <div style={{ marginTop: 30 }}>
        <Band t={t} at={DELAY + 13.4} bg={RED} fg={OFF} size={80} rot={2}>livros</Band>
      </div>
    </div>
  )},
  { at: DELAY + 14.69, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 14.7} size={176} color={OFF} rot={-2}>Questões</Slam>
      <div style={{ marginTop: 28 }}>
        <Band t={t} at={DELAY + 15.18} bg={RED} fg={OFF} size={70} rot={-2}>comentadas</Band>
      </div>
    </div>
  )},
  { at: DELAY + 16.76, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 16.77} size={152} color={OFF} rot={2}>Ferramentas</Slam>
      <div style={{ marginTop: 28 }}>
        <Band t={t} at={DELAY + 17.63} bg={BLK} fg={OFF} size={54} rot={2}>com inteligência artificial</Band>
      </div>
    </div>
  )},
  { at: DELAY + 19.66, bg: OFF, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 19.67} size={300} color={BLK}>10 mil</Slam>
      <div style={{ marginTop: 30 }}>
        <Band t={t} at={DELAY + 20.19} bg={BLK} fg={OFF} size={58} rot={-2}>médicos já entraram</Band>
      </div>
    </div>
  )},
  { at: DELAY + 22.01, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 22.02} size={190} color={OFF} rot={-2}>A porta</Slam>
      <Slam t={t} at={DELAY + 22.66} size={172} color={RED} rot={-2} style={{ marginTop: 16 }}>tá aberta.</Slam>
    </div>
  )},
  { at: DELAY + 23.89, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 23.9} size={160} color={OFF} rot={2}>E o teste</Slam>
      <Slam t={t} at={DELAY + 24.66} size={250} color={BLK} rot={2} style={{ marginTop: 16 }}>é grátis.</Slam>
    </div>
  )},
  { at: DELAY + 26.1, bg: OFF, render: t => (
    <StampFinal t={t} at={DELAY + 26.12} extraAt={DELAY + 27.0}
      topLabel="A porta tá aberta" bottomLeft="+530 cursos · +9.000 livros" bottomRight="teste grátis" />
  )},
];

export const C91_Porta: React.FC = () => (
  <ManifestoVideo beats={BEATS} audio="narration/c91.mp3" />
);
