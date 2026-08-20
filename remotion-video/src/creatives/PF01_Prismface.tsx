import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/pf.json';
import {
  FPS, DELAY, FontesPrism, AREIA, PORCELANA, LINHO, ROSA, CAFE, TAUPE, SALVIA,
  DISPLAY, SANS, FundoPrism, Arco, Celular, Eyebrow, Titulo, Chip, VarreduraArco,
  win, outB, suave, surge,
} from './prismkit';

/* ============================================================
   PF01 — prism.face: um único filme de demonstração.
   Telas reais da plataforma dentro de um celular, no sistema
   visual do próprio produto (areia · Prata · arco de 180°).
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const PF01_DURATION = Math.round((DELAY + T.duration + 4.6) * FPS);

type Cap = {
  at: number; fim: number; take?: string; from?: number;
  eyebrow: string; titulo: React.ReactNode;
  chips?: Array<[number, number, React.ReactNode]>;
  zoom?: [number, number];        /* escala inicial → final do celular */
  desloca?: [number, number];     /* deslocamento vertical inicial → final */
};

const D = DELAY;
const CAPS: Cap[] = [
  {
    at: D + 3.2, fim: D + 7.9, take: 't_landing', from: 1.6,
    eyebrow: 'leitura de pele personalizada',
    titulo: <>Sua pele,<br />lida com cuidado</>,
    chips: [[D + 4.6, D + 7.7, 'menos de um minuto, pelo seu celular']],
    zoom: [0.98, 1.03], desloca: [30, -10],
  },
  {
    at: D + 7.9, fim: D + 13.0, take: 't_painel', from: 3.0,
    eyebrow: 'seu espaço',
    titulo: <>Tudo começa<br />por você</>,
    chips: [[D + 8.6, D + 12.8, 'sua conta, seu histórico, seu ritmo']],
    zoom: [1.0, 1.05], desloca: [10, -26],
  },
  {
    at: D + 13.0, fim: D + 19.6, take: 't_metodo', from: 3.0,
    eyebrow: 'o método',
    titulo: <>O que a sua pele<br />já viveu</>,
    chips: [[D + 13.4, D + 19.4, 'idade · rotina · sensibilidade · gestação · orçamento']],
    zoom: [1.0, 1.06], desloca: [10, -46],
  },
  {
    at: D + 19.6, fim: D + 23.2, take: 't_prep', from: 1.2,
    eyebrow: 'preparação',
    titulo: <>Um minuto para a<br />sua melhor leitura</>,
    chips: [[D + 20.2, D + 23.0, 'rosto limpo · luz natural · celular na altura dos olhos']],
    zoom: [1.0, 1.04], desloca: [0, -24],
  },
  {
    at: D + 23.2, fim: D + 29.4, take: 't_captura', from: 11.0,
    eyebrow: 'captura guiada por voz',
    titulo: <>Cinco poses.<br />A voz conduz.</>,
    chips: [
      [D + 24.2, D + 27.4, 'frente · lados · cima · baixo'],
      [D + 27.7, D + 29.2, 'um aviso sonoro confirma cada foto'],
    ],
    zoom: [1.02, 1.07], desloca: [-10, -34],
  },
  {
    at: D + 29.4, fim: D + 35.4, take: 't_captura', from: 20.0,
    eyebrow: 'sem precisar olhar a tela',
    titulo: <>A voz pede,<br />o som confirma</>,
    chips: [[D + 31.9, D + 35.2, 'nenhum vídeo é gravado — só as fotos de cada pose']],
    zoom: [1.03, 1.08], desloca: [-14, -40],
  },
  {
    at: D + 35.4, fim: D + 38.6, take: 't_leitura', from: 5.2,
    eyebrow: 'sua leitura de pele',
    titulo: <>Seu rosto vira<br />um mapa</>,
    zoom: [1.04, 1.09], desloca: [-16, -44],
  },
  {
    at: D + 38.6, fim: D + 56.0, take: 't_leitura', from: 9.8,
    eyebrow: 'região por região',
    titulo: <>O que foi visto,<br />e como cuidar</>,
    chips: [
      [D + 39.0, D + 41.8, 'cada região com o seu achado'],
      [D + 42.0, D + 48.0, 'testa · olhos · bochechas · queixo'],
      [D + 48.3, D + 52.4, 'de onde vem e como vamos cuidar'],
      [D + 52.6, D + 55.8, 'sem jargão: leve, moderada, intensa'],
    ],
    zoom: [1.0, 1.09], desloca: [10, -70],
  },
  {
    at: D + 56.0, fim: D + 79.2, take: 't_ritualdet', from: 7.0,
    eyebrow: 'seu ritual',
    titulo: <>Manhã e noite,<br />passo a passo</>,
    chips: [
      [D + 58.4, D + 63.0, 'produtos reais, vendidos no Brasil'],
      [D + 63.2, D + 65.6, 'três faixas de preço — a sua já vem aberta'],
      [D + 65.8, D + 69.8, 'quantidade · modo de uso · tempo de espera'],
      [D + 70.0, D + 76.6, 'suplementos com o nível de evidência dito com franqueza'],
      [D + 76.9, D + 79.0, 'o que exige receita vira um resumo para o dermatologista'],
    ],
    zoom: [1.0, 1.09], desloca: [10, -80],
  },
  {
    at: D + 79.2, fim: D + 92.0, take: 't_ritual', from: 1.0,
    eyebrow: 'seu cronograma',
    titulo: <>A plataforma<br />acompanha seu dia</>,
    chips: [
      [D + 80.6, D + 85.2, 'ritual da manhã · ritual da noite'],
      [D + 85.5, D + 88.1, 'lembretes na hora que você escolheu'],
      [D + 88.4, D + 91.8, 'cada passo tem seu tempo — inclusive o de espera'],
    ],
    zoom: [1.0, 1.06], desloca: [0, -50],
  },
  {
    at: D + 92.0, fim: D + 98.0, take: 't_notif', from: 1.0,
    eyebrow: 'a cada semana',
    titulo: <>Uma nova leitura,<br />o que mudou</>,
    chips: [[D + 93.0, D + 97.8, 'comparação região por região, semana a semana']],
    zoom: [1.0, 1.05], desloca: [0, -26],
  },
  {
    at: D + 98.0, fim: D + 105.2, take: 't_jornada2', from: 15.0,
    eyebrow: 'minha jornada',
    titulo: <>Dias de ritual,<br />sequência, evolução</>,
    chips: [[D + 99.0, D + 105.0, 'sua história de pele, num só lugar']],
    zoom: [1.0, 1.07], desloca: [10, -56],
  },
  {
    at: D + 105.2, fim: D + 115.0, take: 't_config', from: 3.0,
    eyebrow: 'privacidade',
    titulo: <>Suas fotos são<br />dado biométrico</>,
    chips: [
      [D + 106.0, D + 109.4, 'consentimento próprio e área privada'],
      [D + 109.7, D + 114.8, 'você pode apagar tudo quando quiser'],
    ],
    zoom: [1.0, 1.05], desloca: [0, -30],
  },
];

