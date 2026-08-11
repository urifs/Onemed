import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, HEAD, BODY, MONO } from './theme';
import { FPS } from './story';
import { EndCard } from './common';
import { Grain, Vignette, Letterbox, FlashCut, shakeAt, win, easeOutExpo } from './cine';
import timing from './timings/c72.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C72_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);
const OURO = '#d4af5e';

const B = {
  silencio: DELAY + 0.1, martelo: DELAY + 1.5,
  lote1: DELAY + 3.9, n14: DELAY + 4.4, quemda: DELAY + 9.1,
  lote2: DELAY + 10.9, n56: DELAY + 14.4, lances: DELAY + 17.8,
  lote3: DELAY + 19.6, incor: DELAY + 22.1,
  lote4: DELAY + 23.7, n12: DELAY + 27.8, banca: DELAY + 31.0,
  palco: DELAY + 34.3, medcof: DELAY + 34.6, hardwork: DELAY + 36.1, cardio: DELAY + 37.7, n530: DELAY + 38.8,
  plateia: DELAY + 41.7, n10k: DELAY + 42.5,
  bate: DELAY + 47.1, junto: DELAY + 48.1, acesso: DELAY + 49.3, atualiza: DELAY + 50.2,
  brinde: DELAY + 52.5, ia1: DELAY + 55.7, ia2: DELAY + 57.3, ia3: DELAY + 60.4,
  arrematado: DELAY + 61.9,
  end: DELAY + T.duration - 3.2,
};

type Lote = { at: number; until: number; num: string; titulo: string; destaque: string; destaqueAt: number; nota?: string; notaAt?: number };
const LOTES: Lote[] = [
  { at: B.lote1, until: B.lote2, num: '01', titulo: 'Estratégia MED', destaque: '14.142 aulas', destaqueAt: B.n14, nota: 'quem dá mais?', notaAt: B.quemda },
  { at: B.lote2, until: B.lote3, num: '02', titulo: 'Banco de Questões MED', destaque: '+56 mil questões', destaqueAt: B.n56, nota: 'os lances disparam', notaAt: B.lances },
  { at: B.lote3, until: B.lote4, num: '03', titulo: 'InCor', destaque: 'coleção de Eletrocardiograma', destaqueAt: B.incor },
  { at: B.lote4, until: B.palco, num: '04', titulo: 'MedGrupo — por estado e instituição', destaque: '12.234 aulas', destaqueAt: B.n12, nota: 'da sua banca, do seu estado', notaAt: B.banca },
];

const Martelo: React.FC<{ t: number }> = ({ t }) => {
  const swing = t < B.bate ? Math.sin(t * 1.6) * 8 : -38 * easeOutExpo(win(t, B.bate - 0.18, B.bate));
  return (
    <div style={{ position: 'absolute', right: 90, top: 260, transform: `rotate(${swing}deg)`, transformOrigin: '85% 85%' }}>
      <div style={{ width: 130, height: 34, background: '#6b4a26', borderRadius: 10, transform: 'rotate(-40deg)', boxShadow: '0 10px 26px rgba(0,0,0,0.5)' }} />
      <div style={{ width: 20, height: 120, background: '#8a643a', borderRadius: 8, marginLeft: 56, marginTop: -12 }} />
    </div>
  );
};

