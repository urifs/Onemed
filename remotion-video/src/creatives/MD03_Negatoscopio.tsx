import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import timing from './timings/md03.json';
import { HEAD, MONO } from './theme';
import { M_BLUE, WHITE } from './meduf';

/* ============================================================
   MD03 — NEGATOSCÓPIO (MEDUF)
   Estilo: sala escura, negatoscópio acende com uma radiografia
   esquemática de tórax; a MEDUF anota o filme como um preceptor.
   ============================================================ */

type Timing = { duration: number; words: { w: string; t: number; end: number }[] };
const T = timing as Timing;
const FPS = 30;
const DELAY = 0.7;
export const MD03_DURATION = Math.round((DELAY + T.duration + 2.8) * FPS);

const SALA = '#030507';
const FILME = '#0d1622';
const OSSO = 'rgba(190,215,240,0.5)';
const CAMPO = 'rgba(120,160,205,0.16)';
const NOTA = '#6ea8ff';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const outB = (p: number) => 1 - Math.pow(1 - p, 3);

const LIGA = [0, 1, 0, 1, 1, 0, 1, 1, 1];

export const MD03_Negatoscopio: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  const acendeAt = DELAY + 0.6;
  const lit = t < acendeAt ? 0 : (t < acendeAt + 0.45 ? (LIGA[frame % LIGA.length] ? 1 : 0.2) : 1);

  const ictAt = DELAY + 5.45;
  const seiosAt = DELAY + 7.0;
  const atencaoAt = DELAY + 8.6;
  const compAt = DELAY + 10.9;
  const chipsAt = DELAY + 16.55;
  const fimAt = DELAY + 21.9;
  const pFim = t < fimAt ? 0 : outB(win(t, fimAt, fimAt + 0.7));

  /* traço que se desenha */
  const desenha = (at: number, len: number) => len * (1 - outB(win(t, at, at + 0.6)));

  const verbo = (at: number, s: string) => t >= at && (
    <span style={{
      fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: WHITE,
      opacity: outB(win(t, at, at + 0.3)),
    }}>{s}</span>
  );

  return (
    <AbsoluteFill style={{ background: SALA }}>
      {/* negatoscópio */}
      <div style={{
        position: 'absolute', left: 70, right: 70, top: 140, height: 1180,
        background: `linear-gradient(160deg, ${FILME}, #101d2e)`,
        borderRadius: 18, border: '3px solid #1b2a3d',
        boxShadow: lit ? `0 0 ${90 * lit}px rgba(140,180,230,${0.25 * lit})` : 'none',
        opacity: 0.35 + 0.65 * lit,
        overflow: 'hidden',
      }}>
        {/* radiografia esquemática de tórax */}
        <svg viewBox="0 0 940 1180" style={{ width: '100%', height: '100%', opacity: lit }}>
          {/* campos pulmonares */}
          <path d="M170,300 Q140,620 220,860 Q320,920 420,860 L430,340 Q330,250 170,300"
            fill={CAMPO} stroke={OSSO} strokeWidth={3} />
          <path d="M770,300 Q800,620 720,860 Q620,920 520,860 L510,340 Q610,250 770,300"
            fill={CAMPO} stroke={OSSO} strokeWidth={3} />
          {/* costelas */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <g key={i} stroke={OSSO} strokeWidth={5} fill="none" opacity={0.55}>
              <path d={`M150,${330 + i * 92} Q300,${290 + i * 92} 435,${350 + i * 92}`} />
              <path d={`M790,${330 + i * 92} Q640,${290 + i * 92} 505,${350 + i * 92}`} />
            </g>
          ))}
          {/* clavículas */}
          <path d="M180,265 Q330,225 450,275" stroke={OSSO} strokeWidth={8} fill="none" />
          <path d="M760,265 Q610,225 490,275" stroke={OSSO} strokeWidth={8} fill="none" />
          {/* coração */}
          <ellipse cx="500" cy="700" rx="165" ry="190" fill="rgba(160,190,225,0.28)" />
          {/* diafragma */}
          <path d="M160,880 Q320,830 460,890" stroke={OSSO} strokeWidth={6} fill="none" />
          <path d="M780,880 Q620,820 500,890" stroke={OSSO} strokeWidth={6} fill="none" />

          {/* ICT: linhas de medida */}
          {t >= ictAt && (
            <g stroke={NOTA} strokeWidth={5}>
              <line x1={335} y1={700} x2={665} y2={700} strokeDasharray={330} strokeDashoffset={desenha(ictAt, 330)} />
              <line x1={335} y1={680} x2={335} y2={720} />
              <line x1={665} y1={680} x2={665} y2={720} />
              <line x1={150} y1={980} x2={790} y2={980} strokeDasharray={640} strokeDashoffset={desenha(ictAt + 0.3, 640)} opacity={0.7} />
            </g>
          )}
          {/* seios costofrênicos: setas */}
          {t >= seiosAt && (
            <g stroke={NOTA} strokeWidth={5} fill="none" opacity={outB(win(t, seiosAt, seiosAt + 0.4))}>
              <path d="M235,1010 L200,930 M200,930 l-6,26 M200,930 l24,10" />
              <path d="M705,1010 L740,930 M740,930 l6,26 M740,930 l-24,10" />
            </g>
          )}
          {/* zona de atenção */}
          {t >= atencaoAt && (
            <circle cx={650} cy={480} r={95} fill="none" stroke={NOTA} strokeWidth={5}
              strokeDasharray={597} strokeDashoffset={desenha(atencaoAt, 597)} />
          )}
        </svg>

        {/* etiquetas das anotações */}
        {t >= ictAt && (
          <div style={{
            position: 'absolute', left: 60, top: 596, fontFamily: MONO, fontSize: 27, color: NOTA,
            opacity: outB(win(t, ictAt + 0.2, ictAt + 0.6)),
          }}>índice cardiotorácico</div>
        )}
        {t >= seiosAt && (
          <div style={{
            position: 'absolute', left: 60, bottom: 96, fontFamily: MONO, fontSize: 27, color: NOTA,
            opacity: outB(win(t, seiosAt + 0.2, seiosAt + 0.6)),
          }}>seios costofrênicos</div>
        )}
        {t >= atencaoAt && (
          <div style={{
            position: 'absolute', right: 60, top: 300, fontFamily: MONO, fontSize: 27, color: NOTA,
            opacity: outB(win(t, atencaoAt + 0.2, atencaoAt + 0.6)),
          }}>atenção aqui</div>
        )}
        <div style={{
          position: 'absolute', right: 24, bottom: 18, fontFamily: MONO, fontSize: 20,
          color: 'rgba(190,215,240,0.35)',
        }}>ilustração esquemática</div>
      </div>

      {/* selo MEDUF no canto do filme */}
      <div style={{
        position: 'absolute', top: 170, left: 100, display: 'flex', alignItems: 'center', gap: 14,
        opacity: lit,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: HEAD, fontWeight: 900, fontSize: 26, color: WHITE,
        }}>M</div>
        <span style={{ fontFamily: MONO, fontSize: 26, color: 'rgba(255,255,255,0.75)' }}>
          MEDUF · leitura assistida
        </span>
      </div>

      {/* legenda inferior */}
      <div style={{ position: 'absolute', left: 70, right: 70, bottom: 200 }}>
        {t >= compAt && t < chipsAt && (
          <div style={{
            fontFamily: HEAD, fontWeight: 800, fontSize: 52, color: WHITE, lineHeight: 1.3,
            opacity: outB(win(t, compAt, compAt + 0.5)),
          }}>
            você compara com o seu olho.<br />
            <span style={{ color: NOTA }}>discute. aprende.</span>
          </div>
        )}
        {t >= chipsAt && (
          <div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {['RADIOGRAFIA', 'ELETRO', 'LABORATÓRIO'].map((s, i) => t >= chipsAt + i * 0.85 && (
                <span key={s} style={{
                  fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: WHITE,
                  border: `3px solid ${M_BLUE}`, borderRadius: 14, padding: '14px 26px',
                  background: 'rgba(21,96,232,0.15)',
                  opacity: outB(win(t, chipsAt + i * 0.85, chipsAt + i * 0.85 + 0.3)),
                }}>{s}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 26, marginTop: 24 }}>
              {verbo(DELAY + 18.66, 'manda.')}
              {verbo(DELAY + 19.33, 'pergunta.')}
              {verbo(DELAY + 20.06, 'entende.')}
            </div>
          </div>
        )}
      </div>

      {/* encerramento */}
      <AbsoluteFill style={{
        background: SALA, opacity: pFim, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 30,
      }}>
        <div style={{
          width: 130, height: 130, borderRadius: 36,
          background: `linear-gradient(140deg, ${M_BLUE}, #0a3d99)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: HEAD, fontWeight: 900, fontSize: 66, color: WHITE,
          boxShadow: '0 24px 70px rgba(21,96,232,0.5)',
        }}>M</div>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 74, color: WHITE }}>
          meduf<span style={{ color: '#6ea8ff' }}>.com.br</span>
        </div>
        <div style={{ fontFamily: HEAD, fontSize: 34, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 1.5 }}>
          apoio ao seu raciocínio,<br />do internato ao plantão
        </div>
      </AbsoluteFill>

      <Sequence from={Math.round(DELAY * FPS)}>
        <Audio src={staticFile('narration/md03.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
