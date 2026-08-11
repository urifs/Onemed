import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, OffthreadVideo } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY } from './theme';
import { FPS, ClipAt } from './story';
import { AmbientBg, EndCard } from './common';
import { RED, WHITE as W } from './theme';
import { Grain, Vignette, Letterbox, LightSweep, FlashCut, win, easeOutExpo } from './cine';
import timing from './timings/c53.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C53_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  neste: DELAY + 0.1,
  dequem: DELAY + 5.1,
  resumo: DELAY + 9.3, flash: DELAY + 11.5, assist: DELAY + 13.9,
  anuncio: DELAY + 17.8,
  busca: DELAY + 22.6, quest: DELAY + 26.0, comunidade: DELAY + 28.3,
  embreve: DELAY + 32.7, asua: DELAY + 35.8,
  end: DELAY + T.duration - 3.2,
};

const Cartela: React.FC<{ t: number; at: number; until: number; lines: string[]; size?: number }> =
({ t, at, until, lines, size = 66 }) => {
  const p = easeOutExpo(win(t, at, at + 0.8));
  const o = Math.min(win(t, at, at + 0.4), 1 - win(t, until - 0.3, until));
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: o }}>
      <div style={{ textAlign: 'center', transform: `scale(${0.92 + p * 0.08}) translateY(${(1 - p) * 40}px)`, letterSpacing: 6 }}>
        {lines.map((l, i) => (
          <div key={i} style={{
            fontFamily: HEAD, fontWeight: 900, fontSize: i === lines.length - 1 ? size : size * 0.52,
            color: i === lines.length - 1 ? W : 'rgba(255,255,255,0.72)',
            lineHeight: 1.3, textTransform: 'uppercase',
            textShadow: '0 10px 60px rgba(0,0,0,0.8)',
          }}>{l}</div>
        ))}
      </div>
    </div>
  );
};

const Take: React.FC<{ t: number; at: number; until: number; src: string; from: number; label: string }> =
({ t, at, until, src, from, label }) => {
  const o = Math.min(win(t, at, at + 0.25), 1 - win(t, until - 0.2, until));
  if (o <= 0) return null;
  const z = 1.06 - 0.06 * win(t, at, until);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <div style={{ position: 'absolute', left: '50%', top: '47%', transform: `translate(-50%,-50%) scale(${z})`, width: 660, height: 1240, borderRadius: 34, overflow: 'hidden', boxShadow: '0 60px 140px -30px rgba(0,0,0,0.9)' }}>
        <ClipAt fromSec={at - 0.3}>
          <OffthreadVideo src={staticFile(src)} muted startFrom={from} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        </ClipAt>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 300, textAlign: 'center' }}>
        <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 34, color: W, letterSpacing: 4, textTransform: 'uppercase', textShadow: '0 6px 30px rgba(0,0,0,0.9)' }}>{label}</span>
      </div>
    </div>
  );
};

export const C53_Trailer: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#05060a' }}>
      <AmbientBg intensity={0.7} />

      <Cartela t={t} at={B.neste} until={B.dequem} lines={['neste semestre', 'uma força vai mudar', 'sua rotina de estudos']} size={64} />
      <Cartela t={t} at={B.dequem} until={B.resumo} lines={['de quem trouxe', '+530 cursos']} size={88} />

      <Take t={t} at={B.resumo} until={B.flash} src="rec/m_pdf.mp4" from={190} label="resume em 1 clique" />
      <Take t={t} at={B.flash} until={B.assist} src="rec/oa_flash_gen.mp4" from={220} label="seu material vira flashcards" />
      <Take t={t} at={B.assist} until={B.anuncio} src="rec/oa_assistant.mp4" from={300} label="responde olhando sua tela" />

      {/* quebra da 4ª parede */}
      <Cartela t={t} at={B.anuncio} until={B.busca} lines={['sim. isso é um anúncio.', 'mas assiste até o fim.']} size={56} />

      <Take t={t} at={B.busca} until={B.quest} src="rec/m_search.mp4" from={150} label="uma busca: aula + livro + questão" />
      <Take t={t} at={B.quest} until={B.comunidade} src="rec/oa_questions.mp4" from={450} label="respostas comentadas" />
      <Take t={t} at={B.comunidade} until={B.embreve} src="rec/m_community.mp4" from={100} label="+10.000 médicos e estudantes" />

      <Cartela t={t} at={B.embreve} until={B.asua} lines={['em breve', 'na tela mais próxima de você']} size={62} />
      <Cartela t={t} at={B.asua} until={B.end + 0.6} lines={['a sua.']} size={130} />

      {[B.dequem, B.resumo, B.flash, B.assist, B.anuncio, B.busca, B.quest, B.comunidade, B.embreve, B.asua].map((b, i) => (
        <FlashCut key={i} t={t} atSec={b} color="rgba(255,255,255,0.35)" />
      ))}

      <LightSweep t={t} period={4.5} opacity={0.10} />
      <Letterbox t={t} inAt={0.1} outAt={B.end - 0.4} size={150} />
      <Vignette strength={0.55} />
      <Grain opacity={0.09} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={50} highlight={RED} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c53.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
