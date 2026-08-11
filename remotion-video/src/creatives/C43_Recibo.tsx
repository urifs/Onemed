import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { OLightBg, OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import { Grain, Vignette, win, easeOutExpo } from './cine';
import timing from './timings/c43.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C43_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  imprime: DELAY + 1.9,
  n530: DELAY + 5.2, n9000: DELAY + 7.1,
  busca: DELAY + 8.7, resumo: DELAY + 11.4, flash: DELAY + 12.7, quest: DELAY + 16.5,
  assist: DELAY + 18.8, crono: DELAY + 21.2, pdf: DELAY + 23.6, atualiza: DELAY + 25.5,
  total: DELAY + 27.7, nada: DELAY + 31.2, tempo: DELAY + 33.0,
  escorre: DELAY + 35.0, end: DELAY + T.duration - 3.2,
};

type Linha = { at: number; txt: string; kind: 'head' | 'item' | 'stamp' | 'total' };
const LINHAS: Linha[] = [
  { at: DELAY + 0.4, txt: 'ONEMED — CUPOM DO SEU ESTUDO', kind: 'head' },
  { at: B.n530, txt: '+530 CURSOS COMPLETOS', kind: 'item' },
  { at: B.n9000, txt: '+9.000 LIVROS MÉDICOS', kind: 'item' },
  { at: B.busca, txt: 'BUSCA: AULA + LIVRO + QUESTÃO', kind: 'item' },
  { at: B.resumo, txt: 'RESUMO EM 1 CLIQUE', kind: 'item' },
  { at: B.flash, txt: 'FLASHCARDS POR IA (SEU MATERIAL)', kind: 'item' },
  { at: B.quest, txt: 'QUESTÕES C/ RESPOSTA COMENTADA', kind: 'item' },
  { at: B.assist, txt: 'ASSISTENTE QUE LÊ SUA TELA', kind: 'item' },
  { at: B.crono, txt: 'CRONOGRAMA + MAPA MENTAL', kind: 'item' },
  { at: B.pdf, txt: 'ANOTAÇÃO POR CIMA DO PDF', kind: 'item' },
  { at: B.atualiza, txt: 'ATUALIZAÇÕES SEM CUSTO — SEMPRE', kind: 'stamp' },
  { at: B.total, txt: 'TOTAL —', kind: 'total' },
];
const LH = { head: 96, item: 78, stamp: 92, total: 240 } as const;

export const C43_Recibo: React.FC = () => {
  const t = useCurrentFrame() / FPS;

  // altura impressa até t (com a última linha crescendo suave)
  let printed = 0;
  LINHAS.forEach(l => { printed += LH[l.kind] * easeOutExpo(win(t, l.at, l.at + 0.4)); });
  const slot = 330;                      // boca da impressora
  const scroll = Math.max(0, printed - 880);   // papel desce, câmera segue
  const zoomTotal = win(t, B.total + 0.5, B.total + 1.1) * (1 - win(t, B.escorre - 0.4, B.escorre));
  const slide = easeOutExpo(win(t, B.escorre + 0.55, B.escorre + 1.5)) * 1900;
  const paperOp = sceneOpacity(t, [0, B.end + 0.6] as Range, true);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />

      <div style={{
        position: 'absolute', inset: 0, opacity: paperOp,
        transform: `scale(${1 + zoomTotal * 0.32}) translateY(${zoomTotal * -220}px)`,
        transformOrigin: '50% 72%',
      }}>
        {/* impressora */}
        <div style={{
          position: 'absolute', left: '50%', top: 150, transform: 'translateX(-50%)', width: 760, height: 190,
          background: 'linear-gradient(180deg,#2b2e35,#181a1f)', borderRadius: 30, zIndex: 6,
          boxShadow: '0 40px 90px -24px rgba(22,24,29,0.55)',
        }}>
          <div style={{ position: 'absolute', left: 60, right: 60, bottom: 26, height: 14, borderRadius: 8, background: '#0a0b0d' }} />
          <div style={{
            position: 'absolute', left: 34, top: 34, display: 'flex', alignItems: 'center', gap: 12,
            fontFamily: HEAD, fontWeight: 800, fontSize: 24, color: WHITE,
          }}>
            <span style={{ width: 14, height: 14, borderRadius: 99, background: t % 0.8 < 0.4 && t < B.escorre ? O_GREEN : '#3a3f4a' }} />
            imprimindo…
          </div>
        </div>

        {/* papel */}
        <div style={{
          position: 'absolute', left: '50%', top: slot,
          transform: `translateX(-50%) translateY(${slide - scroll}px)`,
          width: 660, minHeight: 60, background: '#fffdf7', zIndex: 4,
          boxShadow: '0 30px 70px -20px rgba(22,24,29,0.35)',
          paddingBottom: 30,
        }}>
          {/* serrilha */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: -14, height: 14, background: 'repeating-linear-gradient(90deg,#fffdf7 0 22px,transparent 22px 34px)' }} />
          <div style={{ padding: '34px 40px 6px' }}>
            {LINHAS.map((l, i) => {
              const p = win(t, l.at, l.at + 0.35);
              if (p <= 0) return null;
              if (l.kind === 'head') return (
                <div key={i} style={{ opacity: p, borderBottom: '2px dashed #c9c4b4', paddingBottom: 18, marginBottom: 16, textAlign: 'center', fontFamily: MONO, fontWeight: 700, fontSize: 27, color: O_INK, letterSpacing: 1 }}>{l.txt}</div>
              );
              if (l.kind === 'total') return (
                <div key={i} style={{ opacity: p, borderTop: '2px dashed #c9c4b4', marginTop: 16, paddingTop: 22 }}>
                  <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: O_INK, letterSpacing: 1 }}>TOTAL ————————</div>
                  <div style={{ marginTop: 16, opacity: win(t, B.nada - 1.4, B.nada - 0.9) }}>
                    <div style={{ fontFamily: MONO, fontSize: 24, color: O_MUT }}>A PAGAR PRA EXPERIMENTAR:</div>
                    <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: O_RED, letterSpacing: -1, opacity: win(t, B.nada, B.nada + 0.3) }}>NADA — TESTE GRÁTIS</div>
                  </div>
                  <div style={{ marginTop: 14, opacity: win(t, B.tempo, B.tempo + 0.4) }}>
                    <div style={{ fontFamily: MONO, fontSize: 24, color: O_MUT }}>A GANHAR EM TEMPO:</div>
                    <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 44, color: O_INK }}>INCONTÁVEL</div>
                  </div>
                </div>
              );
              return (
                <div key={i} style={{ opacity: p, display: 'flex', alignItems: 'center', gap: 16, height: LH[l.kind] - 18, position: 'relative' }}>
                  <span style={{ fontFamily: MONO, fontSize: 24, color: '#b3ac97' }}>◆</span>
                  <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: l.kind === 'stamp' ? 26 : 27, color: O_INK }}>{l.txt}</span>
                  {l.kind === 'stamp' && (
                    <span style={{
                      position: 'absolute', right: -8, top: -6, transform: `rotate(-9deg) scale(${0.6 + 0.4 * easeOutExpo(win(t, l.at + 0.4, l.at + 0.7))})`,
                      opacity: win(t, l.at + 0.4, l.at + 0.6),
                      border: `4px double ${O_GREEN}`, borderRadius: 10, padding: '6px 12px',
                      fontFamily: HEAD, fontWeight: 900, fontSize: 22, color: O_GREEN,
                    }}>OK ✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Vignette strength={0.22} />
      <Grain opacity={0.04} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c43.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
