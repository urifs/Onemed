import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, OffthreadVideo } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, clamp01 } from './theme';
import { FPS, ClipAt } from './story';
import { OLightBg, OLEndCard, O_RED, O_INK, O_MUT, WHITE } from './olight';
import { Grain, Vignette, win, easeOutExpo } from './cine';
import timing from './timings/c49.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C49_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

type Msg = { at: number; side: 'ele' | 'eu'; kind: 'txt' | 'print' | 'audio'; txt?: string; src?: string; from?: number };
const MSGS: Msg[] = [
  { at: DELAY + 0.3, side: 'ele', kind: 'txt', txt: 'olha isso' },
  { at: DELAY + 4.4, side: 'ele', kind: 'print', src: 'rec/ol_flash.mp4', from: 200 },
  { at: DELAY + 8.8, side: 'eu', kind: 'txt', txt: 'peraí… como assim GEROU SOZINHO?' },
  { at: DELAY + 13.8, side: 'ele', kind: 'print', src: 'rec/ol_assist.mp4', from: 310 },
  { at: DELAY + 18.7, side: 'ele', kind: 'print', src: 'rec/ol_quest.mp4', from: 210 },
  { at: DELAY + 21.4, side: 'ele', kind: 'print', src: 'rec/ol_acervo.mp4', from: 170 },
  { at: DELAY + 27.5, side: 'eu', kind: 'audio' },
  { at: DELAY + 30.2, side: 'ele', kind: 'txt', txt: 'onemedcursos.com.br — tem teste grátis, entra sem pagar nada' },
];
const B = {
  favor: DELAY + 36.4,
  end: DELAY + T.duration - 3.2,
};

const Bolha: React.FC<{ m: Msg; t: number; y: number }> = ({ m, t, y }) => {
  const p = easeOutExpo(win(t, m.at, m.at + 0.45));
  if (p <= 0) return null;
  const eu = m.side === 'eu';
  const w = m.kind === 'print' ? 420 : m.kind === 'audio' ? 420 : undefined;
  return (
    <div style={{
      position: 'absolute', top: y, [eu ? 'right' : 'left']: 56,
      maxWidth: 680, width: w,
      transform: `translateY(${(1 - p) * 40}px) scale(${0.9 + 0.1 * p})`,
      transformOrigin: eu ? '100% 100%' : '0% 100%', opacity: p,
      background: eu ? '#dff7d0' : WHITE,
      borderRadius: eu ? '24px 24px 8px 24px' : '24px 24px 24px 8px',
      border: '1.5px solid rgba(22,24,29,0.1)',
      boxShadow: '0 14px 34px -14px rgba(22,24,29,0.25)',
      padding: m.kind === 'print' ? 10 : '20px 26px',
    }}>
      {m.kind === 'txt' && (
        <span style={{ fontFamily: BODY, fontWeight: 600, fontSize: 29, color: O_INK, lineHeight: 1.35 }}>{m.txt}</span>
      )}
      {m.kind === 'print' && (
        <div style={{ width: 400, height: 560, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
          <ClipAt fromSec={m.at - 0.3}>
            <OffthreadVideo src={staticFile(m.src!)} muted startFrom={m.from}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          </ClipAt>
          <div style={{ position: 'absolute', right: 10, bottom: 8, fontFamily: BODY, fontSize: 17, color: 'rgba(255,255,255,0.95)', textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>print · agora</div>
        </div>
      )}
      {m.kind === 'audio' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 999, background: O_RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill={WHITE}><path d="M7 5l12 7-12 7z" /></svg>
          </div>
          <svg width={220} height={44}>
            {[...Array(26)].map((_, i) => {
              const h = 8 + Math.abs(Math.sin(i * 1.7 + 1)) * 28 * (t > m.at + 0.3 && t < m.at + 2.6 && i / 26 < (t - m.at - 0.3) / 2.3 ? 1 : 0.45);
              return <rect key={i} x={i * 8.4} y={22 - h / 2} width={4.6} height={h} rx={2.3} fill={t > m.at + 0.3 && i / 26 < (t - m.at - 0.3) / 2.3 ? O_RED : '#9aa3ad'} />;
            })}
          </svg>
          <span style={{ fontFamily: BODY, fontSize: 20, color: O_MUT }}>0:07</span>
        </div>
      )}
    </div>
  );
};

/* posições verticais empilhadas com rolagem da conversa */
const YS = [210, 330, 940, 1050, 1160, 1270, 1390, 1510];
const compact = (i: number) => [210, 330, 620, 700, 780, 860, 980, 1100][i];

export const C49_Print: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  // conversa sobe conforme novas mensagens chegam (rolagem suave)
  const scroll =
    440 * easeOutExpo(win(t, MSGS[3].at, MSGS[3].at + 0.5)) +
    330 * easeOutExpo(win(t, MSGS[5].at, MSGS[5].at + 0.5)) +
    290 * easeOutExpo(win(t, MSGS[7].at, MSGS[7].at + 0.5));
  const ys = [200, 320, 930, 1080, 1660, 2210, 2760, 2980];
  const favor = win(t, B.favor - 0.2, B.favor + 0.3);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />
      {/* topo do chat */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 150, zIndex: 14, background: WHITE, borderBottom: '1.5px solid rgba(22,24,29,0.1)', display: 'flex', alignItems: 'flex-end', padding: '0 40px 18px', gap: 18 }}>
        <div style={{ width: 62, height: 62, borderRadius: 999, background: '#d9dee5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: 26, color: O_MUT }}>R</div>
        <div>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 28, color: O_INK }}>Rafa — colega do internato</div>
          <div style={{ fontFamily: BODY, fontSize: 20, color: '#0e9f6e' }}>online</div>
        </div>
      </div>

      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${-scroll}px)`, opacity: 1 - favor }}>
        {MSGS.map((m, i) => <Bolha key={i} m={m} t={t} y={ys[i]} />)}
      </div>

      {/* fecho: manda pro teu grupo */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 20, opacity: favor * (1 - win(t, B.end + 0.5, B.end + 1)), background: 'rgba(250,250,250,0.95)' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 780, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 92, color: O_INK, letterSpacing: -3, lineHeight: 1.1 }}>
            manda pro<br /><span style={{ color: O_RED }}>teu grupo.</span>
          </div>
          <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center', gap: 14 }}>
            {['➦ encaminhar', '➦ encaminhar', '➦ encaminhar'].map((x, i) => (
              <div key={i} style={{ background: WHITE, border: '1.5px solid rgba(22,24,29,0.14)', borderRadius: 999, padding: '12px 24px', fontFamily: BODY, fontWeight: 700, fontSize: 23, color: O_INK, opacity: win(t, B.favor + 0.3 + i * 0.15, B.favor + 0.5 + i * 0.15) }}>{x}</div>
            ))}
          </div>
        </div>
      </div>

      <Vignette strength={0.18} />
      <Grain opacity={0.035} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c49.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
