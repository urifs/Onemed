import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01, easeInOut } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { OLightBg, OLBadge, OLPhone, OLHero, OLEndCard, O_RED, O_INK, O_MUT, WHITE } from './olight';
import timing from './timings/c32.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C32_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  cabe: DELAY + 1.4,
  apostilas: DELAY + 3.3,
  viram: DELAY + 5.0,
  n530: DELAY + 6.8,
  postits: DELAY + 11.2,
  flashcards: DELAY + 13.9,
  melhor: DELAY + 18.4,
  papel: DELAY + 19.9,
  vira: DELAY + 22.4,
  semanas: DELAY + 25.4,
  montado: DELAY + 28.2,
  fim: DELAY + 32.3,
  cafe: DELAY + 35.1,
  arruma: DELAY + 38.2,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  mesa: [0, B.viram + 1.6] as Range,
  acervo: [B.viram + 1.6, B.postits + 0.6] as Range,
  flash: [B.postits, B.melhor - 0.2] as Range,
  cronoPapel: [B.melhor - 0.2, B.vira + 0.5] as Range,
  mapa: [B.vira + 0.5, B.fim - 0.3] as Range,
  limpa: [B.fim - 0.3, B.arruma - 0.2] as Range,
  cta: [B.arruma - 0.2, B.end + 1.0] as Range,
};