export const C72_Leilao: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#0b0a08', transform: shakeAt(t, B.bate, 11) || undefined }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 110% 65% at 50% 15%, #17140d 0%, #0b0a08 68%)' }} />
      <Martelo t={t} />

      {/* abertura */}
      <div style={{ position: 'absolute', inset: 0, opacity: t < B.lote1 ? 1 - win(t, B.lote1 - 0.3, B.lote1) : 0 }}>
        <div style={{ position: 'absolute', left: 80, right: 80, top: 720, textAlign: 'center' }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, color: OURO, letterSpacing: 8 }}>LEILÃO EXTRAORDINÁRIO</div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 74, color: WHITE, letterSpacing: -2, marginTop: 20, lineHeight: 1.2, opacity: win(t, B.martelo, B.martelo + 0.4) }}>
            silêncio no salão.<br /><span style={{ color: OURO }}>o martelo vai subir.</span>
          </div>
        </div>
      </div>

      {/* lotes */}
      {LOTES.map((l, i) => {
        const o = Math.min(win(t, l.at, l.at + 0.3), 1 - win(t, l.until - 0.25, l.until));
        if (o <= 0) return null;
        const p = easeOutExpo(win(t, l.at, l.at + 0.55));
        return (
          <div key={i} style={{ position: 'absolute', inset: 0, opacity: o }}>
            <div style={{ position: 'absolute', left: 90, right: 90, top: 460, transform: `translateY(${(1 - p) * 120}px)` }}>
              {/* moldura dourada */}
              <div style={{ border: `5px solid ${OURO}`, borderRadius: 10, padding: 10, boxShadow: '0 0 90px rgba(212,175,94,0.15), 0 60px 130px -30px rgba(0,0,0,0.9)' }}>
                <div style={{ border: `2px solid rgba(212,175,94,0.45)`, borderRadius: 6, background: 'linear-gradient(170deg,#171410,#0d0c09)', padding: '46px 40px', textAlign: 'center' }}>
                  <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 25, color: OURO, letterSpacing: 8 }}>LOTE {l.num}</div>
                  <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: l.titulo.length > 20 ? 52 : 76, color: WHITE, letterSpacing: -2, marginTop: 22, lineHeight: 1.15 }}>{l.titulo}</div>
                  <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 58, color: OURO, marginTop: 26, opacity: win(t, l.destaqueAt, l.destaqueAt + 0.3), textShadow: '0 0 50px rgba(212,175,94,0.4)' }}>{l.destaque}</div>
                  {l.nota && (
                    <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 31, color: 'rgba(255,255,255,0.75)', marginTop: 20, fontStyle: 'italic', opacity: win(t, l.notaAt!, l.notaAt! + 0.3) }}>
                      “{l.nota}”
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* plaquinhas de lance subindo */}
            {[...Array(6)].map((_, k) => (
              <div key={k} style={{
                position: 'absolute', left: 120 + k * 150, bottom: 300,
                opacity: win(t, l.at + 0.5 + k * 0.18, l.at + 0.7 + k * 0.18) * (1 - win(t, l.until - 0.4, l.until - 0.15)),
                transform: `translateY(${-easeOutExpo(win(t, l.at + 0.5 + k * 0.18, l.at + 1.1 + k * 0.18)) * 60}px)`,
              }}>
                <div style={{ width: 84, height: 60, background: '#e8dfc8', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: 27, color: '#3c2f16' }}>{(k + 1) * 7}</div>
                <div style={{ width: 10, height: 42, background: '#8a643a', margin: '0 auto' }} />
              </div>
            ))}
          </div>
        );
      })}

      {/* sobem ao palco + plateia */}
      {t >= B.palco && t < B.bate && (
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - win(t, B.bate - 0.25, B.bate) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 520, textAlign: 'center' }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 25, color: OURO, letterSpacing: 6 }}>E AINDA SOBEM AO PALCO</div>
            <div style={{ marginTop: 30 }}>
              {[['Medcof', B.medcof], ['Hardwork', B.hardwork], ['Cardiopapers', B.cardio]].map(([nome, at], i) => (
                <div key={i} style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 76, color: WHITE, letterSpacing: -2, lineHeight: 1.3, opacity: win(t, at as number, (at as number) + 0.3) }}>{nome as string}</div>
              ))}
            </div>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: OURO, marginTop: 28, opacity: win(t, B.n530, B.n530 + 0.35) }}>+530 cursos</div>
            <div style={{ marginTop: 44, opacity: win(t, B.plateia, B.plateia + 0.35) }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 9 }}>
                {[...Array(16)].map((_, i) => (
                  <div key={i} style={{ width: 24, height: 24, borderRadius: 99, background: i % 4 ? 'rgba(255,255,255,0.3)' : OURO }} />
                ))}
              </div>
              <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 29, color: 'rgba(255,255,255,0.75)', marginTop: 16, opacity: win(t, B.n10k, B.n10k + 0.3) }}>
                +10.000 médicos e estudantes prendem a respiração
              </div>
            </div>
          </div>
        </div>
      )}

      {/* o martelo bate */}
      {t >= B.bate && t < B.brinde && (
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - win(t, B.brinde - 0.25, B.brinde) }}>
          <div style={{ position: 'absolute', left: 80, right: 80, top: 680, textAlign: 'center' }}>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 96, color: WHITE, letterSpacing: -3, opacity: win(t, B.bate, B.bate + 0.2) }}>TUDO JUNTO.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 40, alignItems: 'center' }}>
              <span style={{ opacity: win(t, B.acesso, B.acesso + 0.3), background: '#151209', border: `2px solid ${OURO}`, borderRadius: 999, padding: '16px 34px', fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: OURO }}>no mesmo acesso</span>
              <span style={{ opacity: win(t, B.atualiza, B.atualiza + 0.3), background: '#151209', border: '2px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '16px 34px', fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: WHITE }}>atualizações sem custo</span>
            </div>
          </div>
        </div>
      )}

      {/* brinde IA + arrematado */}
      {t >= B.brinde && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.brinde, B.brinde + 0.3), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
          <div style={{ position: 'absolute', left: 80, right: 80, top: 480, textAlign: 'center' }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: OURO, letterSpacing: 6 }}>O BRINDE QUE NINGUÉM ESPERAVA</div>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: WHITE, letterSpacing: -1.5, marginTop: 18 }}>inteligência artificial</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 40, alignItems: 'center' }}>
              {[['resume em 1 clique', B.ia1], ['flashcards do seu material', B.ia2], ['monta seu cronograma', B.ia3]].map(([txt, at], i) => (
                <span key={i} style={{
                  opacity: win(t, at as number, (at as number) + 0.3),
                  background: '#151209', border: `2px solid ${i === 0 ? OURO : 'rgba(255,255,255,0.22)'}`, borderRadius: 999, padding: '17px 32px',
                  fontFamily: HEAD, fontWeight: 800, fontSize: 33, color: WHITE,
                }}>{txt as string}</span>
              ))}
            </div>
            <div style={{ marginTop: 52, opacity: win(t, B.arrematado, B.arrematado + 0.3), transform: `rotate(-5deg) scale(${0.7 + 0.3 * easeOutExpo(win(t, B.arrematado, B.arrematado + 0.45))})` }}>
              <span style={{ display: 'inline-block', border: `6px double ${RED}`, borderRadius: 16, padding: '18px 40px', fontFamily: HEAD, fontWeight: 900, fontSize: 60, color: RED, background: 'rgba(239,68,68,0.07)' }}>
                ARREMATADO — POR VOCÊ
              </span>
            </div>
          </div>
        </div>
      )}

      {LOTES.map((l, i) => <FlashCut key={i} t={t} atSec={l.at} color="rgba(212,175,94,0.3)" />)}
      <FlashCut t={t} atSec={B.bate} color="rgba(255,255,255,0.5)" />
      <Letterbox t={t} inAt={0.1} outAt={B.end - 0.4} size={130} />
      <Vignette strength={0.6} />
      <Grain opacity={0.08} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={50} highlight={OURO} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c72.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
