import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, HEAD, BODY, MONO } from './theme';
import { FPS } from './story';
import { EndCard } from './common';
import { Grain, Vignette, Letterbox, FlashCut, typed, win, easeOutExpo } from './cine';
import timing from './timings/c84.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C84_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  hook: DELAY + 0.1,
  d1: DELAY + 3.8, s1: DELAY + 5.2, e14: DELAY + 7.1, mcurso: DELAY + 9.7, mcof: DELAY + 11.0, aqui: DELAY + 12.4,
  d2: DELAY + 13.6, n31: DELAY + 14.6, n56: DELAY + 17.3, mgrupo: DELAY + 20.2, n12: DELAY + 22.5, serio: DELAY + 25.1,
  d3: DELAY + 26.7, incor: DELAY + 27.7, cardio: DELAY + 28.4, quantos: DELAY + 29.6,
  souber: DELAY + 32.7,
  responde: DELAY + 35.0, f1: DELAY + 36.1, f2: DELAY + 39.8, f3: DELAY + 40.9, f4: DELAY + 42.6,
  n530: DELAY + 46.1, passo: DELAY + 50.6,
  end: DELAY + T.duration - 3.2,
};

const NEON = '#7de0ff';

/* barra de busca gigante */
const Busca: React.FC<{ t: number; texto: string; inicio: number; y?: number }> = ({ t, texto, inicio, y = 820 }) => (
  <div style={{ position: 'absolute', left: 90, right: 90, top: y }}>
    <div style={{
      background: '#0c1018', border: `2.5px solid rgba(125,224,255,0.5)`, borderRadius: 999, padding: '30px 44px',
      display: 'flex', alignItems: 'center', gap: 22, boxShadow: `0 0 60px rgba(125,224,255,0.15), inset 0 0 30px rgba(125,224,255,0.05)`,
    }}>
      <svg width={38} height={38} viewBox="0 0 38 38"><circle cx={16} cy={16} r={10} fill="none" stroke={NEON} strokeWidth={3.5} /><line x1={24} y1={24} x2={34} y2={34} stroke={NEON} strokeWidth={3.5} strokeLinecap="round" /></svg>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 46, color: WHITE, letterSpacing: 1 }}>
        {typed(texto, t, inicio, 11)}<span style={{ opacity: (t * 2) % 1 < 0.5 ? 1 : 0, color: NEON }}>▍</span>
      </span>
    </div>
  </div>
);

/* salão: portas se abrem revelando cards */
const Salao: React.FC<{ t: number; at: number; until: number; titulo: string; children: React.ReactNode }> =
({ t, at, until, titulo, children }) => {
  const abre = easeOutExpo(win(t, at, at + 0.7));
  const o = Math.min(win(t, at, at + 0.25), 1 - win(t, until - 0.3, until));
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      {/* portas */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%', background: 'linear-gradient(90deg,#0a0e15,#0e1420)', transform: `translateX(${-abre * 100}%)`, zIndex: 8, borderRight: `2px solid rgba(125,224,255,0.4)` }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%', background: 'linear-gradient(270deg,#0a0e15,#0e1420)', transform: `translateX(${abre * 100}%)`, zIndex: 8, borderLeft: `2px solid rgba(125,224,255,0.4)` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center' }}>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, color: NEON, letterSpacing: 8 }}>{titulo}</span>
      </div>
      <div style={{ position: 'absolute', left: 80, right: 80, top: 420, transform: `scale(${0.92 + abre * 0.08})` }}>
        {children}
      </div>
    </div>
  );
};

const CardCurso: React.FC<{ t: number; at: number; nome: string; destaque?: string; grande?: boolean }> =
({ t, at, nome, destaque, grande }) => {
  const p = easeOutExpo(win(t, at, at + 0.5));
  return (
    <div style={{
      opacity: win(t, at, at + 0.3), transform: `translateY(${(1 - p) * 70}px)`,
      background: 'linear-gradient(165deg,#131a26,#0c1018)', border: `2px solid ${grande ? NEON : 'rgba(125,224,255,0.25)'}`,
      borderRadius: 20, padding: grande ? '34px 36px' : '22px 30px', marginBottom: 18,
      boxShadow: grande ? `0 0 70px rgba(125,224,255,0.2)` : '0 20px 50px -18px rgba(0,0,0,0.7)',
    }}>
      <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: grande ? 58 : 42, color: WHITE, letterSpacing: -1 }}>{nome}</div>
      {destaque && <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: grande ? 44 : 30, color: NEON, marginTop: 6 }}>{destaque}</div>}
    </div>
  );
};

