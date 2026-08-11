import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, OffthreadVideo } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, HEAD, BODY, MONO } from './theme';
import { FPS, ClipAt } from './story';
import { EndCard } from './common';
import { Grain, Vignette, Letterbox, FlashCut, win, easeOutExpo, beatIndex } from './cine';
import timing from './timings/c62.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C62_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  confissao: DELAY + 0.1,
  mapa: DELAY + 3.1, pilha: DELAY + 4.4, tabuleiro: DELAY + 5.9, curva: DELAY + 6.9, speedrun: DELAY + 8.3,
  mesma: DELAY + 9.9,
  quarenta: DELAY + 14.1,
  frase: DELAY + 17.9,
  aula: DELAY + 20.4, quest: DELAY + 21.3, flash: DELAY + 22.6, crono: DELAY + 24.6, comuni: DELAY + 26.3,
  metaforas: DELAY + 30.7,
  abrir: DELAY + 34.8,
  fim: DELAY + 35.6,
  end: DELAY + T.duration - 3.2,
};

/* vinhetas-relâmpago das séries anteriores (miniaturas 2D) */
const Vinheta: React.FC<{ t: number; at: number; until: number; children: React.ReactNode; label: string }> =
({ t, at, until, children, label }) => {
  const o = Math.min(win(t, at, at + 0.18), 1 - win(t, until - 0.15, until));
  if (o <= 0) return null;
  const p = easeOutExpo(win(t, at, at + 0.4));
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <div style={{ position: 'absolute', left: '50%', top: '46%', transform: `translate(-50%,-50%) scale(${0.85 + p * 0.15}) rotate(${(1 - p) * 3}deg)` }}>
        {children}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 430, textAlign: 'center' }}>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: 'rgba(255,255,255,0.6)', letterSpacing: 3 }}>{label}</span>
      </div>
    </div>
  );
};

