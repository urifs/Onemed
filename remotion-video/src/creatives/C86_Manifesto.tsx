import React from 'react';
import timing from './timings/c86.json';
import {
  FPS, DELAY, RED, BLK, OFF, fit, Slam, Band, Center, Beat, StampFinal, Ticker, ManifestoVideo,
} from './manifesto';

/* ============================================================
   C86 — MANIFESTO (regravado em voz 100% pt-BR)
   "Chega. De escolher. Entre os grandes."
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const C86_DURATION = Math.round((DELAY + T.duration + 2.8) * FPS);

const CURSOS = ['Estratégia MED', 'MEDCurso', 'Medcof', 'MedCel', 'MedGrupo', 'Sanarflix'];

const BEATS: Beat[] = [
  { at: 0, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 0.1} size={244} color={OFF} rot={-2}>Chega.</Slam>
    </div>
  )},
  { at: DELAY + 0.85, bg: RED, render: t => (
    <div style={{ ...Center, alignItems: 'flex-start', paddingLeft: 70, gap: 8 }}>
      <Slam t={t} at={DELAY + 0.86} size={148} color={BLK}>Chega de</Slam>
      <Slam t={t} at={DELAY + 1.27} size={184} color={OFF}>escolher</Slam>
      <Slam t={t} at={DELAY + 1.69} size={114} color={BLK} style={{ marginTop: 26 }}>entre os</Slam>
      <Slam t={t} at={DELAY + 2.01} size={170} color={OFF}>grandes.</Slam>
    </div>
  )},
  { at: DELAY + 2.81, bg: OFF, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 2.82} size={fit(10)} color={BLK} rot={-3}>Estratégia</Slam>
      <Slam t={t} at={DELAY + 3.1} size={120} color={RED} rot={-3}>MED</Slam></div>
  )},
  { at: DELAY + 3.73, bg: BLK, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 3.74} size={fit(8)} color={OFF} rot={2}>MEDCurso</Slam></div>
  )},
  { at: DELAY + 4.86, bg: RED, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 4.87} size={fit(6)} color={OFF} rot={-2}>Medcof</Slam></div>
  )},
  { at: DELAY + 5.78, bg: OFF, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 5.79} size={fit(6)} color={RED} rot={2}>MedCel</Slam></div>
  )},
  { at: DELAY + 6.69, bg: BLK, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 6.7} size={fit(8)} color={OFF} rot={-2}>MedGrupo</Slam>
      <div style={{ width: 420, height: 16, background: RED, marginTop: 24 }} /></div>
  )},
  { at: DELAY + 7.71, bg: RED, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 7.72} size={fit(9)} color={BLK} rot={2}>Sanarflix</Slam></div>
  )},
  { at: DELAY + 8.86, bg: BLK, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 8.87} size={276} color={OFF}>Todos.</Slam></div>
  )},
  { at: DELAY + 9.58, bg: OFF, render: t => (
    <div style={{ ...Center, gap: 2 }}>
      {CURSOS.map((c, i) => (
        <Slam key={c} t={t} at={DELAY + 9.59 + i * 0.045} size={108} color={i % 2 ? RED : BLK}
          rot={i % 2 ? 0.8 : -0.8}>{c}</Slam>
      ))}
      <div style={{ position: 'absolute', left: -40, right: -40, top: '68%', transform: 'rotate(-4deg)' }}>
        <Band t={t} at={DELAY + 9.9} bg={RED} fg={OFF} size={92}>ao mesmo tempo</Band>
      </div>
    </div>
  )},
  { at: DELAY + 10.71, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 10.72} size={330} color={OFF}>14 mil</Slam>
      <div style={{ marginTop: 34 }}>
        <Band t={t} at={DELAY + 11.41} bg={BLK} fg={OFF} size={58} rot={-2}>aulas num curso só</Band>
      </div>
    </div>
  )},
  { at: DELAY + 12.8, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 12.81} size={330} color={OFF}>31 mil</Slam>
      <div style={{ marginTop: 34 }}>
        <Band t={t} at={DELAY + 13.37} bg={RED} fg={OFF} size={58} rot={2}>questões comentadas</Band>
      </div>
    </div>
  )},
  { at: DELAY + 14.73, bg: OFF, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 14.74} size={330} color={BLK}>9 mil</Slam>
      <div style={{ marginTop: 34 }}>
        <Band t={t} at={DELAY + 15.22} bg={RED} fg={OFF} size={72} rot={-2}>livros</Band>
      </div>
    </div>
  )},
  { at: DELAY + 16.0, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 16.01} size={520} color={OFF}>530</Slam>
      <div style={{ marginTop: 30 }}>
        <Band t={t} at={DELAY + 16.84} bg={BLK} fg={OFF} size={80} rot={2}>cursos</Band>
      </div>
    </div>
  )},
  { at: DELAY + 17.61, bg: BLK, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 17.62} size={300} color={OFF} rot={-2}>Tudo.</Slam></div>
  )},
  { at: DELAY + 18.18, bg: OFF, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 18.19} size={296} color={BLK} rot={2}>Numa.</Slam></div>
  )},
  { at: DELAY + 18.86, bg: RED, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 18.87} size={330} color={OFF} rot={-2}>Tela.</Slam></div>
  )},
  { at: DELAY + 19.47, bg: BLK, render: t => (
    <div style={{ ...Center, alignItems: 'flex-start', paddingLeft: 70, gap: 14 }}>
      <Slam t={t} at={DELAY + 19.48} size={104} color={OFF} style={{ whiteSpace: 'normal', maxWidth: 940 }}>
        E quando você trava,
      </Slam>
      <Slam t={t} at={DELAY + 20.6} size={116} color={OFF} style={{ whiteSpace: 'normal', maxWidth: 940 }}>
        a <span style={{ color: RED }}>máquina</span> estuda contigo.
      </Slam>
    </div>
  )},
  { at: DELAY + 22.15, bg: OFF, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 22.16} size={196} color={BLK} rot={-2}>Resumo.</Slam>
      <div style={{ marginTop: 34 }}>
        <Band t={t} at={DELAY + 22.96} bg={RED} fg={OFF} size={72} rot={-2}>num clique</Band>
      </div>
    </div>
  )},
  { at: DELAY + 23.9, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 23.91} size={162} color={OFF} rot={2}>Flashcards.</Slam>
      <div style={{ marginTop: 34 }}>
        <Band t={t} at={DELAY + 24.78} bg={BLK} fg={OFF} size={62} rot={2}>do teu material</Band>
      </div>
    </div>
  )},
  { at: DELAY + 25.92, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 25.93} size={132} color={OFF}>Um assistente</Slam>
      <div style={{ marginTop: 34 }}>
        <Band t={t} at={DELAY + 26.97} bg={RED} fg={OFF} size={74} rot={-2}>que lê a tela</Band>
      </div>
    </div>
  )},
  { at: DELAY + 28.01, bg: OFF, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 28.02} size={300} color={BLK}>10 mil</Slam>
      <div style={{ marginTop: 30 }}>
        <Band t={t} at={DELAY + 28.44} bg={BLK} fg={OFF} size={56} rot={-2}>médicos já entenderam</Band>
      </div>
    </div>
  )},
  { at: DELAY + 29.92, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 29.93} size={230} color={OFF} rot={-2}>Falta</Slam>
      <Slam t={t} at={DELAY + 30.32} size={252} color={BLK} rot={-2}>você.</Slam>
    </div>
  )},
  { at: DELAY + 30.96, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 30.97} size={280} color={OFF} rot={2}>Testa.</Slam>
      <div style={{ marginTop: 36 }}>
        <Band t={t} at={DELAY + 31.59} bg={RED} fg={OFF} size={92} rot={2}>de graça</Band>
      </div>
    </div>
  )},
  { at: DELAY + 32.49, bg: OFF, render: t => (
    <StampFinal t={t} at={DELAY + 32.51} extraAt={DELAY + 33.4}
      topLabel="Manifesto OneMed" bottomLeft="+530 cursos" bottomRight="teste grátis" />
  )},
];

export const C86_Manifesto: React.FC = () => (
  <ManifestoVideo
    beats={BEATS}
    audio="narration/c86.mp3"
    overlay={t => <Ticker t={t} from={DELAY + 2.81} to={DELAY + 10.6} items={CURSOS} />}
  />
);
