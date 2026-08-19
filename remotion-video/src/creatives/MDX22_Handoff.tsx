import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md22.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, M_MUT, M_GREEN, WHITE, M_BG } from './meduf';
import {
  LaptopShell, TelaApp, PhoneShell, Cursor, Dedo, CameraRig, Cartao, Linha, Refs, Alerta,
  FimClaro, surge, win, outB, flashAt, AZUL_SOFT,
} from './medufui';

/* ============================================================
   MDX22 — DO NOTEBOOK PRO CELULAR (a sessão vai junto)
   Notebook em tela quase cheia rodando a Análise de ECG;
   flash → o mesmo resultado abre no celular, com o dedo
   rolando. Fecho: os dois lado a lado, sessão sincronizada.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MDX22_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

const FA_PATH =
  'M0,80 l60,0 l8,-10 l10,10 l12,0 l6,-64 l8,104 l6,-40 l88,0 l8,-10 l10,10 l12,0 l6,-64 l8,104 l6,-40 l52,0 l8,-10 l10,10 l12,0 l6,-64 l8,104 l6,-40 l120,0 l8,-10 l10,10 l12,0 l6,-64 l8,104 l6,-40 l70,0 l8,-10 l10,10 l12,0 l6,-64 l8,104 l6,-40 l100,0';

/* o conteúdo do resultado (usado no notebook E no celular) */
const ResultadoECG: React.FC<{ t: number; base: number; compacto?: boolean }> = ({ t, base, compacto }) => (
  <>
    <div style={{
      background: '#fdf6f4', borderRadius: 12, border: '1.5px solid rgba(224,36,36,0.15)',
      overflow: 'hidden', height: compacto ? 150 : 180,
      backgroundImage: 'linear-gradient(rgba(224,36,36,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(224,36,36,0.08) 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    }}>
      <svg width={compacto ? 800 : 900} height={compacto ? 150 : 180} viewBox="0 0 880 170">
        <path d={FA_PATH} fill="none" stroke="#c2382e" strokeWidth={3.5}
          strokeLinecap="round" strokeLinejoin="round" transform="translate(0,10)" />
      </svg>
    </div>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: compacto ? 14 : 18 }}>
      {[['ritmo', 'irregular', base], ['FC', '~142', base + 0.4], ['onda P', 'ausente', base + 0.8]].map(([r, v, at]) => t >= (at as number) && (
        <div key={r as string} style={{
          background: AZUL_SOFT, borderRadius: 12, padding: compacto ? '10px 16px' : '13px 20px',
          ...surge(t, at as number, 0.3),
        }}>
          <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: compacto ? 18 : 21, color: M_MUT, marginRight: 10 }}>{r as string}</span>
          <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: compacto ? 21 : 25, color: M_NAVY }}>{v as string}</span>
        </div>
      ))}
    </div>
    {t >= base + 1.3 && (
      <div style={{ marginTop: compacto ? 14 : 18 }}>
        <Alerta t={t} at={base + 1.3} titulo="Achado">
          padrão de FA de alta resposta — correlacionar com clínica
        </Alerta>
      </div>
    )}
  </>
);