const fimUltimo = CAPS[CAPS.length - 1].fim;
const FIM_S = PF01_DURATION / FPS;

export const PF01_Prismface: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const cap = CAPS.find(c => t >= c.at - 0.5 && t < c.fim + 0.5);
  const iAtual = cap ? CAPS.indexOf(cap) : -1;
  const progresso = cap ? win(t, cap.at, cap.fim) : 0;

  /* abertura */
  const pAbre = outB(win(t, D + 0.15, D + 1.2));
  const abreSai = 1 - suave(win(t, D + 2.6, D + 3.4));

  /* fecho */
  const fechoAt = fimUltimo;
  const pFecho = outB(win(t, fechoAt + 0.2, fechoAt + 1.2));

  return (
    <AbsoluteFill style={{ background: AREIA }}>
      <FontesPrism />
      <FundoPrism t={t} />

      {/* ---------- corpo: capítulo atual ---------- */}
      {cap && (
        <>
          {/* cabeçalho do capítulo */}
          <div style={{ position: 'absolute', top: 118, left: 80, right: 80, ...surge(t, cap.at, 0.7) }}>
            <Eyebrow>{cap.eyebrow}</Eyebrow>
            <Titulo style={{ marginTop: 14 }}>{cap.titulo}</Titulo>
          </div>

          {/* celular com a tela real */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 415,
            display: 'flex', justifyContent: 'center',
            opacity: outB(win(t, cap.at, cap.at + 0.55)) * (1 - suave(win(t, cap.fim - 0.35, cap.fim))),
          }}>
            <Sequence from={Math.round(cap.at * FPS)} layout="none">
              <Celular
                take={cap.take!}
                from={cap.from ?? 0}
                largura={580}
                escala={(cap.zoom?.[0] ?? 1) + ((cap.zoom?.[1] ?? 1) - (cap.zoom?.[0] ?? 1)) * suave(progresso)}
                desloca={(cap.desloca?.[0] ?? 0) + ((cap.desloca?.[1] ?? 0) - (cap.desloca?.[0] ?? 0)) * suave(progresso)}
              />
            </Sequence>
          </div>

          {/* chips de apoio */}
          {cap.chips?.map(([a, b, txt], i) => (
            <Chip key={i} t={t} at={a} ate={b} bottom={96}>{txt}</Chip>
          ))}

          {/* arco de progresso do filme, no rodapé */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 26, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Arco progresso={win(t, D, fimUltimo)} largura={190} espessura={3} />
            <div style={{
              fontFamily: SANS, fontSize: 21, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: TAUPE, opacity: 0.75, marginTop: -6,
            }}>prism.face</div>
          </div>
        </>
      )}

      {/* ---------- transições entre capítulos ---------- */}
      {CAPS.slice(1).map((c, i) => (
        <VarreduraArco key={i} t={t} at={c.at - 0.5} />
      ))}

      {/* ---------- abertura ---------- */}
      {t < D + 3.5 && (
        <AbsoluteFill style={{
          background: AREIA, opacity: abreSai,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 42,
        }}>
          <FundoPrism t={t} />
          <div style={{ opacity: pAbre, transform: `translateY(${(1 - pAbre) * 20}px)`, textAlign: 'center' }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 104, color: CAFE, letterSpacing: '-0.02em' }}>
              prism.face
            </div>
            <div style={{ marginTop: 26, display: 'flex', justifyContent: 'center' }}>
              <Arco progresso={win(t, D + 0.7, D + 2.6)} largura={360} espessura={4} />
            </div>
            <div style={{
              marginTop: 30, fontFamily: SANS, fontSize: 30, color: TAUPE, letterSpacing: '0.06em',
              opacity: outB(win(t, D + 1.5, D + 2.2)),
            }}>
              toda pele conta uma história
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ---------- fecho ---------- */}
      {t >= fechoAt && (
        <AbsoluteFill style={{
          background: AREIA, opacity: pFecho,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <FundoPrism t={t} />
          <div style={{ textAlign: 'center', transform: `translateY(${(1 - pFecho) * 18}px)` }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 96, color: CAFE, letterSpacing: '-0.02em' }}>
              prism.face
            </div>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
              <Arco progresso={outB(win(t, fechoAt + 0.6, fechoAt + 2.4))} largura={330} espessura={4} />
            </div>
            <div style={{
              marginTop: 34, fontFamily: DISPLAY, fontSize: 52, color: CAFE, lineHeight: 1.25,
              opacity: outB(win(t, fechoAt + 1.2, fechoAt + 2.0)),
            }}>
              Sua pele, lida com o<br />cuidado que ela merece
            </div>
            <div style={{
              marginTop: 30, fontFamily: SANS, fontSize: 34, color: ROSA, letterSpacing: '0.04em',
              opacity: outB(win(t, fechoAt + 1.9, fechoAt + 2.7)),
            }}>
              prismface.com.br
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ---------- áudio: narração + trilha ---------- */}
      <Sequence from={Math.round(D * FPS)}>
        <Audio src={staticFile('narration/pf.mp3')} />
      </Sequence>
      <Audio
        src={staticFile('narration/pf_musica.mp3')}
        volume={f => 0.5 * (1 - suave(win(f / FPS, FIM_S - 2.2, FIM_S)))}
      />
    </AbsoluteFill>
  );
};
