import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO } from './theme';
import { FPS } from './story';
import { OLightBg, OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import { Grain, Vignette, WipePanel, win, easeOutExpo } from './cine';
import timing from './timings/c69.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C69_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  feira: DELAY + 0.8,
  grito: DELAY + 6.0, estrategia: DELAY + 7.6, n14: DELAY + 8.9, balanca: DELAY + 12.8,
  lado: DELAY + 14.9, medcof: DELAY + 15.2, medcel: DELAY + 16.1, cardio: DELAY + 17.0, incor: DELAY + 19.3,
  n530: DELAY + 20.2, n9k: DELAY + 22.2,
  concorrida: DELAY + 25.2, n31: DELAY + 27.4, medgrupo: DELAY + 30.1, banca: DELAY + 31.7,
  sacola: DELAY + 33.7, ia1: DELAY + 37.5, ia2: DELAY + 38.7, ia3: DELAY + 40.3,
  fresco: DELAY + 42.5,
  end: DELAY + T.duration - 3.2,
};

/* lona listrada de barraca */
const Lona: React.FC<{ cor: string }> = ({ cor }) => (
  <div style={{ height: 74, borderRadius: '16px 16px 0 0', overflow: 'hidden', position: 'relative' }}>
    <div style={{ position: 'absolute', inset: 0, background: `repeating-linear-gradient(90deg, ${cor} 0 56px, #fff 56px 112px)` }} />
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: -18, height: 22, background: `repeating-linear-gradient(90deg, ${cor} 0 56px, #fff 56px 112px)`, clipPath: 'polygon(0 0, 100% 0, 100% 40%, 95% 100%, 90% 40%, 85% 100%, 80% 40%, 75% 100%, 70% 40%, 65% 100%, 60% 40%, 55% 100%, 50% 40%, 45% 100%, 40% 40%, 35% 100%, 30% 40%, 25% 100%, 20% 40%, 15% 100%, 10% 40%, 5% 100%, 0 40%)' }} />
  </div>
);

const Barraca: React.FC<{ t: number; at: number; cor: string; titulo: React.ReactNode; children?: React.ReactNode; w?: number | string }> =
({ t, at, cor, titulo, children, w = '100%' }) => {
  const p = easeOutExpo(win(t, at, at + 0.55));
  if (p <= 0) return null;
  return (
    <div style={{ width: w, opacity: win(t, at, at + 0.3), transform: `translateY(${(1 - p) * 90}px)` }}>
      <Lona cor={cor} />
      <div style={{ background: WHITE, border: '2px solid #e8e2d4', borderTop: 'none', borderRadius: '0 0 18px 18px', padding: '30px 30px 26px', boxShadow: '0 30px 70px -22px rgba(22,24,29,0.22)' }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: O_INK }}>{titulo}</div>
        {children}
      </div>
    </div>
  );
};

