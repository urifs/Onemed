import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, OffthreadVideo } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, HEAD, BODY, MONO } from './theme';
import { FPS, ClipAt } from './story';
import { EndCard } from './common';
import { Grain, Vignette, win, easeOutExpo, shakeAt } from './cine';
import timing from './timings/c55.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C55_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  plano: DELAY + 0.1,
  alvo: DELAY + 4.0,
  equipe: DELAY + 9.4,
  bisturi: DELAY + 10.4, crupie: DELAY + 16.3, banca: DELAY + 22.6, olheiro: DELAY + 28.5,
  aviso: DELAY + 34.5,
  golpe: DELAY + 38.4,
  tudo: DELAY + 41.3,
  entra: DELAY + 46.0,
  end: DELAY + T.duration - 3.2,
};

type Agente = { at: number; until: number; nome: string; codinome: string; funcao: string; src: string; from: number };
const EQUIPE: Agente[] = [
  { at: B.bisturi, until: B.crupie, nome: 'O RESUMO', codinome: 'BISTURI', funcao: 'entra numa aula longa, sai só com o essencial', src: 'rec/m_pdf.mp4', from: 210 },
  { at: B.crupie, until: B.banca, nome: 'O BARALHO', codinome: 'CRUPIÊ', funcao: 'seu material vira flashcards antes de você pedir', src: 'rec/oa_flash_gen.mp4', from: 220 },
  { at: B.banca, until: B.olheiro, nome: 'AS QUESTÕES', codinome: 'A BANCA', funcao: 'cada resposta vem comentada, sem mistério', src: 'rec/oa_questions.mp4', from: 450 },
  { at: B.olheiro, until: B.aviso, nome: 'O ASSISTENTE', codinome: 'OLHEIRO', funcao: 'lê a tela aberta e responde na hora', src: 'rec/oa_assistant.mp4', from: 300 },
];

