import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, OffthreadVideo } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, HEAD, BODY, MONO } from './theme';
import { FPS, ClipAt } from './story';
import { AmbientBg, EndCard, FloatBadge, BadgeText } from './common';
import { Grain, Vignette, WipePanel, win, easeOutExpo } from './cine';
import timing from './timings/c54.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C54_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  hook: DELAY + 0.1,
  n5: DELAY + 4.6, n4: DELAY + 9.2, n3: DELAY + 16.2, n2: DELAY + 21.5, n1: DELAY + 26.7,
  surpresa: DELAY + 27.4,
  n530: DELAY + 34.6,
  end: DELAY + T.duration - 3.2,
};

type Item = { at: number; until: number; num: string; titulo: string; sub: string; src: string; from: number };
const ITENS: Item[] = [
  { at: B.n5, until: B.n4, num: '5', titulo: 'resumo em 1 clique', sub: 'a aula longa vira o essencial', src: 'rec/m_pdf.mp4', from: 210 },
  { at: B.n4, until: B.n3, num: '4', titulo: 'flashcards por IA', sub: 'do seu próprio material', src: 'rec/oa_flash_gen.mp4', from: 220 },
  { at: B.n3, until: B.n2, num: '3', titulo: 'questões comentadas', sub: 'a mais aberta de madrugada', src: 'rec/oa_questions.mp4', from: 450 },
  { at: B.n2, until: B.n1, num: '2', titulo: 'assistente que lê a tela', sub: 'quase deu primeiro lugar', src: 'rec/oa_assistant.mp4', from: 300 },
  { at: B.n1, until: B.n530, num: '1', titulo: 'A BUSCA', sub: 'aula + livro + questão — acha até dentro dos materiais', src: 'rec/m_search.mp4', from: 160 },
];

export const C54_Top5: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#07080c' }}>
      <AmbientBg intensity={0.85} />

      {/* hook */}
      <div style={{ position: 'absolute', inset: 0, opacity: t < B.n5 ? 1 - win(t, B.n5 - 0.4, B.n5) : 0 }}>
        <div style={{ position: 'absolute', left: 60, right: 60, top: 640, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 120, color: WHITE, letterSpacing: -4, lineHeight: 1 }}>
            TOP <span style={{ color: RED }}>5</span>
          </div>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: 'rgba(255,255,255,0.85)', marginTop: 24 }}>
            ferramentas — na ordem que eu mais uso
          </div>
        </div>
      </div>

      {ITENS.map((it, i) => {
        const p = easeOutExpo(win(t, it.at, it.at + 0.5));
        const o = Math.min(win(t, it.at, it.at + 0.3), 1 - win(t, it.until - 0.25, it.until));
        if (o <= 0) return null;
        const um = it.num === '1';
        return (
          <div key={i} style={{ position: 'absolute', inset: 0, opacity: o }}>
            {/* número gigante atrás */}
            <div style={{
              position: 'absolute', left: um ? '50%' : -30, top: um ? 200 : 260,
              transform: um ? `translateX(-50%) scale(${0.8 + p * 0.2})` : `scale(${0.9 + p * 0.1})`,
              fontFamily: HEAD, fontWeight: 900, fontSize: um ? 380 : 560,
              color: um ? RED : 'rgba(255,255,255,0.07)', letterSpacing: -20, lineHeight: 1, zIndex: um ? 3 : 1,
              textShadow: um ? '0 30px 120px rgba(239,68,68,0.5)' : 'none',
            }}>{it.num}</div>
            {/* take */}
            <div style={{
              position: 'absolute', left: '50%', top: um ? 620 : 520, transform: `translateX(-50%) translateY(${(1 - p) * 120}px)`,
              width: 560, height: um ? 900 : 1000, borderRadius: 30, overflow: 'hidden', zIndex: 5,
              border: `2px solid ${um ? RED : 'rgba(255,255,255,0.14)'}`,
              boxShadow: um ? '0 50px 130px -30px rgba(239,68,68,0.5)' : '0 50px 120px -30px rgba(0,0,0,0.8)',
            }}>
              <ClipAt fromSec={it.at - 0.3}>
                <OffthreadVideo src={staticFile(it.src)} muted startFrom={it.from} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              </ClipAt>
            </div>
            <FloatBadge x={56} y={um ? 480 : 400} delay={Math.round((it.at + 0.35) * FPS)} from="left" accent>
              <BadgeText top={it.titulo} bottom={it.sub} />
            </FloatBadge>
          </div>
        );
      })}

      {ITENS.map((it, i) => <WipePanel key={i} t={t} atSec={it.at} color={RED} dur={0.45} angle={i % 2 ? 12 : -12} />)}

      {/* cartela 530 */}
      <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.n530, B.n530 + 0.3), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 740, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 170, color: WHITE, letterSpacing: -6, lineHeight: 1 }}>
            530<span style={{ color: RED }}>+</span>
          </div>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 36, color: 'rgba(255,255,255,0.85)', marginTop: 18 }}>
            cursos pra busca vasculhar
          </div>
        </div>
      </div>

      <Vignette strength={0.5} />
      <Grain opacity={0.07} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={RED} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c54.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
