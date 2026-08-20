import React from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/pf4.json';
import {
  FPS, DELAY, FontesPrism, AREIA, PORCELANA, LINHO, ROSA, CAFE, TAUPE,
  DISPLAY, SANS, FundoPrism, Arco, Celular, Eyebrow, Titulo, Chip, VarreduraArco,
  win, outB, suave, surge,
} from './prismkit';

/* ============================================================
   PF04 — corte de um minuto: a abertura de arquivo e o essencial
   da plataforma, sem nenhuma tela repetida.
   ============================================================ */

const ABRE_FIM = 6.6;   /* onde a abertura entrega o filme */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
export const PF04_DURATION = Math.round((DELAY + T.duration + 5.5) * FPS);

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
    at: D + 6.6, fim: D + 11.2, take: 't_landing', from: 2.0,
    eyebrow: 'leitura de pele personalizada',
    titulo: <>Sua pele,<br />lida com cuidado</>,
    chips: [[D + 9.4, D + 11.0, 'menos de um minuto, pelo seu celular']],
    zoom: [0.99, 1.04], desloca: [22, -10],
  },
  {
    at: D + 11.2, fim: D + 16.3, take: 't_captura', from: 8.4,
    eyebrow: 'captura guiada por voz',
    titulo: <>Frente, lados,<br />cima e baixo</>,
    chips: [[D + 14.5, D + 16.1, 'nenhum vídeo é gravado — só as fotos de cada pose']],
    zoom: [1.02, 1.07], desloca: [-10, -32],
  },
  {
    at: D + 16.3, fim: D + 23.2, take: 't_leitura', from: 3.5,
    eyebrow: 'sua leitura de pele',
    titulo: <>O seu rosto,<br />com os achados</>,
    chips: [[D + 20.6, D + 23.0, 'toque num ponto e veja o achado ali']],
    zoom: [1.0, 1.06], desloca: [8, -40],
  },
  {
    at: D + 23.2, fim: D + 26.4, take: 't_mapa3d', from: 11.0,
    eyebrow: 'se você quiser',
    titulo: <>O mapa gira<br />com o seu dedo</>,
    zoom: [1.02, 1.07], desloca: [0, -26],
  },
  {
    at: D + 26.4, fim: D + 31.4, take: 't_achados', from: 8.0,
    eyebrow: 'região por região',
    titulo: <>Cada achado,<br />uma linha</>,
    chips: [
      [D + 26.9, D + 30.0, 'o que é, onde está e a intensidade'],
      [D + 30.3, D + 31.2, 'leve, moderada, intensa'],
    ],
    zoom: [1.0, 1.07], desloca: [10, -52],
  },
  {
    at: D + 31.4, fim: D + 39.0, take: 't_ritual', from: 9.0,
    eyebrow: 'todos os dias',
    titulo: <>Manhã e noite,<br />uma linha por passo</>,
    chips: [
      [D + 34.9, D + 36.5, 'produtos reais, vendidos no Brasil'],
      [D + 36.8, D + 38.8, 'modo de uso e tempo de espera — a um toque'],
    ],
    zoom: [1.0, 1.08], desloca: [10, -62],
  },
  {
    at: D + 39.0, fim: D + 41.7, take: 't_plano', from: 2.0,
    eyebrow: 'seu cronograma',
    titulo: <>A plataforma<br />acompanha seu dia</>,
    zoom: [1.0, 1.05], desloca: [4, -26],
  },
  {
    at: D + 41.7, fim: D + 45.0, take: 't_jornada', from: 15.0,
    eyebrow: 'sua jornada',
    titulo: <>O antes e agora<br />do seu rosto</>,
    zoom: [1.0, 1.06], desloca: [8, -30],
  },
  {
    at: D + 45.0, fim: D + 50.1, take: 't_config', from: 3.0,
    eyebrow: 'privacidade',
    titulo: <>Suas fotos são<br />dado biométrico</>,
    chips: [[D + 47.2, D + 49.9, 'área privada — você apaga quando quiser']],
    zoom: [1.0, 1.05], desloca: [0, -24],
  },
];

const fimUltimo = CAPS[CAPS.length - 1].fim;
const FIM_S = PF04_DURATION / FPS;

export const PF04_Prismface: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const cap = CAPS.find(c => t >= c.at - 0.5 && t < c.fim + 0.5);
  const progresso = cap ? win(t, cap.at, cap.fim) : 0;


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
                playbackRate={1.55}
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
          <div style={{ position: 'absolute', top: 118, left: 80, right: 80, ...surge(t, cap.at, 0.55) }}>
            <Eyebrow>{cap.eyebrow}</Eyebrow>
            <Titulo style={{ marginTop: 14 }}>{cap.titulo}</Titulo>
          </div>

          <div style={{
            position: 'absolute', left: 0, right: 0, top: 415,
            display: 'flex', justifyContent: 'center',
            opacity: outB(win(t, cap.at, cap.at + 0.4)) * (1 - suave(win(t, cap.fim - 0.28, cap.fim))),
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
        <Audio src={staticFile('narration/pf4.mp3')} />
      </Sequence>
      <Audio
        src={staticFile('narration/pf_musica.mp3')}
        volume={f => 0.5 * (1 - suave(win(f / FPS, FIM_S - 2.2, FIM_S)))}
      />
    </AbsoluteFill>
  );
};
