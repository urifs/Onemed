import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, HEAD, BODY, MONO } from './theme';
import { FPS } from './story';
import { EndCard } from './common';
import { Grain, Vignette, typed, win, easeOutExpo } from './cine';
import timing from './timings/c70.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C70_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  cima: DELAY + 0.6, n530: DELAY + 4.6,
  constel1: DELAY + 6.7, estrategia: DELAY + 8.7, medcof: DELAY + 11.0, emr: DELAY + 12.4, n65: DELAY + 14.6,
  constel2: DELAY + 18.7, cardio: DELAY + 19.8, incor: DELAY + 22.3,
  nebulosa: DELAY + 24.8, n31: DELAY + 26.5, banca: DELAY + 31.9, n86: DELAY + 35.2,
  telescopio: DELAY + 39.3, digita: DELAY + 41.3,
  ia: DELAY + 44.7, rota1: DELAY + 47.6, rota2: DELAY + 48.8, rota3: DELAY + 49.7,
  ceu: DELAY + 52.0,
  end: DELAY + T.duration - 3.2,
};

/* céu estrelado determinístico */
const STARS = [...Array(90)].map((_, i) => ({
  x: (i * 137.5) % 1080,
  y: 120 + ((i * 261.8) % 1500),
  r: 1.5 + ((i * 7) % 5) * 0.7,
  o: 0.3 + ((i * 13) % 7) / 10,
}));

const C1 = [{ x: 250, y: 480 }, { x: 420, y: 380 }, { x: 590, y: 470 }, { x: 700, y: 360 }, { x: 840, y: 460 }];
const C2 = [{ x: 220, y: 780 }, { x: 380, y: 700 }, { x: 560, y: 760 }, { x: 730, y: 690 }];

const Constelacao: React.FC<{ t: number; at: number; pts: Array<{ x: number; y: number }>; cor?: string }> =
({ t, at, pts, cor = 'rgba(255,255,255,0.55)' }) => {
  const p = win(t, at, at + 1.6);
  if (p <= 0) return null;
  const total = pts.length - 1;
  return (
    <svg style={{ position: 'absolute', inset: 0 }} width={1080} height={1920} viewBox="0 0 1080 1920">
      {pts.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={7} fill={WHITE} opacity={win(t, at + (i / pts.length) * 1.2, at + 0.2 + (i / pts.length) * 1.2)} style={{ filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.8))' }} />
      ))}
      {pts.slice(0, -1).map((pt, i) => {
        const seg = win(t, at + 0.3 + (i / total) * 1.1, at + 0.3 + ((i + 1) / total) * 1.1);
        const nx = pts[i + 1];
        return <line key={i} x1={pt.x} y1={pt.y} x2={pt.x + (nx.x - pt.x) * seg} y2={pt.y + (nx.y - pt.y) * seg} stroke={cor} strokeWidth={2.5} />;
      })}
    </svg>
  );
};

const Etiqueta: React.FC<{ t: number; at: number; x: number; y: number; children: React.ReactNode; size?: number }> =
({ t, at, x, y, children, size = 34 }) => (
  <div style={{ position: 'absolute', left: x, top: y, opacity: win(t, at, at + 0.3), transform: `translateY(${(1 - easeOutExpo(win(t, at, at + 0.5))) * 20}px)` }}>
    <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: size, color: WHITE, textShadow: '0 0 30px rgba(255,255,255,0.4)' }}>{children}</span>
  </div>
);