const MiniMapa: React.FC = () => (
  <svg width={700} height={560} viewBox="0 0 700 560">
    <line x1={350} y1={120} x2={160} y2={300} stroke="rgba(255,255,255,0.35)" strokeWidth={5} />
    <line x1={350} y1={120} x2={350} y2={300} stroke="rgba(255,255,255,0.35)" strokeWidth={5} />
    <line x1={350} y1={120} x2={540} y2={300} stroke="rgba(255,255,255,0.35)" strokeWidth={5} />
    <rect x={240} y={60} width={220} height={80} rx={20} fill={RED} />
    {[160, 350, 540].map((x, i) => <rect key={i} x={x - 90} y={280} width={180} height={70} rx={16} fill="#1a1e2b" stroke="rgba(255,255,255,0.3)" strokeWidth={3} />)}
  </svg>
);
const MiniPilha: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: 5 }}>
    {[...Array(9)].map((_, i) => (
      <div key={i} style={{ width: 300 + (i * 67) % 90 - 45, height: 34, borderRadius: 6, background: ['#e05252', '#e08a3c', '#4b9de0', '#43b586', '#8a6fd6'][i % 5] }} />
    ))}
  </div>
);
const MiniTabuleiro: React.FC = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 130px)', gap: 12 }}>
    {[...Array(12)].map((_, i) => (
      <div key={i} style={{ height: 100, borderRadius: 14, background: i === 11 ? RED : '#1a1e2b', border: '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: 20, color: WHITE }}>
        {i === 11 ? 'PROVA' : i + 1}
      </div>
    ))}
  </div>
);
const MiniCurva: React.FC = () => (
  <svg width={700} height={420} viewBox="0 0 700 420">
    <polyline points="40,60 180,240 240,180 380,300 450,230 600,340" fill="none" stroke={RED} strokeWidth={8} strokeLinecap="round" />
    {[180, 240].map((x, i) => <circle key={i} cx={i === 0 ? 240 : 450} cy={i === 0 ? 180 : 230} r={12} fill={WHITE} />)}
  </svg>
);
const MiniSpeed: React.FC = () => (
  <div style={{ background: '#101216', border: `3px solid ${RED}`, borderRadius: 26, padding: '30px 60px', fontFamily: MONO, fontWeight: 700, fontSize: 90, color: WHITE }}>
    0:42<span style={{ color: RED }}>.10</span>
  </div>
);

const TAKES: Array<{ at: number; until: number; src: string; from: number; label: string }> = [
  { at: B.aula, until: B.quest, src: 'rec/m_player.mp4', from: 140, label: 'aula' },
  { at: B.quest, until: B.flash, src: 'rec/oa_questions.mp4', from: 450, label: 'questão comentada' },
  { at: B.flash, until: B.crono, src: 'rec/oa_flash_gen.mp4', from: 220, label: 'flashcards do seu material' },
  { at: B.crono, until: B.comuni, src: 'rec/ol_plano.mp4', from: 300, label: 'cronograma + mapa mental' },
  { at: B.comuni, until: B.metaforas, src: 'rec/m_community.mp4', from: 100, label: '+10.000 estudando junto' },
];

export const C62_Finale: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#07080c' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 110% 76% at 50% 30%, #0f1119 0%, #07080c 72%)' }} />

      {/* confissão */}
      <div style={{ position: 'absolute', left: 70, right: 70, top: 760, textAlign: 'center', opacity: t < B.mapa ? 1 - win(t, B.mapa - 0.3, B.mapa) : 0 }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: RED, letterSpacing: 6 }}>CONFISSÃO</div>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: WHITE, letterSpacing: -2, marginTop: 18 }}>
          a gente precisa<br />te contar uma coisa.
        </div>
      </div>

      {/* montagem-relâmpago das metáforas */}
      <Vinheta t={t} at={B.mapa} until={B.pilha} label="O MAPA"><MiniMapa /></Vinheta>
      <Vinheta t={t} at={B.pilha} until={B.tabuleiro} label="A PILHA"><MiniPilha /></Vinheta>
      <Vinheta t={t} at={B.tabuleiro} until={B.curva} label="O TABULEIRO"><MiniTabuleiro /></Vinheta>
      <Vinheta t={t} at={B.curva} until={B.speedrun} label="A CURVA"><MiniCurva /></Vinheta>
      <Vinheta t={t} at={B.speedrun} until={B.mesma} label="O SPEEDRUN"><MiniSpeed /></Vinheta>
      {[B.mapa, B.pilha, B.tabuleiro, B.curva, B.speedrun, B.mesma].map((b, i) => (
        <FlashCut key={i} t={t} atSec={b} color="rgba(255,255,255,0.3)" />
      ))}

      {/* a mesma frase */}
      <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.mesma, B.mesma + 0.3), 1 - win(t, B.frase + 1.8, B.frase + 2.3)) }}>
        <div style={{ position: 'absolute', left: 80, right: 80, top: 700, textAlign: 'center' }}>
          <div style={{ fontFamily: BODY, fontSize: 30, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
            tudo isso era a gente tentando dizer<br />a mesma frase de jeitos diferentes.
          </div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 26, color: 'rgba(255,255,255,0.4)', marginTop: 30, letterSpacing: 3, opacity: win(t, B.quarenta, B.quarenta + 0.4) }}>
            40+ VÍDEOS DEPOIS…
          </div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 58, color: WHITE, letterSpacing: -1.5, marginTop: 34, lineHeight: 1.3, opacity: win(t, B.frase, B.frase + 0.5) }}>
            estuda melhor quem tem<br /><span style={{ color: RED }}>tudo num lugar só.</span>
          </div>
        </div>
      </div>

      {/* provas em takes rápidos */}
      {TAKES.map((tk, i) => {
        const o = Math.min(win(t, tk.at, tk.at + 0.2), 1 - win(t, tk.until - 0.15, tk.until));
        if (o <= 0) return null;
        return (
          <div key={i} style={{ position: 'absolute', inset: 0, opacity: o }}>
            <div style={{ position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%,-50%)', width: 620, height: 1150, borderRadius: 32, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.14)', boxShadow: '0 60px 130px -30px rgba(0,0,0,0.9)' }}>
              <ClipAt fromSec={tk.at - 0.3}>
                <OffthreadVideo src={staticFile(tk.src)} muted startFrom={tk.from} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              </ClipAt>
            </div>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 330, textAlign: 'center' }}>
              <span style={{ background: 'rgba(0,0,0,0.65)', borderRadius: 999, padding: '10px 26px', fontFamily: HEAD, fontWeight: 800, fontSize: 27, color: WHITE }}>{tk.label}</span>
            </div>
          </div>
        );
      })}

      {/* fecho da série */}
      <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.metaforas, B.metaforas + 0.4), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
        <div style={{ position: 'absolute', left: 80, right: 80, top: 740, textAlign: 'center' }}>
          <div style={{ fontFamily: BODY, fontSize: 31, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
            a gente pode inventar mais quarenta metáforas…
          </div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 60, color: WHITE, letterSpacing: -1.5, marginTop: 26, opacity: win(t, B.abrir - 0.6, B.abrir) }}>
            ou você pode<br /><span style={{ color: RED }}>abrir e ver.</span>
          </div>
          <div style={{ marginTop: 56, opacity: win(t, B.fim, B.fim + 0.5) }}>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, color: 'rgba(255,255,255,0.55)', letterSpacing: 4 }}>
              FIM DA SÉRIE · COMEÇO DO SEU
            </span>
          </div>
        </div>
      </div>

      <Letterbox t={t} inAt={0.1} outAt={B.end - 0.4} size={130} />
      <Vignette strength={0.55} />
      <Grain opacity={0.08} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={50} highlight={RED} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c62.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
