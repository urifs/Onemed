import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, OffthreadVideo } from 'remotion';
import { CaptionTrack, Timing } from './Captions';
import { HEAD, MONO } from './theme';
import { FPS, Range, sceneOpacity, ClipAt } from './story';
import { OLightBg, OLEndCard, O_RED, O_INK, WHITE } from './olight';
import { Static, FlashCut, Grain, Vignette, win, beatIndex } from './cine';
import timing from './timings/c44.json';

const T = timing as Timing;
const DELAY = 0.7;
export const C44_DURATION = Math.round((DELAY + T.duration + 2.2) * FPS);

type Canal = { at: number; num: string; label: string; src?: string; from?: number };
const CANAIS: Canal[] = [
  { at: DELAY + 3.3, num: '01', label: 'AULA AGORA', src: 'rec/ol_dash.mp4', from: 40 },
  { at: DELAY + 5.4, num: '02', label: 'BUSCA UNIFICADA', src: 'rec/ol_acervo.mp4', from: 160 },
  { at: DELAY + 10.2, num: '03', label: 'RESUMO EM 1 CLIQUE', src: 'rec/m_pdf.mp4', from: 180 },
  { at: DELAY + 13.5, num: '04', label: 'FLASHCARDS POR IA', src: 'rec/ol_flash.mp4', from: 170 },
  { at: DELAY + 17.7, num: '05', label: 'QUESTÕES COMENTADAS', src: 'rec/ol_quest.mp4', from: 200 },
  { at: DELAY + 22.5, num: '06', label: 'ASSISTENTE IA', src: 'rec/ol_assist.mp4', from: 300 },
  { at: DELAY + 26.5, num: '07', label: 'ACERVO PÚBLICO', src: 'rec/ol_acervo.mp4', from: 40 },
];
const B = {
  grade: DELAY + 33.3,     // zapping acelerado / mosaico
  frase: DELAY + 39.2,
  end: DELAY + T.duration - 3.2,
};
const FAST = [B.grade, B.grade + 0.28, B.grade + 0.56, B.grade + 0.84, B.grade + 1.12];
const FAST_SRC = ['rec/ol_plano.mp4', 'rec/ol_flash.mp4', 'rec/ol_dash.mp4', 'rec/ol_quest.mp4', 'rec/ol_assist.mp4'];

export const C44_Zapping: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const ci = beatIndex(t, CANAIS.map(c => c.at));
  const fi = beatIndex(t, FAST);
  const emGrade = t >= B.grade && t < B.frase;
  const canal = emGrade && fi >= 0 ? null : (ci >= 0 ? CANAIS[ci] : null);
  const tvOp = sceneOpacity(t, [0, B.end + 0.5] as Range, true);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OLightBg />

      <div style={{ position: 'absolute', inset: 0, opacity: tvOp }}>
        {/* TV 2D */}
        <div style={{
          position: 'absolute', left: 50, right: 50, top: 210, height: 1240,
          background: 'linear-gradient(170deg,#22252b,#101216)', borderRadius: 44, zIndex: 3,
          boxShadow: '0 60px 130px -30px rgba(22,24,29,0.6)', padding: 26,
        }}>
          <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden', background: '#000' }}>
            {/* conteúdo do canal */}
            {canal && canal.src && (
              <ClipAt fromSec={canal.at - 0.3}>
                <OffthreadVideo src={staticFile(canal.src)} muted startFrom={canal.from}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              </ClipAt>
            )}
            {emGrade && fi >= 0 && (
              <ClipAt fromSec={FAST[fi]}>
                <OffthreadVideo src={staticFile(FAST_SRC[fi])} muted startFrom={120 + fi * 40}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              </ClipAt>
            )}
            {/* hook: tela com logo antes do canal 1 */}
            {t < CANAIS[0].at && (
              <div style={{ position: 'absolute', inset: 0, background: '#0c0e12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
                <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 74, color: WHITE, letterSpacing: -2 }}>
                  One<span style={{ color: O_RED }}>Med</span> <span style={{ fontSize: 40, color: '#8b93a0' }}>TV</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 26, color: '#8b93a0' }}>hoje a programação é sua</div>
              </div>
            )}
            {/* frase final dentro da TV */}
            {t >= B.frase && (
              <div style={{ position: 'absolute', inset: 0, background: '#0c0e12', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
                <div style={{ fontFamily: HEAD, fontWeight: 900, fontSize: 64, color: WHITE, letterSpacing: -2, textAlign: 'center', lineHeight: 1.25 }}>
                  o único streaming que te deixa <span style={{ color: O_RED }}>mais inteligente.</span>
                </div>
              </div>
            )}
            {/* estática nos cortes */}
            {CANAIS.map((c, i) => <Static key={i} t={t} atSec={c.at} dur={0.2} />)}
            {FAST.map((f, i) => <Static key={`f${i}`} t={t} atSec={f} dur={0.12} />)}
            <Static t={t} atSec={B.frase} dur={0.22} />
            {/* scanlines */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none', opacity: 0.10, background: 'repeating-linear-gradient(180deg, transparent 0 3px, #000 3px 5px)' }} />
            {/* OSD do canal */}
            {canal && t < B.frase && (
              <div style={{ position: 'absolute', left: 30, top: 26, zIndex: 22, fontFamily: MONO, fontWeight: 700, fontSize: 42, color: '#7CFF6B', textShadow: '0 0 14px rgba(124,255,107,0.8)' }}>
                CH {canal.num}
              </div>
            )}
            {canal && t < B.frase && t < canal.at + 2.2 && (
              <div style={{ position: 'absolute', left: 30, bottom: 28, zIndex: 22, background: 'rgba(0,0,0,0.62)', borderRadius: 10, padding: '10px 18px', fontFamily: MONO, fontWeight: 700, fontSize: 26, color: WHITE }}>
                {canal.label}
              </div>
            )}
          </div>
        </div>

        {/* controle remoto 2D */}
        <div style={{
          position: 'absolute', right: 90, bottom: 210, width: 150, height: 330, zIndex: 8,
          background: 'linear-gradient(170deg,#2b2e35,#16181d)', borderRadius: 40,
          transform: `rotate(14deg) ${t < DELAY + 1 ? 'translateY(60px)' : ''}`,
          boxShadow: '0 40px 90px -20px rgba(22,24,29,0.55)', padding: 20,
          opacity: win(t, DELAY + 0.1, DELAY + 0.6) * (1 - win(t, B.frase, B.frase + 0.4)),
        }}>
          <div style={{ width: 46, height: 46, borderRadius: 99, background: O_RED, margin: '0 auto', boxShadow: `0 0 ${CANAIS.some(c => Math.abs(t - c.at) < 0.12) ? 26 : 6}px rgba(224,45,45,0.9)` }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
            {[...Array(6)].map((_, i) => <div key={i} style={{ height: 34, borderRadius: 10, background: '#3a3f4a' }} />)}
          </div>
          <div style={{ marginTop: 18, height: 70, borderRadius: 18, background: '#3a3f4a' }} />
        </div>
      </div>

      {CANAIS.map((c, i) => <FlashCut key={i} t={t} atSec={c.at} color="rgba(255,255,255,0.5)" />)}
      <Vignette strength={0.24} />
      <Grain opacity={0.045} />
      <CaptionTrack timing={T} delaySec={DELAY} y={1650} size={54} highlight={O_RED} />
      <OLEndCard startFrame={Math.round(B.end * FPS)} />
      <Sequence from={Math.round(DELAY * FPS)}><Audio src={staticFile('narration/c44.mp3')} /></Sequence>
    </AbsoluteFill>
  );
};
