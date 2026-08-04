import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, Sequence, staticFile } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO, clamp01 } from './theme';
import { FPS, sceneOpacity, Range } from './story';
import { OLightBg, OLBadge, OLPhone, OLHero, OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import timing from './timings/c33.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C33_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  valendo: DELAY + 4.0,
  f1: DELAY + 5.45,     // busca
  f2: DELAY + 10.9,     // resumo
  f3: DELAY + 15.0,     // flashcards
  f4: DELAY + 20.9,     // questões
  f5: DELAY + 27.0,     // assistente
  f6: DELAY + 33.2,     // cronograma
  tempo: DELAY + 40.6,
  sobrou: DELAY + 42.0,
  n530: DELAY + 44.4,
  turno: DELAY + 48.3,
  end: DELAY + T.duration - 3.2,
};

const SC = {
  hook: [0, B.f1 - 0.2] as Range,
  f1: [B.f1 - 0.2, B.f2 - 0.2] as Range,
  f2: [B.f2 - 0.2, B.f3 - 0.2] as Range,
  f3: [B.f3 - 0.2, B.f4 - 0.2] as Range,
  f4: [B.f4 - 0.2, B.f5 - 0.2] as Range,
  f5: [B.f5 - 0.2, B.f6 - 0.2] as Range,
  f6: [B.f6 - 0.2, B.tempo - 0.2] as Range,
  tempo: [B.tempo - 0.2, B.turno - 0.3] as Range,
  cta: [B.turno - 0.3, B.end + 1.0] as Range,
};

/* cronômetro speedrun: corre do "valendo" até o "tempo!" */
const Timer: React.FC<{ t: number }> = ({ t }) => {
  if (t < B.valendo - 0.3 || t > B.tempo + 3.5) return null;
  const running = Math.max(0, Math.min(t - B.valendo, B.tempo - B.valendo));
  const cs = Math.floor((running % 1) * 100);
  const s = Math.floor(running);
  const frozen = t >= B.tempo;
  return (
    <div style={{
      position: 'absolute', right: 46, top: 110, zIndex: 9,
      background: frozen ? O_GREEN : O_INK, borderRadius: 16, padding: '12px 24px',
      boxShadow: `0 14px 40px -10px ${frozen ? 'rgba(14,159,110,0.5)' : 'rgba(22,24,29,0.4)'}`,
      transform: frozen ? `scale(${1 + Math.sin((t - B.tempo) * 6) * 0.04})` : 'none',
    }}>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: WHITE }}>
        0:{String(s).padStart(2, '0')}.{String(cs).padStart(2, '0')}{frozen ? ' ✓' : ''}
      </span>
    </div>
  );
};

/* split de etapa: nº + nome + tempo parcial */
const Split: React.FC<{ t: number; n: number; label: string; atSec: number; splitSec: number }> =
({ t, n, label, atSec, splitSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - Math.round(atSec * FPS), fps, config: { damping: 12, stiffness: 160 }, from: 0, to: 1 });
  return (
    <div style={{
      position: 'absolute', left: 46, top: 110, zIndex: 9,
      transform: `scale(${0.7 + s * 0.3})`, opacity: s, transformOrigin: 'left top',
      display: 'flex', alignItems: 'center', gap: 14,
      background: WHITE, border: `2px solid ${O_RED}`, borderRadius: 16, padding: '10px 22px',
      boxShadow: '0 14px 40px -12px rgba(224,45,45,0.35)',
    }}>
      <span style={{
        width: 44, height: 44, borderRadius: 999, background: O_RED,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: HEAD, fontWeight: 900, fontSize: 25, color: WHITE,
      }}>{n}</span>
      <div>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 25, color: O_INK }}>{label}</div>
        <div style={{ fontFamily: MONO, fontSize: 16, color: O_MUT }}>split 0:{String(splitSec).padStart(2, '0')}</div>
      </div>
    </div>
  );
};

