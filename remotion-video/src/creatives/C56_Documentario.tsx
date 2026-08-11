import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, OffthreadVideo } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { RED, WHITE, HEAD, BODY, MONO } from './theme';
import { FPS, ClipAt } from './story';
import { EndCard } from './common';
import { Grain, Vignette, Letterbox, CamDrift, win, easeOutExpo } from './cine';
import timing from './timings/c56.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C56_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

const B = {
  habitat: DELAY + 0.1,
  abas: DELAY + 6.1,
  ritual: DELAY + 13.4,
  voz: DELAY + 18.6,
  mudou: DELAY + 23.2,
  busca: DELAY + 25.9,
  grifo: DELAY + 33.8,
  flash: DELAY + 36.3,
  paz: DELAY + 40.2,
  descansa: DELAY + 46.1,
  junte: DELAY + 49.6,
  end: DELAY + T.duration - 3.2,
};

const SERIF = "Georgia, 'Times New Roman', serif";

/* lower-third de documentário */
const Lower: React.FC<{ t: number; at: number; until: number; top: string; sub?: string }> =
({ t, at, until, top, sub }) => {
  const o = Math.min(win(t, at, at + 0.4), 1 - win(t, until - 0.3, until));
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: 70, bottom: 380, zIndex: 22, opacity: o }}>
      <div style={{ width: 74, height: 6, background: RED, marginBottom: 14 }} />
      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 38, color: WHITE, textShadow: '0 4px 24px rgba(0,0,0,0.9)' }}>{top}</div>
      {sub && <div style={{ fontFamily: MONO, fontSize: 22, color: 'rgba(255,255,255,0.65)', marginTop: 8, letterSpacing: 2 }}>{sub}</div>}
    </div>
  );
};

/* abas de navegador multiplicando */
const Abas: React.FC<{ t: number }> = ({ t }) => {
  const o = Math.min(win(t, B.abas - 0.3, B.abas + 0.1), 1 - win(t, B.ritual + 3.6, B.ritual + 4.1));
  if (o <= 0) return null;
  const n = Math.min(14, Math.floor(1 + Math.max(0, t - B.abas) * 3.4));
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: 420, zIndex: 8, opacity: o }}>
      <div style={{ background: '#161a22', borderRadius: '20px 20px 0 0', padding: '16px 16px 0', border: '1.5px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[...Array(n)].map((_, i) => (
            <div key={i} style={{
              width: n > 8 ? 88 : 150, height: 44, borderRadius: '10px 10px 0 0',
              background: i === n - 1 ? '#242a36' : '#1b202b', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none',
              display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8, overflow: 'hidden',
            }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: ['#e0862d', '#4b9de0', '#43b586', '#8a6fd6'][i % 4], flexShrink: 0 }} />
              <span style={{ fontFamily: BODY, fontSize: 15, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>pdf_final_v{i + 2}…</span>
            </div>
          ))}
        </div>
        <div style={{ height: 560, background: '#0d1017', borderRadius: '0 0 4px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 40, color: 'rgba(255,255,255,0.35)' }}>aba {n} de … ?</div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 26, color: 'rgba(255,255,255,0.5)' }}>"eu vi isso em algum lugar…"</div>
        </div>
      </div>
    </div>
  );
};

const Take: React.FC<{ t: number; at: number; until: number; src: string; from: number }> =
({ t, at, until, src, from }) => {
  const o = Math.min(win(t, at, at + 0.35), 1 - win(t, until - 0.3, until));
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <CamDrift t={t} amp={6} zoom={0.03}>
        <div style={{ position: 'absolute', left: '50%', top: 880, transform: 'translate(-50%,-50%)', width: 640, height: 1150, borderRadius: 32, overflow: 'hidden', boxShadow: '0 60px 140px -30px rgba(0,0,0,0.9)', border: '1.5px solid rgba(255,255,255,0.1)' }}>
          <ClipAt fromSec={at - 0.3}>
            <OffthreadVideo src={staticFile(src)} muted startFrom={from} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          </ClipAt>
        </div>
      </CamDrift>
    </div>
  );
};

export const C56_Documentario: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#05070b' }}>
      {/* fundo noturno */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 70% at 50% 30%, #0c1018 0%, #05070b 70%)' }} />
      {[...Array(10)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', left: 60 + (i * 173) % 960, top: 90 + (i * 259) % 480, width: 4, height: 4, borderRadius: 99, background: WHITE, opacity: 0.25 + 0.35 * Math.abs(Math.sin(t + i * 2)) }} />
      ))}

      {/* cartela de abertura */}
      <div style={{ position: 'absolute', inset: 0, opacity: t < B.abas ? 1 - win(t, B.abas - 0.4, B.abas) : 0 }}>
        <div style={{ position: 'absolute', left: 80, right: 80, top: 660 }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: 'rgba(255,255,255,0.55)', letterSpacing: 6 }}>REGISTRO NOTURNO · 23H47</div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 66, color: WHITE, marginTop: 26, lineHeight: 1.25 }}>
            o estudante de medicina<br />em seu habitat natural.
          </div>
        </div>
      </div>

      <Abas t={t} />
      <Lower t={t} at={B.ritual} until={B.mudou - 0.3} top="o ritual do material perdido" sub="TRANSMITIDO DE GERAÇÃO EM GERAÇÃO" />

      {/* a virada */}
      <Take t={t} at={B.busca - 0.4} until={B.grifo} src="rec/m_search.mp4" from={150} />
      <Lower t={t} at={B.busca + 0.6} until={B.grifo} top="a espécie encontra a busca total" sub="AULA · LIVRO · QUESTÃO — NUM LUGAR SÓ" />
      <Take t={t} at={B.grifo} until={B.flash} src="rec/m_pdf.mp4" from={200} />
      <Take t={t} at={B.flash} until={B.paz} src="rec/oa_flash_gen.mp4" from={220} />
      <Take t={t} at={B.paz} until={B.junte - 0.4} src="rec/oa_flash_study.mp4" from={260} />
      <Lower t={t} at={B.paz + 0.4} until={B.junte - 0.4} top="comportamento nunca antes documentado:" sub="A REVISÃO EM PAZ" />

      {/* fecho */}
      <div style={{ position: 'absolute', inset: 0, opacity: Math.min(win(t, B.descansa, B.descansa + 0.4), 1 - win(t, B.end + 0.5, B.end + 1)) }}>
        <div style={{ position: 'absolute', left: 80, right: 80, top: 800, textAlign: 'center' }}>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 58, color: WHITE, lineHeight: 1.3 }}>
            a espécie, enfim,<br />descansa.
          </div>
          <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 27, color: 'rgba(255,255,255,0.65)', marginTop: 30, opacity: win(t, B.junte, B.junte + 0.4) }}>
            junte-se a +10.000 médicos e estudantes
          </div>
        </div>
      </div>

      <Letterbox t={t} inAt={0.1} outAt={B.end - 0.4} size={130} />
      <Vignette strength={0.6} />
      <Grain opacity={0.09} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1600} size={50} highlight={RED} />
      <EndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c56.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
