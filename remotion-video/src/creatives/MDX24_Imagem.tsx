import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md24.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, M_NAVY, M_MUT, WHITE, M_BG } from './meduf';
import {
  LaptopShell, TelaApp, PhoneShell, Cursor, CameraRig, Cartao, Linha, Refs,
  FimClaro, surge, win, outB, flashAt, AZUL_SOFT,
} from './medufui';

/* ============================================================
   MDX24 — IMAGEM EM TELA CHEIA (Análise de Radiografias)
   O visualizador ocupa o notebook inteiro; a IA aponta, mede
   e marca SOBRE a imagem; a câmera mergulha no achado quando
   a narração diz "amplia onde importa"; abas RX·TC·RM·US.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MDX24_DURATION = Math.round((DELAY + T.duration + 2.6) * FPS);

const NOTA = '#6ea8ff';
const OSSO = 'rgba(190,215,240,0.5)';
const CAMPO = 'rgba(120,160,205,0.16)';

export const MDX24_Imagem: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const apontaAt = DELAY + 5.3;
  const medeAt = DELAY + 6.1;
  const marcaAt = DELAY + 6.75;
  const zoomAt = DELAY + 9.1;      /* "amplia onde importa" */
  const achAt = DELAY + 11.35;
  const abasAt = DELAY + 15.4;     /* TC / RM / US */
  const bolsoAt = DELAY + 18.9;    /* o celular entra */
  const fimAt = DELAY + 22.5;

  const desenha = (at: number, len: number) => len * (1 - outB(win(t, at, at + 0.6)));
  const aba = t < DELAY + 15.4 ? 0 : t < DELAY + 16.35 ? 1 : t < DELAY + 17.3 ? 2 : 3;
  const abaNomes = ['Radiografia', 'Tomografia', 'Ressonância', 'Ultrassom'];
  const pBolso = t < bolsoAt ? 0 : outB(win(t, bolsoAt, bolsoAt + 0.7));

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0d1522, #101c2e)' }}>
      <CameraRig t={t} kf={[
        [0, 1.0, 0, 0],
        [zoomAt, 1.0, 0, 0],
        [zoomAt + 0.7, 1.4, 73, 264],
        [achAt + 0.6, 1.4, 73, 264],
        [achAt + 1.3, 1.0, 0, 0],
        [fimAt, 1.0, 0, 0],
      ]}>
        <div style={{
          position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center',
          fontFamily: HEAD, fontWeight: 800, fontSize: 44, color: WHITE, ...surge(t, DELAY + 0.1),
        }}>
          coloca a imagem <span style={{ color: NOTA }}>na tela.</span>
        </div>

        <div style={{ position: 'absolute', left: -240, right: -240, top: 300 }}>
          <div style={{ margin: '0 auto', width: 1520 }}>
            <LaptopShell width={1520}>
              <TelaApp ferramenta={`Análise de ${abaNomes[aba]}s`.replace('Radiografias', 'Radiografias')}
                extra={
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['RX', 'TC', 'RM', 'US'].map((s, i) => (
                      <span key={s} style={{
                        fontFamily: HEAD, fontWeight: 800, fontSize: 22,
                        color: aba === i ? WHITE : M_MUT,
                        background: aba === i ? M_BLUE : 'rgba(14,27,51,0.06)',
                        borderRadius: 10, padding: '8px 18px',
                      }}>{s}</span>
                    ))}
                  </div>
                }>
                <div style={{ display: 'flex', gap: 26 }}>
                  {/* visualizador escuro dentro do app claro */}
                  <div style={{
                    width: 900, height: 620, background: '#0b1420', borderRadius: 16,
                    position: 'relative', overflow: 'hidden', border: '2px solid #1c2c40',
                  }}>
                    {aba === 0 ? (
                      <svg viewBox="0 0 900 620" style={{ width: '100%', height: '100%' }}>
                        <path d="M180,140 Q155,340 220,470 Q300,510 380,470 L388,160 Q300,110 180,140" fill={CAMPO} stroke={OSSO} strokeWidth={3} />
                        <path d="M720,140 Q745,340 680,470 Q600,510 520,470 L512,160 Q600,110 720,140" fill={CAMPO} stroke={OSSO} strokeWidth={3} />
                        {[0, 1, 2, 3, 4].map(i => (
                          <g key={i} stroke={OSSO} strokeWidth={4} fill="none" opacity={0.5}>
                            <path d={`M165,${170 + i * 62} Q290,${140 + i * 62} 395,${182 + i * 62}`} />
                            <path d={`M735,${170 + i * 62} Q610,${140 + i * 62} 505,${182 + i * 62}`} />
                          </g>
                        ))}
                        <ellipse cx="452" cy="370" rx="120" ry="140" fill="rgba(160,190,225,0.28)" />
                        <path d="M170,480 Q300,440 420,485" stroke={OSSO} strokeWidth={5} fill="none" />
                        <path d="M730,480 Q600,435 480,485" stroke={OSSO} strokeWidth={5} fill="none" />

                        {/* IA aponta: mira */}
                        {t >= apontaAt && (
                          <g stroke={NOTA} strokeWidth={4} opacity={outB(win(t, apontaAt, apontaAt + 0.35))}>
                            <circle cx={640} cy={250} r={10} fill={NOTA} />
                            <line x1={640} y1={200} x2={640} y2={230} />
                            <line x1={640} y1={270} x2={640} y2={300} />
                            <line x1={590} y1={250} x2={620} y2={250} />
                            <line x1={660} y1={250} x2={690} y2={250} />
                          </g>
                        )}
                        {/* mede: régua */}
                        {t >= medeAt && (
                          <g stroke={NOTA} strokeWidth={4}>
                            <line x1={332} y1={370} x2={572} y2={370} strokeDasharray={240} strokeDashoffset={desenha(medeAt, 240)} />
                            <line x1={332} y1={355} x2={332} y2={385} />
                            <line x1={572} y1={355} x2={572} y2={385} />
                          </g>
                        )}
                        {/* marca: círculo do achado */}
                        {t >= marcaAt && (
                          <circle cx={640} cy={250} r={72} fill="none" stroke={NOTA} strokeWidth={5}
                            strokeDasharray={452} strokeDashoffset={desenha(marcaAt, 452)} />
                        )}
                      </svg>
                    ) : (
                      /* TC/RM/US: cortes esquemáticos */
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {aba === 3 ? (
                          <svg viewBox="0 0 900 620" style={{ width: '100%', height: '100%' }}>
                            <path d="M450,80 L200,540 A320,300 0 0 0 700,540 Z" fill="rgba(140,175,215,0.14)" />
                            {[0, 1, 2, 3].map(i => (
                              <path key={i} d={`M450,80 L${290 + i * 20},540`} stroke="rgba(190,215,240,0.25)" strokeWidth={2} fill="none" />
                            ))}
                            <ellipse cx="450" cy="400" rx="120" ry="70" fill="rgba(190,215,240,0.3)" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 900 620" style={{ width: '100%', height: '100%' }}>
                            <ellipse cx="450" cy="310" rx="260" ry="210" fill="rgba(140,175,215,0.16)" stroke={OSSO} strokeWidth={4} />
                            <ellipse cx="450" cy="310" rx="190" ry="150" fill="rgba(160,190,225,0.14)" />
                            <ellipse cx="380" cy="290" rx="55" ry="70" fill="rgba(11,20,32,0.7)" />
                            <ellipse cx="520" cy="290" rx="55" ry="70" fill="rgba(11,20,32,0.7)" />
                            {aba === 2 && <ellipse cx="450" cy="380" rx="90" ry="46" fill="rgba(190,215,240,0.35)" />}
                          </svg>
                        )}
                      </div>
                    )}
                    <div style={{
                      position: 'absolute', left: 16, top: 12, fontFamily: MONO, fontSize: 20,
                      color: 'rgba(190,215,240,0.6)',
                    }}>
                      {abaNomes[aba].toUpperCase()} · ilustração esquemática
                    </div>
                  </div>

                  {/* achados ao lado */}
                  <div style={{ width: 480 }}>
                    {t >= achAt && (
                      <Cartao style={{ padding: '22px 26px', ...surge(t, achAt) }}>
                        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 25, color: M_NAVY, marginBottom: 12 }}>
                          cada achado, explicado
                        </div>
                        <Linha t={t} at={achAt + 0.2} cor={M_BLUE}>opacidade em terço superior direito</Linha>
                        <Linha t={t} at={achAt + 0.9} cor={M_BLUE}>índice cardiotorácico preservado</Linha>
                        <Linha t={t} at={achAt + 1.6} cor={M_BLUE}>seios costofrênicos livres</Linha>
                        <div style={{ marginTop: 10 }}>
                          <Refs t={t} at={achAt + 2.2} itens={['correlação clínica sugerida']} />
                        </div>
                      </Cartao>
                    )}
                  </div>
                </div>
                <Cursor t={t}
                  path={[[DELAY + 2.4, 500, 300], [apontaAt, 640, 300], [marcaAt + 0.5, 700, 330], [abasAt, 1250, 60], [DELAY + 17.5, 1400, 60]]}
                  clicks={[abasAt + 0.05, DELAY + 16.35, DELAY + 17.3]} />
              </TelaApp>
            </LaptopShell>
          </div>
        </div>
      </CameraRig>

      {/* o celular entra: "cabe no bolso" */}
      {t >= bolsoAt && (
        <div style={{
          position: 'absolute', right: 60, bottom: 120,
          transform: `translateY(${(1 - pBolso) * 600}px) rotate(-4deg)`, opacity: pBolso,
        }}>
          <PhoneShell width={360}>
            <div style={{ position: 'absolute', inset: 0, background: '#0b1420', padding: 12 }}>
              <div style={{ fontFamily: MONO, fontSize: 13, color: 'rgba(190,215,240,0.6)', marginBottom: 8 }}>
                ANÁLISE · RX
              </div>
              <svg viewBox="0 0 900 620" style={{ width: '100%' }}>
                <path d="M180,140 Q155,340 220,470 Q300,510 380,470 L388,160 Q300,110 180,140" fill={CAMPO} stroke={OSSO} strokeWidth={3} />
                <path d="M720,140 Q745,340 680,470 Q600,510 520,470 L512,160 Q600,110 720,140" fill={CAMPO} stroke={OSSO} strokeWidth={3} />
                <circle cx={640} cy={250} r={72} fill="none" stroke={NOTA} strokeWidth={6} />
              </svg>
              <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 17, color: WHITE, marginTop: 8 }}>
                a segunda leitura no bolso
              </div>
            </div>
          </PhoneShell>
        </div>
      )}

      <AbsoluteFill style={{ background: WHITE, opacity: flashAt(t, abasAt) * 0.4, pointerEvents: 'none' }} />

      <FimClaro t={t} at={fimAt}
        frase="RX · TC · RM · US — a segunda leitura, sempre por perto"
        sub="teste grátis por 30 minutos" />

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md24.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
