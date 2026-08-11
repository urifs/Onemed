import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO } from './theme';
import { FPS } from './story';
import { OLightBg, OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import { Grain, Vignette, WipePanel, win, easeOutExpo } from './cine';
import timing from './timings/c63.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C63_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  biblio: DELAY + 0.8, n530: DELAY + 3.2,
  estrategia: DELAY + 6.6, n14: DELAY + 9.3,
  medcurso: DELAY + 12.7, medcel: DELAY + 13.9, medcof: DELAY + 15.0,
  corredor: DELAY + 18.6,
  qcoment: DELAY + 21.5, n31: DELAY + 22.5,
  banco56: DELAY + 25.3, n56: DELAY + 28.0,
  medgrupo: DELAY + 29.7, n12: DELAY + 33.1,
  n86: DELAY + 36.9,
  biblioteca_rio: DELAY + 41.4, chips: DELAY + 43.6,
  n10k: DELAY + 47.0,
  end: DELAY + T.duration - 3.2,
};

/* estante: lombadas geradas com nomes reais */
type Spine = { nome: string; w: number; c: string; big?: boolean };
const CORES = ['#c94f4f', '#b8860b', '#3f6fb5', '#3e8e6a', '#7a5fb5', '#946b4a', '#b5533e'];
const FILLER = ['Sanarflix', 'Aristo', 'Hardwork', 'PROGEB', 'ANESTREVIEW', 'Casalmed', 'MedReview 2026', 'USP Semiologia', 'Cardiopapers', 'Eu Médico Residente', 'MED Grupo', 'InCor ECG', 'Medicina Intensiva USP', 'Sanar', 'UTI HCFMUSP'];
const SPINES: Spine[] = [];
for (let i = 0; i < 34; i++) {
  const feature =
    i === 8 ? 'Estratégia MED — Extensivo' :
    i === 15 ? 'MEDCurso' : i === 17 ? 'MedCel · Afya' : i === 19 ? 'Medcof' : null;
  SPINES.push({
    nome: feature ?? FILLER[(i * 7) % FILLER.length],
    w: feature ? (i === 8 ? 190 : 150) : 92 + ((i * 37) % 60),
    c: CORES[(i * 5) % CORES.length],
    big: !!feature,
  });
}
const lefts: number[] = []; let acc = 0;
SPINES.forEach(s => { lefts.push(acc); acc += s.w + 14; });
const centerOf = (i: number) => lefts[i] + SPINES[i].w / 2;

/* keyframes do travelling: [tempo, centro-da-tela sobre a estante] */
const KF: Array<[number, number]> = [
  [B.biblio - 0.5, 300], [B.estrategia, centerOf(8)], [B.estrategia + 5.6, centerOf(8) + 40],
  [B.medcurso, centerOf(15)], [B.medcel, centerOf(17)], [B.medcof, centerOf(19)],
  [B.medcof + 2.2, centerOf(19) + 30], [B.corredor + 0.4, acc + 900],
];
const smooth = (p: number) => p * p * (3 - 2 * p);
const camX = (t: number): number => {
  if (t <= KF[0][0]) return KF[0][1];
  for (let i = 0; i < KF.length - 1; i++) {
    const [t0, x0] = KF[i], [t1, x1] = KF[i + 1];
    if (t <= t1) return x0 + (x1 - x0) * smooth(win(t, t0, t1));
  }
  return KF[KF.length - 1][1];
};

const Estampa: React.FC<{ t: number; at: number; txt: string }> = ({ t, at, txt }) => (
  <div style={{
    position: 'absolute', left: '50%', top: 330, transform: `translateX(-50%) rotate(-6deg) scale(${0.7 + 0.3 * easeOutExpo(win(t, at, at + 0.35))})`,
    opacity: win(t, at, at + 0.25), border: `5px double ${O_RED}`, borderRadius: 14, padding: '10px 22px',
    fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: O_RED, background: 'rgba(255,255,255,0.9)', zIndex: 9,
  }}>{txt}</div>
);

