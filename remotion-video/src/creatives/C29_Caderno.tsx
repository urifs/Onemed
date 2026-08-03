import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { AmbientBg, EndCard, FloatBadge, BadgeText } from './common';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, W60, W40, HEAD, BODY, MONO, GREEN, clamp01 } from './theme';
import { FPS, sceneOpacity, NumbersScene, Range } from './story';
import { OPhone, AiRow } from './oaia';
import timing from './timings/c29.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C29_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  oi: DELAY + 0.1,
  ultima: DELAY + 2.95,      // "última anotação 20 de março"
  parou: DELAY + 6.48,       // "parou no meio da frase"
  simulados: DELAY + 10.7,   // "os simulados começaram a melhorar"
  descobri: DELAY + 15.16,
  escrevem: DELAY + 17.35,   // "se escrevem sozinhos"
  clique: DELAY + 18.8,
  flash: DELAY + 21.4,
  questao: DELAY + 23.3,
  assist: DELAY + 26.9,
  acervo: DELAY + 30.7,
  n530: DELAY + 31.8,
  nunca: DELAY + 35.6,       // "nunca estudou tanto"
  portaCopos: DELAY + 40.0,  // "eu virei porta-copos"
  favor: DELAY + 41.6,       // CTA
  seguro: DELAY + 48.1,      // "eu seguro o café"
  end: DELAY + T.duration - 3.2,
};

const SC = {
  caderno: [0, B.simulados - 0.3] as Range,
  simulados: [B.simulados - 0.3, B.escrevem - 0.3] as Range,
  demo: [B.escrevem - 0.3, B.acervo - 0.2] as Range,
  numeros: [B.acervo - 0.2, B.nunca - 0.2] as Range,
  volta: [B.nunca - 0.2, B.favor - 0.2] as Range,
  cta: [B.favor - 0.2, B.end + 1.0] as Range,
};

/* o caderno como objeto: página pautada, com a última anotação */
const Caderno: React.FC<{ t: number; startSec: number; dusty?: boolean; coaster?: boolean }> = ({ t, startSec, dusty, coaster }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - Math.round(startSec * FPS), fps, config: { damping: 15, stiffness: 60 }, from: 0, to: 1 });
  const tilt = coaster ? 6 : -2;
  return (
    <div style={{
      position: 'absolute', left: '50%', top: 520,
      transform: `translateX(-50%) translateY(${(1 - s) * 80}px) rotate(${tilt}deg) scale(${coaster ? 0.82 : 1})`,
      opacity: s,
      width: 660, height: 720, borderRadius: 10,
      background: dusty ? '#e8e3d4' : '#f3efe2',
      boxShadow: '0 40px 100px -28px rgba(0,0,0,0.7)',
      padding: '40px 44px',
      backgroundImage: 'repeating-linear-gradient(#f3efe2 0 38px, #d9d2bd 38px 39px)',
    }}>
      {/* margem vermelha */}
      <div style={{ position: 'absolute', left: 70, top: 0, bottom: 0, width: 2, background: 'rgba(224,36,36,0.4)' }} />
      <div style={{ marginLeft: 40, fontFamily: MONO, fontSize: 26, color: '#4a4437', lineHeight: '39px' }}>
        Síndrome nefrótica —<br />
        proteinúria &gt; 3,5g...<br />
        <span style={{ opacity: interpolate(t, [B.parou, B.parou + 0.3], [1, 0.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          e o edema começa por<span style={{ color: '#b3372f' }}>|</span>
        </span>
      </div>
      <div style={{ position: 'absolute', left: 110, bottom: 40, fontFamily: BODY, fontSize: 18, color: '#8a8577' }}>
        última anotação · 20 de março
      </div>
      {coaster && (
        <div style={{ position: 'absolute', top: 260, left: '50%', transform: 'translateX(-50%) rotate(-6deg)' }}>
          <div style={{ width: 130, height: 130, borderRadius: 999, background: '#6f4e37', opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>☕</div>
        </div>
      )}
    </div>
  );
};

const Hook: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.caderno, true);
  const oiOp = interpolate(t, [B.oi, B.oi + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 340, textAlign: 'center', opacity: oiOp }}>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: WHITE }}>
          oi. eu sou o <span style={{ color: RED }}>caderno de resumos</span> dele.
        </div>
      </div>
      <Caderno t={t} startSec={0.5} />
    </div>
  );
};

