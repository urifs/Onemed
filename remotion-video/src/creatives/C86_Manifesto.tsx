import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/c86.json';

/* ============================================================
   C86 — MANIFESTO
   Sistema visual: tipografia cinética brutalista. A palavra
   falada É a tela: lajes de cor chapada (vermelho/preto/cru),
   cortes secos no ritmo da voz, tipo gigante sangrando na
   borda. Sem cards, sem legenda, sem encerramento padrão.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const C86_DURATION = Math.round((DELAY + T.duration + 2.8) * FPS);

const RED = '#e8302a';
const BLK = '#0d0d0d';
const OFF = '#f5f2ec';

const BRUT = "'Archivo Black', 'Inter', 'Helvetica Neue', Arial, sans-serif";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const outExpo = (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));

/* tamanho que enche a laje: sangra de propósito nas palavras longas */
const fit = (chars: number, max = 330, avail = 1170) => Math.min(max, avail / (0.58 * chars));

/* palavra-marretada: aparece dura, assenta de 1.26x pra 1 em ~5 frames */
const Slam: React.FC<{
  t: number; at: number; children: React.ReactNode;
  size: number; color: string; rot?: number; style?: React.CSSProperties;
}> = ({ t, at, children, size, color, rot = 0, style }) => {
  if (t < at) return null;
  const p = outExpo(win(t, at, at + 0.16));
  return (
    <div style={{
      fontFamily: BRUT, fontWeight: 900, textTransform: 'uppercase',
      fontSize: size, color, lineHeight: 0.92, letterSpacing: '-0.02em',
      transform: `scale(${1.26 - 0.26 * p}) rotate(${rot * (0.6 + 0.4 * p)}deg)`,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {children}
    </div>
  );
};

/* faixa-carimbo: banda de cor atrás/embaixo de uma linha */
const Band: React.FC<{ t: number; at: number; bg: string; fg: string; size?: number; children: React.ReactNode; rot?: number }> =
  ({ t, at, bg, fg, size = 54, children, rot = 0 }) => {
    if (t < at) return null;
    const p = outExpo(win(t, at, at + 0.2));
    return (
      <div style={{
        display: 'inline-block', background: bg, color: fg, padding: '18px 34px',
        fontFamily: BRUT, fontWeight: 900, textTransform: 'uppercase', fontSize: size,
        letterSpacing: '0.02em', lineHeight: 1,
        transform: `rotate(${rot}deg) scaleX(${0.9 + 0.1 * p})`, transformOrigin: 'left center',
        opacity: p > 0 ? 1 : 0,
      }}>
        {children}
      </div>
    );
  };

const CURSOS = ['Estratégia MED', 'MEDCurso', 'Medcof', 'MedCel', 'MedGrupo', 'Sanarflix'];

/* ---------- as lajes (uma por batida da voz; corte seco entre elas) ---------- */
type Beat = { at: number; bg: string; render: (t: number) => React.ReactNode };

const Center: React.CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
};

const BEATS: Beat[] = [
  /* CHEGA. */
  { at: 0, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 0.05} size={244} color={OFF} rot={-2}>Chega.</Slam>
    </div>
  )},
  /* CHEGA DE ESCOLHER / ENTRE OS GRANDES */
  { at: DELAY + 0.79, bg: RED, render: t => (
    <div style={{ ...Center, alignItems: 'flex-start', paddingLeft: 70, gap: 8 }}>
      <Slam t={t} at={DELAY + 0.8} size={148} color={BLK}>Chega de</Slam>
      <Slam t={t} at={DELAY + 1.25} size={184} color={OFF}>escolher</Slam>
      <Slam t={t} at={DELAY + 1.69} size={114} color={BLK} style={{ marginTop: 26 }}>entre os</Slam>
      <Slam t={t} at={DELAY + 1.98} size={170} color={OFF}>grandes.</Slam>
    </div>
  )},
  /* nomes — um por laje, cores alternadas, tipo sangrando */
  { at: DELAY + 2.84, bg: OFF, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 2.85} size={fit(10)} color={BLK} rot={-3}>Estratégia</Slam>
      <Slam t={t} at={DELAY + 3.1} size={120} color={RED} rot={-3}>MED</Slam></div>
  )},
  { at: DELAY + 3.99, bg: BLK, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 4.0} size={fit(8)} color={OFF} rot={2}>MEDCurso</Slam></div>
  )},
  { at: DELAY + 5.16, bg: RED, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 5.17} size={fit(6)} color={OFF} rot={-2}>Medcof</Slam></div>
  )},
  { at: DELAY + 6.08, bg: OFF, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 6.09} size={fit(6)} color={RED} rot={2}>MedCel</Slam></div>
  )},
  { at: DELAY + 7.05, bg: BLK, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 7.06} size={fit(8)} color={OFF} rot={-2}>MedGrupo</Slam>
      <div style={{ width: 420, height: 16, background: RED, marginTop: 24 }} /></div>
  )},
  { at: DELAY + 8.13, bg: RED, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 8.14} size={fit(9)} color={BLK} rot={2}>Sanarflix</Slam></div>
  )},
  /* TODOS. + grade "AO MESMO TEMPO" */
  { at: DELAY + 9.31, bg: BLK, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 9.32} size={276} color={OFF}>Todos.</Slam></div>
  )},
  { at: DELAY + 9.82, bg: OFF, render: t => (
    <div style={{ ...Center, gap: 2 }}>
      {CURSOS.map((c, i) => (
        <Slam key={c} t={t} at={DELAY + 9.83 + i * 0.045} size={108} color={i % 2 ? RED : BLK}
          rot={i % 2 ? 0.8 : -0.8}>{c}</Slam>
      ))}
      <div style={{ position: 'absolute', left: -40, right: -40, top: '68%', transform: 'rotate(-4deg)' }}>
        <Band t={t} at={DELAY + 10.0} bg={RED} fg={OFF} size={92}>ao mesmo tempo</Band>
      </div>
    </div>
  )},
  /* números */
  { at: DELAY + 11.07, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 11.08} size={330} color={OFF}>14 mil</Slam>
      <div style={{ marginTop: 34 }}>
        <Band t={t} at={DELAY + 11.77} bg={BLK} fg={OFF} size={58} rot={-2}>aulas num curso só</Band>
      </div>
    </div>
  )},
  { at: DELAY + 13.27, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 13.28} size={330} color={OFF}>31 mil</Slam>
      <div style={{ marginTop: 34 }}>
        <Band t={t} at={DELAY + 14.06} bg={RED} fg={OFF} size={58} rot={2}>questões comentadas</Band>
      </div>
    </div>
  )},
  { at: DELAY + 15.62, bg: OFF, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 15.63} size={330} color={BLK}>9 mil</Slam>
      <div style={{ marginTop: 34 }}>
        <Band t={t} at={DELAY + 16.17} bg={RED} fg={OFF} size={72} rot={-2}>livros</Band>
      </div>
    </div>
  )},
  { at: DELAY + 17.06, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 17.07} size={520} color={OFF}>530</Slam>
      <div style={{ marginTop: 30 }}>
        <Band t={t} at={DELAY + 18.03} bg={BLK} fg={OFF} size={80} rot={2}>cursos</Band>
      </div>
    </div>
  )},
  /* TUDO / NUMA / TELA — três cortes secos */
  { at: DELAY + 18.88, bg: BLK, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 18.89} size={300} color={OFF} rot={-2}>Tudo.</Slam></div>
  )},
  { at: DELAY + 19.51, bg: OFF, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 19.52} size={296} color={BLK} rot={2}>Numa.</Slam></div>
  )},
  { at: DELAY + 20.17, bg: RED, render: t => (
    <div style={Center}><Slam t={t} at={DELAY + 20.18} size={330} color={OFF} rot={-2}>Tela.</Slam></div>
  )},
  /* parágrafo-manifesto */
  { at: DELAY + 20.84, bg: BLK, render: t => (
    <div style={{ ...Center, alignItems: 'flex-start', paddingLeft: 70, gap: 14 }}>
      <Slam t={t} at={DELAY + 20.86} size={104} color={OFF} style={{ whiteSpace: 'normal', maxWidth: 940 }}>
        E quando você trava,
      </Slam>
      <Slam t={t} at={DELAY + 21.9} size={116} color={OFF} style={{ whiteSpace: 'normal', maxWidth: 940 }}>
        a <span style={{ color: RED }}>máquina</span> estuda contigo.
      </Slam>
    </div>
  )},
  /* ferramentas */
  { at: DELAY + 23.75, bg: OFF, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 23.76} size={196} color={BLK} rot={-2}>Resumo.</Slam>
      <div style={{ marginTop: 34 }}>
        <Band t={t} at={DELAY + 24.63} bg={RED} fg={OFF} size={72} rot={-2}>num clique</Band>
      </div>
    </div>
  )},
  { at: DELAY + 25.62, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 25.63} size={162} color={OFF} rot={2}>Flashcards.</Slam>
      <div style={{ marginTop: 34 }}>
        <Band t={t} at={DELAY + 26.72} bg={BLK} fg={OFF} size={62} rot={2}>do teu material</Band>
      </div>
    </div>
  )},
  { at: DELAY + 28.03, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 28.04} size={132} color={OFF}>Um assistente</Slam>
      <div style={{ marginTop: 34 }}>
        <Band t={t} at={DELAY + 29.35} bg={RED} fg={OFF} size={74} rot={-2}>que lê a tela</Band>
      </div>
    </div>
  )},
  /* prova social + chamada */
  { at: DELAY + 30.42, bg: OFF, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 30.43} size={300} color={BLK}>10 mil</Slam>
      <div style={{ marginTop: 30 }}>
        <Band t={t} at={DELAY + 30.91} bg={BLK} fg={OFF} size={56} rot={-2}>médicos já entenderam</Band>
      </div>
    </div>
  )},
  { at: DELAY + 32.55, bg: RED, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 32.56} size={230} color={OFF} rot={-2}>Falta</Slam>
      <Slam t={t} at={DELAY + 33.05} size={252} color={BLK} rot={-2}>você.</Slam>
    </div>
  )},
  { at: DELAY + 33.76, bg: BLK, render: t => (
    <div style={Center}>
      <Slam t={t} at={DELAY + 33.77} size={280} color={OFF} rot={2}>Testa.</Slam>
      <div style={{ marginTop: 36 }}>
        <Band t={t} at={DELAY + 34.58} bg={RED} fg={OFF} size={92} rot={2}>de graça</Band>
      </div>
    </div>
  )},
  /* carimbo final em diagonal — nada de end card padrão */
  { at: DELAY + 35.58, bg: OFF, render: t => {
    const p = outExpo(win(t, DELAY + 35.6, DELAY + 35.98));
    const q = outExpo(win(t, DELAY + 36.5, DELAY + 37.0));
    return (
      <div style={Center}>
        <div style={{
          position: 'absolute', left: -160, right: -160, top: '38%', height: 300,
          background: RED, transform: `rotate(-8deg) scaleX(${p})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 30px 80px rgba(13,13,13,0.28)',
        }}>
          <div style={{
            fontFamily: BRUT, fontWeight: 900, fontSize: 88, color: OFF,
            letterSpacing: '-0.01em', transform: `scale(${1.35 - 0.35 * outExpo(win(t, DELAY + 35.75, DELAY + 36.05))})`,
            opacity: t > DELAY + 35.75 ? 1 : 0,
          }}>
            onemedcursos.com.br
          </div>
        </div>
        <div style={{
          position: 'absolute', top: 120, left: 70, opacity: q,
          fontFamily: BRUT, fontWeight: 900, textTransform: 'uppercase',
          fontSize: 40, color: BLK, letterSpacing: '0.12em',
        }}>
          Manifesto OneMed
        </div>
        <div style={{
          position: 'absolute', bottom: 130, left: 70, right: 70, opacity: q,
          display: 'flex', justifyContent: 'space-between',
          fontFamily: BRUT, fontWeight: 900, textTransform: 'uppercase',
          fontSize: 34, color: BLK, letterSpacing: '0.08em',
        }}>
          <span>+530 cursos</span>
          <span style={{ color: RED }}>teste grátis</span>
        </div>
      </div>
    );
  }},
];

/* letreiro de nomes durante a sequência dos grandes */
const Ticker: React.FC<{ t: number }> = ({ t }) => {
  if (t < DELAY + 2.84 || t > DELAY + 10.9) return null;
  const fita = CURSOS.concat(CURSOS, CURSOS).join('  •  ');
  const x = -((t - (DELAY + 2.84)) * 320) % 2400;
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, height: 92,
      background: BLK, display: 'flex', alignItems: 'center', overflow: 'hidden',
      borderTop: `10px solid ${RED}`,
    }}>
      <div style={{
        fontFamily: BRUT, fontWeight: 900, textTransform: 'uppercase', fontSize: 44,
        color: OFF, whiteSpace: 'nowrap', transform: `translateX(${x}px)`, letterSpacing: '0.04em',
      }}>
        {fita} • {fita}
      </div>
    </div>
  );
};

export const C86_Manifesto: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  /* corte seco: só a laje ativa existe */
  let idx = 0;
  for (let i = 0; i < BEATS.length; i++) if (t >= BEATS[i].at) idx = i;
  const beat = BEATS[idx];

  /* micro-impacto no corte: a tela inteira assenta de 1.02x */
  const settle = 1.02 - 0.02 * outExpo(win(t, beat.at, beat.at + 0.2));

  return (
    <AbsoluteFill style={{ background: beat.bg }}>
      <AbsoluteFill style={{ transform: `scale(${settle})`, overflow: 'hidden' }}>
        {beat.render(t)}
      </AbsoluteFill>
      <Ticker t={t} />
      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/c86.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