/* item da mesa sendo sugado pro centro */
const DeskItem: React.FC<{ t: number; suckAt: number; x: number; y: number; rot: number; w: number; h: number; color: string; label?: string }> =
({ t, suckAt, x, y, rot, w, h, color, label }) => {
  const p = clamp01((t - suckAt) / 0.55);
  const e = p * p;   // ease-in agressivo (júri: máx 15% deformação)
  const cx = 540, cy = 900;
  const nx = x + (cx - x) * e;
  const ny = y + (cy - y) * e;
  const sc = 1 - e * 0.85;
  const stretch = 1 + Math.sin(p * Math.PI) * 0.12;
  if (p >= 1) return null;
  return (
    <div style={{
      position: 'absolute', left: nx, top: ny,
      transform: `translate(-50%,-50%) rotate(${rot + e * 50}deg) scale(${sc * stretch}, ${sc / stretch})`,
      width: w, height: h, borderRadius: 10,
      background: color, boxShadow: '0 14px 34px -12px rgba(22,24,29,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {label && <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 17, color: O_INK, opacity: 0.65 }}>{label}</span>}
    </div>
  );
};

const Mesa: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const op = sceneOpacity(t, SC.mesa, true);
  const titOp = interpolate(frame, [2, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (op <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op }}>
      {/* tampo da mesa */}
      <div style={{ position: 'absolute', inset: 0, background: '#efe9df' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 300, textAlign: 'center', opacity: titOp, zIndex: 5 }}>
        <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 56, color: O_INK, letterSpacing: -1 }}>
          sua mesa inteira <span style={{ color: O_RED }}>↓</span>
        </div>
      </div>
      {/* apostilas (sugadas em sequência dentro da cena) */}
      <DeskItem t={t} suckAt={B.apostilas + 0.6} x={230} y={620} rot={-8} w={300} h={200} color="#f7f3ea" label="Apostila — Cardio" />
      <DeskItem t={t} suckAt={B.apostilas + 1.1} x={820} y={640} rot={6} w={280} h={190} color="#f2ede2" label="Apostila — Nefro" />
      <DeskItem t={t} suckAt={B.apostilas + 1.6} x={300} y={1240} rot={4} w={310} h={200} color="#f9f5ec" label="Apostila — Pneumo" />
      <DeskItem t={t} suckAt={B.apostilas + 2.1} x={800} y={1300} rot={-5} w={280} h={185} color="#f2ede2" label="Provas antigas" />
      {/* post-its e caderno ficam de fundo (saem com a cena) */}
      {[0, 1, 2, 3].map(i => (
        <DeskItem key={i} t={t} suckAt={999} x={180 + i * 210} y={980 + (i % 2) * 90} rot={-10 + i * 7} w={110} h={110} color="#ffe9a8" />
      ))}
      <DeskItem t={t} suckAt={999} x={620} y={1500} rot={-3} w={340} h={230} color="#dfe7f2" label="Caderno de resumos" />
      {/* o celular no centro */}
      <div style={{
        position: 'absolute', left: 540, top: 900, transform: 'translate(-50%,-50%)',
        width: 190, height: 390, borderRadius: 34, background: '#1b1d22', zIndex: 4,
        boxShadow: '0 30px 70px -20px rgba(22,24,29,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 170, height: 368, borderRadius: 27, background: '#fafafa',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18, background: O_RED,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${1 + Math.sin(t * 4) * 0.06})`,
            boxShadow: '0 0 34px rgba(224,45,45,0.4)',
          }}>
            <span style={{ color: WHITE, fontWeight: 900, fontFamily: HEAD, fontSize: 26 }}>1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const C32_Mesa: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />
      <Mesa t={t} />

      <OLPhone t={t} range={SC.acervo} src="rec/ol_acervo.mp4" startFrom={30}>
        <OLBadge x={56} y={330} delay={Math.round((SC.acervo[0] + 0.4) * FPS)} from="left" accent
          top="as apostilas viraram isto" bottom="+530 cursos · +9.000 livros · acervo" />
      </OLPhone>

      <OLPhone t={t} range={SC.flash} src="rec/ol_flash.mp4" startFrom={160}>
        <OLBadge x={56} y={330} delay={Math.round((B.flashcards) * FPS)} from="left"
          top="post-its → flashcards" bottom="caderno → resumos, pela IA" />
        {/* post-its voando pra dentro do celular */}
        {[0, 1, 2].map(i => {
          const at = SC.flash[0] + 0.3 + i * 0.35;
          const p = clamp01((t - at) / 0.6);
          if (p <= 0 || p >= 1) return null;
          const e = p * p;
          return (
            <div key={i} style={{
              position: 'absolute',
              left: (i % 2 ? 950 : 40) + ((540 - (i % 2 ? 950 : 40)) * e),
              top: 500 + i * 140 + ((820 - (500 + i * 140)) * e),
              width: 90, height: 90, borderRadius: 8, background: '#ffe9a8',
              transform: `rotate(${e * 160}deg) scale(${1 - e * 0.7})`,
              boxShadow: '0 10px 26px -10px rgba(22,24,29,0.3)',
            }} />
          );
        })}
      </OLPhone>

      {/* o cronograma de papel (2D) sendo sugado de volta na cena da mesa */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.cronoPapel) }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 420, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 42, color: O_INK }}>
            e o <span style={{ color: O_RED }}>cronograma de papel?</span>
          </div>
        </div>
        <div style={{
          position: 'absolute', left: '50%', top: 640, transform: `translateX(-50%) rotate(-2deg) scale(${1 - clamp01((t - (B.vira - 0.2)) / 0.6) * 0.5})`,
          opacity: 1 - clamp01((t - (B.vira - 0.2)) / 0.6),
          width: 620, borderRadius: 12, background: WHITE, padding: '34px 40px',
          boxShadow: '0 30px 80px -24px rgba(22,24,29,0.3)',
        }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ height: 16, width: `${85 - i * 12}%`, background: '#e3ddd0', borderRadius: 5, marginBottom: 18 }} />
          ))}
          <div style={{ fontFamily: MONO, fontSize: 19, color: '#a09884' }}>seg · ter · qua · qui · sex...</div>
        </div>
      </div>

      <OLPhone t={t} range={SC.mapa} src="rec/ol_plano.mp4" startFrom={270}>
        <OLBadge x={56} y={330} delay={Math.round((B.vira + 0.8) * FPS)} from="left" accent
          top="virou mapa mental" bottom="do plano inteiro, navegável" />
        <OLBadge x={580} y={1150} delay={Math.round(B.montado * FPS)} from="right"
          top="montado pela IA" bottom="com as horas que você tem" />
      </OLPhone>

      {/* mesa limpa */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.limpa) }}>
        <div style={{ position: 'absolute', inset: 0, background: '#f3eee5' }} />
        <div style={{ position: 'absolute', left: '50%', top: 800, transform: 'translate(-50%,-50%)' }}>
          <div style={{ width: 200, height: 410, borderRadius: 36, background: '#1b1d22', boxShadow: '0 34px 80px -22px rgba(22,24,29,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 180, height: 388, borderRadius: 28, background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ width: 54, height: 54, borderRadius: 16, background: O_RED }} />
              <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 20, color: O_INK }}>One<span style={{ color: O_RED }}>Med</span></span>
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', left: '68%', top: 620, fontSize: 90, opacity: interpolate(t, [B.cafe, B.cafe + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>☕</div>
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 1180, textAlign: 'center',
          opacity: interpolate(t, [B.fim + 0.4, B.fim + 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}>
          <span style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 38, color: O_INK }}>
            a mesa limpa. <span style={{ color: O_RED }}>o estudo inteiro.</span>
          </span>
        </div>
      </div>

      <OLHero t={t} range={SC.cta} line1="arruma a mesa" line2="de uma vez." size={76} redAfterSec={1.2} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c32.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
