import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { OLightBg, OLBadge, OLPhone, OLHero, OLEndCard, O_RED, O_INK, O_MUT, WHITE } from './olight';
import timing from './timings/c36.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C36_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  alfabeto: DELAY + 0.2,
  ninguem: DELAY + 5.9,
  vem: DELAY + 7.7,
  A: DELAY + 8.9,
  C: DELAY + 13.3,
  F: DELAY + 19.1,
  I: DELAY + 22.0,
  L: DELAY + 27.3,
  M: DELAY + 29.6,
  Q: DELAY + 34.4,
  Z: DELAY + 37.1,
  inteiro: DELAY + 39.6,
  n530: DELAY + 42.9,
  az: DELAY + 45.6,
  end: DELAY + T.duration - 3.2,
};

const LETTERS: Array<{ l: string; at: number; word: string; sub: string; take?: string; sf?: number }> = [
  { l: 'A', at: B.A, word: 'Acervo', sub: 'a biblioteca colaborativa', take: 'rec/ol_acervo.mp4', sf: 30 },
  { l: 'C', at: B.C, word: 'Cronograma', sub: 'a IA monta seu plano', take: 'rec/ol_plano_gen.mp4', sf: 60 },
  { l: 'F', at: B.F, word: 'Flashcards', sub: 'gerados na hora', take: 'rec/ol_flash.mp4', sf: 160 },
  { l: 'I', at: B.I, word: 'IA', sub: 'lê a sua tela e responde', take: 'rec/ol_assist.mp4', sf: 270 },
  { l: 'L', at: B.L, word: 'Livros', sub: '+9.000' },
  { l: 'M', at: B.M, word: 'Mapa mental', sub: 'do plano inteiro, com marcos', take: 'rec/ol_plano.mp4', sf: 270 },
  { l: 'Q', at: B.Q, word: 'Questões', sub: 'com resposta comentada', take: 'rec/ol_quest.mp4', sf: 170 },
  { l: 'Z', at: B.Z, word: 'Zero', sub: 'enrolação' },
];

/* cartela-vinheta de cada letra */
const LetterCard: React.FC<{ t: number; from: number; to: number; item: typeof LETTERS[0] }> =
({ t, from, to, item }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (t < from || t >= to) return null;
  const s = spring({ frame: frame - Math.round(from * FPS), fps, config: { damping: 12, stiffness: 170 }, from: 1.25, to: 1 });
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{
        position: 'absolute', left: 60, top: 300,
        transform: `scale(${s})`, transformOrigin: 'left top',
        display: 'flex', alignItems: 'baseline', gap: 22,
      }}>
        <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 190, color: O_RED, letterSpacing: -8, lineHeight: 1 }}>{item.l}</span>
        <div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: O_INK, letterSpacing: -1 }}>{item.word}</div>
          <div style={{ fontFamily: BODY, fontSize: 26, color: O_MUT, marginTop: 4 }}>{item.sub}</div>
        </div>
      </div>
      {!item.take && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 800, textAlign: 'center',
          fontFamily: HEAD, fontWeight: 900, fontSize: 130, color: 'rgba(224,45,45,0.12)', letterSpacing: -4,
        }}>
          {item.word.toUpperCase()}
        </div>
      )}
    </div>
  );
};

export const C36_AZ: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const bounds = LETTERS.map((x, i) => [x.at - 0.15, (LETTERS[i + 1]?.at ?? B.inteiro) - 0.15] as Range);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />

      {/* hook: alfabeto de criança vs alfabeto do estudo */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, [0, B.A - 0.15] as Range, true) }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 84, color: 'rgba(22,24,29,0.18)', letterSpacing: 8 }}>A B C</div>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: O_INK, marginTop: 30 }}>
            esse, você aprendeu com 5 anos.
          </div>
          <div style={{
            fontFamily: HEAD, fontWeight: 900, fontSize: 46, color: O_RED, marginTop: 26,
            opacity: interpolate(t, [B.ninguem, B.ninguem + 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            o do estudo de medicina...<br />ninguém te ensinou.
          </div>
        </div>
      </div>

      {/* letras com takes reais embaixo */}
      {LETTERS.map((item, i) => (
        <React.Fragment key={item.l}>
          <LetterCard t={t} from={bounds[i][0]} to={bounds[i][1]} item={item} />
          {item.take && (
            <OLPhone t={t} range={bounds[i]} src={item.take} startFrom={item.sf!} width={470} top={620} />
          )}
        </React.Fragment>
      ))}

      <OLHero t={t} range={[B.inteiro - 0.15, B.az - 0.2] as Range}
        line1="o alfabeto inteiro do seu estudo" line2="num lugar só. +530 cursos." size={54} redAfterSec={1.6} />

      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, [B.az - 0.2, B.end + 1.0] as Range) }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 760, textAlign: 'center',
          opacity: interpolate(t, [B.az, B.az + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 110, color: O_INK, letterSpacing: -3 }}>
            de <span style={{ color: O_RED }}>A</span> a <span style={{ color: O_RED }}>Z</span>.
          </div>
        </div>
      </div>

      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c36.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
