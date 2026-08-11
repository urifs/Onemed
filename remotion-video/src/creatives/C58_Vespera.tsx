import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, OffthreadVideo } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, HEAD, BODY, MONO } from './theme';
import { FPS, ClipAt } from './story';
import { EndCard, FloatBadge, BadgeText } from './common';
import { Grain, Vignette, Letterbox, CamDrift, win, easeOutExpo } from './cine';
import timing from './timings/c58.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C58_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  vespera: DELAY + 0.1,
  sombras: DELAY + 3.9,
  respira: DELAY + 11.1,
  proteger: DELAY + 14.2,
  abre: DELAY + 16.7,
  favoritos: DELAY + 19.2,
  flash: DELAY + 22.0,
  checklist: DELAY + 25.9,
  dormir: DELAY + 30.9,
  clareza: DELAY + 36.5,
  terror: DELAY + 37.9,
  end: DELAY + T.duration - 3.2,
};

/* relógio noir */
const Relogio: React.FC<{ t: number }> = ({ t }) => {
  const o = Math.min(win(t, B.vespera, B.vespera + 0.5), 1 - win(t, B.respira, B.respira + 0.5));
  if (o <= 0) return null;
  const tic = Math.floor(t * 2) % 2;
  return (
    <div style={{ position: 'absolute', left: '50%', top: 480, transform: 'translateX(-50%)', opacity: o }}>
      <svg width={420} height={420} viewBox="0 0 420 420">
        <circle cx={210} cy={210} r={196} fill="#0c0e14" stroke="rgba(255,255,255,0.2)" strokeWidth={5} />
        {[...Array(12)].map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <line key={i} x1={210 + Math.sin(a) * 172} y1={210 - Math.cos(a) * 172} x2={210 + Math.sin(a) * 188} y2={210 - Math.cos(a) * 188} stroke="rgba(255,255,255,0.4)" strokeWidth={5} />;
        })}
        <line x1={210} y1={210} x2={210 + Math.sin(2.1) * 110} y2={210 - Math.cos(2.1) * 110} stroke={WHITE} strokeWidth={9} strokeLinecap="round" />
        <line x1={210} y1={210} x2={210 + Math.sin(5.4 + tic * 0.02) * 155} y2={210 - Math.cos(5.4 + tic * 0.02) * 155} stroke={RED} strokeWidth={5} strokeLinecap="round" />
        <circle cx={210} cy={210} r={12} fill={RED} />
      </svg>
    </div>
  );
};

/* sombras que viram assuntos */
const Sombras: React.FC<{ t: number }> = ({ t }) => {
  const o = Math.min(win(t, B.sombras, B.sombras + 0.5), 1 - win(t, B.respira, B.respira + 0.4));
  if (o <= 0) return null;
  const S = ['nefro?', 'arritmias?', 'antibiótico?', 'aquela aula…'];
  return (
    <>
      {S.map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: 90 + (i * 263) % 700, top: 1000 + (i * 191) % 420,
          fontFamily: HEAD, fontWeight: 900, fontSize: 46 + (i % 3) * 12,
          color: `rgba(255,255,255,${0.10 + 0.05 * Math.abs(Math.sin(t * 1.2 + i * 2))})`,
          transform: `rotate(${(i % 2 ? 1 : -1) * (4 + i)}deg) translateY(${Math.sin(t * 0.8 + i) * 12}px)`,
          opacity: o,
        }}>{s}</div>
      ))}
    </>
  );
};

const Tela: React.FC<{ t: number; at: number; until: number; src: string; from: number; badgeTop: string; badgeBottom?: string }> =
({ t, at, until, src, from, badgeTop, badgeBottom }) => {
  const o = Math.min(win(t, at, at + 0.45), 1 - win(t, until - 0.35, until));
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <CamDrift t={t} amp={5} zoom={0.025}>
        <div style={{
          position: 'absolute', left: '50%', top: 880, transform: 'translate(-50%,-50%)',
          width: 620, height: 1160, borderRadius: 34, overflow: 'hidden',
          border: '1.5px solid rgba(255,255,255,0.14)',
          boxShadow: '0 0 100px 4px rgba(239,68,68,0.12), 0 60px 130px -30px rgba(0,0,0,0.95)',
        }}>
          <ClipAt fromSec={at - 0.3}>
            <OffthreadVideo src={staticFile(src)} muted startFrom={from} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          </ClipAt>
        </div>
      </CamDrift>
      <FloatBadge x={56} y={300} delay={Math.round((at + 0.4) * FPS)} from="left" accent>
        <BadgeText top={badgeTop} bottom={badgeBottom || ''} />
      </FloatBadge>
    </div>
  );
};