const Simulados: React.FC<{ t: number }> = ({ t }) => {
  const op = sceneOpacity(t, SC.simulados);
  if (op <= 0) return null;
  const el = Math.max(0, t - SC.simulados[0]);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center' }}>
        <div style={{ fontFamily: BODY, fontSize: 26, color: W60 }}>mas os simulados dele... começaram a melhorar</div>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 46, color: RED, marginTop: 10 }}>sem mim.</div>
      </div>
      {/* curva de simulado subindo */}
      <svg width={620} height={360} viewBox="0 0 620 360" style={{ position: 'absolute', left: '50%', top: 640, transform: 'translateX(-50%)' }}>
        {[0, 1, 2, 3].map(i => <line key={i} x1={0} y1={90 * i + 20} x2={620} y2={90 * i + 20} stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} />)}
        <polyline points="20,300 160,260 300,190 440,120 580,50" fill="none" stroke={RED} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={900} strokeDashoffset={900 * (1 - clamp01(el / 2.2))} style={{ filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.5))' }} />
        {[[20,300],[160,260],[300,190],[440,120],[580,50]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r={7} fill={RED} opacity={clamp01((el - i * 0.4) / 0.3)} />
        ))}
      </svg>
    </div>
  );
};

export const C29_Caderno: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AmbientBg intensity={t < B.escrevem ? 0.6 : 1} />
      <Hook t={t} />
      <Simulados t={t} />

      {/* descoberta: os resumos se escrevem sozinhos (takes reais) */}
      <OPhone t={t} range={SC.demo} src="rec/oa_flash_gen.mp4" startFrom={30} top={220}>
        <FloatBadge x={56} y={300} delay={Math.round(B.escrevem * FPS)} from="left" accent>
          <BadgeText top="os resumos se escrevem" bottom="sozinhos — um clique" />
        </FloatBadge>
        <AiRow t={t} startSec={B.flash} y={1150} />
      </OPhone>

      <NumbersScene t={t} range={SC.numeros}
        atFirstSec={B.n530} atSecondSec={B.n530 + 2.0} atPillSec={undefined} />

      {/* o caderno vira porta-copos */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.volta) }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 340, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: WHITE }}>
            ele nunca estudou tanto. <span style={{ color: RED }}>só que sem caneta.</span>
          </div>
        </div>
        <Caderno t={t} startSec={SC.volta[0]} dusty coaster />
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 1320, textAlign: 'center',
          opacity: interpolate(t, [B.portaCopos, B.portaCopos + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: BODY, fontSize: 28, color: W60 }}>tá tudo bem. eu virei <span style={{ color: WHITE, fontWeight: 700 }}>porta-copos.</span></div>
        </div>
      </div>

      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.cta) }}>
        <div style={{
          position: 'absolute', left: 50, right: 50, top: 740, textAlign: 'center',
          opacity: interpolate(t, [SC.cta[0], SC.cta[0] + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 52, color: WHITE, letterSpacing: -1.5, lineHeight: 1.25 }}>
            faz um favor pra um<br />caderno aposentado:<br /><span style={{ color: RED }}>vai lá e testa grátis.</span>
          </div>
          <div style={{
            fontFamily: BODY, fontSize: 26, color: W60, marginTop: 26,
            opacity: interpolate(t, [B.seguro, B.seguro + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            pode ir... eu seguro o café. ☕
          </div>
        </div>
      </div>

      <CaptionTrack timing={T} delaySec={DELAY} y={1560} size={54} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c29.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
