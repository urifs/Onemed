import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, Range } from './story';
import { OLightBg, OLPhone, OLBadge, OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import { Grain, Vignette, win, shakeAt } from './cine';
import timing from './timings/c46.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C46_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  desafio: DELAY + 1.9,
  resumo: DELAY + 6.4,
  gole1: DELAY + 10.5,
  baralho: DELAY + 12.1,
  gole2: DELAY + 19.4,
  quest: DELAY + 21.2,
  errei: DELAY + 23.6,
  morno: DELAY + 27.4,
  revisei: DELAY + 30.3,
  lugar: DELAY + 33.8,
  amanha: DELAY + 37.7,
  end: DELAY + T.duration - 3.2,
};
const SC = {
  hook: [0, B.resumo - 0.3] as Range,
  resumo: [B.resumo - 0.3, B.baralho - 0.3] as Range,
  baralho: [B.baralho - 0.3, B.quest - 0.3] as Range,
  quest: [B.quest - 0.3, B.morno - 0.3] as Range,
  fecho: [B.morno - 0.3, B.end + 1.0] as Range,
};

/* temperatura 100→30 com quedas nos goles */
const temp = (t: number) => {
  let x = 96 - (t - DELAY) * 1.1;
  x -= 9 * win(t, B.gole1, B.gole1 + 0.4);
  x -= 9 * win(t, B.gole2, B.gole2 + 0.4);
  return Math.max(34, x);
};

const Xicara: React.FC<{ t: number; big?: boolean }> = ({ t, big }) => {
  const tp = temp(t);
  const vapor = clamp01((tp - 40) / 55);
  const gole = (Math.abs(t - B.gole1 - 0.2) < 0.35 || Math.abs(t - B.gole2 - 0.2) < 0.35) ? -16 : 0;
  const s = big ? 1.6 : 1;
  return (
    <div style={{ transform: `scale(${s}) rotate(${gole}deg)`, transformOrigin: '50% 90%', transition: 'none' }}>
      <svg width={300} height={340} viewBox="0 0 300 340">
        {/* vapor */}
        {[0, 1, 2].map(i => (
          <path key={i}
            d={`M ${120 + i * 34} 150 q ${12 * Math.sin(t * 2 + i)} -34 0 -62 q ${-12 * Math.sin(t * 2.4 + i)} -30 0 -58`}
            stroke="rgba(120,128,140,0.55)" strokeWidth={9} fill="none" strokeLinecap="round"
            opacity={vapor * (0.8 - i * 0.18)} transform={`translate(0 ${Math.sin(t * 1.6 + i * 2) * 5})`} />
        ))}
        {/* xícara */}
        <path d="M70 170 h160 v90 a80 46 0 0 1 -160 0 z" fill="#fff" stroke="#d8d2c6" strokeWidth={5} />
        <ellipse cx={150} cy={170} rx={80} ry={26} fill="#6b4a35" stroke="#d8d2c6" strokeWidth={5} />
        <path d="M232 190 q54 8 44 56 q -8 38 -52 30" fill="none" stroke="#d8d2c6" strokeWidth={12} />
        <ellipse cx={150} cy={306} rx={104} ry={18} fill="rgba(22,24,29,0.12)" />
      </svg>
      {/* termômetro */}
      <div style={{ position: 'absolute', right: -66, top: 30, width: 34, height: 240, borderRadius: 20, background: '#eceff3', border: '2px solid rgba(22,24,29,0.15)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${tp}%`, background: tp > 62 ? O_RED : tp > 45 ? '#e0862d' : '#4b9de0' }} />
      </div>
      <div style={{ position: 'absolute', right: -110, top: 280, fontFamily: MONO, fontWeight: 700, fontSize: 25, color: tp > 45 ? O_INK : '#4b9de0' }}>
        {tp > 62 ? 'QUENTE' : tp > 45 ? 'MORNO' : 'FRIO'}
      </div>
    </div>
  );
};

export const C46_Cafe: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', transform: shakeAt(t, B.errei, 7) || undefined }}>
      <OLightBg />

      {/* hook: xícara gigante */}
      <div style={{ position: 'absolute', inset: 0, opacity: (() => { const o = t < SC.hook[1] ? 1 - win(t, SC.hook[1] - 0.4, SC.hook[1]) : 0; return o; })() }}>
        <div style={{ position: 'absolute', left: '50%', top: 430, transform: 'translateX(-50%)' }}>
          <Xicara t={t} big />
        </div>
        <div style={{ position: 'absolute', left: 60, right: 60, top: 1120, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 66, color: O_INK, letterSpacing: -2, lineHeight: 1.18 }}>
            te desafio: estudar<br />antes de <span style={{ color: O_RED }}>esfriar.</span>
          </div>
        </div>
      </div>

      {/* fases com telas reais + xícara pequena persistente */}
      <OLPhone t={t} range={SC.resumo} src="rec/ol_assist.mp4" startFrom={150} playbackRate={0.7} top={230} width={520}>
        <OLBadge x={56} y={330} delay={Math.round((B.resumo + 0.5) * FPS)} from="left" accent
          top="resumo — 1 clique" bottom="antes do primeiro gole" />
      </OLPhone>
      <OLPhone t={t} range={SC.baralho} src="rec/ol_flash.mp4" startFrom={70} top={230} width={520}>
        <OLBadge x={56} y={330} delay={Math.round((B.baralho + 0.5) * FPS)} from="left" accent
          top="a IA monta o baralho" bottom="enquanto eu assopro" />
      </OLPhone>
      <OLPhone t={t} range={SC.quest} src="rec/ol_quest.mp4" startFrom={200} top={230} width={520}>
        <OLBadge x={56} y={330} delay={Math.round((B.quest + 0.4) * FPS)} from="left" accent
          top="5 questões comentadas" />
        <OLBadge x={560} y={1140} delay={Math.round((B.errei + 0.3) * FPS)} from="right"
          top="errei 1 — e entendi o porquê" />
      </OLPhone>

      {t >= SC.resumo[0] && t < SC.fecho[0] + 0.6 && (
        <div style={{ position: 'absolute', left: 40, bottom: 260, zIndex: 9, opacity: Math.min(win(t, SC.resumo[0], SC.resumo[0] + 0.5), 1 - win(t, SC.fecho[0], SC.fecho[0] + 0.5)), transform: 'scale(0.72)' }}>
          <Xicara t={t} />
        </div>
      )}

      {/* fecho */}
      <div style={{ position: 'absolute', inset: 0, opacity: t >= SC.fecho[0] ? Math.min(win(t, SC.fecho[0], SC.fecho[0] + 0.5), 1 - win(t, B.end + 0.6, B.end + 1.1)) : 0 }}>
        <div style={{ position: 'absolute', left: '50%', top: 480, transform: 'translateX(-50%) scale(1.2)' }}>
          <Xicara t={t} />
        </div>
        <div style={{ position: 'absolute', left: 60, right: 60, top: 1000, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 56, color: O_INK, letterSpacing: -1.8, lineHeight: 1.25, opacity: win(t, B.revisei, B.revisei + 0.4) }}>
            café ainda morno.<br /><span style={{ color: O_RED }}>um tema inteiro revisado.</span>
          </div>
          <div style={{ fontFamily: BODY, fontSize: 28, color: O_MUT, marginTop: 24, opacity: win(t, B.lugar, B.lugar + 0.4) }}>
            não é mágica — é tudo num lugar só, com atualizações sem custo.
          </div>
        </div>
      </div>

      <Vignette strength={0.2} />
      <Grain opacity={0.04} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c46.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
