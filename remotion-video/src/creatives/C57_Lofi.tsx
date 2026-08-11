import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, OffthreadVideo } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, HEAD, BODY, MONO } from './theme';
import { FPS, ClipAt } from './story';
import { EndCard } from './common';
import { Grain, Vignette, CamDrift, win } from './cine';
import timing from './timings/c57.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C57_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  chove: DELAY + 0.1,
  sessao: DELAY + 5.9,
  resumo: DELAY + 7.5,
  timer: DELAY + 9.2,
  crono: DELAY + 11.6,
  duvida: DELAY + 14.9,
  assist: DELAY + 16.2,
  pausa: DELAY + 20.8,
  flash: DELAY + 23.3,
  quieto: DELAY + 27.3,
  comigo: DELAY + 34.2,
  end: DELAY + T.duration - 3.2,
};

/* chuva na janela */
const Chuva: React.FC<{ t: number }> = ({ t }) => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
    {[...Array(26)].map((_, i) => {
      const x = (i * 149) % 1080;
      const speed = 700 + (i * 97) % 500;
      const y = ((t * speed + i * 331) % 2100) - 120;
      const len = 60 + (i * 53) % 70;
      return (
        <div key={i} style={{
          position: 'absolute', left: x, top: y, width: 3, height: len, borderRadius: 3,
          background: 'linear-gradient(180deg, transparent, rgba(160,190,230,0.4))',
          transform: 'rotate(8deg)',
        }} />
      );
    })}
  </div>
);

/* pomodoro: conta em time-lapse */
const Pomodoro: React.FC<{ t: number }> = ({ t }) => {
  const o = Math.min(win(t, B.timer - 0.2, B.timer + 0.3), 1 - win(t, B.end - 0.3, B.end + 0.2));
  if (o <= 0) return null;
  const restante = Math.max(0, 25 * 60 - Math.floor(Math.max(0, t - B.timer) * 52)); // acelerado
  const mm = String(Math.floor(restante / 60)).padStart(2, '0');
  const ss = String(restante % 60).padStart(2, '0');
  const pausado = t > B.pausa && t < B.pausa + 2.0;
  return (
    <div style={{
      position: 'absolute', right: 60, top: 200, zIndex: 20, opacity: o,
      background: 'rgba(16,20,30,0.85)', border: `2px solid ${pausado ? '#e0a83c' : 'rgba(255,255,255,0.18)'}`,
      borderRadius: 22, padding: '18px 28px', backdropFilter: 'blur(4px)',
    }}>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 21, color: pausado ? '#e0a83c' : 'rgba(255,255,255,0.55)', letterSpacing: 3 }}>
        {pausado ? 'PAUSA · ALONGA' : 'SESSÃO'}
      </div>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 54, color: WHITE, marginTop: 4 }}>{mm}:{ss}</div>
    </div>
  );
};

const Tela: React.FC<{ t: number; at: number; until: number; src: string; from: number; rate?: number }> =
({ t, at, until, src, from, rate }) => {
  const o = Math.min(win(t, at, at + 0.55), 1 - win(t, until - 0.45, until));
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <CamDrift t={t} amp={5} zoom={0.02}>
        <div style={{
          position: 'absolute', left: '50%', top: 900, transform: 'translate(-50%,-50%)',
          width: 620, height: 1160, borderRadius: 34, overflow: 'hidden',
          border: '2px solid rgba(255,255,255,0.12)',
          boxShadow: '0 0 90px 8px rgba(120,150,220,0.18), 0 60px 130px -30px rgba(0,0,0,0.9)',
        }}>
          <ClipAt fromSec={at - 0.3}>
            <OffthreadVideo src={staticFile(src)} muted startFrom={from} playbackRate={rate} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          </ClipAt>
        </div>
      </CamDrift>
    </div>
  );
};

