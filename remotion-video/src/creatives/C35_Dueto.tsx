import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, ClipAt, Range } from './story';
import { OLightBg, OLBadge, OLEndCard, OLHero, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import { PhoneFrame } from './DeviceFrames';
import timing from './timings/c35.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C35_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  parar: DELAY + 3.4,
  olha: DELAY + 4.5,
  digitou: DELAY + 5.7,
  dentro: DELAY + 7.7,
  achou: DELAY + 10.4,
  volta: DELAY + 11.1,
  lenta: DELAY + 12.5,
  acervo: DELAY + 13.3,
  colab: DELAY + 14.9,
  categorias: DELAY + 17.2,
  equipe: DELAY + 20.2,
  contador: DELAY + 22.6,
  milhares: DELAY + 25.1,
  mesmoMaterial: DELAY + 26.4,
  n530: DELAY + 31.1,
  teste: DELAY + 35.0,
  olhos: DELAY + 38.8,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  take1: [0, B.volta - 0.2] as Range,       // primeira vez, velocidade normal
  replay: [B.volta - 0.2, B.mesmoMaterial - 0.3] as Range,  // câmera lenta + reactions
  tese: [B.mesmoMaterial - 0.3, B.teste - 0.3] as Range,
  cta: [B.teste - 0.3, B.end + 1.0] as Range,
};

/* cartela de reação estilo dueto */
const Reaction: React.FC<{ t: number; atSec: number; emoji: string; txt: string; y: number }> =
({ t, atSec, emoji, txt, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - Math.round(atSec * FPS), fps, config: { damping: 11, stiffness: 170 }, from: 0, to: 1 });
  if (s <= 0.01) return null;
  return (
    <div style={{
      position: 'absolute', left: 50, top: y, right: 560,
      transform: `scale(${0.75 + s * 0.25}) rotate(-1.5deg)`, opacity: s, transformOrigin: 'left center',
      background: WHITE, border: '2px solid rgba(22,24,29,0.1)', borderRadius: 22,
      padding: '20px 26px', boxShadow: '0 20px 50px -16px rgba(22,24,29,0.28)',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <span style={{ fontSize: 46 }}>{emoji}</span>
      <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 32, color: O_INK }}>{txt}</span>
    </div>
  );
};

/* o "take" do lado direito (estilo dueto) */
const DuetTake: React.FC<{ t: number; range: Range; startFrom: number; slow?: boolean }> =
({ t, range, startFrom, slow }) => {
  const op = sceneOpacity(t, range);
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', right: 40, top: 260 }}>
        <ClipAt fromSec={range[0]}>
          <PhoneFrame src="rec/ol_acervo.mp4" width={490} startFrom={startFrom} statusDark playbackRate={slow ? 0.45 : 1} />
        </ClipAt>
      </div>
      {slow && (
        <div style={{
          position: 'absolute', right: 60, top: 290, zIndex: 8,
          background: 'rgba(22,24,29,0.85)', borderRadius: 999, padding: '8px 20px',
        }}>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 20, color: WHITE }}>0.5× replay</span>
        </div>
      )}
    </div>
  );
};

export const C35_Dueto: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />

      {/* 1ª passada */}
      <DuetTake t={t} range={SC.take1} startFrom={130} />
      <div style={{ opacity: sceneOpacity(t, SC.take1, true) }}>
        <Reaction t={t} atSec={0.9} emoji="👀" txt="olha esse take" y={420} />
        <Reaction t={t} atSec={B.parar} emoji="✋" txt="PERA." y={620} />
        <Reaction t={t} atSec={B.dentro} emoji="🤯" txt="achou DENTRO do material" y={820} />
      </div>

      {/* replay em câmera lenta */}
      <DuetTake t={t} range={SC.replay} startFrom={150} slow />
      <div style={{ opacity: sceneOpacity(t, SC.replay) }}>
        <Reaction t={t} atSec={B.lenta} emoji="🐢" txt="de novo. em câmera lenta." y={420} />
        <Reaction t={t} atSec={B.colab} emoji="📚" txt="biblioteca colaborativa" y={620} />
        <Reaction t={t} atSec={B.equipe} emoji="✅" txt="até a equipe responde" y={800} />
        <Reaction t={t} atSec={B.milhares} emoji="👁" txt="MILHARES de views" y={980} />
      </div>

      {/* tese */}
      <OLHero t={t} range={SC.tese} line1="gente estudando do material bom..." line2="em vez de garimpar em 10 grupos." size={52} redAfterSec={1.6} />

      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.cta) }}>
        <div style={{
          position: 'absolute', left: 50, right: 50, top: 760, textAlign: 'center',
          opacity: interpolate(t, [SC.cta[0], SC.cta[0] + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: O_INK, letterSpacing: -1.5 }}>
            vai lá ver com os<br /><span style={{ color: O_RED }}>seus próprios olhos.</span>
          </div>
        </div>
      </div>

      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c35.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