export const C70_Observatorio: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const nebOp = win(t, B.nebulosa, B.nebulosa + 0.8);
  const drift = t * 3;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#05070f' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 130% 70% at 50% 0%, #0b1024 0%, #05070f 65%)' }} />

      {/* estrelas */}
      <svg style={{ position: 'absolute', inset: 0, transform: `translateY(${-drift * 0.4}px)` }} width={1080} height={1920} viewBox="0 0 1080 1920">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y + 100} r={s.r} fill={WHITE} opacity={s.o * (0.7 + 0.3 * Math.sin(t * 2 + i))} />
        ))}
      </svg>

      {/* abertura */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1050, textAlign: 'center', opacity: t < B.constel1 ? Math.min(win(t, B.cima, B.cima + 0.4), 1 - win(t, B.constel1 - 0.3, B.constel1)) : 0 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 66, color: WHITE, letterSpacing: -1.5, lineHeight: 1.3 }}>
          cada estrela…<br />um curso de medicina.
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: 'rgba(255,255,255,0.65)', marginTop: 22, letterSpacing: 3, opacity: win(t, B.n530, B.n530 + 0.35) }}>
          +530 NESSE CÉU
        </div>
      </div>

      {/* constelação dos extensivos */}
      {t >= B.constel1 && t < B.nebulosa && (
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - win(t, B.nebulosa - 0.3, B.nebulosa) }}>
          <Constelacao t={t} at={B.constel1} pts={C1} />
          <Etiqueta t={t} at={B.constel1} x={90} y={250} size={28}>CONSTELAÇÃO DOS EXTENSIVOS</Etiqueta>
          <Etiqueta t={t} at={B.estrategia} x={300} y={300} size={44}>Estratégia MED</Etiqueta>
          <Etiqueta t={t} at={B.medcof} x={150} y={530}>Medcof</Etiqueta>
          <Etiqueta t={t} at={B.emr} x={560} y={530} size={30}>Eu Médico Residente</Etiqueta>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 900, textAlign: 'center', opacity: win(t, B.n65, B.n65 + 0.35) }}>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 44, color: RED }}>+65 mil aulas</span>
            <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 28, color: 'rgba(255,255,255,0.7)' }}> só nessa região</span>
          </div>
          {t >= B.constel2 && (
            <>
              <Constelacao t={t} at={B.constel2} pts={C2.map(p => ({ x: p.x, y: p.y + 300 }))} cor="rgba(255,150,150,0.5)" />
              <Etiqueta t={t} at={B.constel2} x={90} y={1030} size={28}>CONSTELAÇÃO DA CARDIOLOGIA</Etiqueta>
              <Etiqueta t={t} at={B.cardio} x={170} y={1180} size={38}>Cardiopapers</Etiqueta>
              <Etiqueta t={t} at={B.incor} x={520} y={1240} size={34}>InCor · ECG</Etiqueta>
            </>
          )}
        </div>
      )}

      {/* nebulosa das questões */}
      {t >= B.nebulosa && t < B.telescopio && (
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - win(t, B.telescopio - 0.3, B.telescopio) }}>
          <div style={{
            position: 'absolute', left: '50%', top: 760, transform: 'translate(-50%,-50%)', width: 900, height: 700, opacity: nebOp,
            background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(239,68,68,0.4) 0%, rgba(239,68,68,0.15) 45%, transparent 75%)',
            filter: 'blur(8px)',
          }} />
          <svg style={{ position: 'absolute', inset: 0, opacity: nebOp }} width={1080} height={1920}>
            {[...Array(60)].map((_, i) => (
              <circle key={i} cx={340 + (i * 97) % 420} cy={560 + (i * 61) % 420} r={1.6 + (i % 3)} fill="#ffb3b3" opacity={0.5 + 0.5 * Math.sin(t * 3 + i * 2)} />
            ))}
          </svg>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 620, textAlign: 'center' }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, color: '#ff9d9d', letterSpacing: 6, opacity: nebOp }}>NEBULOSA DAS QUESTÕES</div>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 130, color: WHITE, letterSpacing: -4, marginTop: 20, opacity: win(t, B.n31, B.n31 + 0.35), textShadow: '0 0 80px rgba(239,68,68,0.6)' }}>31.612</div>
            <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: 'rgba(255,255,255,0.85)', marginTop: 8, opacity: win(t, B.n31 + 0.3, B.n31 + 0.6) }}>aulas só de questões comentadas</div>
            <div style={{ marginTop: 30, opacity: win(t, B.banca, B.banca + 0.35) }}>
              <span style={{ background: 'rgba(239,68,68,0.15)', border: `2px solid ${RED}`, borderRadius: 999, padding: '14px 30px', fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: WHITE }}>
                MedGrupo — da sua banca, do seu estado
              </span>
            </div>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 46, color: RED, marginTop: 34, opacity: win(t, B.n86, B.n86 + 0.35) }}>
              +86 mil itens entre bancos e simulados
            </div>
          </div>
        </div>
      )}

      {/* telescópio = busca */}
      {t >= B.telescopio && t < B.ia && (
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - win(t, B.ia - 0.25, B.ia) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center' }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: 'rgba(255,255,255,0.6)', letterSpacing: 6 }}>QUER UMA ESTRELA ESPECÍFICA?</div>
            <div style={{
              margin: '36px auto 0', width: 760, background: '#0d1120', border: '2.5px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '26px 40px',
              display: 'flex', alignItems: 'center', gap: 20, opacity: win(t, B.telescopio + 0.4, B.telescopio + 0.7),
            }}>
              <span style={{ fontSize: 34, color: 'rgba(255,255,255,0.5)' }}>🔭</span>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 36, color: WHITE }}>
                {typed('eletrocardiograma', t, B.digita, 16)}<span style={{ opacity: t % 0.8 < 0.4 ? 1 : 0 }}>|</span>
              </span>
            </div>
            <div style={{ marginTop: 30, opacity: win(t, B.digita + 1.4, B.digita + 1.8) }}>
              <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 29, color: 'rgba(255,255,255,0.75)' }}>a busca aponta o telescópio: aula + livro + questão</span>
            </div>
          </div>
        </div>
      )}

      {/* IA traça a rota */}
      {t >= B.ia && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.ia, B.ia + 0.3), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
          <svg style={{ position: 'absolute', inset: 0 }} width={1080} height={1920}>
            <path d="M 200 520 C 420 460, 640 520, 800 640 C 920 740, 760 900, 540 940" fill="none" stroke={RED} strokeWidth={4} strokeDasharray="4 20" pathLength={100} strokeDashoffset={100 - win(t, B.ia + 0.2, B.ia + 1.6) * 100} />
            {[{ x: 200, y: 520 }, { x: 800, y: 640 }, { x: 540, y: 940 }].map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={8} fill={WHITE} style={{ filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.9))' }} />
            ))}
          </svg>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 1030, textAlign: 'center' }}>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 60, color: WHITE, letterSpacing: -1.5 }}>
              e a IA traça <span style={{ color: RED }}>a sua rota.</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 40, flexWrap: 'wrap' }}>
              {[['resumo em 1 clique', B.rota1], ['flashcards', B.rota2], ['cronograma + mapa mental', B.rota3]].map(([txt, at], i) => (
                <span key={i} style={{
                  opacity: win(t, at as number, (at as number) + 0.3),
                  background: '#0d1120', border: '2px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '16px 28px',
                  fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: WHITE,
                }}>{txt as string}</span>
              ))}
            </div>
            <div style={{ marginTop: 42, opacity: win(t, B.ceu, B.ceu + 0.35) }}>
              <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 44, color: 'rgba(255,255,255,0.9)' }}>vem ver esse céu de perto.</span>
            </div>
          </div>
        </div>
      )}

      <Vignette strength={0.5} />
      <Grain opacity={0.07} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1620} size={52} highlight={RED} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c70.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
