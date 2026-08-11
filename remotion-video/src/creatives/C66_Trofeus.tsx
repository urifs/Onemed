import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, HEAD, BODY, MONO } from './theme';
import { FPS } from './story';
import { EndCard } from './common';
import { Grain, Vignette, Letterbox, win, easeOutExpo } from './cine';
import timing from './timings/c66.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C66_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);
const OURO = '#cfa54e';

const B = {
  sala: DELAY + 0.5,
  luz1: DELAY + 8.8, luz2: DELAY + 12.8, luz3: DELAY + 14.1, luz4: DELAY + 15.8, luz5: DELAY + 17.3, luz6: DELAY + 20.7,
  salao: DELAY + 22.7, n42: DELAY + 26.4, n86: DELAY + 29.2, n31: DELAY + 31.8,
  banca: DELAY + 38.3, n12: DELAY + 40.1,
  n530: DELAY + 44.9,
  placa: DELAY + 49.0, fer1: DELAY + 50.4, fer2: DELAY + 51.8, fer3: DELAY + 54.2, fer4: DELAY + 56.0,
  porta: DELAY + 58.9,
  end: DELAY + T.duration - 3.2,
};

const PECAS: Array<{ at: number; nome: string; sub?: string }> = [
  { at: B.luz1, nome: 'MEDCurso' },
  { at: B.luz2, nome: 'MED Grupo' },
  { at: B.luz3, nome: 'Medcof' },
  { at: B.luz4, nome: 'PROGEB' },
  { at: B.luz5, nome: 'Cardiopapers' },
  { at: B.luz6, nome: 'InCor', sub: 'Eletrocardiograma' },
];

/* pedestal com spot de luz */
const Pedestal: React.FC<{ t: number; at: number; until: number; nome: string; sub?: string; idx: number }> =
({ t, at, until, nome, sub, idx }) => {
  const o = Math.min(win(t, at, at + 0.35), 1 - win(t, until - 0.3, until));
  if (o <= 0) return null;
  const p = easeOutExpo(win(t, at, at + 0.7));
  const x = idx % 2 ? 90 : -90;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      {/* cone de luz */}
      <div style={{
        position: 'absolute', left: '50%', top: 220, transform: `translateX(calc(-50% + ${x}px))`,
        width: 700, height: 900, opacity: p * 0.9,
        background: 'linear-gradient(180deg, rgba(255,238,200,0.16) 0%, rgba(255,238,200,0.05) 55%, transparent 100%)',
        clipPath: 'polygon(44% 0, 56% 0, 100% 100%, 0 100%)',
      }} />
      {/* nome sobre o pedestal */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 660, textAlign: 'center', transform: `translateX(${x}px) translateY(${(1 - p) * 40}px)` }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 23, color: 'rgba(255,255,255,0.45)', letterSpacing: 6 }}>PEÇA {String(idx + 1).padStart(2, '0')}</div>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: nome.length > 9 ? 82 : 108, color: OURO, letterSpacing: -2, marginTop: 10, textShadow: '0 0 70px rgba(207,165,78,0.45)' }}>{nome}</div>
        {sub && <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 40, color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>{sub}</div>}
        {/* pedestal */}
        <div style={{ width: 300, height: 44, margin: '46px auto 0', background: 'linear-gradient(180deg,#23242b,#101116)', borderRadius: 8, boxShadow: '0 30px 60px -18px rgba(0,0,0,0.9)' }} />
        <div style={{ width: 380, height: 26, margin: '0 auto', background: 'linear-gradient(180deg,#1a1b21,#0b0c10)', borderRadius: 6 }} />
      </div>
    </div>
  );
};