const FERRAMENTAS = [
  { titulo: 'cronograma + mapa mental', sub: 'a IA monta pro seu objetivo' },
  { titulo: 'resumo em 1 clique', sub: 'qualquer aula, na hora' },
  { titulo: 'flashcards do seu material', sub: 'o baralho se faz sozinho' },
  { titulo: 'assistente que lê a tela', sub: 'explica o que você está vendo' },
];

export const C84_Digita: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#06090f' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 110% 70% at 50% 25%, #0b1220 0%, #06090f 70%)' }} />
      {/* grade sutil de fundo */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.25, backgroundImage: 'linear-gradient(rgba(125,224,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(125,224,255,0.05) 1px, transparent 1px)', backgroundSize: '90px 90px' }} />

      {/* HOOK: só a barra e o cursor */}
      {t < B.s1 && (
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - win(t, B.s1 - 0.25, B.s1) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', opacity: win(t, B.hook + 0.3, B.hook + 0.8) }}>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: WHITE, letterSpacing: -1, lineHeight: 1.3 }}>
              digita o curso que você<br /><span style={{ color: NEON }}>sempre quis fazer.</span>
            </span>
          </div>
          <Busca t={t} texto="extensivo" inicio={B.d1} />
        </div>
      )}

      {/* SALÃO 1: extensivo */}
      <Salao t={t} at={B.s1} until={B.d2} titulo="SALÃO · EXTENSIVOS">
        <CardCurso t={t} at={B.s1 + 0.3} nome="Estratégia MED" destaque="14.142 aulas" grande />
        <CardCurso t={t} at={B.mcurso} nome="MEDCurso" />
        <CardCurso t={t} at={B.mcof} nome="Medcof" />
        <div style={{ textAlign: 'center', marginTop: 26, opacity: win(t, B.aqui, B.aqui + 0.3) }}>
          <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: 'rgba(255,255,255,0.85)' }}>tá tudo aqui.</span>
        </div>
      </Salao>

      {/* transição: barra reaparece */}
      {t >= B.d2 - 0.5 && t < B.n31 && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.d2 - 0.4, B.d2 - 0.1), 1 - win(t, B.n31 - 0.15, B.n31)), zIndex: 12 }}>
          <div style={{ position: 'absolute', inset: 0, background: '#06090f' }} />
          <Busca t={t} texto="questões" inicio={B.d2 - 0.2} />
        </div>
      )}

      {/* SALÃO 2: questões */}
      <Salao t={t} at={B.n31} until={B.d3} titulo="SALÃO · QUESTÕES">
        <CardCurso t={t} at={B.n31} nome="Questões Comentadas" destaque="31.612 aulas" grande />
        <CardCurso t={t} at={B.n56} nome="Banco de Questões MED" destaque="+56 mil" />
        <CardCurso t={t} at={B.mgrupo} nome="MedGrupo · por estado e instituição" destaque="12.234 aulas" />
        <div style={{ textAlign: 'center', marginTop: 26, opacity: win(t, B.serio, B.serio + 0.3) }}>
          <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: 'rgba(255,255,255,0.85)' }}>é sério.</span>
        </div>
      </Salao>

      {/* transição: ECG */}
      {t >= B.d3 - 0.5 && t < B.incor && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.d3 - 0.4, B.d3 - 0.1), 1 - win(t, B.incor - 0.12, B.incor)), zIndex: 12 }}>
          <div style={{ position: 'absolute', inset: 0, background: '#06090f' }} />
          <Busca t={t} texto="ecg" inicio={B.d3 - 0.2} />
        </div>
      )}

      {/* SALÃO 3: ECG */}
      <Salao t={t} at={B.incor} until={B.souber} titulo="SALÃO · CARDIOLOGIA">
        <CardCurso t={t} at={B.incor} nome="InCor" destaque="Eletrocardiograma" grande />
        <CardCurso t={t} at={B.cardio} nome="Cardiopapers" />
        {/* traçado de ECG atravessa */}
        <svg width="100%" height={130} viewBox="0 0 900 130" style={{ marginTop: 10, opacity: win(t, B.cardio + 0.3, B.cardio + 0.7) }}>
          <polyline
            points="0,65 200,65 230,65 250,18 270,112 290,52 320,65 560,65 590,65 610,22 630,108 650,58 680,65 900,65"
            fill="none" stroke="#41d98c" strokeWidth={5} strokeLinecap="round"
            strokeDasharray={1800} strokeDashoffset={1800 * (1 - win(t, B.cardio + 0.3, B.quantos + 1.4))}
          />
        </svg>
        <div style={{ textAlign: 'center', marginTop: 14, opacity: win(t, B.quantos, B.quantos + 0.4) }}>
          <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 30, color: 'rgba(255,255,255,0.75)' }}>quantos anos de estudo cabem numa busca?</span>
        </div>
      </Salao>

      {/* VIRADA */}
      {t >= B.souber && t < B.responde + 0.6 && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.souber, B.souber + 0.3), 1 - win(t, B.responde + 0.2, B.responde + 0.6)), zIndex: 14 }}>
          <div style={{ position: 'absolute', inset: 0, background: '#06090f' }} />
          <div style={{ position: 'absolute', left: 80, right: 80, top: 700, textAlign: 'center' }}>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: WHITE, letterSpacing: -1.5, lineHeight: 1.3 }}>
              e se você nem souber<br /><span style={{ color: NEON }}>o que digitar?</span>
            </span>
          </div>
          <Busca t={t} texto="" inicio={B.souber} y={1020} />
        </div>
      )}

      {/* FERRAMENTAS: a plataforma responde */}
      {t >= B.responde + 0.3 && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.responde + 0.3, B.responde + 0.7), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 290, textAlign: 'center' }}>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: NEON, letterSpacing: 6 }}>A PLATAFORMA RESPONDE POR VOCÊ</span>
          </div>
          <div style={{ position: 'absolute', left: 90, right: 90, top: 400, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {FERRAMENTAS.map((f, i) => {
              const at = [B.f1, B.f2, B.f3, B.f4][i];
              const p = easeOutExpo(win(t, at, at + 0.5));
              return (
                <div key={i} style={{
                  opacity: win(t, at, at + 0.3), transform: `translateY(${(1 - p) * 60}px)`,
                  background: 'linear-gradient(165deg,#131a26,#0c1018)', border: `2px solid ${i === 0 ? NEON : 'rgba(125,224,255,0.25)'}`,
                  borderRadius: 20, padding: '24px 30px',
                }}>
                  <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 38, color: WHITE }}>{f.titulo}</div>
                  <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 24, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>{f.sub}</div>
                </div>
              );
            })}
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 380, textAlign: 'center', opacity: win(t, B.n530, B.n530 + 0.35) }}>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 42, color: WHITE }}>+530 cursos <span style={{ color: NEON }}>esperando a tua próxima busca</span></span>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 290, textAlign: 'center', opacity: win(t, B.passo, B.passo + 0.35) }}>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: NEON, letterSpacing: 2 }}>&gt; digita o teu próximo passo▍</span>
          </div>
        </div>
      )}

      {[B.s1, B.n31, B.incor, B.souber, B.responde].map((b, i) => <FlashCut key={i} t={t} atSec={b} color="rgba(125,224,255,0.22)" />)}
      <Letterbox t={t} inAt={0.1} outAt={B.end - 0.4} size={120} />
      <Vignette strength={0.55} />
      <Grain opacity={0.07} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1620} size={52} highlight={NEON} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c84.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
