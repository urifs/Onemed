import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/c95.json';

/* ============================================================
   C95 — GABARITO
   Estilo: folha de respostas de prova. Enunciados em serifa,
   bolhas Ⓐ Ⓑ preenchidas a lápis, carimbo final de banca.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const C95_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

const MESA = '#cfccc2';
const FOLHA = '#fdfcf7';
const TINTA = '#232323';
const CINZA = '#6b6b66';
const LAPIS = '#3a3a3a';
const CARIMBO = '#b3261e';
const VERDE = '#1c7c40';
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'Courier New', monospace";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const outB = (p: number) => 1 - Math.pow(1 - p, 3);

const aparece = (t: number, at: number): React.CSSProperties => {
  const p = outB(win(t, at, at + 0.4));
  return { opacity: p, transform: `translateY(${(1 - p) * 10}px)` };
};

/* bolha de resposta que é preenchida a lápis */
const BolhaResp: React.FC<{ t: number; fillAt?: number; letra: string }> =
  ({ t, fillAt, letra }) => {
    const p = fillAt !== undefined && t >= fillAt ? outB(win(t, fillAt, fillAt + 0.3)) : 0;
    return (
      <span style={{
        display: 'inline-flex', width: 52, height: 52, borderRadius: 26,
        border: `3px solid ${TINTA}`, alignItems: 'center', justifyContent: 'center',
        fontFamily: MONO, fontSize: 30, color: p > 0.5 ? FOLHA : TINTA,
        position: 'relative', marginRight: 14, flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute', inset: 4, borderRadius: 22, background: LAPIS,
          transform: `scale(${p})`, opacity: 0.92,
        }} />
        <span style={{ position: 'relative' }}>{letra}</span>
      </span>
    );
  };

const Opcao: React.FC<{
  t: number; at: number; letra: string; fillAt?: number; children: React.ReactNode;
}> = ({ t, at, letra, fillAt, children }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 18, ...aparece(t, at),
  }}>
    <BolhaResp t={t} letra={letra} fillAt={fillAt} />
    <div style={{ fontFamily: SERIF, fontSize: 37, lineHeight: 1.35, color: TINTA, paddingTop: 4 }}>
      {children}
    </div>
  </div>
);

const Questao: React.FC<{ t: number; at: number; num: string; children: React.ReactNode }> =
  ({ t, at, num, children }) => (
    <div style={{ marginTop: 44, ...aparece(t, at) }}>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 40, color: TINTA }}>
        <span style={{ fontFamily: MONO, marginRight: 14 }}>{num}.</span>{children}
      </div>
    </div>
  );

export const C95_Gabarito: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const stampAt = DELAY + 37.97;
  const pStamp = t < stampAt ? 0 : outB(win(t, stampAt, stampAt + 0.35));
  const rodapeAt = DELAY + 41.52;

  return (
    <AbsoluteFill style={{ background: MESA }}>
      {/* textura da mesa */}
      <AbsoluteFill style={{
        backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.03) 0 3px, transparent 3px 9px)',
      }} />

      {/* a folha */}
      <div style={{
        position: 'absolute', left: 60, right: 60, top: 70, bottom: 70,
        background: FOLHA, borderRadius: 6, padding: '56px 64px',
        boxShadow: '0 30px 70px rgba(0,0,0,0.3)', transform: 'rotate(0.4deg)',
      }}>
        {/* cabeçalho institucional */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 36, color: TINTA, letterSpacing: '0.02em' }}>
              PROCESSO SELETIVO — RESIDÊNCIA MÉDICA
            </div>
            <div style={{ fontFamily: MONO, fontSize: 26, color: CINZA, marginTop: 8, letterSpacing: '0.14em' }}>
              FOLHA DE RESPOSTAS · CADERNO ÚNICO
            </div>
          </div>
          {/* código de barras */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 52 }}>
            {[4, 2, 6, 2, 3, 5, 2, 4, 6, 2, 3, 5, 2].map((wd, i) => (
              <div key={i} style={{ width: wd, height: i % 4 === 0 ? 52 : 42, background: TINTA }} />
            ))}
          </div>
        </div>
        <div style={{ height: 3, background: TINTA, margin: '26px 0 10px' }} />
        <div style={{ fontFamily: MONO, fontSize: 27, color: CINZA }}>
          Candidato(a): <span style={{ color: TINTA }}>VOCÊ</span>
          <span style={{ marginLeft: 40 }}>Inscrição: 2026</span>
        </div>

        {/* Q1 */}
        <Questao t={t} at={DELAY + 0.1} num="1">
          Onde estudar com todos os grandes cursos?
        </Questao>
        <Opcao t={t} at={DELAY + 4.99} letra="A">fazendo sete matrículas diferentes</Opcao>
        <Opcao t={t} at={DELAY + 8.62} letra="B" fillAt={DELAY + 14.17}>
          numa plataforma só — <b>+530 cursos</b>
        </Opcao>

        {/* Q2 */}
        <Questao t={t} at={DELAY + 15.27} num="2">
          Como treinar para a prova?
        </Questao>
        <Opcao t={t} at={DELAY + 19.25} letra="A">no chute</Opcao>
        <Opcao t={t} at={DELAY + 21.99} letra="B" fillAt={DELAY + 28.4}>
          <b>31.612 questões comentadas</b> + Banco MED com <b>+56 mil</b>
        </Opcao>

        {/* Q3 */}
        <Questao t={t} at={DELAY + 29.39} num="3">
          E a revisão?
        </Questao>
        <div style={{ marginTop: 16, ...aparece(t, DELAY + 32.71) }}>
          <div style={{
            fontFamily: SERIF, fontStyle: 'italic', fontSize: 38, color: '#20456b',
            borderBottom: `2px dotted ${CINZA}`, paddingBottom: 10, width: 'fit-content',
          }}>
            resumos, flashcards e cronograma — por IA
          </div>
        </div>

        {/* carimbo da banca */}
        <div style={{
          position: 'absolute', right: 70, bottom: 250,
          transform: `rotate(-12deg) scale(${1.6 - 0.6 * pStamp})`, opacity: pStamp * 0.92,
        }}>
          <div style={{
            border: `6px double ${CARIMBO}`, borderRadius: 14, padding: '22px 34px',
            color: CARIMBO, textAlign: 'center',
          }}>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 44, letterSpacing: '0.06em' }}>
              GABARITO
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 30, marginTop: 6 }}>
              todas as respostas<br />no mesmo lugar
            </div>
          </div>
        </div>

        {/* rodapé com o local de prova */}
        <div style={{
          position: 'absolute', left: 64, right: 64, bottom: 70, ...aparece(t, rodapeAt),
        }}>
          <div style={{ height: 2, background: TINTA, marginBottom: 18 }} />
          <div style={{ fontFamily: MONO, fontSize: 30, color: CINZA }}>
            Local de prova: <span style={{ color: TINTA, fontWeight: 700 }}>onemedcursos.com.br</span>
          </div>
          <div style={{
            marginTop: 12, fontFamily: SERIF, fontStyle: 'italic', fontSize: 34, color: VERDE,
          }}>
            ✔ teste grátis — sem taxa de inscrição
          </div>
        </div>
      </div>

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/c95.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
