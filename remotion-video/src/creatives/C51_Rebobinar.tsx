import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, BODY, MONO } from './theme';
import { FPS, Range } from './story';
import { OLightBg, OLPhone, OLBadge, OLEndCard, O_RED, O_INK, O_MUT, O_GREEN, WHITE } from './olight';
import { Grain, Vignette, win, easeOutExpo, FlashCut } from './cine';
import timing from './timings/c51.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C51_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  futuro: DELAY + 0.1,
  calma: DELAY + 6.5,
  rebobina: DELAY + 9.3,
  checklist: DELAY + 10.6,
  mapa: DELAY + 12.7,
  flash: DELAY + 15.8,
  busca: DELAY + 18.3,
  dia1: DELAY + 22.8,
  hoje: DELAY + 29.4,
  play: DELAY + 33.1,
  gratis: DELAY + 35.3,
  end: DELAY + T.duration - 3.2,
};
const SC = {
  futuro: [0, B.rebobina - 0.2] as Range,
  rw1: [B.rebobina - 0.2, B.mapa - 0.2] as Range,       // checklist desmarcando (ol_plano reverso simulado)
  rw2: [B.mapa - 0.2, B.flash - 0.2] as Range,           // mapa fechando
  rw3: [B.flash - 0.2, B.busca - 0.2] as Range,          // flashcards
  rw4: [B.busca - 0.2, B.dia1 - 0.2] as Range,           // busca
  rw5: [B.dia1 - 0.2, B.hoje - 0.3] as Range,            // dia 1 (form do cronograma)
  hoje: [B.hoje - 0.3, B.end + 1.0] as Range,
};

/* overlay de rebobinagem: tracking lines + ◀◀ */
const RewindFX: React.FC<{ t: number; on: boolean }> = ({ t, on }) => {
  if (!on) return null;
  const ln = (i: number) => 200 + ((t * 900 + i * 460) % 1700);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 26, pointerEvents: 'none' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: ln(i), height: 5 + (i % 2) * 4, background: 'rgba(22,24,29,0.10)' }} />
      ))}
      <div style={{ position: 'absolute', right: 60, top: 190, fontFamily: MONO, fontWeight: 700, fontSize: 52, color: O_RED, opacity: t % 0.7 < 0.4 ? 1 : 0.25 }}>◀◀</div>
      <div style={{ position: 'absolute', left: 60, top: 196, fontFamily: MONO, fontWeight: 700, fontSize: 30, color: O_MUT }}>REW</div>
    </div>
  );
};