export const C57_Lofi: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#0b0e16' }}>
      {/* noite lo-fi: gradiente quente-frio + luminária */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(200deg, #101527 0%, #0b0e16 55%, #14101c 100%)' }} />
      <div style={{ position: 'absolute', width: 900, height: 900, borderRadius: 999, left: -260, bottom: -220, background: 'radial-gradient(circle, rgba(224,150,60,0.16), transparent 62%)' }} />
      <div style={{ position: 'absolute', width: 760, height: 760, borderRadius: 999, right: -220, top: -180, background: 'radial-gradient(circle, rgba(90,120,220,0.14), transparent 62%)' }} />
      <Chuva t={t} />

      {/* abertura */}
      <div style={{ position: 'absolute', inset: 0, opacity: t < B.resumo ? 1 - win(t, B.resumo - 0.5, B.resumo) : 0, zIndex: 8 }}>
        <div style={{ position: 'absolute', left: 80, right: 80, top: 700 }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 25, color: 'rgba(255,255,255,0.5)', letterSpacing: 5 }}>LO-FI SESSION · 22H</div>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 66, color: WHITE, letterSpacing: -1.5, marginTop: 22, lineHeight: 1.25 }}>
            chove lá fora.<br /><span style={{ color: '#e0a83c' }}>a gente fica.</span>
          </div>
          <div style={{ fontFamily: BODY, fontSize: 27, color: 'rgba(255,255,255,0.6)', marginTop: 22 }}>só eu, o chá e a tela acesa.</div>
        </div>
      </div>

      {/* xícara de chá 2D persistente */}
      <div style={{ position: 'absolute', left: 64, bottom: 300, zIndex: 18, opacity: Math.min(win(t, B.sessao, B.sessao + 0.6), 1 - win(t, B.end - 0.2, B.end + 0.3)) }}>
        <svg width={130} height={150} viewBox="0 0 130 150">
          {[0, 1].map(i => (
            <path key={i} d={`M ${52 + i * 26} 66 q ${8 * Math.sin(t * 1.6 + i * 2)} -20 0 -38`} stroke="rgba(220,230,245,0.4)" strokeWidth={6} fill="none" strokeLinecap="round" />
          ))}
          <path d="M30 76 h70 v36 a35 22 0 0 1 -70 0 z" fill="#1d2333" stroke="rgba(255,255,255,0.25)" strokeWidth={3} />
          <ellipse cx={65} cy={76} rx={35} ry={12} fill="#3d2f1e" stroke="rgba(255,255,255,0.25)" strokeWidth={3} />
          <path d="M101 84 q26 4 20 26 q -5 17 -24 13" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={6} />
        </svg>
      </div>

      <Tela t={t} at={B.resumo} until={B.crono} src="rec/m_pdf.mp4" from={170} rate={0.85} />
      <Tela t={t} at={B.crono} until={B.assist} src="rec/ol_plano.mp4" from={300} rate={0.85} />
      <Tela t={t} at={B.assist} until={B.flash} src="rec/oa_assistant.mp4" from={290} rate={0.85} />
      <Tela t={t} at={B.flash} until={B.quieto + 1.6} src="rec/oa_flash_study.mp4" from={240} rate={0.85} />
      <Pomodoro t={t} />

      {/* fecho quieto */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 22, opacity: Math.min(win(t, B.quieto + 1.8, B.quieto + 2.3), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(11,14,22,0.88)' }} />
        <div style={{ position: 'absolute', left: 80, right: 80, top: 820, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 54, color: WHITE, letterSpacing: -1, lineHeight: 1.35 }}>
            estudar também pode ser<br /><span style={{ color: '#e0a83c' }}>esse lugar quieto.</span>
          </div>
          <div style={{ fontFamily: BODY, fontSize: 30, color: 'rgba(255,255,255,0.65)', marginTop: 34, opacity: win(t, B.comigo, B.comigo + 0.4) }}>
            amanhã tem mais — e tem lugar pra você aqui.
          </div>
        </div>
      </div>

      <Vignette strength={0.55} />
      <Grain opacity={0.07} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={52} highlight="#e0a83c" />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c57.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