export const C66_Trofeus: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#08090c' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 120% 60% at 50% 8%, #121319 0%, #08090c 65%)' }} />

      {/* abertura */}
      <div style={{ position: 'absolute', inset: 0, opacity: t < B.luz1 ? 1 - win(t, B.luz1 - 0.35, B.luz1) : 0 }}>
        <div style={{ position: 'absolute', left: 80, right: 80, top: 740, textAlign: 'center' }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, color: OURO, letterSpacing: 7 }}>GALERIA PRIVADA</div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 68, color: WHITE, letterSpacing: -2, marginTop: 18, lineHeight: 1.25 }}>
            tem uma sala que<br />pouca gente conhece.
          </div>
        </div>
      </div>

      {PECAS.map((p, i) => (
        <Pedestal key={i} t={t} at={p.at} until={i < PECAS.length - 1 ? PECAS[i + 1].at : B.salao} nome={p.nome} sub={p.sub} idx={i} />
      ))}

      {/* salão das questões */}
      {t >= B.salao && t < B.placa && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.salao, B.salao + 0.4), 1 - win(t, B.placa - 0.3, B.placa)) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 320, textAlign: 'center' }}>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: OURO, letterSpacing: 7 }}>A PEÇA CENTRAL · SALÃO DO FUNDO</span>
          </div>
          {/* moldura monumental */}
          <div style={{
            position: 'absolute', left: 110, right: 110, top: 430, bottom: 560,
            border: `6px solid ${OURO}`, borderRadius: 8, boxShadow: '0 0 120px rgba(207,165,78,0.18), inset 0 0 80px rgba(0,0,0,0.7)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, padding: 40,
            transform: `scale(${0.94 + 0.06 * easeOutExpo(win(t, B.salao, B.salao + 0.7))})`,
          }}>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 50, color: WHITE, textAlign: 'center', lineHeight: 1.25 }}>
              BANCO DE QUESTÕES<br />& SIMULADOS
            </div>
            <div style={{ display: 'flex', gap: 44, opacity: win(t, B.n42, B.n42 + 0.35) }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 96, color: OURO, letterSpacing: -3 }}>42</div>
                <div style={{ fontFamily: MONO, fontSize: 24, color: 'rgba(255,255,255,0.7)' }}>cursos inteiros</div>
              </div>
              <div style={{ width: 2, background: 'rgba(207,165,78,0.35)' }} />
              <div style={{ textAlign: 'center', opacity: win(t, B.n86, B.n86 + 0.3) }}>
                <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 96, color: OURO, letterSpacing: -3 }}>+86 mil</div>
                <div style={{ fontFamily: MONO, fontSize: 24, color: 'rgba(255,255,255,0.7)' }}>itens</div>
              </div>
            </div>
            <div style={{ textAlign: 'center', opacity: win(t, B.n31, B.n31 + 0.35) }}>
              <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 44, color: WHITE }}>31.612</span>
              <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 27, color: 'rgba(255,255,255,0.7)' }}> aulas só de questões comentadas</span>
            </div>
            <div style={{ textAlign: 'center', opacity: win(t, B.banca, B.banca + 0.35) }}>
              <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: OURO, opacity: win(t, B.n12, B.n12 + 0.3) }}>12.234</span>
              <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 26, color: 'rgba(255,255,255,0.7)' }}> aulas da sua banca, do seu estado</span>
            </div>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 430, textAlign: 'center', opacity: win(t, B.n530, B.n530 + 0.35) }}>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 46, color: WHITE }}>a coleção: <span style={{ color: OURO }}>+530 cursos</span></span>
          </div>
        </div>
      )}

      {/* placa de saída (IA) */}
      {t >= B.placa && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.placa, B.placa + 0.35), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
          <div style={{ position: 'absolute', left: 120, right: 120, top: 560 }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 25, color: 'rgba(255,255,255,0.5)', letterSpacing: 6, textAlign: 'center' }}>NA SAÍDA, UMA PLACA DISCRETA</div>
            <div style={{
              marginTop: 30, background: 'linear-gradient(160deg,#2b2416,#16120a)', border: `2.5px solid ${OURO}`, borderRadius: 14, padding: '38px 42px',
              boxShadow: '0 50px 110px -30px rgba(0,0,0,0.9)',
            }}>
              {[
                ['resumo', 'em 1 clique', B.fer1],
                ['flashcards', 'do seu material', B.fer2],
                ['assistente', 'que lê a tela', B.fer3],
                ['cronograma', 'com mapa mental', B.fer4],
              ].map(([nome, sub, at], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '13px 0', borderBottom: i < 3 ? '1px solid rgba(207,165,78,0.25)' : 'none', opacity: win(t, at as number, (at as number) + 0.3) }}>
                  <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: OURO }}>◆</span>
                  <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: OURO }}>{nome}</span>
                  <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 27, color: 'rgba(255,255,255,0.7)' }}>{sub}</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 44, opacity: win(t, B.porta, B.porta + 0.4) }}>
              <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: WHITE, letterSpacing: -1 }}>
                a porta está <span style={{ color: RED }}>aberta.</span>
              </span>
            </div>
          </div>
        </div>
      )}

      <Letterbox t={t} inAt={0.1} outAt={B.end - 0.4} size={130} />
      <Vignette strength={0.6} />
      <Grain opacity={0.08} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={50} highlight={OURO} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c66.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
