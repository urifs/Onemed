import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/pf2.json';
import {
  FPS, DELAY, FontesPrism, AREIA, PORCELANA, LINHO, ROSA, CAFE, TAUPE,
  DISPLAY, SANS, FundoPrism, Arco, Celular, Eyebrow, Titulo, Chip, VarreduraArco,
  win, outB, suave, surge,
} from './prismkit';

/* ============================================================
   PF02 — prism.face, versão nova da plataforma.
   Mais interativa e mais curta: o essencial na tela e o detalhe
   a um toque. Telas reais gravadas no celular, rosto fictício.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const PF02_DURATION = Math.round((DELAY + T.duration + 4.2) * FPS);

type Cap = {
  at: number; fim: number; take: string; from: number;
  eyebrow: string; titulo: React.ReactNode;
  chips?: Array<[number, number, React.ReactNode]>;
  zoom?: [number, number];
  desloca?: [number, number];
};

const D = DELAY;
const CAPS: Cap[] = [
  {
    at: D + 3.0, fim: D + 8.3, take: 't_landing', from: 2.0,
    eyebrow: 'leitura de pele personalizada',
    titulo: <>Sua pele,<br />lida com cuidado</>,
    chips: [[D + 4.8, D + 8.1, 'menos de um minuto, pelo seu celular']],
    zoom: [0.98, 1.03], desloca: [26, -8],
  },
  {
    at: D + 8.3, fim: D + 13.6, take: 't_metodo', from: 3.0,
    eyebrow: 'o método',
    titulo: <>Quatro passos,<br />quatro desenhos</>,
    chips: [[D + 9.8, D + 13.4, 'a leitura · a avaliação · o ritual · a evolução']],
    zoom: [1.0, 1.06], desloca: [10, -40],
  },
  {
    at: D + 13.6, fim: D + 19.2, take: 't_painel', from: 3.0,
    eyebrow: 'seu espaço',
    titulo: <>Tudo seu,<br />num lugar só</>,
    chips: [[D + 15.2, D + 19.0, 'sua leitura · seu cronograma · sua jornada']],
    zoom: [1.0, 1.05], desloca: [10, -24],
  },
  {
    at: D + 19.2, fim: D + 26.3, take: 't_prep', from: 2.0,
    eyebrow: 'preparação',
    titulo: <>As cinco poses,<br />desenhadas</>,
    chips: [
      [D + 20.2, D + 23.9, 'um minuto de preparo antes da câmera'],
      [D + 24.2, D + 26.1, 'o nariz diz para onde virar'],
    ],
    zoom: [1.0, 1.05], desloca: [0, -30],
  },
  {
    at: D + 26.3, fim: D + 35.0, take: 't_captura', from: 6.0,
    eyebrow: 'captura guiada por voz',
    titulo: <>Frente, lados,<br />cima e baixo</>,
    chips: [
      [D + 30.2, D + 32.6, 'um aviso sonoro confirma cada foto'],
      [D + 32.9, D + 34.8, 'sem precisar olhar para a tela'],
    ],
    zoom: [1.02, 1.07], desloca: [-10, -34],
  },
  {
    at: D + 35.0, fim: D + 38.8, take: 't_captura', from: 30.0,
    eyebrow: 'privacidade na origem',
    titulo: <>Nenhum vídeo<br />é gravado</>,
    chips: [[D + 36.6, D + 38.6, 'só as fotos de cada pose']],
    zoom: [1.03, 1.07], desloca: [-12, -30],
  },
  {
    at: D + 38.8, fim: D + 41.4, take: 't_captura', from: 109.6,
    eyebrow: 'em segundos',
    titulo: <>Sua leitura<br />fica pronta</>,
    zoom: [1.02, 1.06], desloca: [-6, -22],
  },
  {
    at: D + 41.4, fim: D + 47.3, take: 't_leitura', from: 3.5,
    eyebrow: 'sua leitura de pele',
    titulo: <>O seu rosto,<br />com os achados</>,
    chips: [[D + 44.9, D + 47.1, 'toque num ponto e veja o que foi encontrado ali']],
    zoom: [1.0, 1.06], desloca: [8, -40],
  },
  {
    at: D + 47.3, fim: D + 51.1, take: 't_mapa3d', from: 8.5,
    eyebrow: 'se você quiser',
    titulo: <>O mapa gira<br />com o seu dedo</>,
    chips: [[D + 48.2, D + 50.9, 'o rosto em três dimensões, sob demanda']],
    zoom: [1.02, 1.07], desloca: [0, -30],
  },
  {
    at: D + 51.1, fim: D + 61.2, take: 't_achados', from: 8.0,
    eyebrow: 'região por região',
    titulo: <>Cada achado,<br />uma linha</>,
    chips: [
      [D + 51.9, D + 54.7, 'o que é, onde está e a intensidade'],
      [D + 55.0, D + 57.9, 'um toque abre o detalhe: de onde vem e como cuidar'],
      [D + 58.2, D + 61.0, 'sem jargão: leve, moderada, intensa'],
    ],
    zoom: [1.0, 1.08], desloca: [10, -66],
  },
  {
    at: D + 61.2, fim: D + 72.1, take: 't_ritual', from: 9.0,
    eyebrow: 'todos os dias',
    titulo: <>Manhã e noite,<br />uma linha por passo</>,
    chips: [
      [D + 65.3, D + 67.6, 'produtos reais, vendidos no Brasil'],
      [D + 67.9, D + 71.9, 'quantidade, modo de uso e tempo de espera — a um toque'],
    ],
    zoom: [1.0, 1.08], desloca: [10, -66],
  },
  {
    at: D + 72.1, fim: D + 76.0, take: 't_evolucao', from: 7.0,
    eyebrow: 'o caminho pela frente',
    titulo: <>A evolução em<br />cartões de semana</>,
    chips: [[D + 73.2, D + 75.8, 'o que esperar — e quando']],
    zoom: [1.0, 1.06], desloca: [6, -34],
  },
  {
    at: D + 76.0, fim: D + 81.5, take: 't_plano', from: 2.0,
    eyebrow: 'seu cronograma',
    titulo: <>A plataforma<br />acompanha seu dia</>,
    chips: [[D + 79.2, D + 81.3, 'ritual da manhã · ritual da noite']],
    zoom: [1.0, 1.06], desloca: [4, -40],
  },
  {
    at: D + 81.5, fim: D + 86.2, take: 't_notif', from: 1.5,
    eyebrow: 'no seu tempo',
    titulo: <>Lembretes na hora<br />que você escolheu</>,
    chips: [[D + 83.6, D + 86.0, 'o que ficou para trás continua contando']],
    zoom: [1.0, 1.05], desloca: [0, -26],
  },
  {
    at: D + 86.2, fim: D + 95.5, take: 't_jornada', from: 15.0,
    eyebrow: 'sua jornada',
    titulo: <>O antes e agora<br />do seu rosto</>,
    chips: [
      [D + 86.9, D + 90.8, 'uma nova leitura a cada semana'],
      [D + 91.1, D + 95.3, 'dias de ritual · sequência · o que mudou'],
    ],
    zoom: [1.0, 1.07], desloca: [8, -50],
  },
  {
    at: D + 95.5, fim: D + 102.2, take: 't_config', from: 3.0,
    eyebrow: 'privacidade',
    titulo: <>Suas fotos são<br />dado biométrico</>,
    chips: [
      [D + 97.6, D + 100.0, 'consentimento próprio e área privada'],
      [D + 100.3, D + 102.0, 'você apaga tudo quando quiser'],
    ],
    zoom: [1.0, 1.05], desloca: [0, -28],
  },
];

const fimUltimo = CAPS[CAPS.length - 1].fim;
const FIM_S = PF02_DURATION / FPS;

export const PF02_Prismface: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const cap = CAPS.find(c => t >= c.at - 0.5 && t < c.fim + 0.5);
  const progresso = cap ? win(t, cap.at, cap.fim) : 0;

  /* abertura */
  const pAbre = outB(win(t, D + 0.15, D + 1.1));
  const abreSai = 1 - suave(win(t, D + 2.4, D + 3.1));

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
          <div style={{ position: 'absolute', top: 118, left: 80, right: 80, ...surge(t, cap.at, 0.7) }}>
            <Eyebrow>{cap.eyebrow}</Eyebrow>
            <Titulo style={{ marginTop: 14 }}>{cap.titulo}</Titulo>
          </div>

          <div style={{
            position: 'absolute', left: 0, right: 0, top: 415,
            display: 'flex', justifyContent: 'center',
            opacity: outB(win(t, cap.at, cap.at + 0.55)) * (1 - suave(win(t, cap.fim - 0.35, cap.fim))),
          }}>
            <Sequence from={Math.round(cap.at * FPS)} layout="none">
              <Celular
                take={cap.take}
                from={cap.from}
                largura={580}
                escala={(cap.zoom?.[0] ?? 1) + ((cap.zoom?.[1] ?? 1) - (cap.zoom?.[0] ?? 1)) * suave(progresso)}
                desloca={(cap.desloca?.[0] ?? 0) + ((cap.desloca?.[1] ?? 0) - (cap.desloca?.[0] ?? 0)) * suave(progresso)}
              />
            </Sequence>
          </div>

          {cap.chips?.map(([a, b, txt], i) => (
            <Chip key={i} t={t} at={a} ate={b} bottom={96}>{txt}</Chip>
          ))}

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
      {t < D + 3.2 && (
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
              <Arco progresso={win(t, D + 0.6, D + 2.4)} largura={360} espessura={4} />
            </div>
            <div style={{
              marginTop: 30, fontFamily: SANS, fontSize: 30, color: TAUPE, letterSpacing: '0.06em',
              opacity: outB(win(t, D + 1.4, D + 2.1)),
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
        <Audio src={staticFile('narration/pf2.mp3')} />
      </Sequence>
      <Audio
        src={staticFile('narration/pf_musica.mp3')}
        volume={f => 0.5 * (1 - suave(win(f / FPS, FIM_S - 2.2, FIM_S)))}
      />
    </AbsoluteFill>
  );
};