export const C69_Feira: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const kg = 14142 * easeOutExpo(win(t, B.balanca, B.balanca + 1.2));
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />

      {/* abertura */}
      <div style={{ position: 'absolute', inset: 0, opacity: t < B.grito ? 1 - win(t, B.grito - 0.35, B.grito) : 0 }}>
        <div style={{ position: 'absolute', left: 70, right: 70, top: 620, textAlign: 'center' }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, color: O_MUT, letterSpacing: 6 }}>MANHÃ DE FEIRA</div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 76, color: O_INK, letterSpacing: -2, marginTop: 18, lineHeight: 1.2 }}>
            cada barraca…<br /><span style={{ color: O_RED }}>um curso de medicina.</span>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 90, right: 90, top: 1120, opacity: win(t, B.feira + 1.6, B.feira + 2.0) }}>
          <Lona cor={O_RED} />
          <div style={{ height: 60, background: WHITE, borderRadius: '0 0 16px 16px', border: '2px solid #e8e2d4', borderTop: 'none' }} />
        </div>
      </div>

      {/* barraca Estratégia MED + balança */}
      {t >= B.grito && t < B.lado && (
        <div style={{ position: 'absolute', left: 80, right: 80, top: 460, opacity: 1 - win(t, B.lado - 0.25, B.lado) }}>
          <Barraca t={t} at={B.grito} cor={O_RED} titulo={<>olha o <span style={{ color: O_RED }}>Estratégia MED!</span></>}>
            <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 28, color: O_MUT, marginTop: 10, opacity: win(t, B.n14, B.n14 + 0.3) }}>
              14.142 aulas num extensivo só!
            </div>
            {/* balança */}
            <div style={{ marginTop: 28, opacity: win(t, B.balanca - 0.4, B.balanca) }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ width: 200, height: 130, borderRadius: '14px 14px 60px 60px', background: '#eceff3', border: '3px solid #cfd6de', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: O_INK }}>📚</span>
                </div>
                <div style={{ flex: 1, background: '#16181d', borderRadius: 14, padding: '18px 24px', textAlign: 'right' }}>
                  <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 52, color: '#7cffa8', letterSpacing: 2 }}>{Math.round(kg).toLocaleString('pt-BR')}</div>
                  <div style={{ fontFamily: MONO, fontSize: 21, color: 'rgba(255,255,255,0.6)' }}>aulas na balança</div>
                </div>
              </div>
            </div>
          </Barraca>
        </div>
      )}

      {/* fileira de barracas */}
      {t >= B.lado && t < B.concorrida && (
        <div style={{ position: 'absolute', left: 70, right: 70, top: 430, opacity: 1 - win(t, B.concorrida - 0.25, B.concorrida) }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
            <Barraca t={t} at={B.medcof} cor="#3e8e6a" titulo="Medcof" />
            <Barraca t={t} at={B.medcel} cor="#3f6fb5" titulo="MedCel" />
            <Barraca t={t} at={B.cardio} cor="#b8860b" titulo="Cardiopapers" />
            <Barraca t={t} at={B.incor} cor="#b5533e" titulo={<>InCor <span style={{ fontSize: 26, color: O_MUT }}>· ECG</span></>} />
          </div>
          <div style={{ textAlign: 'center', marginTop: 36, opacity: win(t, B.n530, B.n530 + 0.35) }}>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 44, color: O_INK }}>+530 barracas</span>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 44, color: O_RED, opacity: win(t, B.n9k, B.n9k + 0.3) }}> · +9.000 livros</span>
          </div>
        </div>
      )}

      {/* a barraca mais concorrida */}
      {t >= B.concorrida && t < B.sacola && (
        <div style={{ position: 'absolute', left: 80, right: 80, top: 440, opacity: 1 - win(t, B.sacola - 0.25, B.sacola) }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: O_RED, letterSpacing: 5 }}>A MAIS CONCORRIDA</span>
          </div>
          <Barraca t={t} at={B.concorrida} cor={O_RED} titulo="Questões Comentadas">
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 92, color: O_RED, letterSpacing: -3, marginTop: 12, opacity: win(t, B.n31, B.n31 + 0.3) }}>31.612</div>
            <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 28, color: O_MUT }}>aulas</div>
            <div style={{ marginTop: 20, opacity: win(t, B.medgrupo, B.medgrupo + 0.3) }}>
              <span style={{ background: 'rgba(224,45,45,0.08)', border: `2px solid ${O_RED}`, borderRadius: 999, padding: '12px 26px', fontFamily: HEAD, fontWeight: 800, fontSize: 28, color: O_INK }}>
                MedGrupo: <span style={{ color: O_RED, opacity: win(t, B.banca, B.banca + 0.3) }}>da sua banca, do seu estado</span>
              </span>
            </div>
          </Barraca>
          {/* fila de gente (bolinhas) */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 26 }}>
            {[...Array(14)].map((_, i) => (
              <div key={i} style={{ width: 26, height: 26, borderRadius: 99, background: i % 3 ? '#cfd6de' : O_RED, opacity: win(t, B.concorrida + 0.4 + i * 0.07, B.concorrida + 0.6 + i * 0.07) }} />
            ))}
          </div>
        </div>
      )}

      {/* sacola organizada pela IA */}
      {t >= B.sacola && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.sacola, B.sacola + 0.35), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center' }}>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 56, color: O_INK, letterSpacing: -1.5 }}>
              a sacola chega em casa<br /><span style={{ color: O_RED }}>organizada.</span>
            </div>
            {/* sacola */}
            <div style={{ width: 460, margin: '46px auto 0', position: 'relative' }}>
              <div style={{ height: 400, background: '#f6efe2', border: '3px solid #dccfb2', borderRadius: '10px 10px 26px 26px', boxShadow: '0 40px 90px -26px rgba(22,24,29,0.3)', paddingTop: 40 }}>
                {[['resumo em 1 clique', B.ia1], ['flashcards do seu material', B.ia2], ['cronograma com mapa mental', B.ia3]].map(([txt, at], i) => (
                  <div key={i} style={{
                    margin: '14px 28px 0', background: WHITE, border: `2.5px solid ${i === 2 ? O_RED : '#e4ddca'}`, borderRadius: 999, padding: '14px 10px',
                    fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: O_INK,
                    opacity: win(t, at as number, (at as number) + 0.3),
                    transform: `translateY(${(1 - easeOutExpo(win(t, at as number, (at as number) + 0.45))) * -60}px)`,
                  }}>{txt as string}</div>
                ))}
              </div>
              <div style={{ position: 'absolute', top: -54, left: 90, right: 90, height: 70, border: '10px solid #dccfb2', borderBottom: 'none', borderRadius: '60px 60px 0 0' }} />
            </div>
            <div style={{ marginTop: 40, opacity: win(t, B.fresco, B.fresco + 0.35) }}>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, color: O_GREEN, letterSpacing: 2 }}>✓ TUDO FRESCO — ATUALIZAÇÕES SEM CUSTO</span>
            </div>
          </div>
        </div>
      )}

      <WipePanel t={t} atSec={B.grito} color={O_RED} dur={0.45} angle={-10} />
      <WipePanel t={t} atSec={B.concorrida} color={O_RED} dur={0.45} angle={10} />
      <Vignette strength={0.2} />
      <Grain opacity={0.04} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c69.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