export const MDX22_Handoff: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const notebookFase = DELAY + 0.2;
  const achAt = DELAY + 3.4;
  const handAt = DELAY + 8.6;          /* "pega o celular" */
  const foneAt = handAt + 0.35;
  const pFone = t < foneAt ? 0 : outB(win(t, foneAt, foneAt + 0.8));
  const scrollAt = DELAY + 12.4;
  const pScroll = t < scrollAt ? 0 : outB(win(t, scrollAt, scrollAt + 1.2));
  const duplaAt = DELAY + 16.3;
  const pDupla = t < duplaAt ? 0 : outB(win(t, duplaAt, duplaAt + 0.7));
  const fimAt = DELAY + 22.0;

  const emFone = t >= foneAt;

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #eef1f7, #e4e9f3)' }}>
      {/* -------- fase 1: notebook em tela quase cheia -------- */}
      {!emFone && (
        <CameraRig t={t} kf={[
          [0, 1.0, 0, 0],
          [achAt, 1.0, 0, 0],
          [achAt + 0.8, 1.14, -30, -40],
          [handAt, 1.02, 0, 0],
        ]}>
          <div style={{ position: 'absolute', left: -240, right: -240, top: 330 }}>
            <div style={{ margin: '0 auto', width: 1520 }}>
              <LaptopShell width={1520}>
                <TelaApp ferramenta="Análise de ECG"
                  extra={<span style={{ fontFamily: MONO, fontSize: 24, color: '#0e9f6e' }}>sessão #4821</span>}>
                  <div style={{ display: 'flex', gap: 30 }}>
                    <div style={{ width: 940 }}>
                      <ResultadoECG t={t} base={achAt} />
                    </div>
                    <div style={{ width: 460 }}>
                      {t >= DELAY + 4.2 && (
                        <Cartao style={{ padding: '22px 26px', ...surge(t, DELAY + 4.2) }}>
                          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 25, color: M_NAVY, marginBottom: 12 }}>
                            laudo, linha a linha
                          </div>
                          <Linha t={t} at={DELAY + 4.5} cor={M_BLUE}>cada intervalo explicado</Linha>
                          <Linha t={t} at={DELAY + 5.3} cor={M_BLUE}>base científica citada</Linha>
                        </Cartao>
                      )}
                    </div>
                  </div>
                  <Cursor t={t}
                    path={[[DELAY + 2.6, 480, 300], [achAt + 1.2, 380, 560], [DELAY + 6.5, 1120, 300]]}
                    clicks={[achAt + 1.35]} />
                </TelaApp>
              </LaptopShell>
            </div>
          </div>
          <div style={{
            position: 'absolute', top: 150, left: 0, right: 0, textAlign: 'center',
            fontFamily: HEAD, fontWeight: 800, fontSize: 44, color: M_NAVY, ...surge(t, DELAY + 0.2),
          }}>
            a análise começa <span style={{ color: M_BLUE }}>no notebook</span>
          </div>
        </CameraRig>
      )}

      {/* -------- fase 2: o celular assume -------- */}
      {emFone && t < duplaAt && (
        <>
          <div style={{
            position: 'absolute', top: 130, left: 0, right: 0, textAlign: 'center',
            fontFamily: HEAD, fontWeight: 800, fontSize: 46, color: M_NAVY, ...surge(t, foneAt + 0.2),
          }}>
            chamaram no corredor? <span style={{ color: M_BLUE }}>pega o celular.</span>
          </div>
          <div style={{
            position: 'absolute', left: '50%', top: 300,
            transform: `translateX(-50%) translateY(${(1 - pFone) * 500}px) scale(${0.9 + pFone * 0.1})`,
            opacity: pFone,
          }}>
            <PhoneShell width={640}>
              <div style={{ position: 'absolute', inset: 0, background: M_BG, paddingTop: 42 }}>
                {/* header compacto do app no celular */}
                <div style={{
                  height: 64, background: WHITE, display: 'flex', alignItems: 'flex-end',
                  padding: '0 18px 8px', gap: 10, borderBottom: '1px solid rgba(14,27,51,0.08)',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`, color: WHITE,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: HEAD, fontWeight: 900, fontSize: 17,
                  }}>M</div>
                  <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 20, color: M_NAVY }}>Análise de ECG</span>
                  <span style={{
                    marginLeft: 'auto', fontFamily: MONO, fontSize: 13, color: M_GREEN,
                  }}>sessão #4821 ✓</span>
                </div>
                <div style={{ position: 'absolute', top: 64, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 16px', transform: `translateY(${-pScroll * 40}px)` }}>
                    <div style={{ transform: 'scale(0.56)', transformOrigin: 'top left', width: 710, height: 420 }}>
                      <ResultadoECG t={t} base={foneAt + 0.7} compacto />
                    </div>
                    {t >= foneAt + 2.3 && (
                      <div style={{
                        fontFamily: HEAD, fontWeight: 700, fontSize: 20, color: M_NAVY,
                        background: AZUL_SOFT, borderRadius: 12, padding: '14px 16px', lineHeight: 1.4,
                        ...surge(t, foneAt + 2.3, 0.3),
                      }}>
                        do jeito que você deixou — nada se perde entre os aparelhos
                      </div>
                    )}
                    {t >= foneAt + 3.3 && (
                      <div style={{
                        marginTop: 12, fontFamily: HEAD, fontWeight: 800, fontSize: 21, color: '#065f46',
                        background: '#d1fae5', borderRadius: 12, padding: '14px 16px',
                        ...surge(t, foneAt + 3.3, 0.3),
                      }}>
                        ✓ mesma sessão · mesmo caso · zero retrabalho
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </PhoneShell>
            <Dedo t={t} taps={[[scrollAt, 330, 540]]} />
          </div>
        </>
      )}

      {/* -------- fase 3: os dois lado a lado -------- */}
      {t >= duplaAt && (
        <div style={{ position: 'absolute', inset: 0, opacity: pDupla }}>
          <div style={{ position: 'absolute', left: -30, top: 620 }}>
            <LaptopShell width={640}>
              <TelaApp ferramenta="Análise de ECG">
                <div style={{ width: 900 }}><ResultadoECG t={999} base={0} /></div>
              </TelaApp>
            </LaptopShell>
          </div>
          <div style={{ position: 'absolute', right: 60, top: 560 }}>
            <PhoneShell width={430}>
              <div style={{ background: M_BG, position: 'absolute', inset: 0, padding: '52px 14px 14px' }}>
                <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: 720 }}>
                  <ResultadoECG t={999} base={0} compacto />
                </div>
              </div>
            </PhoneShell>
          </div>
          <div style={{
            position: 'absolute', top: 220, left: 70, right: 70, textAlign: 'center',
            fontFamily: HEAD, fontWeight: 900, fontSize: 56, color: M_NAVY, lineHeight: 1.3,
          }}>
            notebook na mesa. celular no bolso.<br />
            <span style={{ color: M_BLUE }}>a MEDUF vai junto.</span>
          </div>
          <div style={{
            position: 'absolute', bottom: 160, left: 0, right: 0, display: 'flex', justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: HEAD, fontWeight: 800, fontSize: 30, color: M_GREEN,
              background: '#d1fae5', border: `2.5px solid ${M_GREEN}`, borderRadius: 999, padding: '14px 30px',
            }}>
              ✓ sessão sincronizada
            </span>
          </div>
        </div>
      )}

      <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, handAt) * 0.85, pointerEvents: 'none' }} />
      <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, duplaAt) * 0.6, pointerEvents: 'none' }} />

      <FimClaro t={t} at={fimAt}
        frase="a mesma sessão, em qualquer tela"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md22.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
