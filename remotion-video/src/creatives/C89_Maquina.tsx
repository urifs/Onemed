import React from 'react';
import timing from './timings/c89.json';
import {
  FPS, DELAY, RED, BLK, OFF, Slam, Band, Center, Beat, StampFinal, ManifestoVideo,
} from './manifesto';

/* ============================================================
   C89 — A MÁQUINA
   Manifesto das ferramentas: você cansa, a máquina não.
   As quatro ferramentas de IA em lajes, os cursos por baixo.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const C89_DURATION = Math.round((DELAY + T.duration + 2.8) * FPS);

const BEATS: Beat[] = [
  { at: 0, bg: OFF, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 0.1} size={210} color={BLK} rot={-2}>Você cansa.</Slam>
    </div>
  )},
  { at: DELAY + 1.75, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 1.76} size={170} color={OFF} rot={2}>A máquina</Slam>
      <Slam t={t} at={DELAY + 2.28} size={280} color={RED} rot={2} style={{ marginTop: 16 }}>não.</Slam>
    </div>
  )},
  { at: DELAY + 3.35, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 3.36} size={196} color={OFF} rot={-2}>Resumo.</Slam>
      <div style={{ marginTop: 34 }}>
        <Band t={t} at={DELAY + 4.72} bg={BLK} fg={OFF} size={72} rot={-2}>num clique</Band>
      </div>
    </div>
  )},
  { at: DELAY + 6.17, bg: OFF, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 6.18} size={162} color={BLK} rot={2}>Flashcards.</Slam>
      <div style={{ marginTop: 34 }}>
        <Band t={t} at={DELAY + 7.69} bg={RED} fg={OFF} size={56} rot={2}>do teu próprio material</Band>
      </div>
    </div>
  )},
  { at: DELAY + 8.95, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 8.96} size={150} color={OFF} rot={-2}>Cronograma.</Slam>
      <div style={{ marginTop: 32 }}>
        <Band t={t} at={DELAY + 10.41} bg={RED} fg={OFF} size={62} rot={-2}>com mapa mental</Band>
      </div>
      <div style={{ marginTop: 18 }}>
        <Band t={t} at={DELAY + 12.2} bg={OFF} fg={BLK} size={62} rot={2}>feito pra tua prova</Band>
      </div>
    </div>
  )},
  { at: DELAY + 14.21, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 14.22} size={140} color={OFF}>Um assistente</Slam>
      <div style={{ marginTop: 32 }}>
        <Band t={t} at={DELAY + 15.83} bg={BLK} fg={OFF} size={62} rot={-2}>que lê a tela contigo</Band>
      </div>
    </div>
  )},
  { at: DELAY + 17.96, bg: OFF, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 17.97} size={104} color={BLK}>Isso em cima de</Slam>
      <Slam t={t} at={DELAY + 18.77} size={330} color={RED} style={{ marginTop: 18 }}>+530</Slam>
      <Slam t={t} at={DELAY + 20.17} size={170} color={BLK} style={{ marginTop: 12 }}>cursos.</Slam>
      <div style={{ marginTop: 28, display: 'flex', gap: 20 }}>
        <Band t={t} at={DELAY + 21.51} bg={BLK} fg={OFF} size={58} rot={-2}>os grandes</Band>
        <Band t={t} at={DELAY + 23.14} bg={RED} fg={OFF} size={58} rot={2}>todos</Band>
      </div>
    </div>
  )},
  { at: DELAY + 24.46, bg: BLK, render: t => (
    <div style={{ ...Center, alignItems: 'flex-start', paddingLeft: 70, gap: 16 }}>
      <Slam t={t} at={DELAY + 24.47} size={128} color={OFF}>Estudar pesado.</Slam>
      <Slam t={t} at={DELAY + 26.27} size={110} color={RED} style={{ whiteSpace: 'normal', maxWidth: 940 }}>
        Sem carregar o peso.
      </Slam>
    </div>
  )},
  { at: DELAY + 28.24, bg: OFF, render: t => (
    <StampFinal t={t} at={DELAY + 29.97} extraAt={DELAY + 30.8}
      topLabel="A máquina estuda contigo" bottomLeft="4 ferramentas de IA" bottomRight="testa de graça" />
  )},
];

export const C89_Maquina: React.FC = () => (
  <ManifestoVideo beats={BEATS} audio="narration/c89.mp3" />
);
