import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, HEAD, BODY, MONO } from './theme';
import { FPS } from './story';
import { EndCard } from './common';
import { Grain, Vignette, FlashCut, shakeAt, win, easeOutExpo } from './cine';
import timing from './timings/c68.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C68_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  poster: DELAY + 0.2, vs: DELAY + 2.4,
  corner: DELAY + 7.1,
  t1: DELAY + 9.5, n14: DELAY + 12.9,
  t2: DELAY + 17.2,
  t3: DELAY + 21.6, n12: DELAY + 24.4, banca: DELAY + 27.9,
  sparring: DELAY + 30.3, n31: DELAY + 31.6,
  n530: DELAY + 36.6,
  cutman: DELAY + 40.5, f1: DELAY + 43.5, f2: DELAY + 44.8,
  luta: DELAY + 47.1, sozinho: DELAY + 49.6,
  end: DELAY + T.duration - 3.2,
};

type Treinador = { at: number; until: number; nome: string; papel: string; extra?: string; extraAt?: number };
const CORNER: Treinador[] = [
  { at: B.t1, until: B.t2, nome: 'ESTRATÉGIA MED', papel: 'no jab — golpe preciso', extra: '14.142 aulas · Intensivo/Extensivo', extraAt: B.n14 },
  { at: B.t2, until: B.t3, nome: 'MEDCURSO', papel: 'no cardio — até o último assalto' },
  { at: B.t3, until: B.sparring, nome: 'MEDGRUPO', papel: 'questões por estado e instituição', extra: '12.234 aulas — sua banca, seu estado', extraAt: B.n12 },
];

