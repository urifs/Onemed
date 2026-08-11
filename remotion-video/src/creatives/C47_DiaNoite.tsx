import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, OffthreadVideo } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, clamp01 } from './theme';
import { FPS, ClipAt } from './story';
import { OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import { Grain, Vignette, win, easeOutExpo } from './cine';
import timing from './timings/c47.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C47_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  sol: DELAY + 0.2,
  conta: DELAY + 4.5,
  conclui: DELAY + 8.2,
  marcada: DELAY + 11.2,
  grifa: DELAY + 13.2,
  espera: DELAY + 16.8,
  favorita: DELAY + 18.7,
  abre: DELAY + 21.5,
  duvida: DELAY + 23.9,
  respondida: DELAY + 26.4,
  n10k: DELAY + 27.6,
  horario: DELAY + 30.4,
  end: DELAY + T.duration - 3.2,
};

/* pulso de luz cruzando a divisa */
const Pulso: React.FC<{ t: number; at: number; toRight?: boolean; y: number }> = ({ t, at, toRight = true, y }) => {
  const p = win(t, at, at + 0.7);
  if (p <= 0 || p >= 1) return null;
  const x = 540 + (toRight ? 1 : -1) * easeOutExpo(p) * 420;
  return (
    <div style={{
      position: 'absolute', left: x - 30, top: y, width: 60, height: 60, borderRadius: 999, zIndex: 30,
      background: `radial-gradient(circle, ${WHITE}, rgba(255,220,120,0.8) 40%, transparent 70%)`,
      opacity: 1 - p * 0.6, boxShadow: '0 0 60px 24px rgba(255,220,120,0.5)',
    }} />
  );
};