export const C58_Vespera: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const luz = easeOutExpo(win(t, B.abre - 0.4, B.abre + 0.6)); // farol acendendo

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#07080d' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 90% 60% at 50% 40%, rgba(20,24,36,${0.9 - luz * 0.3}) 0%, #07080d 75%)` }} />
      {/* farol vermelho da plataforma */}
      <div style={{ position: 'absolute', width: 1100, height: 1100, borderRadius: 999, left: '50%', top: 760, transform: 'translate(-50%,-50%)', background: `radial-gradient(circle, rgba(239,68,68,${0.16 * luz}), transparent 60%)` }} />

      <div style={{ position: 'absolute', left: 70, right: 70, top: 220, textAlign: 'center', opacity: Math.min(win(t, B.vespera, B.vespera + 0.4), 1 - win(t, B.abre - 0.5, B.abre)) }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: 'rgba(255,255,255,0.5)', letterSpacing: 7 }}>VÉSPERA DE PROVA</div>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 58, color: WHITE, letterSpacing: -1.5, marginTop: 18, lineHeight: 1.2 }}>
          o relógio não anda.<br /><span style={{ color: RED }}>ele encurrala.</span>
        </div>
      </div>
      <Relogio t={t} />
      <Sombras t={t} />

      {/* virada: respira / proteger */}
      <div style={{ position: 'absolute', left: 80, right: 80, top: 700, textAlign: 'center', zIndex: 8, opacity: Math.min(win(t, B.respira, B.respira + 0.5), 1 - win(t, B.abre - 0.2, B.abre + 0.2)) }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 78, color: WHITE, letterSpacing: -2 }}>respira.</div>
        <div style={{ fontFamily: BODY, fontSize: 30, color: 'rgba(255,255,255,0.75)', marginTop: 26, lineHeight: 1.5, opacity: win(t, B.proteger - 1.2, B.proteger - 0.6) }}>
          a véspera não é noite de aprender.<br />é noite de <b style={{ color: RED }}>proteger o que você já sabe.</b>
        </div>
      </div>

      <Tela t={t} at={B.abre + 0.8} until={B.flash} src="rec/m_rows.mp4" from={140} badgeTop="revisão leve dos favoritos" />
      <Tela t={t} at={B.flash} until={B.checklist} src="rec/oa_flash_study.mp4" from={250} badgeTop="flashcards do seu material" badgeBottom="10 minutos e acabou" />
      <Tela t={t} at={B.checklist} until={B.dormir} src="rec/ol_plano.mp4" from={520} badgeTop="checklist fechado" badgeBottom="prova pra ansiedade: o trabalho foi feito" />

      {/* dormir */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, opacity: Math.min(win(t, B.dormir, B.dormir + 0.6), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,8,13,0.9)' }} />
        <div style={{ position: 'absolute', left: 80, right: 80, top: 760, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 66, color: WHITE, letterSpacing: -2 }}>
            a parte mais subestimada:<br /><span style={{ color: RED }}>dormir.</span>
          </div>
          <div style={{ fontFamily: BODY, fontSize: 29, color: 'rgba(255,255,255,0.7)', marginTop: 30, lineHeight: 1.5, opacity: win(t, B.clareza - 1.5, B.clareza - 0.9) }}>
            amanhã você não precisa de heroísmo.<br />precisa de <b style={{ color: WHITE }}>clareza</b>.
          </div>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 38, color: WHITE, marginTop: 46, opacity: win(t, B.terror, B.terror + 0.4) }}>
            a véspera não precisa ser um filme de terror.
          </div>
        </div>
      </div>

      <Letterbox t={t} inAt={0.1} outAt={B.end - 0.4} size={120} />
      <Vignette strength={0.6} />
      <Grain opacity={0.085} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1620} size={50} highlight={RED} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c58.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