export const C63_Estante: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const naEstante = t < B.corredor + 0.45;
  const cx = camX(t);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />

      {/* ESTANTE (primeiro ato) */}
      {naEstante && (
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - win(t, B.corredor, B.corredor + 0.45) }}>
          {/* prateleira */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 1320, height: 26, background: '#c9b28f', boxShadow: '0 10px 24px rgba(22,24,29,0.18)' }} />
          <div style={{ position: 'absolute', left: 540 - cx, top: 560, display: 'flex', alignItems: 'flex-end', gap: 14, height: 760 }}>
            {SPINES.map((s, i) => {
              const destaque = s.big && Math.abs(centerOf(i) - cx) < 200;
              const alt = s.big ? 740 : 560 + ((i * 53) % 140);
              return (
                <div key={i} style={{
                  width: s.w, height: alt, background: s.c, borderRadius: '8px 8px 3px 3px', position: 'relative',
                  transform: destaque ? 'translateY(-56px)' : undefined,
                  boxShadow: destaque ? `0 40px 80px -18px rgba(224,45,45,0.5)` : '0 16px 30px -12px rgba(22,24,29,0.35)',
                  outline: destaque ? `5px solid ${O_RED}` : undefined,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{
                    writingMode: 'vertical-rl', fontFamily: HEAD, fontWeight: s.big ? 900 : 700,
                    fontSize: s.big ? 42 : 27, color: WHITE, letterSpacing: 1, maxHeight: alt - 60,
                    overflow: 'hidden', textShadow: '0 2px 8px rgba(0,0,0,0.35)',
                  }}>{s.nome}</span>
                </div>
              );
            })}
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', opacity: Math.min(win(t, B.biblio, B.biblio + 0.4), 1 - win(t, B.estrategia - 0.4, B.estrategia)) }}>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: O_MUT, letterSpacing: 5 }}>SEÇÃO: +530 CURSOS</span>
          </div>
          <Estampa t={t} at={B.n14} txt="14.142 AULAS" />
          {t >= B.medcurso - 0.1 && t < B.corredor && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: 320, textAlign: 'center' }}>
              <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: O_INK, background: 'rgba(255,255,255,0.85)', borderRadius: 999, padding: '10px 26px', boxShadow: '0 12px 30px rgba(22,24,29,0.12)' }}>
                relíquias que todo residente conhece
              </span>
            </div>
          )}
        </div>
      )}

      {/* CORREDOR DAS QUESTÕES (segundo ato) */}
      {t >= B.corredor && t < B.biblioteca_rio + 0.3 && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.corredor + 0.1, B.corredor + 0.5), 1 - win(t, B.biblioteca_rio - 0.35, B.biblioteca_rio)) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 290, textAlign: 'center' }}>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 29, color: O_RED, letterSpacing: 5 }}>CORREDOR EXCLUSIVO · QUESTÕES</span>
          </div>
          {/* volume monumental */}
          <div style={{
            position: 'absolute', left: 90, top: 430, width: 500, height: 700, background: '#a83232', borderRadius: '12px 12px 4px 4px',
            transform: `translateY(${(1 - easeOutExpo(win(t, B.qcoment, B.qcoment + 0.5))) * 120}px)`,
            opacity: win(t, B.qcoment, B.qcoment + 0.3),
            boxShadow: '0 50px 100px -24px rgba(168,50,50,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
          }}>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 46, color: WHITE, textAlign: 'center', lineHeight: 1.2 }}>QUESTÕES<br />COMENTADAS</span>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 86, color: '#ffd9a8', opacity: win(t, B.n31, B.n31 + 0.3), letterSpacing: -2 }}>31.612</span>
            <span style={{ fontFamily: MONO, fontSize: 24, color: 'rgba(255,255,255,0.85)', opacity: win(t, B.n31 + 0.2, B.n31 + 0.5) }}>aulas</span>
          </div>
          {/* +56mil */}
          <div style={{
            position: 'absolute', right: 90, top: 470, width: 350, height: 620, background: '#3f6fb5', borderRadius: '12px 12px 4px 4px',
            opacity: win(t, B.banco56, B.banco56 + 0.3), transform: `translateY(${(1 - easeOutExpo(win(t, B.banco56, B.banco56 + 0.5))) * 120}px)`,
            boxShadow: '0 50px 100px -24px rgba(63,111,181,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 38, color: WHITE, textAlign: 'center', lineHeight: 1.25 }}>BANCO DE<br />QUESTÕES MED</span>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 74, color: '#cde3ff', opacity: win(t, B.n56, B.n56 + 0.3) }}>+56 mil</span>
            <span style={{ fontFamily: MONO, fontSize: 22, color: 'rgba(255,255,255,0.85)', opacity: win(t, B.n56, B.n56 + 0.4) }}>o nome já avisa</span>
          </div>
          {/* fichário por estado */}
          <div style={{ position: 'absolute', left: 90, right: 90, top: 1190, opacity: win(t, B.medgrupo, B.medgrupo + 0.4) }}>
            <div style={{ background: WHITE, border: '2px solid #e4e0d6', borderRadius: 20, padding: 26, boxShadow: '0 30px 70px -20px rgba(22,24,29,0.22)' }}>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 23, color: O_MUT, letterSpacing: 2 }}>MEDGRUPO · POR ESTADO E INSTITUIÇÃO</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                {['SP', 'RJ', 'MG', 'BA', 'RS', 'PE', '+21'].map((uf, i) => (
                  <div key={uf} style={{
                    flex: 1, height: 78, borderRadius: 12, background: i === 0 ? O_RED : '#f2efe8', border: '2px solid #e4e0d6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: 28,
                    color: i === 0 ? WHITE : O_INK, opacity: win(t, B.medgrupo + 0.15 + i * 0.09, B.medgrupo + 0.35 + i * 0.09),
                  }}>{uf}</div>
                ))}
              </div>
              <div style={{ marginTop: 16, fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: O_INK, opacity: win(t, B.n12, B.n12 + 0.3) }}>
                12.234 aulas <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 26, color: O_MUT }}>— da sua banca, do seu estado</span>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 22, opacity: win(t, B.n86, B.n86 + 0.4) }}>
              <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 42, color: O_RED }}>+86 mil itens nesse corredor</span>
            </div>
          </div>
        </div>
      )}

      {/* BIBLIOTECÁRIO (fecho de IA) */}
      {t >= B.biblioteca_rio && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.biblioteca_rio, B.biblioteca_rio + 0.35), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
          <div style={{ position: 'absolute', left: 80, right: 80, top: 560, textAlign: 'center' }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, color: O_MUT, letterSpacing: 5 }}>E AINDA TEM</div>
            <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 84, color: O_INK, letterSpacing: -2, marginTop: 14 }}>
              o <span style={{ color: O_RED }}>bibliotecário.</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 52 }}>
              {['acha qualquer volume', 'resume em 1 clique', 'transforma em flashcards'].map((c, i) => (
                <div key={c} style={{
                  opacity: win(t, B.chips + i * 0.75, B.chips + 0.3 + i * 0.75),
                  transform: `translateY(${(1 - easeOutExpo(win(t, B.chips + i * 0.75, B.chips + 0.5 + i * 0.75))) * 40}px)`,
                  background: WHITE, border: `2.5px solid ${i === 2 ? O_RED : '#e4e0d6'}`, borderRadius: 999, padding: '20px 34px',
                  fontFamily: HEAD, fontWeight: 800, fontSize: 38, color: O_INK, boxShadow: '0 20px 50px -16px rgba(22,24,29,0.18)',
                }}>{c}</div>
              ))}
            </div>
            <div style={{ marginTop: 48, opacity: win(t, B.n10k, B.n10k + 0.4) }}>
              <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 30, color: O_MUT }}>+10.000 médicos e estudantes já estudam aqui</span>
            </div>
          </div>
        </div>
      )}

      <WipePanel t={t} atSec={B.corredor} color={O_RED} dur={0.5} angle={-10} />
      <WipePanel t={t} atSec={B.biblioteca_rio} color={O_INK} dur={0.45} angle={10} />
      <Vignette strength={0.2} />
      <Grain opacity={0.04} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c63.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
