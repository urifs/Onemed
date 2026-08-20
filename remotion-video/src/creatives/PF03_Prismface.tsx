import React from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/pf3.json';
import {
  FPS, DELAY, FontesPrism, AREIA, PORCELANA, LINHO, ROSA, CAFE, TAUPE,
  DISPLAY, SANS, FundoPrism, Arco, Celular, Eyebrow, Titulo, Chip, VarreduraArco,
  win, outB, suave, surge,
} from './prismkit';

/* ============================================================
   PF03 — o mesmo filme da plataforma, agora com a abertura que
   mostra de onde a gente vem: a análise de pele que exigia hora
   marcada, deslocamento e um aparelho de balcão.
   ============================================================ */

const ABRE_FIM = 10.92;   /* onde a abertura entrega o filme */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const PF03_DURATION = Math.round((DELAY + T.duration + 4.2) * FPS);

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
    at: D + 13.92, fim: D + 19.22, take: 't_landing', from: 2.0,
    eyebrow: 'leitura de pele personalizada',
    titulo: <>Sua pele,<br />lida com cuidado</>,
    chips: [[D + 15.72, D + 19.02, 'menos de um minuto, pelo seu celular']],
    zoom: [0.98, 1.03], desloca: [26, -8],
  },
  {
    at: D + 19.22, fim: D + 24.52, take: 't_metodo', from: 3.0,
    eyebrow: 'o método',
    titulo: <>Quatro passos,<br />quatro desenhos</>,
    chips: [[D + 20.72, D + 24.32, 'a leitura · a avaliação · o ritual · a evolução']],
    zoom: [1.0, 1.06], desloca: [10, -40],
  },
  {
    at: D + 24.52, fim: D + 30.12, take: 't_painel', from: 3.0,
    eyebrow: 'seu espaço',
    titulo: <>Tudo seu,<br />num lugar só</>,
    chips: [[D + 26.12, D + 29.92, 'sua leitura · seu cronograma · sua jornada']],
    zoom: [1.0, 1.05], desloca: [10, -24],
  },
  {
    at: D + 30.12, fim: D + 37.22, take: 't_prep', from: 2.0,
    eyebrow: 'preparação',
    titulo: <>As cinco poses,<br />desenhadas</>,
    chips: [
      [D + 31.12, D + 34.82, 'um minuto de preparo antes da câmera'],
      [D + 35.12, D + 37.02, 'o nariz diz para onde virar'],
    ],
    zoom: [1.0, 1.05], desloca: [0, -30],
  },
  {
    at: D + 37.22, fim: D + 45.92, take: 't_captura', from: 6.0,
    eyebrow: 'captura guiada por voz',
    titulo: <>Frente, lados,<br />cima e baixo</>,
    chips: [
      [D + 41.12, D + 43.52, 'um aviso sonoro confirma cada foto'],
      [D + 43.82, D + 45.72, 'sem precisar olhar para a tela'],
    ],
    zoom: [1.02, 1.07], desloca: [-10, -34],
  },
  {
    at: D + 45.92, fim: D + 49.72, take: 't_captura', from: 30.0,
    eyebrow: 'privacidade na origem',
    titulo: <>Nenhum vídeo<br />é gravado</>,
    chips: [[D + 47.52, D + 49.52, 'só as fotos de cada pose']],
    zoom: [1.03, 1.07], desloca: [-12, -30],
  },
  {
    at: D + 49.72, fim: D + 52.32, take: 't_captura', from: 109.6,
    eyebrow: 'em segundos',
    titulo: <>Sua leitura<br />fica pronta</>,
    zoom: [1.02, 1.06], desloca: [-6, -22],
  },
  {
    at: D + 52.32, fim: D + 58.22, take: 't_leitura', from: 3.5,
    eyebrow: 'sua leitura de pele',
    titulo: <>O seu rosto,<br />com os achados</>,
    chips: [[D + 55.82, D + 58.02, 'toque num ponto e veja o que foi encontrado ali']],
    zoom: [1.0, 1.06], desloca: [8, -40],
  },
  {
    at: D + 58.22, fim: D + 62.02, take: 't_mapa3d', from: 8.5,
    eyebrow: 'se você quiser',
    titulo: <>O mapa gira<br />com o seu dedo</>,
    chips: [[D + 59.12, D + 61.82, 'o rosto em três dimensões, sob demanda']],
    zoom: [1.02, 1.07], desloca: [0, -30],
  },
  {
    at: D + 62.02, fim: D + 72.12, take: 't_achados', from: 8.0,
    eyebrow: 'região por região',
    titulo: <>Cada achado,<br />uma linha</>,
    chips: [
      [D + 62.82, D + 65.62, 'o que é, onde está e a intensidade'],
      [D + 65.92, D + 68.82, 'um toque abre o detalhe: de onde vem e como cuidar'],
      [D + 69.12, D + 71.92, 'sem jargão: leve, moderada, intensa'],
    ],
    zoom: [1.0, 1.08], desloca: [10, -66],
  },
  {
    at: D + 72.12, fim: D + 83.02, take: 't_ritual', from: 9.0,
    eyebrow: 'todos os dias',
    titulo: <>Manhã e noite,<br />uma linha por passo</>,
    chips: [
      [D + 76.22, D + 78.52, 'produtos reais, vendidos no Brasil'],
      [D + 78.82, D + 82.82, 'quantidade, modo de uso e tempo de espera — a um toque'],
    ],
    zoom: [1.0, 1.08], desloca: [10, -66],
  },
  {
    at: D + 83.02, fim: D + 86.92, take: 't_evolucao', from: 7.0,
    eyebrow: 'o caminho pela frente',
    titulo: <>A evolução em<br />cartões de semana</>,
    chips: [[D + 84.12, D + 86.72, 'o que esperar — e quando']],
    zoom: [1.0, 1.06], desloca: [6, -34],
  },
  {
    at: D + 86.92, fim: D + 92.42, take: 't_plano', from: 2.0,
    eyebrow: 'seu cronograma',
    titulo: <>A plataforma<br />acompanha seu dia</>,
    chips: [[D + 90.12, D + 92.22, 'ritual da manhã · ritual da noite']],
    zoom: [1.0, 1.06], desloca: [4, -40],
  },
  {
    at: D + 92.42, fim: D + 97.12, take: 't_notif', from: 1.5,
    eyebrow: 'no seu tempo',
    titulo: <>Lembretes na hora<br />que você escolheu</>,
    chips: [[D + 94.52, D + 96.92, 'o que ficou para trás continua contando']],
    zoom: [1.0, 1.05], desloca: [0, -26],
  },
  {
    at: D + 97.12, fim: D + 106.42, take: 't_jornada', from: 15.0,
    eyebrow: 'sua jornada',
    titulo: <>O antes e agora<br />do seu rosto</>,
    chips: [
      [D + 97.82, D + 101.72, 'uma nova leitura a cada semana'],
      [D + 102.02, D + 106.22, 'dias de ritual · sequência · o que mudou'],
    ],
    zoom: [1.0, 1.07], desloca: [8, -50],
  },
  {
    at: D + 106.42, fim: D + 113.12, take: 't_config', from: 3.0,
    eyebrow: 'privacidade',
    titulo: <>Suas fotos são<br />dado biométrico</>,
    chips: [
      [D + 108.52, D + 110.92, 'consentimento próprio e área privada'],
      [D + 111.22, D + 112.92, 'você apaga tudo quando quiser'],
    ],
    zoom: [1.0, 1.05], desloca: [0, -28],
  },
];