const Etapa: React.FC<{ t: number; range: Range; n: number; label: string; splitSec: number; src: string; startFrom: number; badge: string; badgeSub?: string }> =
({ t, range, n, label, splitSec, src, startFrom, badge, badgeSub }) => {
  const op = sceneOpacity(t, range);
  if (op <= 0) return null;
  return (
    <>
      <OLPhone t={t} range={range} src={src} startFrom={startFrom} top={300}>
        <OLBadge x={56} y={430} delay={Math.round((range[0] + 0.5) * FPS)} from="left" accent top={badge} bottom={badgeSub} />
      </OLPhone>
      <div style={{ opacity: op }}><Split t={t} n={n} label={label} atSec={range[0] + 0.1} splitSec={splitSec} /></div>
    </>
  );
};

export const C33_Speedrun: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />

      {/* hook: botão de cronômetro esmagado */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.hook, true) }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 84, color: O_INK, letterSpacing: -3 }}>
            6 ferramentas.<br /><span style={{ color: O_RED }}>60 segundos.</span>
          </div>
          <div style={{
            marginTop: 60, display: 'inline-block',
            transform: `scale(${t > B.valendo - 0.3 ? 0.92 : 1 + Math.sin(t * 3) * 0.03})`,
          }}>
            <div style={{
              width: 170, height: 170, borderRadius: 999, background: O_RED, margin: '0 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 26px 70px -18px rgba(224,45,45,0.55), inset 0 -10px 0 rgba(0,0,0,0.15)',
            }}>
              <span style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 34, color: WHITE }}>GO</span>
            </div>
          </div>
        </div>
      </div>

      <Etapa t={t} range={SC.f1} n={1} label="busca" splitSec={6} src="rec/ol_dash.mp4" startFrom={30}
        badge="🔎 digitei o tema" badgeSub="aula, livro e questão juntos" />
      <Etapa t={t} range={SC.f2} n={2} label="resumo" splitSec={12} src="rec/ol_assist.mp4" startFrom={150}
        badge="📝 um clique, pronto" />
      <Etapa t={t} range={SC.f3} n={3} label="flashcards" splitSec={18} src="rec/ol_flash.mp4" startFrom={160}
        badge="🃏 baralho gerado sozinho" />
      <Etapa t={t} range={SC.f4} n={4} label="questões" splitSec={25} src="rec/ol_quest.mp4" startFrom={170}
        badge="📋 resposta comentada" badgeSub="li, marquei pra revisar" />
      <Etapa t={t} range={SC.f5} n={5} label="assistente" splitSec={31} src="rec/ol_assist.mp4" startFrom={270}
        badge="💬 lê a tela · respondeu" />
      <Etapa t={t} range={SC.f6} n={6} label="cronograma" splitSec={39} src="rec/ol_plano.mp4" startFrom={270}
        badge="🧠 mapa mental do plano" badgeSub="objetivo · horas · prova" />

      <Timer t={t} />

      {/* TEMPO! */}
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity(t, SC.tempo) }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 110, color: O_GREEN, letterSpacing: -3 }}>TEMPO! ✓</div>
          <div style={{
            fontFamily: HEAD, fontWeight: 700, fontSize: 36, color: O_INK, marginTop: 20,
            opacity: interpolate(t, [B.sobrou, B.sobrou + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            e ainda sobrou.
          </div>
          <div style={{
            fontFamily: BODY, fontSize: 27, color: O_MUT, marginTop: 26,
            opacity: interpolate(t, [B.n530, B.n530 + 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}>
            lá dentro: <b style={{ color: O_RED }}>+530 cursos</b> e <b style={{ color: O_RED }}>+9.000 livros</b> esperando
          </div>
        </div>
      </div>

      <OLHero t={t} range={SC.cta} line1="seu turno." line2="bate esse tempo." size={76} redAfterSec={1.2} />

      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c33.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
