import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md25.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, M_MUT, M_RED, M_GREEN, WHITE, M_BG } from './meduf';
import {
  MobileShell, CameraRig, ConsensoFlux, Cartao, Rank, Linha, FimClaro,
  surge, win, outB, flashAt, AZUL_SOFT, VERM_BG, AMBAR, AMBAR_BG,
} from './medufui';

/* ============================================================
   MDX25 — UM TURNO INTEIRO DENTRO DO APP
   Seis horários, seis ferramentas em uso, cortes com carimbo
   de hora; no fim, as seis telas encolhem num mosaico e o
   consenso fecha. Montagem rápida, câmera sempre viva.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MDX25_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

type Cena = { at: number; hora: string; ferramenta: string; el: (t: number, at: number) => React.ReactNode };

const mini = (texto: string, cor: string = M_BLUE) => (
  <span style={{
    fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: cor === M_BLUE ? M_BLUE : WHITE,
    background: cor === M_BLUE ? AZUL_SOFT : cor, borderRadius: 999, padding: '12px 24px',
    display: 'inline-block', marginRight: 12, marginBottom: 12,
  }}>{texto}</span>
);

const CENAS: Cena[] = [
  {
    at: DELAY + 1.55, hora: '07:00', ferramenta: 'Estruturação de Anamnese',
    el: (t, at) => (
      <Cartao style={{ padding: '24px 28px' }}>
        {[['ID', 'M, 71 anos'], ['QP', 'dispneia há 2 dias'], ['HDA', 'ortopneia, piora progressiva']].map(([s, v], i) => t >= at + 0.25 + i * 0.28 && (
          <div key={s} style={{ display: 'flex', gap: 14, marginBottom: 12, ...surge(t, at + 0.25 + i * 0.28, 0.25) }}>
            <span style={{
              fontFamily: HEAD, fontWeight: 900, fontSize: 22, color: M_BLUE, background: AZUL_SOFT,
              borderRadius: 8, padding: '5px 16px', minWidth: 90, textAlign: 'center',
            }}>{s}</span>
            <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 26, color: M_NAVY }}>{v}</span>
          </div>
        ))}
      </Cartao>
    ),
  },
  {
    at: DELAY + 4.2, hora: '09:00', ferramenta: 'Diagnóstico Detalhado',
    el: (t, at) => (
      <Cartao style={{ padding: '24px 28px', minHeight: 200 }}>
        <Rank t={t} at={at + 0.05} rotulo="IC descompensada" frac={0.86} tag="alta" />
        <Rank t={t} at={at + 0.4} rotulo="TEP" frac={0.4} tag="considerar" />
        {t >= at + 0.8 && (
          <div style={{ ...surge(t, at + 0.8, 0.3) }}>{mini('ECG + BNP')}{mini('eco à beira-leito')}</div>
        )}
      </Cartao>
    ),
  },
  {
    at: DELAY + 6.35, hora: '11:00', ferramenta: 'Interação Medicamentosa',
    el: (t, at) => (
      <div>
        <div style={{ marginBottom: 8 }}>{mini('varfarina')}{mini('amiodarona')}</div>
        {t >= at + 0.5 && (
          <div style={{
            background: VERM_BG, border: `3px solid ${M_RED}`, borderRadius: 16,
            padding: '20px 26px', ...surge(t, at + 0.5, 0.3),
          }}>
            <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 30, color: M_RED }}>
              ! interação grave — checada
            </span>
          </div>
        )}
      </div>
    ),
  },
  {
    at: DELAY + 8.3, hora: '14:00', ferramenta: 'Análise de Exames Laboratoriais',
    el: (t, at) => (
      <Cartao style={{ padding: '24px 28px' }}>
        {[['Potássio', '6,1 ↑', M_RED], ['Creatinina', '2,4 ↑', M_RED], ['Hb', '9,8 ↓', AMBAR]].map(([n, v, cor], i) => t >= at + 0.2 + i * 0.25 && (
          <div key={n as string} style={{
            display: 'flex', justifyContent: 'space-between', padding: '12px 18px',
            background: cor === M_RED ? VERM_BG : AMBAR_BG, borderRadius: 12, marginBottom: 10,
            border: `2px solid ${cor}`, ...surge(t, at + 0.2 + i * 0.25, 0.25),
          }}>
            <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: M_NAVY }}>{n as string}</span>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 27, color: cor as string }}>{v as string}</span>
          </div>
        ))}
      </Cartao>
    ),
  },
  {
    at: DELAY + 11.1, hora: '17:00', ferramenta: 'Análise de ECG',
    el: (t, at) => (
      <Cartao style={{ padding: '24px 28px' }}>
        <div style={{
          background: '#fdf6f4', borderRadius: 12, height: 150, overflow: 'hidden',
          backgroundImage: 'linear-gradient(rgba(224,36,36,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(224,36,36,0.08) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}>
          <svg width={900} height={150} viewBox="0 0 900 150">
            <path d="M0,75 l70,0 l10,-12 l12,12 l14,0 l8,-55 l10,90 l8,-35 l110,0 l10,-12 l12,12 l14,0 l8,-55 l10,90 l8,-35 l90,0 l10,-12 l12,12 l14,0 l8,-55 l10,90 l8,-35 l150,0"
              fill="none" stroke="#c2382e" strokeWidth={4} strokeLinecap="round"
              strokeDasharray={1400} strokeDashoffset={1400 * (1 - Math.min(1, (t - at) / 1.4))} />
          </svg>
        </div>
        {t >= at + 0.9 && (
          <div style={{ marginTop: 14, ...surge(t, at + 0.9, 0.3) }}>
            {mini('ritmo analisado')}{mini('FC ~142')}
          </div>
        )}
      </Cartao>
    ),
  },
  {
    at: DELAY + 13.85, hora: '19:00', ferramenta: 'Análise de Prontuário',
    el: (t, at) => (
      <Cartao style={{ padding: '24px 28px' }}>
        <Linha t={t} at={at + 0.2} cor={AMBAR}>pendência sinalizada: eletrólitos pós-diurético</Linha>
        <Linha t={t} at={at + 0.7} cor={M_GREEN}>prontuário pronto pra passagem</Linha>
      </Cartao>
    ),
  },
];

export const MDX25_Turno: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const mosaicoAt = DELAY + 15.75;
  const consAt = DELAY + 18.45;
  const claimAt = DELAY + 20.1;
  const fimAt = DELAY + 22.5;
  const pMos = t < mosaicoAt ? 0 : outB(win(t, mosaicoAt, mosaicoAt + 0.8));

  let idx = 0;
  for (let i = 0; i < CENAS.length; i++) if (t >= CENAS[i].at) idx = i;
  const cena = CENAS[idx];

  return (
    <AbsoluteFill style={{ background: '#0e1b33' }}>
      {/* fase 1: cortes de hora em hora, dentro do app */}
      {t < mosaicoAt && (
        <CameraRig t={t} kf={[
          [cena.at, 1.06, 10, -20],
          [cena.at + 1.0, 1.0, 0, 0],
          [cena.at + 2.4, 1.05, -10, -30],
        ]}>
          <MobileShell ferramenta={cena.ferramenta} voltar hora={cena.hora}>
            <div style={{ padding: '30px 40px' }}>
              {/* carimbo da hora */}
              <div style={{
                display: 'inline-block', background: M_NAVY, color: WHITE, fontFamily: MONO,
                fontWeight: 700, fontSize: 42, borderRadius: 16, padding: '14px 30px',
                marginBottom: 24, transform: `scale(${1.3 - 0.3 * outB(win(t, cena.at, cena.at + 0.25))}) rotate(-2deg)`,
                boxShadow: '0 16px 44px rgba(14,27,51,0.35)',
              }}>
                {cena.hora}
              </div>
              {cena.el(t, cena.at)}
            </div>
            {/* linha do dia: onde estamos no turno */}
            <div style={{
              position: 'absolute', left: 40, right: 40, bottom: 70,
              background: WHITE, borderRadius: 20, padding: '22px 28px',
              border: '1.5px solid rgba(14,27,51,0.08)', boxShadow: '0 12px 32px rgba(14,27,51,0.08)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {CENAS.map((c, i) => {
                  const ativa = c.hora === cena.hora;
                  return (
                    <div key={c.hora} style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{
                        width: ativa ? 26 : 16, height: ativa ? 26 : 16, borderRadius: 13,
                        background: i <= idx ? M_BLUE : 'rgba(14,27,51,0.15)',
                        margin: '0 auto 8px',
                        boxShadow: ativa ? '0 0 0 8px rgba(21,96,232,0.18)' : 'none',
                      }} />
                      <span style={{
                        fontFamily: MONO, fontSize: ativa ? 24 : 19,
                        color: ativa ? M_NAVY : 'rgba(14,27,51,0.4)', fontWeight: 700,
                      }}>{c.hora}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </MobileShell>
          <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, cena.at) * 0.55, pointerEvents: 'none' }} />
        </CameraRig>
      )}

      {/* fase 2: mosaico das seis telas */}
      {t >= mosaicoAt && (
        <AbsoluteFill style={{ background: M_BG }}>
          <div style={{
            position: 'absolute', top: 130, left: 0, right: 0, textAlign: 'center',
            fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: M_NAVY,
            opacity: pMos, lineHeight: 1.25,
          }}>
            uma plataforma.<br /><span style={{ color: M_BLUE }}>17 ferramentas.</span>
          </div>
          <div style={{
            position: 'absolute', left: 70, right: 70, top: 380,
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20,
          }}>
            {CENAS.map((c, i) => {
              const p = outB(win(t, mosaicoAt + i * 0.1, mosaicoAt + i * 0.1 + 0.45));
              return (
                <div key={i} style={{
                  background: WHITE, borderRadius: 18, border: '1.5px solid rgba(14,27,51,0.08)',
                  boxShadow: '0 14px 36px rgba(14,27,51,0.1)', padding: '20px 20px',
                  opacity: p, transform: `scale(${0.8 + 0.2 * p}) translateY(${(1 - p) * 30}px)`,
                }}>
                  <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: M_BLUE }}>{c.hora}</div>
                  <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 22, color: M_NAVY, marginTop: 8, lineHeight: 1.25 }}>
                    {c.ferramenta}
                  </div>
                  <div style={{ marginTop: 10, height: 8, borderRadius: 4, background: AZUL_SOFT }}>
                    <div style={{ width: `${70 + i * 5}%`, height: '100%', borderRadius: 4, background: M_BLUE }} />
                  </div>
                </div>
              );
            })}
          </div>
          {t >= consAt && (
            <div style={{ position: 'absolute', left: 60, top: 900 }}>
              <ConsensoFlux t={t} at={consAt} consAt={consAt + 1.0} largura={960} />
            </div>
          )}
          {t >= claimAt && (
            <div style={{
              position: 'absolute', bottom: 260, left: 70, right: 70, textAlign: 'center',
              fontFamily: HEAD, fontWeight: 900, fontSize: 46, color: M_NAVY, lineHeight: 1.3,
              ...surge(t, claimAt),
            }}>
              o plantão muda quando<br />a decisão <span style={{ color: M_BLUE }}>tem apoio.</span>
            </div>
          )}
          <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, mosaicoAt) * 0.7, pointerEvents: 'none' }} />
        </AbsoluteFill>
      )}

      <FimClaro t={t} at={fimAt}
        frase="17 ferramentas, o turno inteiro"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md25.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