/* blueprint bg */
const Blueprint: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: '#0a1020' }}>
    <div style={{ position: 'absolute', inset: 0, opacity: 0.5, backgroundImage: 'linear-gradient(rgba(90,130,255,0.10) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(90,130,255,0.10) 1.5px, transparent 1.5px)', backgroundSize: '72px 72px' }} />
    <div style={{ position: 'absolute', inset: 0, opacity: 0.35, backgroundImage: 'linear-gradient(rgba(90,130,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(90,130,255,0.08) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
    <div style={{ position: 'absolute', width: 1000, height: 1000, borderRadius: 999, top: -300, right: -300, background: 'radial-gradient(circle, rgba(239,68,68,0.14), transparent 62%)' }} />
  </div>
);

export const C55_Plano: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', transform: shakeAt(t, B.entra, 7) || undefined }}>
      <Blueprint />

      {/* hook + alvo */}
      <div style={{ position: 'absolute', inset: 0, opacity: t < B.bisturi ? 1 - win(t, B.bisturi - 0.35, B.bisturi) : 0 }}>
        <div style={{ position: 'absolute', left: 70, right: 70, top: 420 }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, color: '#7d9bff', letterSpacing: 6 }}>OPERAÇÃO · CONFIDENCIAL</div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 96, color: WHITE, letterSpacing: -3, marginTop: 20, lineHeight: 1.05 }}>
            o plano é<br />o seguinte.
          </div>
          <div style={{ marginTop: 60, opacity: win(t, B.alvo, B.alvo + 0.4) }}>
            <div style={{ display: 'inline-block', border: `3px solid ${RED}`, borderRadius: 16, padding: '22px 32px', transform: 'rotate(-2deg)', background: 'rgba(239,68,68,0.08)' }}>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: RED, letterSpacing: 3 }}>O ALVO</div>
              <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 42, color: WHITE, marginTop: 8 }}>seu tempo de estudo<br />desperdiçado há anos</div>
            </div>
          </div>
        </div>
        {/* mira */}
        <svg style={{ position: 'absolute', right: 90, top: 1150, opacity: win(t, B.alvo + 0.5, B.alvo + 0.9) }} width={260} height={260} viewBox="0 0 260 260">
          <circle cx={130} cy={130} r={110} stroke={RED} strokeWidth={4} fill="none" opacity={0.8} />
          <circle cx={130} cy={130} r={64} stroke={RED} strokeWidth={3} fill="none" opacity={0.6} />
          <line x1={130} y1={0} x2={130} y2={260} stroke={RED} strokeWidth={3} opacity={0.5} />
          <line x1={0} y1={130} x2={260} y2={130} stroke={RED} strokeWidth={3} opacity={0.5} />
        </svg>
      </div>

      {/* fichas da equipe */}
      {EQUIPE.map((a, i) => {
        const p = easeOutExpo(win(t, a.at, a.at + 0.55));
        const o = Math.min(win(t, a.at, a.at + 0.3), 1 - win(t, a.until - 0.25, a.until));
        if (o <= 0) return null;
        return (
          <div key={i} style={{
            position: 'absolute', left: 80, right: 80, top: 280, opacity: o,
            transform: `translateY(${(1 - p) * 150}px) rotate(${(1 - p) * (i % 2 ? 3 : -3)}deg)`,
            background: '#0e1526', border: '2px solid rgba(125,155,255,0.3)', borderRadius: 22,
            boxShadow: '0 50px 120px -28px rgba(0,0,0,0.85)', padding: 34,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 23, color: '#7d9bff', letterSpacing: 3 }}>RECRUTA {i + 1}/4 · {a.nome}</div>
                <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 54, color: WHITE, letterSpacing: -1, marginTop: 6 }}>
                  codinome <span style={{ color: RED }}>{a.codinome}</span>
                </div>
              </div>
              <div style={{ width: 74, height: 74, borderRadius: 999, border: `3px dashed ${RED}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: 30, color: RED, transform: 'rotate(8deg)' }}>{i + 1}</div>
            </div>
            <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 27, color: 'rgba(255,255,255,0.75)', margin: '16px 0 20px' }}>{a.funcao}</div>
            <div style={{ width: '100%', height: 700, borderRadius: 16, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.12)' }}>
              <ClipAt fromSec={a.at - 0.3}>
                <OffthreadVideo src={staticFile(a.src)} muted startFrom={a.from} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              </ClipAt>
            </div>
          </div>
        );
      })}

      {/* aviso + fecho */}
      <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.aviso, B.aviso + 0.3), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
        {t >= B.aviso && (
          <div style={{ position: 'absolute', left: 90, right: 90, top: 480 }}>
            <div style={{ background: 'rgba(239,68,68,0.1)', border: `3px solid ${RED}`, borderRadius: 20, padding: '30px 36px', transform: 'rotate(-1.5deg)' }}>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: RED, letterSpacing: 3 }}>AVISO DA OPERAÇÃO</div>
              <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 44, color: WHITE, marginTop: 12, lineHeight: 1.25 }}>
                ninguém aqui promete aprovação.<br />
                <span style={{ color: RED, opacity: win(t, B.golpe, B.golpe + 0.4) }}>o golpe é estudar melhor, em menos tempo.</span>
              </div>
            </div>
            <div style={{ marginTop: 54, textAlign: 'center', opacity: win(t, B.tudo, B.tudo + 0.4) }}>
              <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 28, color: 'rgba(255,255,255,0.75)' }}>tudo junto, numa plataforma só — atualizações sem custo</span>
            </div>
            <div style={{ marginTop: 46, textAlign: 'center', opacity: win(t, B.entra, B.entra + 0.35) }}>
              <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: WHITE, letterSpacing: -2 }}>
                você entra… <span style={{ color: RED }}>ou não entra?</span>
              </span>
            </div>
          </div>
        )}
      </div>

      <Vignette strength={0.5} />
      <Grain opacity={0.07} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={RED} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c55.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
