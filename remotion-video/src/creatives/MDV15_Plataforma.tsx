import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md15.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, M_MUT, M_BG, WHITE } from './meduf';
import {
  Cartao, MChip, Consenso, Seguranca, FimClaro, surge, win, outB, AZUL_SOFT, FERRAMENTAS,
} from './medufui';

/* ============================================================
   MDV15 — A PLATAFORMA
   As 17 ferramentas reais desfilando, o motor de consenso,
   as fontes científicas e os números da MEDUF.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MDV15_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

export const MDV15_Plataforma: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const gradeAt = DELAY + 0.1;
  const consAt = DELAY + 9.3;
  const fontesAt = DELAY + 13.4;
  const numerosAt = DELAY + 20.6;
  const lockupAt = DELAY + 27.2;

  const secGrade = t < consAt;
  const secCons = t >= consAt && t < fontesAt;
  const secFontes = t >= fontesAt && t < numerosAt;
  const secNums = t >= numerosAt && t < lockupAt;

  return (
    <AbsoluteFill style={{ background: M_BG }}>
      <AbsoluteFill style={{
        backgroundImage: 'radial-gradient(rgba(21,96,232,0.05) 1.4px, transparent 1.4px)',
        backgroundSize: '40px 40px',
      }} />

      {/* cabeçalho fixo */}
      <div style={{
        position: 'absolute', top: 70, left: 70, right: 70,
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <MChip size={72} />
        <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 44, color: M_NAVY }}>
          MEDUF <span style={{ color: M_BLUE }}>AI</span>
        </span>
      </div>

      {/* seção 1: as 17 ferramentas */}
      {secGrade && (
        <div style={{ position: 'absolute', left: 70, right: 70, top: 210 }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: M_NAVY, marginBottom: 30, ...surge(t, gradeAt) }}>
            <span style={{ color: M_BLUE }}>17 ferramentas</span> de apoio<br />à decisão clínica
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {FERRAMENTAS.map((f, i) => {
              const at = gradeAt + 0.5 + i * 0.42;
              if (t < at) return null;
              return (
                <div key={f} style={{
                  background: WHITE, border: '1.5px solid rgba(14,27,51,0.08)', borderRadius: 16,
                  padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14,
                  boxShadow: '0 10px 26px rgba(14,27,51,0.06)', ...surge(t, at, 0.3),
                }}>
                  <span style={{
                    width: 40, height: 40, borderRadius: 11, background: AZUL_SOFT, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: HEAD, fontWeight: 900, fontSize: 20, color: M_BLUE,
                  }}>{i + 1}</span>
                  <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 25, color: M_NAVY }}>{f}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* seção 2: consenso */}
      {secCons && (
        <div style={{ position: 'absolute', left: 70, right: 70, top: 420 }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 72, color: M_NAVY, marginBottom: 44, ...surge(t, consAt) }}>
            três IAs.<br /><span style={{ color: M_BLUE }}>um consenso.</span>
          </div>
          <Consenso t={t} at={consAt + 0.3} escala={1.25}
            doneAts={[DELAY + 10.6, DELAY + 11.3, DELAY + 11.9]}
            consensoAt={DELAY + 12.3} />
          <div style={{ marginTop: 60, fontFamily: HEAD, fontSize: 34, color: M_MUT, lineHeight: 1.6, maxWidth: 900, ...surge(t, consAt + 1.2) }}>
            GPT, Claude e Gemini analisam o mesmo caso ao mesmo tempo —<br />
            e o que chega até você é o consenso consolidado.
          </div>
        </div>
      )}

      {/* seção 3: fontes científicas */}
      {secFontes && (
        <div style={{ position: 'absolute', left: 70, right: 70, top: 330 }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 64, color: M_NAVY, marginBottom: 40, ...surge(t, fontesAt) }}>
            base científica<br /><span style={{ color: M_BLUE }}>de verdade</span>
          </div>
          {[
            ['PubMed', '+35 milhões de artigos científicos', DELAY + 14.8],
            ['Protocolos do SUS · PCDT', 'as diretrizes oficiais brasileiras', DELAY + 17.6],
            ['RENAME', 'a relação nacional de medicamentos', DELAY + 19.0],
          ].map(([titulo, sub, at]) => t >= (at as number) && (
            <Cartao key={titulo as string} style={{ marginBottom: 20, ...surge(t, at as number) }}>
              <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 42, color: M_NAVY }}>{titulo as string}</div>
              <div style={{ fontFamily: HEAD, fontSize: 30, color: M_MUT, marginTop: 8 }}>{sub as string}</div>
            </Cartao>
          ))}
        </div>
      )}

      {/* seção 4: números */}
      {secNums && (
        <div style={{ position: 'absolute', left: 70, right: 70, top: 380 }}>
          {[
            ['+10.000', 'médicos usando', numerosAt + 0.2],
            ['27', 'estados do Brasil', DELAY + 21.9],
            ['+90 mil', 'consultas realizadas', DELAY + 23.2],
          ].map(([num, sub, at]) => t >= (at as number) && (
            <div key={num as string} style={{
              display: 'flex', alignItems: 'baseline', gap: 26, marginBottom: 44,
              ...surge(t, at as number),
            }}>
              <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 120, color: M_BLUE, letterSpacing: -3 }}>
                {num as string}
              </span>
              <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 40, color: M_NAVY }}>{sub as string}</span>
            </div>
          ))}
        </div>
      )}

      {/* lockup final antes do encerramento */}
      {t >= lockupAt && t < DELAY + 30.8 && (
        <div style={{
          position: 'absolute', left: 70, right: 70, top: 560,
          fontFamily: HEAD, fontWeight: 900, fontSize: 78, color: M_NAVY, lineHeight: 1.2,
          ...surge(t, lockupAt),
        }}>
          o assistente clínico<br /><span style={{ color: M_BLUE }}>ao lado do médico.</span>
        </div>
      )}

      <Seguranca />

      <FimClaro t={t} at={DELAY + 30.8}
        frase="o assistente clínico ao lado do médico"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md15.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
