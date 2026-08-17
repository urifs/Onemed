import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md16.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, WHITE } from './meduf';
import {
  LaptopShell, TelaApp, Cursor, Cartao, Consenso, Rank, Refs, Linha,
  FimClaro, surge, win, outB, AZUL_SOFT,
} from './medufui';

/* ============================================================
   MDN16 — 23:14, PRONTO-SOCORRO
   Cena: o PS escuro, o notebook aberto brilhando. Dentro dele,
   o Diagnóstico Simples resolvendo a dúvida entre um paciente
   e outro. Cursor clicando, consenso das 3 IAs, decisão.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MDN16_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

export const MDN16_Plantao: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const laptopAt = DELAY + 9.5;
  const pLap = t < laptopAt ? 0 : outB(win(t, laptopAt, laptopAt + 0.8));
  const digitaAt = DELAY + 11.0;
  const iasAt = DELAY + 12.9;
  const consAt = DELAY + 14.1;
  const resAt = DELAY + 14.9;

  const texto = 'Homem, 58 anos. Dor torácica em aperto há 40 min, sudorese, irradiação para MSE.';
  const n = t < digitaAt ? 0 : Math.ceil(win(t, digitaAt, digitaAt + 1.7) * texto.length);

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #070b12, #0d1420 70%)' }}>
      {/* luz fria do corredor */}
      <AbsoluteFill style={{
        background: 'radial-gradient(90% 50% at 50% 0%, rgba(80,120,190,0.12), transparent 60%)',
      }} />

      {/* relógio-cenário */}
      <div style={{ position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center', ...surge(t, DELAY + 0.1) }}>
        <div style={{ fontFamily: MONO, fontSize: 110, fontWeight: 700, color: WHITE, letterSpacing: '0.05em' }}>
          23:14
        </div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 38, color: 'rgba(255,255,255,0.65)', marginTop: 8 }}>
          pronto-socorro
        </div>
      </div>

      {t >= DELAY + 6.1 && t < laptopAt && (
        <div style={{
          position: 'absolute', top: 470, left: 90, right: 90, textAlign: 'center',
          fontFamily: HEAD, fontWeight: 800, fontSize: 52, color: WHITE, lineHeight: 1.35,
          ...surge(t, DELAY + 6.1),
        }}>
          uma dúvida que<br />não pode esperar.
        </div>
      )}

      {/* o notebook abre — brilho azul da tela no escuro */}
      {t >= laptopAt && (
        <div style={{
          position: 'absolute', left: 40, top: 400, opacity: pLap,
          transform: `translateY(${(1 - pLap) * 60}px)`,
        }}>
          <div style={{
            position: 'absolute', left: -80, top: -60, right: -80, bottom: -40,
            background: 'radial-gradient(60% 60% at 50% 45%, rgba(110,168,255,0.22), transparent 70%)',
          }} />
          <LaptopShell width={1000}>
            <TelaApp ferramenta="Diagnóstico Simples"
              extra={<span style={{ fontFamily: MONO, fontSize: 24, color: '#0e9f6e' }}>online</span>}>
              <div style={{ display: 'flex', gap: 30 }}>
                {/* coluna do caso */}
                <div style={{ width: 700 }}>
                  <Cartao style={{ padding: '26px 30px' }}>
                    <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 22, color: '#5b6b85', marginBottom: 12, letterSpacing: '0.06em' }}>
                      DESCREVA O CASO
                    </div>
                    <div style={{ fontFamily: HEAD, fontSize: 30, color: M_NAVY, lineHeight: 1.5, minHeight: 130 }}>
                      {texto.slice(0, n)}
                      {n > 0 && n < texto.length && <span style={{ color: M_BLUE }}>▌</span>}
                    </div>
                  </Cartao>
                  <div style={{ marginTop: 20 }}>
                    <Consenso t={t} at={iasAt} escala={0.92}
                      doneAts={[consAt - 0.5, consAt - 0.3, consAt - 0.1]}
                      consensoAt={consAt} />
                  </div>
                </div>
                {/* coluna do resultado */}
                {t >= resAt && (
                  <div style={{ width: 700 }}>
                    <Cartao style={{ padding: '26px 30px', ...surge(t, resAt) }}>
                      <Rank t={t} at={resAt + 0.1} rotulo="Síndrome coronariana aguda" frac={0.9} tag="alta" />
                      <Rank t={t} at={resAt + 0.5} rotulo="Dissecção de aorta" frac={0.45} tag="não descartar" />
                      <Linha t={t} at={DELAY + 15.9}>ECG em até 10 min + troponina</Linha>
                      <Linha t={t} at={DELAY + 16.7}>AAS conforme protocolo, se sem contraindicação</Linha>
                      <div style={{ marginTop: 14 }}>
                        <Refs t={t} at={DELAY + 17.2} itens={['PubMed', 'protocolo SUS']} />
                      </div>
                    </Cartao>
                  </div>
                )}
              </div>
              <Cursor t={t}
                path={[[digitaAt - 0.6, 380, 330], [iasAt - 0.4, 300, 560], [resAt + 0.4, 900, 300], [DELAY + 17.5, 1100, 480]]}
                clicks={[iasAt - 0.2]} />
            </TelaApp>
          </LaptopShell>
        </div>
      )}

      {/* narrativa por fora do notebook */}
      {t >= DELAY + 18.3 && t < DELAY + 25.0 && (
        <div style={{
          position: 'absolute', bottom: 300, left: 90, right: 90, textAlign: 'center',
          fontFamily: HEAD, fontWeight: 800, fontSize: 46, color: WHITE, lineHeight: 1.4,
          ...surge(t, DELAY + 18.3),
        }}>
          o próximo paciente já foi chamado.
          {t >= DELAY + 21.4 && (
            <div style={{ color: '#8db6ff', marginTop: 14 }}>
              você entra com a decisão mais segura.
            </div>
          )}
        </div>
      )}

      <FimClaro t={t} at={DELAY + 25.0}
        frase="o assistente clínico ao lado do médico"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md16.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