export const C51_Rebobinar: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const rewinding = t >= B.rebobina - 0.1 && t < B.hoje - 0.2;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />

      {/* FUTURO: progresso no verde */}
      <div style={{ position: 'absolute', inset: 0, opacity: t < SC.futuro[1] ? 1 - win(t, SC.futuro[1] - 0.3, SC.futuro[1]) : 0 }}>
        <div style={{ position: 'absolute', left: 60, right: 60, top: 260, textAlign: 'center' }}>
          <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 27, color: O_MUT, letterSpacing: 4 }}>DAQUI A ALGUNS MESES</div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 62, color: O_INK, letterSpacing: -2, marginTop: 14 }}>
            esse é <span style={{ color: O_RED }}>você.</span>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 120, right: 120, top: 560 }}>
          {[['revisão em dia', 100], ['cronograma no verde', 92], ['questões do bloco fechadas', 88]].map(([lb, pc], i) => (
            <div key={i} style={{ background: WHITE, border: '1.5px solid rgba(22,24,29,0.1)', borderRadius: 20, padding: '26px 30px', marginBottom: 20, boxShadow: '0 14px 36px -14px rgba(22,24,29,0.2)', opacity: win(t, B.futuro + 1.2 + i * 1.0, B.futuro + 1.5 + i * 1.0) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: HEAD, fontWeight: 800, fontSize: 29, color: O_INK }}>
                <span>{lb}</span><span style={{ color: O_GREEN }}>{pc}%</span>
              </div>
              <div style={{ marginTop: 14, height: 16, borderRadius: 10, background: '#eceff3', overflow: 'hidden' }}>
                <div style={{ width: `${pc}%`, height: '100%', background: O_GREEN }} />
              </div>
            </div>
          ))}
          <div style={{ textAlign: 'center', marginTop: 30, fontFamily: HEAD, fontWeight: 800, fontSize: 32, color: O_INK, opacity: win(t, B.calma, B.calma + 0.4) }}>
            a calma de quem sabe onde tá pisando.
          </div>
        </div>
      </div>

      <FlashCut t={t} atSec={B.rebobina} color="rgba(22,24,29,0.55)" />

      {/* REBOBINANDO: telas reais em playback reverso (rate negativo simulado com playbackRate baixo + overlay) */}
      <OLPhone t={t} range={SC.rw1} src="rec/ol_plano.mp4" startFrom={560} playbackRate={0.7} top={300} width={500}>
        <OLBadge x={56} y={430} delay={Math.round((B.checklist) * FPS)} from="left" accent top="o checklist se desmarcando" />
      </OLPhone>
      <OLPhone t={t} range={SC.rw2} src="rec/ol_plano.mp4" startFrom={300} playbackRate={0.7} top={300} width={500}>
        <OLBadge x={56} y={430} delay={Math.round((B.mapa + 0.3) * FPS)} from="left" accent top="o mapa fechando, marco por marco" />
      </OLPhone>
      <OLPhone t={t} range={SC.rw3} src="rec/ol_flash.mp4" startFrom={200} playbackRate={0.7} top={300} width={500}>
        <OLBadge x={56} y={430} delay={Math.round((B.flash + 0.3) * FPS)} from="left" accent top="os flashcards do teu material" />
      </OLPhone>
      <OLPhone t={t} range={SC.rw4} src="rec/ol_acervo.mp4" startFrom={200} playbackRate={0.7} top={300} width={500}>
        <OLBadge x={56} y={430} delay={Math.round((B.busca + 0.4) * FPS)} from="left" accent top="a primeira busca" bottom="aula + livro + questão" />
      </OLPhone>
      <OLPhone t={t} range={SC.rw5} src="rec/ol_plano_gen.mp4" startFrom={120} playbackRate={0.8} top={300} width={500}>
        <OLBadge x={56} y={430} delay={Math.round((B.dia1 + 0.4) * FPS)} from="left" accent top="o dia 1" bottom="objetivo → cronograma inteiro por IA" />
      </OLPhone>
      <RewindFX t={t} on={rewinding} />

      {/* HOJE: botão play gigante */}
      <div style={{ position: 'absolute', inset: 0, opacity: win(t, B.hoje - 0.2, B.hoje + 0.3) * (1 - win(t, B.end + 0.5, B.end + 1)) }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 430, textAlign: 'center' }}>
          <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 27, color: O_MUT, letterSpacing: 4 }}>HOJE · AGORA</div>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 58, color: O_INK, letterSpacing: -2, marginTop: 12 }}>
            você, decidindo se<br />aperta o <span style={{ color: O_RED }}>play.</span>
          </div>
        </div>
        <div style={{ position: 'absolute', left: '50%', top: 880, transform: `translateX(-50%) scale(${1 + Math.sin(t * 3) * 0.04})` }}>
          <div style={{ width: 300, height: 300, borderRadius: 999, background: O_RED, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 40px 110px -20px rgba(224,45,45,0.65)' }}>
            <svg width={110} height={110} viewBox="0 0 24 24" fill={WHITE}><path d="M8 5l11 7-11 7z" /></svg>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1290, textAlign: 'center', fontFamily: HEAD, fontWeight: 800, fontSize: 34, color: O_INK, opacity: win(t, B.gratis, B.gratis + 0.4) }}>
          o play é <span style={{ color: O_RED }}>de graça.</span>
        </div>
      </div>

      <Vignette strength={0.2} />
      <Grain opacity={0.045} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c51.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
