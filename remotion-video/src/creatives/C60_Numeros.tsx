import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, HEAD, BODY } from './theme';
import { FPS } from './story';
import { EndCard } from './common';
import { Grain, Vignette, Letterbox, LightSweep, win, easeOutExpo } from './cine';
import timing from './timings/c60.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C60_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  abertura: DELAY + 0.1,
  n530: DELAY + 3.2, t530: DELAY + 6.5,
  n10k: DELAY + 11.5, t10k: DELAY + 15.8,
  atual: DELAY + 21.8, tAtual: DELAY + 24.6,
  busca: DELAY + 27.8, tBusca: DELAY + 29.6,
  grandioso: DELAY + 37.2,
  titulo: DELAY + 40.9,
  end: DELAY + T.duration - 3.2,
};

/* número-título varrendo em profundidade */
const Titulo: React.FC<{ t: number; at: number; until: number; big: string; frase: React.ReactNode; fraseAt: number }> =
({ t, at, until, big, frase, fraseAt }) => {
  const p = win(t, at, until);
  const o = Math.min(win(t, at, at + 0.4), 1 - win(t, until - 0.4, until));
  if (o <= 0) return null;
  // atravessa: entra da direita ao fundo, cresce e passa levemente à esquerda
  const x = (0.5 - p) * 340;
  const scale = 0.72 + easeOutExpo(Math.min(p * 1.6, 1)) * 0.55;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      {/* sombra longa */}
      <div style={{
        position: 'absolute', left: '50%', top: 700,
        transform: `translate(-50%,-50%) translateX(${x + 26}px) translateY(26px) scale(${scale}) skewX(-6deg)`,
        fontFamily: HEAD, fontWeight: 900, fontSize: 300, letterSpacing: -12,
        color: 'rgba(0,0,0,0.55)', whiteSpace: 'nowrap',
      }}>{big}</div>
      <div style={{
        position: 'absolute', left: '50%', top: 700,
        transform: `translate(-50%,-50%) translateX(${x}px) scale(${scale})`,
        fontFamily: HEAD, fontWeight: 900, fontSize: 300, letterSpacing: -12,
        color: WHITE, whiteSpace: 'nowrap',
        textShadow: '0 40px 120px rgba(0,0,0,0.8)',
      }}>{big}</div>
      <div style={{ position: 'absolute', left: 90, right: 90, top: 1010, textAlign: 'center', opacity: win(t, fraseAt, fraseAt + 0.5) }}>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 44, color: 'rgba(255,255,255,0.92)', lineHeight: 1.35, letterSpacing: -1 }}>{frase}</div>
      </div>
    </div>
  );
};

export const C60_Numeros: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#08090d' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 120% 80% at 50% 30%, #10131c 0%, #08090d 70%)' }} />

      {/* abertura */}
      <div style={{ position: 'absolute', inset: 0, opacity: t < B.n530 ? 1 - win(t, B.n530 - 0.4, B.n530) : 0 }}>
        <div style={{ position: 'absolute', left: 80, right: 80, top: 780, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 66, color: WHITE, letterSpacing: -2, lineHeight: 1.25 }}>
            alguns números merecem<br /><span style={{ color: RED }}>tela de cinema.</span>
          </div>
        </div>
      </div>

      <Titulo t={t} at={B.n530} until={B.n10k} big="530+" fraseAt={B.t530}
        frase={<>não é uma lista. é um <span style={{ color: RED }}>território inteiro</span> da medicina num lugar só.</>} />
      <Titulo t={t} at={B.n10k} until={B.atual} big="10.000+" fraseAt={B.t10k}
        frase={<>não é plateia. é gente <span style={{ color: RED }}>dividindo material, dúvida e caminho</span> — todos os dias.</>} />
      <Titulo t={t} at={B.atual} until={B.busca} big="+0" fraseAt={B.tAtual}
        frase={<>atualizações <span style={{ color: RED }}>sem custo</span>: o que entra de novo, entra pra você.</>} />
      <Titulo t={t} at={B.busca} until={B.grandioso} big="1" fraseAt={B.tBusca}
        frase={<>o número que ninguém filma: <span style={{ color: RED }}>uma busca só</span> — aula, livro e questão, até arquivo dentro dos materiais.</>} />

      {/* fecho */}
      <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.grandioso, B.grandioso + 0.4), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
        <div style={{ position: 'absolute', left: 80, right: 80, top: 720, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: WHITE, letterSpacing: -2, lineHeight: 1.3 }}>
            grandioso na tela.<br /><span style={{ color: RED }}>simples na sua rotina.</span>
          </div>
          <div style={{ fontFamily: BODY, fontSize: 30, color: 'rgba(255,255,255,0.7)', marginTop: 40, opacity: win(t, B.titulo, B.titulo + 0.4) }}>
            o próximo título desse filme escreve você.
          </div>
        </div>
      </div>

      <LightSweep t={t} period={3.6} opacity={0.13} />
      <Letterbox t={t} inAt={0.1} outAt={B.end - 0.4} size={150} />
      <Vignette strength={0.55} />
      <Grain opacity={0.08} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={50} highlight={RED} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c60.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
