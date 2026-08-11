import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, MONO } from './theme';
import { FPS, Range } from './story';
import { OLightBg, OLPhone, OLBadge, OLEndCard, O_RED, O_INK, O_MUT, WHITE } from './olight';
import { Grain, Vignette, win, typed, WipePanel } from './cine';
import timing from './timings/c48.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C48_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

type Perg = { at: number; ansAt: number; q: string; src?: string; from?: number; top?: string; bottom?: string };
const PERGS: Perg[] = [
  { at: DELAY + 4.8, ansAt: DELAY + 6.7, q: 'por onde eu começo?', src: 'rec/ol_plano.mp4', from: 290, top: 'cronograma por IA', bottom: 'semana a semana · marcos · checklist' },
  { at: DELAY + 13.5, ansAt: DELAY + 15.6, q: 'o que eu revi ontem?', src: 'rec/ol_dash.mp4', from: 70, top: 'progresso salvo', bottom: 'aula por aula' },
  { at: DELAY + 18.8, ansAt: DELAY + 20.8, q: 'cadê aquele resumo?', src: 'rec/ol_acervo.mp4', from: 160, top: 'a busca acha tudo de uma vez', bottom: 'aula + livro + questão' },
  { at: DELAY + 28.6, ansAt: DELAY + 30.7, q: 'como eu fixo isso?', src: 'rec/ol_flash.mp4', from: 170, top: 'flashcards do SEU material' },
  { at: DELAY + 33.0, ansAt: DELAY + 35.2, q: 'quem me explica essa questão?', src: 'rec/ol_quest.mp4', from: 200, top: 'resposta comentada, uma por uma' },
];
const B = {
  ultima: DELAY + 38.3,
  quanto: DELAY + 40.3,
  nada: DELAY + 42.4,
  end: DELAY + T.duration - 3.2,
};

export const C48_Perguntas: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  // pergunta ativa (para a barra)
  let ativa = -1;
  PERGS.forEach((p, i) => { if (t >= p.at) ativa = i; });
  const emUltima = t >= B.quanto;
  const qAtual = emUltima ? 'quanto custa começar?' : ativa >= 0 ? PERGS[ativa].q : '';
  const qStart = emUltima ? B.quanto : ativa >= 0 ? PERGS[ativa].at : 0;
  const barOp = t < B.end ? 1 : 0;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />

      {/* hook título */}
      <div style={{ position: 'absolute', left: 60, right: 60, top: 250, textAlign: 'center', opacity: Math.min(1, win(t, DELAY, DELAY + 0.4)) * (1 - win(t, PERGS[0].at - 0.4, PERGS[0].at)) }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: O_INK, letterSpacing: -2, lineHeight: 1.2 }}>
          toda pergunta de madrugada<br />tem resposta <span style={{ color: O_RED }}>na mesma tela.</span>
        </div>
      </div>

      {/* barra de busca gigante */}
      <div style={{
        position: 'absolute', left: 60, right: 60, top: 150, height: 110, zIndex: 12, opacity: barOp,
        background: WHITE, borderRadius: 999, border: `3px solid ${emUltima ? O_RED : 'rgba(22,24,29,0.15)'}`,
        boxShadow: '0 24px 60px -18px rgba(22,24,29,0.28)',
        display: 'flex', alignItems: 'center', gap: 22, padding: '0 40px',
      }}>
        <svg width={40} height={40} viewBox="0 0 24 24" fill="none">
          <circle cx={11} cy={11} r={7} stroke={O_MUT} strokeWidth={2.6} />
          <path d="M16.5 16.5L21 21" stroke={O_MUT} strokeWidth={2.6} strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: O_INK, whiteSpace: 'nowrap', overflow: 'hidden' }}>
          {typed(qAtual, t, qStart, 26)}
          <span style={{ opacity: t % 0.8 < 0.4 ? 1 : 0, color: O_RED }}>|</span>
        </span>
      </div>

      {/* respostas com telas reais */}
      {PERGS.map((p, i) => {
        const fim = i < PERGS.length - 1 ? PERGS[i + 1].at : B.ultima;
        return (
          <OLPhone key={i} t={t} range={[p.ansAt - 0.2, fim - 0.15] as Range} src={p.src!} startFrom={p.from} top={330} width={500}>
            <OLBadge x={56} y={430} delay={Math.round((p.ansAt + 0.3) * FPS)} from="left" accent top={p.top!} bottom={p.bottom} />
          </OLPhone>
        );
      })}
      {PERGS.map((p, i) => <WipePanel key={i} t={t} atSec={p.at - 0.05} color={O_RED} dur={0.42} />)}

      {/* resposta final: NADA */}
      <div style={{ position: 'absolute', inset: 0, opacity: win(t, B.nada - 0.15, B.nada + 0.2) * (1 - win(t, B.end + 0.5, B.end + 1)) }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 700, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 190, color: O_RED, letterSpacing: -6 }}>nada.</div>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: O_INK, marginTop: 20 }}>o teste é grátis.</div>
        </div>
      </div>

      <Vignette strength={0.2} />
      <Grain opacity={0.04} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c48.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