const MiniCheck: React.FC<{ t: number; at: number }> = ({ t, at }) => (
  <div style={{
    width: 54, height: 54, borderRadius: 14, border: `4px solid ${O_GREEN}`, background: WHITE,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transform: `scale(${0.5 + 0.5 * easeOutExpo(win(t, at, at + 0.4))})`, opacity: win(t, at, at + 0.25),
  }}>
    <svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <path d="M4 12.5l5.5 5.5L20 7" stroke={O_GREEN} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

export const C47_DiaNoite: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const sunY = 560 - easeOutExpo(win(t, B.sol, B.sol + 2.4)) * 260;
  const starOp = (i: number) => 0.4 + 0.6 * Math.abs(Math.sin(t * 1.4 + i * 2.1));
  const estrela = (t >= B.favorita && t <= B.abre + 0.9) ? win(t, B.favorita + 0.3, B.abre - 0.2) : -1;
  const fechoOp = win(t, B.horario - 0.3, B.horario + 0.2);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* metade dia */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 540, overflow: 'hidden', background: 'linear-gradient(180deg,#dff0ff 0%,#fef3df 55%,#fafafa 100%)' }}>
        <div style={{ position: 'absolute', left: 150, top: sunY, width: 190, height: 190, borderRadius: 999, background: 'radial-gradient(circle,#fff6d8,#ffd873 62%,transparent 72%)' }} />
      </div>
      {/* metade noite */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 540, overflow: 'hidden', background: 'linear-gradient(180deg,#0a0d16 0%,#121627 60%,#0d0f18 100%)' }}>
        <div style={{ position: 'absolute', right: 140, top: 250, width: 130, height: 130, borderRadius: 999, background: 'radial-gradient(circle,#f4f6fb,#c8cede 60%,transparent 72%)' }} />
        <div style={{ position: 'absolute', right: 176, top: 258, width: 104, height: 104, borderRadius: 999, background: '#121627' }} />
        {[...Array(14)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute', left: 40 + (i * 137) % 460, top: 90 + (i * 211) % 700,
            width: 5, height: 5, borderRadius: 99, background: WHITE, opacity: starOp(i),
          }} />
        ))}
      </div>
      {/* divisa */}
      <div style={{ position: 'absolute', left: 537, top: 0, bottom: 0, width: 6, background: 'linear-gradient(180deg, rgba(224,45,45,0.0), rgba(224,45,45,0.85) 20%, rgba(224,45,45,0.85) 80%, transparent)', zIndex: 20, boxShadow: '0 0 30px 4px rgba(224,45,45,0.35)' }} />

      {/* telas: dia = claro / noite = escuro */}
      <div style={{ position: 'absolute', left: 62, top: 430, width: 420, height: 860, borderRadius: 30, overflow: 'hidden', border: '2px solid rgba(22,24,29,0.12)', boxShadow: '0 40px 90px -26px rgba(22,24,29,0.35)', zIndex: 8 }}>
        <ClipAt fromSec={0.2}>
          <OffthreadVideo src={staticFile('rec/ol_dash.mp4')} muted startFrom={40} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        </ClipAt>
        <div style={{ position: 'absolute', left: 24, top: 24 }}><MiniCheck t={t} at={B.conclui + 0.7} /></div>
        {/* grifo dia */}
        <div style={{ position: 'absolute', left: 30, right: 30, top: 330, height: 26, background: 'rgba(255,214,79,0.75)', borderRadius: 6, transform: `scaleX(${win(t, B.grifa, B.grifa + 1.1)})`, transformOrigin: 'left', opacity: t > B.grifa ? 1 : 0 }} />
      </div>
      <div style={{ position: 'absolute', right: 62, top: 430, width: 420, height: 860, borderRadius: 30, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.14)', boxShadow: '0 40px 90px -26px rgba(0,0,0,0.7)', zIndex: 8 }}>
        <ClipAt fromSec={0.2}>
          <OffthreadVideo src={staticFile('rec/m_course.mp4')} muted startFrom={100} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        </ClipAt>
        <div style={{ position: 'absolute', left: 24, top: 24 }}><MiniCheck t={t} at={B.marcada} /></div>
        {/* grifo noite */}
        <div style={{ position: 'absolute', left: 30, right: 30, top: 330, height: 26, background: 'rgba(255,214,79,0.6)', borderRadius: 6, opacity: win(t, B.espera - 0.4, B.espera) }} />
        {/* dúvida respondida */}
        <div style={{
          position: 'absolute', left: 20, right: 20, bottom: 26, background: '#1b2030', border: '1.5px solid rgba(255,255,255,0.16)',
          borderRadius: 16, padding: '16px 18px', opacity: win(t, B.respondida - 0.2, B.respondida + 0.3),
          fontFamily: BODY, fontWeight: 600, fontSize: 21, color: '#e8ecf5',
        }}>
          sua dúvida foi respondida ✓ — comunidade
        </div>
      </div>

      {/* pulsos e estrela atravessando */}
      <Pulso t={t} at={B.conclui + 1.0} y={470} />
      <Pulso t={t} at={B.grifa + 1.3} y={760} />
      <Pulso t={t} at={B.duvida + 0.6} toRight={false} y={1180} />
      {estrela >= 0 && (
        <div style={{
          position: 'absolute', left: 230 + estrela * 620, top: 380 - Math.sin(estrela * Math.PI) * 130, zIndex: 32,
          fontSize: 60, color: '#f5b301', textShadow: '0 0 26px rgba(245,179,1,0.8)',
          transform: `rotate(${estrela * 260}deg)`,
        }}>★</div>
      )}

      {/* rótulos */}
      {[['MANHÃ', 90, O_INK], ['MADRUGADA', 640, WHITE]].map(([lb, x, c], i) => (
        <div key={i} style={{ position: 'absolute', left: x as number, top: 120, zIndex: 22, fontFamily: HEAD, fontWeight: 900, fontSize: 30, letterSpacing: 5, color: c as string, opacity: 0.9 }}>{lb}</div>
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 210, textAlign: 'center', zIndex: 22, opacity: win(t, B.conta, B.conta + 0.4) * (1 - fechoOp) }}>
        <span style={{ background: O_RED, color: WHITE, borderRadius: 999, padding: '12px 30px', fontFamily: HEAD, fontWeight: 900, fontSize: 27 }}>mesma conta · o mesmo você</span>
      </div>

      {/* fecho */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 26, opacity: fechoOp, background: 'linear-gradient(90deg, rgba(250,250,250,0.94) 0 50%, rgba(10,13,22,0.94) 50% 100%)' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 760, textAlign: 'center' }}>
          <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 74, letterSpacing: -2 }}>
            <span style={{ color: O_INK }}>seu estudo </span>
            <span style={{ color: O_RED }}>não tem horário.</span>
          </span>
        </div>
      </div>

      <Vignette strength={0.22} />
      <Grain opacity={0.04} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c47.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
