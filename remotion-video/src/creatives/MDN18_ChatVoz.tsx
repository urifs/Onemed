import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md18.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, M_MUT, WHITE } from './meduf';
import {
  LaptopShell, TelaApp, Cursor, Refs, FimClaro, surge, win, outB, AZUL_SOFT,
} from './medufui';

/* ============================================================
   MDN18 — CHAT MÉDICO IA + CONSULTA POR VOZ
   Cena: a pergunta que você faria a um colega, no notebook.
   Depois, mãos ocupadas: a voz assume, a onda sonora responde.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MDN18_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

const PERGUNTA = 'Posso usar essa medicação no 1º trimestre de gestação?';

export const MDN18_ChatVoz: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const digitaAt = DELAY + 1.6;
  const respAt = DELAY + 6.0;
  const vozAt = DELAY + 10.8;
  const escutaAt = DELAY + 15.7;

  const n = t < digitaAt ? 0 : Math.ceil(win(t, digitaAt, digitaAt + 2.2) * PERGUNTA.length);
  const emVoz = t >= vozAt;

  /* onda sonora determinística */
  const barra = (i: number) => {
    const fase = Math.sin(frame * 0.35 + i * 1.1) * Math.cos(frame * 0.13 + i * 0.7);
    return 14 + Math.abs(fase) * 58;
  };

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #f5f7fb, #eef2f9)' }}>
      <div style={{ position: 'absolute', top: 110, left: 70, right: 70, ...surge(t, DELAY + 0.1) }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: M_NAVY, lineHeight: 1.2 }}>
          pergunta como perguntaria<br /><span style={{ color: M_BLUE }}>a um colega.</span>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 40, top: 380 }}>
        <LaptopShell width={1000}>
          <TelaApp ferramenta={emVoz ? 'Consulta por Voz' : 'Chat Médico IA'}
            extra={<span style={{ fontFamily: MONO, fontSize: 24, color: '#0e9f6e' }}>online</span>}>
            {!emVoz ? (
              /* ------- chat ------- */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 8 }}>
                {n > 0 && (
                  <div style={{
                    alignSelf: 'flex-end', maxWidth: 900, background: M_BLUE, color: WHITE,
                    borderRadius: '22px 22px 6px 22px', padding: '22px 30px',
                    fontFamily: HEAD, fontWeight: 600, fontSize: 31, lineHeight: 1.4,
                  }}>
                    {PERGUNTA.slice(0, n)}
                    {n < PERGUNTA.length && <span>▌</span>}
                  </div>
                )}
                {t >= respAt && (
                  <div style={{
                    alignSelf: 'flex-start', maxWidth: 1080, background: WHITE,
                    border: '1.5px solid rgba(14,27,51,0.08)',
                    borderRadius: '22px 22px 22px 6px', padding: '26px 32px',
                    boxShadow: '0 14px 36px rgba(14,27,51,0.08)', ...surge(t, respAt, 0.3),
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <span style={{
                        width: 40, height: 40, borderRadius: 11,
                        background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`, color: WHITE,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: HEAD, fontWeight: 900, fontSize: 20,
                      }}>M</span>
                      <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 24, color: M_NAVY }}>MEDUF</span>
                      <span style={{ fontFamily: MONO, fontSize: 20, color: M_MUT }}>consenso de 3 IAs</span>
                    </div>
                    {[['classificação de risco da droga, explicada', respAt + 0.3], ['evidência atual, resumida em 4 linhas', respAt + 1.2], ['alternativas mais seguras, se houver', respAt + 2.1]].map(([s, at]) => t >= (at as number) && (
                      <div key={s as string} style={{ display: 'flex', gap: 12, marginBottom: 10, ...surge(t, at as number, 0.3) }}>
                        <span style={{ width: 10, height: 10, borderRadius: 5, background: M_BLUE, marginTop: 13, flexShrink: 0 }} />
                        <span style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 28, color: M_NAVY }}>{s as string}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 14 }}>
                      <Refs t={t} at={respAt + 2.8} itens={['referência junto', 'PubMed']} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ------- voz ------- */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40 }}>
                <div style={{
                  width: 170, height: 170, borderRadius: 85,
                  background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 0 ${12 + Math.abs(Math.sin(frame * 0.2)) * 22}px rgba(21,96,232,0.12)`,
                }}>
                  {/* microfone */}
                  <svg width={72} height={72} viewBox="0 0 24 24" fill="none">
                    <rect x="9" y="3" width="6" height="11" rx="3" fill={WHITE} />
                    <path d="M5,11 a7,7 0 0 0 14,0 M12,18 v3 M8,21 h8" stroke={WHITE} strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  </svg>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: 90, marginTop: 34 }}>
                  {[...Array(26)].map((_, i) => (
                    <div key={i} style={{
                      width: 10, borderRadius: 5, background: M_BLUE, height: barra(i),
                      opacity: 0.4 + (barra(i) - 14) / 90,
                    }} />
                  ))}
                </div>
                {t >= escutaAt && (
                  <div style={{
                    fontFamily: HEAD, fontWeight: 700, fontSize: 32, color: M_NAVY, marginTop: 30,
                    display: 'flex', gap: 26, ...surge(t, escutaAt, 0.3),
                  }}>
                    <span>escuta</span>
                    {t >= DELAY + 16.8 && <span>· entende</span>}
                    {t >= DELAY + 17.7 && <span style={{ color: M_BLUE }}>· responde</span>}
                  </div>
                )}
                <div style={{ fontFamily: HEAD, fontSize: 26, color: M_MUT, marginTop: 20 }}>
                  mãos livres — no exame físico, no procedimento, no corredor
                </div>
              </div>
            )}
            {!emVoz && (
              <Cursor t={t}
                path={[[digitaAt - 0.5, 700, 240], [respAt - 0.4, 1180, 200], [DELAY + 9.8, 1240, 620]]}
                clicks={[respAt - 0.25]} />
            )}
          </TelaApp>
        </LaptopShell>
      </div>

      {/* legenda da voz falada (fora do notebook) */}
      {emVoz && t < DELAY + 19.0 && (
        <div style={{
          position: 'absolute', top: 250, left: 70, right: 70,
          fontFamily: HEAD, fontWeight: 700, fontSize: 40, color: M_MUT, fontStyle: 'italic',
          ...surge(t, vozAt + 0.4),
        }}>
          "mãos ocupadas no exame físico? fala com ela."
        </div>
      )}

      {t >= DELAY + 18.9 && t < DELAY + 21.9 && (
        <div style={{
          position: 'absolute', bottom: 320, left: 70, right: 70, textAlign: 'center',
          fontFamily: HEAD, fontWeight: 900, fontSize: 50, color: M_NAVY, lineHeight: 1.3,
          ...surge(t, DELAY + 18.9),
        }}>
          um colega de plantão<br /><span style={{ color: M_BLUE }}>que nunca está ocupado.</span>
        </div>
      )}

      <FimClaro t={t} at={DELAY + 21.9}
        frase="Chat Médico IA · Consulta por Voz"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md18.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