const Cordas: React.FC<{ y: number }> = ({ y }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: y }}>
    {[0, 46, 92].map(o => (
      <div key={o} style={{ position: 'absolute', left: 0, right: 0, top: o, height: 8, background: o === 46 ? RED : 'rgba(255,255,255,0.22)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} />
    ))}
  </div>
);

export const C68_Luta: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const shake = shakeAt(t, B.n31, 9) || shakeAt(t, B.vs, 7);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#0a0a0d', transform: shake || undefined }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 120% 70% at 50% 25%, #16161c 0%, #0a0a0d 70%)' }} />
      <Cordas y={330} />

      {/* pôster VOCÊ × A PROVA */}
      <div style={{ position: 'absolute', inset: 0, opacity: t < B.t1 ? 1 - win(t, B.t1 - 0.35, B.t1) : 0 }}>
        <div style={{ position: 'absolute', left: 60, right: 60, top: 560, textAlign: 'center' }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, color: 'rgba(255,255,255,0.55)', letterSpacing: 8 }}>CARD PRINCIPAL · ÚNICO ROUND QUE IMPORTA</div>
          <div style={{ marginTop: 40, opacity: win(t, B.vs - 0.3, B.vs) }}>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 130, color: WHITE, letterSpacing: -5, lineHeight: 0.95 }}>VOCÊ</div>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 84, color: RED, margin: '18px 0', transform: `scale(${0.7 + 0.3 * easeOutExpo(win(t, B.vs, B.vs + 0.4))})` }}>×</div>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 130, color: 'transparent', WebkitTextStroke: `4px ${WHITE}`, letterSpacing: -5, lineHeight: 0.95 }}>A PROVA</div>
          </div>
          <div style={{ marginTop: 44, opacity: win(t, B.corner, B.corner + 0.35) }}>
            <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 36, color: 'rgba(255,255,255,0.85)' }}>ninguém sobe nesse ringue sozinho.</span>
          </div>
        </div>
      </div>

      {/* fichas dos treinadores */}
      {CORNER.map((c, i) => {
        const o = Math.min(win(t, c.at, c.at + 0.3), 1 - win(t, c.until - 0.25, c.until));
        if (o <= 0) return null;
        const p = easeOutExpo(win(t, c.at, c.at + 0.55));
        return (
          <div key={i} style={{ position: 'absolute', inset: 0, opacity: o }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 372, textAlign: 'center' }}>
              <span style={{ background: '#0a0a0d', borderRadius: 999, padding: '10px 26px', fontFamily: MONO, fontWeight: 700, fontSize: 25, color: RED, letterSpacing: 6 }}>SEU CÓRNER · TREINADOR {i + 1}/3</span>
            </div>
            <div style={{
              position: 'absolute', left: 80, right: 80, top: 520, transform: `translateY(${(1 - p) * 130}px) rotate(${(1 - p) * (i % 2 ? 2.5 : -2.5)}deg)`,
              background: 'linear-gradient(165deg,#181820,#0e0e13)', border: `3px solid ${RED}`, borderRadius: 24, padding: '44px 40px',
              boxShadow: '0 60px 130px -30px rgba(239,68,68,0.35)',
            }}>
              {/* luva */}
              <div style={{ width: 110, height: 110, borderRadius: '50% 50% 46% 54%', background: RED, margin: '0 auto', boxShadow: 'inset -12px -10px 0 rgba(0,0,0,0.25), 0 20px 50px -10px rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: 44, color: WHITE }}>{i + 1}</div>
              <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: c.nome.length > 10 ? 74 : 92, color: WHITE, letterSpacing: -2, marginTop: 30 }}>{c.nome}</div>
              <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 32, color: 'rgba(255,255,255,0.8)', marginTop: 14 }}>{c.papel}</div>
              {c.extra && (
                <div style={{ marginTop: 26, opacity: win(t, c.extraAt!, c.extraAt! + 0.3) }}>
                  <span style={{ background: 'rgba(239,68,68,0.14)', border: `2px solid ${RED}`, borderRadius: 999, padding: '14px 30px', fontFamily: HEAD, fontWeight: 900, fontSize: 33, color: RED }}>{c.extra}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* sparring 31.612 */}
      {t >= B.sparring && t < B.cutman && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.sparring, B.sparring + 0.3), 1 - win(t, B.cutman - 0.3, B.cutman)) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 600, textAlign: 'center' }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: 'rgba(255,255,255,0.55)', letterSpacing: 7 }}>O SPARRING</div>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 200, color: RED, letterSpacing: -8, lineHeight: 1, marginTop: 26, opacity: win(t, B.n31, B.n31 + 0.25), transform: `scale(${0.85 + 0.15 * easeOutExpo(win(t, B.n31, B.n31 + 0.45))})`, textShadow: '0 30px 120px rgba(239,68,68,0.5)' }}>
              31.612
            </div>
            <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: WHITE, marginTop: 18 }}>aulas só de questões comentadas</div>
            <div style={{ marginTop: 50, opacity: win(t, B.n530, B.n530 + 0.35) }}>
              <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 46, color: 'rgba(255,255,255,0.9)' }}>+530 cursos no seu córner</span>
            </div>
          </div>
        </div>
      )}

      {/* cutman IA */}
      {t >= B.cutman && t < B.luta && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.cutman, B.cutman + 0.3), 1 - win(t, B.luta - 0.25, B.luta)) }}>
          <div style={{ position: 'absolute', left: 90, right: 90, top: 640, textAlign: 'center' }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: RED, letterSpacing: 6 }}>ENTRE UM ROUND E OUTRO</div>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 80, color: WHITE, letterSpacing: -2, marginTop: 16 }}>
              a IA é o <span style={{ color: RED }}>cutman.</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 48 }}>
              {[['resumo em 1 clique', B.f1], ['flashcards do seu material', B.f2]].map(([txt, at], i) => (
                <span key={i} style={{
                  opacity: win(t, at as number, (at as number) + 0.3),
                  background: '#14141a', border: '2px solid rgba(255,255,255,0.2)', borderRadius: 999, padding: '20px 34px',
                  fontFamily: HEAD, fontWeight: 800, fontSize: 38, color: WHITE,
                }}>{txt as string}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* fecho */}
      {t >= B.luta && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.luta, B.luta + 0.3), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
          <div style={{ position: 'absolute', left: 80, right: 80, top: 760, textAlign: 'center' }}>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: WHITE, letterSpacing: -1.5, lineHeight: 1.3 }}>
              a luta continua sendo sua.
            </div>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 74, color: RED, letterSpacing: -2, marginTop: 26, opacity: win(t, B.sozinho, B.sozinho + 0.35) }}>
              mas ninguém sobe sozinho.
            </div>
          </div>
        </div>
      )}

      {[B.t1, B.t2, B.t3, B.sparring, B.cutman, B.luta].map((b, i) => <FlashCut key={i} t={t} atSec={b} color="rgba(239,68,68,0.3)" />)}
      <Vignette strength={0.55} />
      <Grain opacity={0.08} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1620} size={52} highlight={RED} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c68.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