const fimUltimo = CAPS[CAPS.length - 1].fim;
const FIM_S = PF03_DURATION / FPS;

export const PF03_Prismface: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const cap = CAPS.find(c => t >= c.at - 0.5 && t < c.fim + 0.5);
  const progresso = cap ? win(t, cap.at, cap.fim) : 0;

  /* abertura */
  const pAbre = outB(win(t, D + 11.07, D + 12.02));
  const abreSai = 1 - suave(win(t, D + 13.32, D + 14.02));

  /* fecho */
  const fechoAt = fimUltimo;
  const pFecho = outB(win(t, fechoAt + 0.2, fechoAt + 1.2));

  return (
    <AbsoluteFill style={{ background: AREIA }}>
      <FontesPrism />
      <FundoPrism t={t} />

      {/* ---------- abertura: como era antes ---------- */}
      {t < D + ABRE_FIM + 0.6 && (
        <AbsoluteFill style={{ zIndex: 40 }}>
          {/* a cena de arquivo, ocupando a tela inteira */}
          <AbsoluteFill style={{
            opacity: outB(win(t, D + 0.1, D + 0.8)) * (1 - suave(win(t, D + 8.0, D + 8.7))),
          }}>
            <Sequence from={Math.round((D + 0.1) * FPS)} layout="none">
              <OffthreadVideo
                src={staticFile('takes/t_clinica.mp4')}
                muted
                playbackRate={0.8}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Sequence>
            {/* véu para o texto respirar sobre a imagem */}
            <AbsoluteFill style={{
              background: `linear-gradient(180deg, rgba(63,53,46,0.62) 0%, rgba(63,53,46,0.12) 42%,
                           rgba(63,53,46,0.20) 72%, rgba(63,53,46,0.66) 100%)`,
            }} />
          </AbsoluteFill>

          {/* areia entra quando a frase vira */}
          <AbsoluteFill style={{ opacity: suave(win(t, D + 8.0, D + 8.7)) }}>
            <FundoPrism t={t} />
          </AbsoluteFill>

          {/* título sobre a cena */}
          <div style={{
            position: 'absolute', top: 150, left: 80, right: 80,
            ...surge(t, D + 0.5, 0.8),
            opacity: outB(win(t, D + 0.5, D + 1.3)) * (1 - suave(win(t, D + 7.6, D + 8.2))),
          }}>
            <Eyebrow style={{ color: '#f2dad3' }}>até ontem</Eyebrow>
            <Titulo style={{ marginTop: 14, color: PORCELANA }}>
              Para ler a sua pele,<br />você tinha que<br />sair de casa
            </Titulo>
          </div>

          {t >= D + 3.6 && t < D + 8.2 && (
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 180, display: 'flex', justifyContent: 'center',
              opacity: outB(win(t, D + 3.6, D + 4.2)) * (1 - suave(win(t, D + 7.8, D + 8.2))),
            }}>
              <div style={{
                background: PORCELANA, color: CAFE, fontFamily: SANS, fontSize: 31, fontWeight: 600,
                borderRadius: 999, padding: '20px 40px', maxWidth: 940, textAlign: 'center',
                boxShadow: '0 1px 2px rgba(63,53,46,0.06), 0 8px 24px rgba(63,53,46,0.18)',
              }}>hora marcada · deslocamento · aparelho de balcão</div>
            </div>
          )}

          {/* a virada */}
          {t >= D + 8.2 && (
            <AbsoluteFill style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: outB(win(t, D + 8.4, D + 9.1)) * (1 - suave(win(t, D + ABRE_FIM - 0.2, D + ABRE_FIM + 0.4))),
            }}>
              <div style={{ textAlign: 'center' }}>
                <Titulo size={92}>Agora não<br />precisa mais.</Titulo>
                <div style={{ marginTop: 34, display: 'flex', justifyContent: 'center' }}>
                  <Arco progresso={outB(win(t, D + 8.9, D + ABRE_FIM))} largura={340} espessura={4} />
                </div>
              </div>
            </AbsoluteFill>
          )}
        </AbsoluteFill>
      )}

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
      {t < D + 14.12 && (
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
              <Arco progresso={win(t, D + 11.52, D + 13.32)} largura={360} espessura={4} />
            </div>
            <div style={{
              marginTop: 30, fontFamily: SANS, fontSize: 30, color: TAUPE, letterSpacing: '0.06em',
              opacity: outB(win(t, D + 12.32, D + 13.02)),
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
        <Audio src={staticFile('narration/pf3.mp3')} />
      </Sequence>
      <Audio
        src={staticFile('narration/pf_musica.mp3')}
        volume={f => 0.5 * (1 - suave(win(f / FPS, FIM_S - 2.2, FIM_S)))}
      />
    </AbsoluteFill>
  );
};
